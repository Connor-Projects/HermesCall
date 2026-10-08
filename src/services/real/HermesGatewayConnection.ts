import type { IGatewayConnection, ConnectionStatus } from '../../interfaces';
import type { GatewayMessage } from '../../types';
import { logger } from '../../utils/logger';
import { randomId } from '../../utils/randomId';

const GATEWAY_PROTOCOL = '1.0.0';
const WS_SUBPROTOCOL = 'hermes';
const READY_TIMEOUT_MS = 8000;

type GatewayEnvelope = {
  protocol?: string;
  id: string | null;
  method?: string;
  params?: Record<string, unknown>;
  error?: Record<string, unknown>;
  result?: unknown;
};

/**
 * Live WSS connection to the Hermes Phone Gateway.
 *
 * Converts the app’s typed {@link GatewayMessage}s into the gateway’s
 * JSON-RPC-style envelope (`{protocol,id,method,params}`) and vice-versa.
 */
export class HermesGatewayConnection implements IGatewayConnection {
  status: ConnectionStatus = 'disconnected';

  private ws: WebSocket | null = null;
  private handlers = new Set<(message: GatewayMessage) => void>();
  private connectPromise: Promise<void> | null = null;
  private connectResolve: (() => void) | null = null;
  private connectReject: ((reason?: Error) => void) | null = null;
  private readyTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalDisconnect = false;
  private reconnectAttempt = 0;
  private readonly maxReconnectAttempts = 5;

  private get baseUrl(): string {
    const url = process.env.EXPO_PUBLIC_HERMES_GATEWAY_URL?.trim();
    if (!url) {
      logger.warn(
        'EXPO_PUBLIC_HERMES_GATEWAY_URL is not set; falling back to the built-in gateway URL',
      );
    }
    return url || 'https://hermesagent.conweb2.dpdns.org';
  }

  async connect(): Promise<void> {
    if (this.status === 'connected') return;
    if (this.connectPromise) return this.connectPromise;

    this.intentionalDisconnect = false;
    this.connectPromise = new Promise<void>((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;

      this.setStatus('connecting');
      const wsUrl = this.buildWsUrl(this.baseUrl);
      logger.info('Connecting to Hermes Phone Gateway:', wsUrl);

      try {
        this.ws = new WebSocket(wsUrl, [WS_SUBPROTOCOL]);
      } catch (e) {
        this.handleError(e instanceof Error ? e : new Error(String(e)));
        return;
      }

      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onerror = (event) => this.handleError(event);
      this.ws.onclose = () => this.handleClose();

      this.readyTimer = setTimeout(() => {
        this.handleError(
          new Error('Timed out waiting for gateway connection.ready'),
        );
      }, READY_TIMEOUT_MS);
    });

    return this.connectPromise;
  }

  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    this.clearReconnect();

    if (this.ws) {
      // 1000 = normal closure.
      this.ws.close(1000, 'Client disconnected');
      this.ws = null;
    }

    this.clearReadyTimer();
    this.rejectConnect(new Error('Disconnected by client'));
    this.setStatus('disconnected');
    this.reconnectAttempt = 0;
    logger.info('Disconnected from Hermes Phone Gateway');
  }

  async send(message: GatewayMessage): Promise<void> {
    if (this.status !== 'connected' || !this.ws) {
      logger.warn('Cannot send, gateway not connected');
      throw new Error('Gateway not connected');
    }

    const envelope = this.toEnvelope(message);
    const payload = JSON.stringify(envelope);
    logger.info('→ gateway:', envelope.method, envelope.id);
    this.ws.send(payload);
  }

  onMessage(handler: (message: GatewayMessage) => void): void {
    this.handlers.add(handler);
  }

  offMessage(handler: (message: GatewayMessage) => void): void {
    this.handlers.delete(handler);
  }

  private buildWsUrl(base: string): string {
    const trimmed = base.replace(/\/$/, '');
    // If the user already supplied the WSS endpoint, use it verbatim.
    if (trimmed.startsWith('wss://')) {
      return trimmed;
    }
    // Otherwise derive WSS from HTTPS and append the gateway WS path.
    const https = trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
    return https.replace(/^https:/, 'wss:') + '/ws';
  }

  private handleOpen(): void {
    logger.info('WSS socket open, waiting for gateway handshake');
  }

  private handleMessage(event: MessageEvent): void {
    let envelope: GatewayEnvelope;
    try {
      envelope = JSON.parse(event.data as string) as GatewayEnvelope;
    } catch {
      logger.warn('Received non-JSON gateway message:', event.data);
      return;
    }

    if (envelope.error) {
      logger.info('← gateway error:', envelope.error.code, envelope.id);
    } else if ('result' in envelope) {
      logger.info('← gateway result:', envelope.id);
    } else {
      logger.info('← gateway:', envelope.method, envelope.id);
    }

    if (envelope.method === 'connection.ready') {
      this.clearReadyTimer();
      this.reconnectAttempt = 0;
      this.setStatus('connected');
      this.resolveConnect();
      logger.info('Gateway ready:', envelope.params);
    }

    const message = this.fromEnvelope(envelope);
    if (message) {
      this.dispatch(message);
    }
  }

  private handleClose(): void {
    logger.info('WSS socket closed');
    this.ws = null;
    this.clearReadyTimer();
    this.rejectConnect(new Error('Connection closed'));
    this.setStatus('disconnected');

    if (!this.intentionalDisconnect) {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Error | Event): void {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Gateway connection error:', message);
    this.clearReadyTimer();
    this.rejectConnect(error instanceof Error ? error : new Error(message));

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('disconnected');

    if (!this.intentionalDisconnect) {
      this.scheduleReconnect();
    }
  }

  private resolveConnect(): void {
    if (this.connectResolve) {
      this.connectResolve();
      this.connectResolve = null;
      this.connectReject = null;
      this.connectPromise = null;
    }
  }

  private rejectConnect(error: Error): void {
    if (this.connectReject) {
      this.connectReject(error);
      this.connectResolve = null;
      this.connectReject = null;
      this.connectPromise = null;
    }
  }

  private clearReadyTimer(): void {
    if (this.readyTimer) {
      clearTimeout(this.readyTimer);
      this.readyTimer = null;
    }
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      logger.error('Max gateway reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 15000);
    this.reconnectAttempt += 1;
    logger.info(
      `Scheduling gateway reconnect attempt ${this.reconnectAttempt}/${this.maxReconnectAttempts} in ${delay}ms`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        // Errors are logged inside connect(); the close handler will schedule
        // the next attempt if needed.
      });
    }, delay);
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    logger.info('Gateway status:', status);
  }

  private dispatch(message: GatewayMessage): void {
    this.handlers.forEach((handler) => {
      try {
        handler(message);
      } catch (e) {
        logger.error('Gateway message handler threw:', e);
      }
    });
  }

  private toEnvelope(message: GatewayMessage): GatewayEnvelope {
    const id = message.correlationId ?? randomId('msg');
    const payload = message.payload ?? {};

    switch (message.type) {
      case 'call.invite':
        return {
          protocol: GATEWAY_PROTOCOL,
          id,
          method: 'call.dial',
          params: {
            number: payload.destination,
            extension: payload.extension,
          },
        };
      case 'call.hangup':
        return {
          protocol: GATEWAY_PROTOCOL,
          id,
          method: 'call.hangup',
          params: { callId: payload.callId },
        };
      case 'call.dtmf':
        return {
          protocol: GATEWAY_PROTOCOL,
          id,
          method: 'call.dtmf',
          params: {
            callId: payload.callId,
            digit: payload.digit,
          },
        };
      default:
        return {
          protocol: GATEWAY_PROTOCOL,
          id,
          method: message.type,
          params: payload,
        };
    }
  }

  private fromEnvelope(envelope: GatewayEnvelope): GatewayMessage | null {
    // The gateway handshake is internal; don't leak it as a generic message.
    if (envelope.method === 'connection.ready') {
      return null;
    }

    if (envelope.error) {
      return {
        type: 'gateway.error',
        correlationId: envelope.id ?? undefined,
        payload: envelope.error,
      };
    }

    if ('result' in envelope) {
      return {
        type: 'gateway.response',
        correlationId: envelope.id ?? undefined,
        payload: { result: envelope.result },
      };
    }

    if (!envelope.method) {
      return null;
    }

    // Map gateway call events back to app message types where we have them.
    switch (envelope.method) {
      case 'call.ringing':
      case 'call.active':
      case 'call.ended':
      case 'call.error':
      case 'call.dtmf':
        return {
          type: envelope.method,
          correlationId: envelope.id ?? undefined,
          payload: envelope.params,
        };
      default:
        return {
          type: envelope.method,
          correlationId: envelope.id ?? undefined,
          payload: envelope.params,
        };
    }
  }
}

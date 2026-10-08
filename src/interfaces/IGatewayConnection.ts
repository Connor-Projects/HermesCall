import type { GatewayMessage } from '../types';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * Abstraction for the secure WebSocket (WSS) connection to the Hermes Phone
 * Gateway. This is the only Internet-facing channel the app will ever use.
 *
 * The gateway is responsible for bridging to Asterisk (SIP/ARI) on a private
 * interface. The app never connects directly to Asterisk.
 */
export interface IGatewayConnection {
  readonly status: ConnectionStatus;

  /** Open the WSS connection using the stored device token. */
  connect(): Promise<void>;

  /** Close the WSS connection. */
  disconnect(): Promise<void>;

  /** Send a signaling message to the gateway. */
  send(message: GatewayMessage): Promise<void>;

  /** Register a handler for incoming gateway messages. */
  onMessage(handler: (message: GatewayMessage) => void): void;

  /** Remove a previously registered handler. */
  offMessage(handler: (message: GatewayMessage) => void): void;
}

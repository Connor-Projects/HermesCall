import type { IGatewayConnection } from '../../interfaces';
import type { GatewayMessage } from '../../types';
import { logger } from '../../utils/logger';

/**
 * Mock gateway connection for UI development.
 *
 * This maintains a fake connection status but never opens a real WebSocket. All
 * send() calls are logged as unimplemented and then discarded.
 */
export class MockGatewayConnection implements IGatewayConnection {
  status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

  private handlers = new Set<(message: GatewayMessage) => void>();

  async connect(): Promise<void> {
    if (this.status === 'connected') return;

    this.status = 'connecting';
    logger.info('Mock: connecting to Hermes Phone Gateway... (real WSS not yet implemented)');

    // Simulate a brief connection delay.
    await new Promise((resolve) => setTimeout(resolve, 600));
    this.status = 'connected';
    logger.info('Mock: connected (no real network connection)');
  }

  async disconnect(): Promise<void> {
    this.status = 'disconnected';
    logger.info('Mock: disconnected from Hermes Phone Gateway');
  }

  async send(message: GatewayMessage): Promise<void> {
    if (this.status !== 'connected') {
      logger.warn('Mock: cannot send, gateway not connected');
      return;
    }

    logger.info('Mock: message not sent over network (unimplemented):', { type: message.type });
  }

  onMessage(handler: (message: GatewayMessage) => void): void {
    this.handlers.add(handler);
  }

  offMessage(handler: (message: GatewayMessage) => void): void {
    this.handlers.delete(handler);
  }
}

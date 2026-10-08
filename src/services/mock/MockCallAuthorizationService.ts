import type { ICallAuthorizationService } from '../../interfaces';
import { logger } from '../../utils/logger';
import { randomId } from '../../utils/randomId';

/**
 * Mock call-authorization service.
 *
 * In production the PIN is sent to the gateway over WSS for verification. The
 * app never stores or validates the PIN locally.
 */
export class MockCallAuthorizationService implements ICallAuthorizationService {
  private required = false;
  private ticket: string | null = null;

  isAuthorizationRequired(): boolean {
    return this.required;
  }

  setAuthorizationRequired(required: boolean): void {
    this.required = required;
    logger.info('Call authorization requirement set to:', required);
  }

  async authorize(pin: string): Promise<{ authorized: boolean; ticket?: string; reason?: string }> {
    logger.info('Mock: authorizing call (PIN verification happens on gateway in production)');

    if (!pin || pin.length < 4) {
      return { authorized: false, reason: 'PIN must be at least 4 digits' };
    }

    // Mock: any 4+ digit PIN is accepted. This is purely for UI flow testing.
    this.ticket = randomId('mock_auth_ticket');
    return { authorized: true, ticket: this.ticket };
  }

  clearAuthorization(): void {
    this.ticket = null;
  }

  getTicket(): string | null {
    return this.ticket;
  }
}

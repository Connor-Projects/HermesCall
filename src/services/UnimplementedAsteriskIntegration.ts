import type { IAsteriskIntegration } from '../interfaces';
import { logger } from '../utils/logger';

/**
 * Stub implementation that makes it explicit the app must never call Asterisk
 * directly.
 *
 * Asterisk integration belongs on the Hermes Phone Gateway, which runs on the
 * private network (192.168.3.146). The gateway will use AMI/ARI to originate,
 * hang up, and send DTMF to Asterisk channels.
 */
export class UnimplementedAsteriskIntegration implements IAsteriskIntegration {
  async originate(): Promise<void> {
    logger.error('AsteriskIntegration.originate() is not implemented in the app; use the gateway');
    throw new Error('Asterisk integration is server-side only');
  }

  async hangUp(): Promise<void> {
    logger.error('AsteriskIntegration.hangUp() is not implemented in the app; use the gateway');
    throw new Error('Asterisk integration is server-side only');
  }

  async sendDtmf(): Promise<void> {
    logger.error('AsteriskIntegration.sendDtmf() is not implemented in the app; use the gateway');
    throw new Error('Asterisk integration is server-side only');
  }
}

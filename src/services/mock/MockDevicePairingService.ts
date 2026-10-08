import type { IDevicePairingService } from '../../interfaces';
import type { DeviceIdentity, PairingCode } from '../../types';
import { logger } from '../../utils/logger';
import { randomId } from '../../utils/randomId';

/**
 * Mock pairing service for UI development.
 *
 * In production:
 *  1. The gateway creates a short-lived pairing code and sends it to the user
 *     via Telegram (server-side bot token, never in the app).
 *  2. The app sends the code back over WSS; the gateway returns a device token.
 *  3. The device token is stored securely (e.g. OS keychain) and used to
 *     authenticate every future connection.
 */
export class MockDevicePairingService implements IDevicePairingService {
  private pairedDevice: DeviceIdentity | null = null;

  async requestPairingCode(): Promise<PairingCode> {
    logger.info('Mock: requesting pairing code (server-side Telegram delivery not implemented)');

    // Generate a deterministic-looking random 6-digit code.
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    return { code, expiresAt };
  }

  async pairWithCode(code: string): Promise<DeviceIdentity> {
    logger.info('Mock: pairing with code (network call not implemented)');

    if (!/^\d{6}$/.test(code)) {
      throw new Error('Pairing code must be six digits');
    }

    this.pairedDevice = {
      deviceId: randomId('device'),
      deviceToken: randomId('mock_device_token'),
      pairedAt: new Date().toISOString(),
      extension: '1001',
    };

    logger.info('Mock: device paired, extension=', this.pairedDevice.extension);
    return this.pairedDevice;
  }

  getPairedDevice(): DeviceIdentity | null {
    return this.pairedDevice;
  }

  unpair(): void {
    logger.info('Mock: device unpaired');
    this.pairedDevice = null;
  }
}

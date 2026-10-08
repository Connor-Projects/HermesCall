import type { IAuthService } from '../../interfaces';
import { logger } from '../../utils/logger';
import { randomId } from '../../utils/randomId';

/**
 * Mock authentication service for UI development.
 *
 * IMPORTANT: This does not perform real authentication. The real
 * implementation will POST credentials to the Hermes Phone Gateway and store
 * only short-lived access/refresh tokens in memory.
 */
export class MockAuthService implements IAuthService {
  private authenticated = false;
  private accessToken: string | null = null;

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  async signIn(credentials: { username: string; password: string }): Promise<{ accessToken: string; refreshToken: string }> {
    logger.info('Mock sign-in for user:', credentials.username);

    if (!credentials.username || !credentials.password) {
      throw new Error('Username and password are required');
    }

    // Mock tokens. In production these come from the gateway and are never
    // committed to source control.
    this.accessToken = randomId('mock_access');
    const refreshToken = randomId('mock_refresh');
    this.authenticated = true;

    logger.info('Mock sign-in succeeded (no network call)');
    return { accessToken: this.accessToken, refreshToken };
  }

  async signOut(): Promise<void> {
    logger.info('Mock sign-out');
    this.authenticated = false;
    this.accessToken = null;
  }

  getDeviceIdentity() {
    return null;
  }
}

import type { DeviceIdentity } from '../types';

/**
 * Abstraction for user authentication.
 *
 * The real implementation will authenticate against the Hermes Phone Gateway.
 * The app never stores passwords; it only keeps an access token in memory while
 * signed in and a long-lived device token after pairing.
 */
export interface IAuthService {
  /** True when a valid access token is held in memory. */
  isAuthenticated(): boolean;

  /**
   * Exchange user credentials for short-lived access and refresh tokens.
   * Throws on failure so the UI can show an error.
   */
  signIn(credentials: {
    username: string;
    password: string;
  }): Promise<{ accessToken: string; refreshToken: string }>;

  /** Discard tokens and return to the signed-out state. */
  signOut(): Promise<void>;

  /** Return the paired device identity if one exists. */
  getDeviceIdentity(): DeviceIdentity | null;
}

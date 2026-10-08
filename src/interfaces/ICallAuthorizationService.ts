/**
 * Abstraction for the per-call authorization step.
 *
 * When enabled, the app must collect a PIN (or biometric/biometric-equivalent)
 * and receive an authorization ticket from the gateway before a call can be
 * placed. The PIN is never stored locally; it is only sent over TLS/WSS to the
 * gateway for verification.
 */
export interface ICallAuthorizationService {
  /** Whether the user has enabled the additional call authorization step. */
  isAuthorizationRequired(): boolean;

  setAuthorizationRequired(required: boolean): void;

  /**
   * Verify a PIN with the gateway.
   * Returns a short-lived authorization ticket on success.
   */
  authorize(pin: string): Promise<{ authorized: boolean; ticket?: string; reason?: string }>;

  /** Forget any cached authorization ticket. */
  clearAuthorization(): void;
}

import type { DeviceIdentity, PairingCode } from '../types';

/**
 * Abstraction for the one-time device pairing flow.
 *
 * Pairing is intentionally separate from user sign-in: a device receives an
 * opaque token that it uses for all later gateway connections. The pairing
 * code is delivered through Telegram by the Hermes backend; the app itself
 * never sees the bot token.
 */
export interface IDevicePairingService {
  /** Request a new pairing code from the gateway (delivered via Telegram). */
  requestPairingCode(): Promise<PairingCode>;

  /** Exchange a pairing code for a permanent device identity/token. */
  pairWithCode(code: string): Promise<DeviceIdentity>;

  /** Return the currently paired device, or null if not paired. */
  getPairedDevice(): DeviceIdentity | null;

  /** Forget the local device identity. */
  unpair(): void;
}

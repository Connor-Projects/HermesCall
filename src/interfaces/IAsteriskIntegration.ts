/**
 * Placeholder interface for the server-side Asterisk integration.
 *
 * The app must NEVER talk to Asterisk directly. This interface lives in the
 * codebase only to document the boundary where the Hermes Phone Gateway will
 * interface with Asterisk (AMI/ARI) on the private network.
 */
export interface IAsteriskIntegration {
  /** Ask Asterisk to originate a call from an extension to a destination. */
  originate(extension: string, destination: string): Promise<void>;

  /** Hang up a channel by its Asterisk channel ID. */
  hangUp(channelId: string): Promise<void>;

  /** Send a DTMF digit to a channel. */
  sendDtmf(channelId: string, digit: string): Promise<void>;
}

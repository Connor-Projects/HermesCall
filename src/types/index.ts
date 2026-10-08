/**
 * Shared domain types for Hermes Call.
 *
 * These types describe messages and state that cross the boundary between the
 * app, the Hermes Phone Gateway, and (eventually) Asterisk. They are framework
 * agnostic so the gateway/backend can be developed independently.
 */

/** Direction of a call from the app's point of view. */
export type CallDirection = 'outgoing' | 'incoming' | null;

/** High-level call lifecycle state kept by the app. */
export type CallStatus =
  | 'idle'
  | 'dialing'
  | 'ringing'
  | 'active'
  | 'ending'
  | 'ended'
  | 'error';

/** Immutable-ish snapshot of a call from the state manager. */
export interface CallState {
  status: CallStatus;
  remoteNumber: string;
  direction: CallDirection;
  startTime: Date | null;
  endTime: Date | null;
  error?: string;
  /** True when the current call is a local mock and not a real Asterisk call. */
  isMock: boolean;
}

/** Base interface for all signaling messages sent through the gateway. */
export interface GatewayMessage {
  type: string;
  correlationId?: string;
  payload?: Record<string, unknown>;
}

/** Outbound call invitation sent by the app to the gateway. */
export interface CallInviteMessage extends GatewayMessage {
  type: 'call.invite';
  payload: {
    destination: string;
    /** The extension that should place the call, e.g. 1001. */
    extension: string;
  };
}

/** Hang-up request sent by the app to the gateway. */
export interface CallHangupMessage extends GatewayMessage {
  type: 'call.hangup';
  payload: {
    callId: string;
  };
}

/** DTMF digit sent during an active call. */
export interface CallDtmfMessage extends GatewayMessage {
  type: 'call.dtmf';
  payload: {
    callId: string;
    digit: string;
  };
}

export type KnownGatewayMessage =
  | CallInviteMessage
  | CallHangupMessage
  | CallDtmfMessage;

/** Result of a successful device pairing. */
export interface DeviceIdentity {
  /** Stable UUID for this device. */
  deviceId: string;
  /** Long-lived opaque token used to authenticate the device to the gateway. */
  deviceToken: string;
  /** ISO timestamp when pairing completed. */
  pairedAt: string;
  /** Extension assigned to this device, if known at pairing time. */
  extension?: string;
}

/** Short-lived pairing code displayed/delivered to the user. */
export interface PairingCode {
  /** Six-digit numeric code. */
  code: string;
  /** ISO timestamp when the code expires. */
  expiresAt: string;
}

/** Minimal account/extension status exposed to the UI. */
export interface AccountStatus {
  /** Whether the user has completed sign-in. */
  authenticated: boolean;
  /** Whether the device has been paired. */
  paired: boolean;
  /** Assigned extension, e.g. 1001. */
  extension: string | null;
  /** Display name for the current user/account. */
  displayName: string | null;
}

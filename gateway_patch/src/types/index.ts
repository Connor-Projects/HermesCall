/**
 * @fileoverview Typed JSON gateway messages for the Hermes Phone Gateway.
 */

export const GATEWAY_PROTOCOL_VERSION = "1.0.0" as const;

export const GATEWAY_METHODS = [
  "connection.hello",
  "connection.ready",
  "call.dial",
  "call.hangup",
  "call.status",
] as const;

export type GatewayMethod = (typeof GATEWAY_METHODS)[number];
export type GatewayRequestId = string | null;

export interface GatewayMessage<
  M extends GatewayMethod = GatewayMethod,
  P = Record<string, unknown>,
> {
  protocol: typeof GATEWAY_PROTOCOL_VERSION;
  id: GatewayRequestId;
  method: M;
  params?: P;
}

export interface ConnectionHelloParams {
  client: string;
  version?: string;
  device_id?: string;
}

export interface ConnectionReadyPayload {
  protocol: typeof GATEWAY_PROTOCOL_VERSION;
  ready: boolean;
  status: "idle" | "starting" | "ready" | "degraded";
  endpoints: {
    ws: "available" | "degraded" | "unavailable";
    dial: boolean;
    hangup: boolean;
  };
}

export interface ConnectionHelloMessage extends GatewayMessage<"connection.hello", ConnectionHelloParams> {
  protocol: typeof GATEWAY_PROTOCOL_VERSION;
  id: string;
  method: "connection.hello";
  params: ConnectionHelloParams;
}

export interface ConnectionReadyMessage extends GatewayMessage<"connection.ready", ConnectionReadyPayload> {
  protocol: typeof GATEWAY_PROTOCOL_VERSION;
  id: null;
  method: "connection.ready";
  params: ConnectionReadyPayload;
}

export interface CallDialParams {
  /** Dialed number (Android uses this). */
  number?: string;
  /** Legacy field; kept for compatibility. */
  destination?: string;
  /** Extension that should place the call. */
  extension?: string;
  transport?: "udp" | "tcp" | "tls" | "auto";
  display_name?: string;
  caller_id?: string;
}

export interface CallDialMessage extends GatewayMessage<"call.dial", CallDialParams> {
  protocol: typeof GATEWAY_PROTOCOL_VERSION;
  id: string;
  method: "call.dial";
  params: CallDialParams;
}

export interface CallHangupParams {
  call_id?: string;
  callId?: string;
  reason?: string;
}

export interface CallHangupMessage extends GatewayMessage<"call.hangup", CallHangupParams> {
  protocol: typeof GATEWAY_PROTOCOL_VERSION;
  id: string;
  method: "call.hangup";
  params: CallHangupParams;
}

export interface CallStatusParams {
  call_id?: string;
  callId?: string;
}

export interface CallStatusPayload {
  call_id: string;
  state: "dialing" | "ringing" | "active" | "held" | "completed" | "failed";
  caller_id?: string;
  destination?: string;
  timestamp?: string;
  audio_active?: boolean;
}

export interface CallStatusMessage extends GatewayMessage<"call.status", CallStatusParams> {
  protocol: typeof GATEWAY_PROTOCOL_VERSION;
  id: null;
  method: "call.status";
  params: CallStatusParams;
}

export interface CallErrorMessage {
  call_id: string;
  code: string;
  message: string;
  details?: string;
}

export interface CallResult {
  call_id: string;
  state: CallStatusPayload["state"];
  timestamp: string;
}

export interface CallError {
  id: string;
  code: string;
  message: string;
}

export interface CallResponse {
  id: GatewayRequestId;
  result?: CallResult;
  error?: CallError;
}

export interface ConnectionErrorMessage {
  id: null;
  protocol: typeof GATEWAY_PROTOCOL_VERSION;
  method: "connection.error";
  error: {
    code: string;
    message: string;
    details?: string;
  };
}

export type ClientRequestMessage =
  | ConnectionHelloMessage
  | CallDialMessage
  | CallHangupMessage
  | CallStatusMessage;

export type ServerMessage =
  | ConnectionReadyMessage
  | CallStatusMessage
  | CallErrorMessage
  | ConnectionErrorMessage;

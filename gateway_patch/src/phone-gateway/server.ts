/**
 * @fileoverview Hermes Phone Gateway — HTTP server + WebSocket control plane.
 *
 * Listens on 127.0.0.1:8080 (localhost only).
 * - GET /health -> JSON health response
 * - /ws -> WebSocket endpoint for typed gateway messages
 *
 * Message methods:
 *  - connection.hello    (client -> server)
 *  - connection.ready    (server -> client notification)
 *  - call.dial           (client -> server) -> originates PJSIP/3264 via ARI
 *  - call.hangup         (client -> server) -> hangs up the active ARI channel
 *  - call.status         (server -> client) -> ARI channel state updates
 */

import http from "node:http";
import crypto from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import {
  GATEWAY_PROTOCOL_VERSION,
  GATEWAY_METHODS,
  type GatewayMessage,
  type GatewayMethod,
  type ConnectionReadyPayload,
  type CallStatusPayload,
  type CallStatusMessage,
  type CallResponse,
} from "../types/index.js";
import { AsteriskAriClient } from "../bridges/asterisk/broker.js";

// --- Configuration -----------------------------------------------------------

const HOST = "127.0.0.1";
const PORT = 8080;
const HEALTH_ROUTE = "/health";
const WS_ROUTE = "/ws";

const ARI_BASE_URL = process.env.ARI_BASE_URL?.trim() || "http://127.0.0.1:8088";
const ARI_USERNAME = process.env.ARI_USERNAME?.trim() || "";
const ARI_PASSWORD = process.env.ARI_PASSWORD?.trim() || "";

const ariClient = new AsteriskAriClient({
  baseUrl: ARI_BASE_URL,
  username: ARI_USERNAME,
  password: ARI_PASSWORD,
});

// --- State -------------------------------------------------------------------

interface ActiveCall {
  callId: string;
  channelId: string;
}

interface ConnectionState {
  id: string;
  ws: WebSocket;
  ready: boolean;
  activeCall: ActiveCall | null;
}

const connections = new Map<string, ConnectionState>();
const channelsById = new Map<string, ActiveCall & { connId: string }>();

// --- Logging -----------------------------------------------------------------

const SENSITIVE_KEYS = new Set([
  "password",
  "password_hash",
  "token",
  "api_key",
  "apikey",
  "secret",
  "secret_key",
  "auth",
  "authorization",
  "cookie",
  "pin",
  "pairing_code",
  "session_id",
  "credential",
  "private_key",
]);

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (SENSITIVE_KEYS.has(lower)) return true;
  const prefixes = ["password", "token", "secret", "auth", "cookie", "pin", "pairing"];
  return prefixes.some((p) => lower.startsWith(p));
}

export function safeLog(
  level: "debug" | "info" | "warn" | "error",
  message: string,
  context?: Record<string, unknown>,
): void {
  const safeContext: Record<string, unknown> = {};
  if (context) {
    for (const [key, value] of Object.entries(context)) {
      safeContext[key] = isSensitiveKey(key) ? "[REDACTED]" : value;
    }
  }
  const prefix = `[${level.toUpperCase()}]`;
  if (Object.keys(safeContext).length === 0) {
    console.log(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`, JSON.stringify(safeContext, null, 2));
  }
}

// --- Message helpers ---------------------------------------------------------

function sendJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function buildErrorResponse(requestId: string | null, code: string, message: string): CallResponse {
  return {
    id: requestId,
    error: { id: String(requestId), code, message },
  };
}

function buildResultResponse(requestId: string | null, result: CallResponse["result"]): CallResponse {
  return {
    id: requestId,
    result,
  };
}

function parseMessage(raw: string): GatewayMessage | null {
  try {
    const parsed = JSON.parse(raw) as GatewayMessage;

    if (typeof parsed !== "object" || parsed === null) {
      safeLog("warn", "Received non-object JSON message, ignoring", { rawLength: raw.length });
      return null;
    }

    if (typeof parsed.protocol !== "string") {
      safeLog("warn", "Message missing or invalid 'protocol' field");
      return null;
    }

    if (typeof parsed.id !== "string" && parsed.id !== null) {
      safeLog("warn", "Message has invalid 'id' field", { id: String(parsed.id) });
      return null;
    }

    if (typeof parsed.method !== "string") {
      safeLog("warn", "Message missing 'method' field");
      return null;
    }

    if (parsed.params !== undefined && typeof parsed.params !== "object") {
      safeLog("warn", "Message 'params' must be an object or undefined", { paramsType: typeof parsed.params });
      return null;
    }

    if (!GATEWAY_METHODS.includes(parsed.method as GatewayMethod)) {
      safeLog("warn", `Unknown gateway method: ${parsed.method}`, { method: parsed.method });
      return null;
    }

    return parsed;
  } catch (err) {
    safeLog("warn", `Failed to parse JSON message: ${(err as Error).message}`, { rawLength: raw.length });
    return null;
  }
}

// --- ARI state change handling -----------------------------------------------

ariClient.setStateChangeCallback((callId, state) => {
  const record = channelsById.get(callId);
  if (!record) return;

  const conn = connections.get(record.connId);
  if (!conn) return;

  const statusMsg: CallStatusMessage = {
    protocol: GATEWAY_PROTOCOL_VERSION,
    id: null,
    method: "call.status",
    params: {
      call_id: record.callId,
      state,
      timestamp: new Date().toISOString(),
    },
  };

  sendJson(conn.ws, statusMsg);

  if (state === "completed" || state === "failed") {
    channelsById.delete(record.callId);
    if (conn.activeCall?.callId === record.callId) {
      conn.activeCall = null;
    }
  }
});

// --- WebSocket handler -------------------------------------------------------

function createWebSocketServer(server: http.Server) {
  const wss = new WebSocketServer({ server, path: WS_ROUTE, maxPayload: 100 * 1024 * 1024 });

  wss.on("connection", (ws, req) => {
    const clientIp = req.socket.remoteAddress ?? "unknown";
    safeLog("info", "New WebSocket connection", { client_ip: clientIp, path: req.url });

    const connId = `conn_${crypto.randomUUID()}`;
    const connState: ConnectionState = {
      id: connId,
      ws,
      ready: false,
      activeCall: null,
    };
    connections.set(connId, connState);

    const ariConfigured = Boolean(ARI_USERNAME && ARI_PASSWORD);
    const greetingPayload: ConnectionReadyPayload = {
      protocol: GATEWAY_PROTOCOL_VERSION,
      ready: true,
      status: "idle",
      endpoints: {
        ws: "available",
        dial: ariConfigured,
        hangup: ariConfigured,
      },
    };

    sendJson(ws, {
      protocol: GATEWAY_PROTOCOL_VERSION,
      id: null,
      method: "connection.ready",
      params: greetingPayload,
    });

    ws.on("message", async (data) => {
      const raw = data.toString();
      const msg = parseMessage(raw);
      if (!msg) {
        safeLog("warn", "Rejected invalid message format", { client_ip: clientIp });
        return;
      }

      switch (msg.method) {
        case "connection.hello": {
          const params = (msg.params ?? {}) as Record<string, unknown>;
          const clientName = typeof params.client === "string" ? params.client : "unknown";
          const deviceId = typeof params.device_id === "string" ? params.device_id : "none";

          safeLog("info", "Connection hello received", {
            client_ip: clientIp,
            client: clientName,
            device_id: deviceId,
          });

          const readyPayload: ConnectionReadyPayload = {
            protocol: GATEWAY_PROTOCOL_VERSION,
            ready: true,
            status: "ready",
            endpoints: {
              ws: "available",
              dial: ariConfigured,
              hangup: ariConfigured,
            },
          };

          sendJson(ws, {
            protocol: GATEWAY_PROTOCOL_VERSION,
            id: null,
            method: "connection.ready",
            params: readyPayload,
          });
          break;
        }

        case "call.dial": {
          const params = (msg.params ?? {}) as Record<string, unknown>;
          const destination = (params.number as string) || (params.destination as string) || "";

          safeLog("info", "Call dial requested", {
            client_ip: clientIp,
            destination,
          });

          if (!ariConfigured) {
            sendJson(ws, buildErrorResponse(msg.id, "ARI_NOT_CONFIGURED", "Asterisk ARI is not configured on the gateway"));
            break;
          }

          if (connState.activeCall) {
            sendJson(ws, buildErrorResponse(msg.id, "CALL_ALREADY_ACTIVE", "Only one active call is supported in this milestone"));
            break;
          }

          const callId = typeof msg.id === "string" ? msg.id : crypto.randomUUID();

          try {
            const { channelId, state } = await ariClient.originate(callId);
            connState.activeCall = { callId, channelId };
            channelsById.set(callId, { callId, channelId, connId });

            sendJson(ws, buildResultResponse(msg.id, {
              call_id: callId,
              state,
              timestamp: new Date().toISOString(),
            }));
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            safeLog("error", "Failed to originate call via ARI", { client_ip: clientIp, error: message });
            sendJson(ws, buildErrorResponse(msg.id, "ORIGINATE_FAILED", message));
          }
          break;
        }

        case "call.hangup": {
          const params = (msg.params ?? {}) as Record<string, unknown>;
          const requestedCallId = (params.callId as string) || (params.call_id as string) || "";

          safeLog("info", "Call hangup requested", {
            client_ip: clientIp,
            call_id: requestedCallId,
          });

          const active = connState.activeCall;
          if (!active) {
            sendJson(ws, buildErrorResponse(msg.id, "NO_ACTIVE_CALL", "No active call to hang up"));
            break;
          }

          try {
            await ariClient.hangup(active.channelId);
            channelsById.delete(active.callId);
            connState.activeCall = null;

            sendJson(ws, buildResultResponse(msg.id, {
              call_id: active.callId,
              state: "completed",
              timestamp: new Date().toISOString(),
            }));
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            safeLog("error", "Failed to hang up call via ARI", { client_ip: clientIp, error: message });
            sendJson(ws, buildErrorResponse(msg.id, "HANGUP_FAILED", message));
          }
          break;
        }

        case "call.status": {
          const params = (msg.params ?? {}) as Record<string, unknown>;
          const requestedCallId = (params.call_id as string) || "";

          safeLog("info", "Call status requested", {
            client_ip: clientIp,
            call_id: requestedCallId,
          });

          const active = connState.activeCall;
          if (!active) {
            sendJson(ws, buildErrorResponse(msg.id, "NO_ACTIVE_CALL", "No active call"));
            break;
          }

          sendJson(ws, buildResultResponse(msg.id, {
            call_id: active.callId,
            state: "dialing",
            timestamp: new Date().toISOString(),
          }));
          break;
        }

        default: {
          safeLog("warn", "Unhandled method", { method: msg.method });
        }
      }
    });

    ws.on("close", (code, reason) => {
      connections.delete(connId);
      for (const [callId, record] of channelsById) {
        if (record.connId === connId) {
          channelsById.delete(callId);
        }
      }
      safeLog("info", "WebSocket connection closed", {
        client_ip: clientIp,
        code,
        reason: reason ? reason.toString() : "normal closure",
      });
    });

    ws.on("error", (err) => {
      safeLog("error", "WebSocket error", {
        client_ip: clientIp,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  });

  return wss;
}

// --- HTTP handler ------------------------------------------------------------

function createHttpServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const path = url.pathname;

    safeLog("debug", "HTTP request received", {
      client_ip: req.socket.remoteAddress ?? "unknown",
      method: req.method,
      path,
    });

    if (req.method === "GET" && path === HEALTH_ROUTE) {
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ status: "ok", service: "hermes-phone-gateway" }));
      return;
    }

    if (req.method === "GET" && path === WS_ROUTE) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("WebSocket upgrade is handled by the socket server");
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not_found", message: "Route not found" }));
  });

  return server;
}

// --- Main --------------------------------------------------------------------

async function main(): Promise<void> {
  const ariConfigured = Boolean(ARI_USERNAME && ARI_PASSWORD);
  if (ariConfigured) {
    try {
      const ok = await ariClient.ping();
      safeLog("info", `ARI ping ${ok ? "succeeded" : "failed"}`, { base_url: ARI_BASE_URL });
    } catch (err) {
      safeLog("warn", "ARI ping failed", { error: err instanceof Error ? err.message : String(err) });
    }
  } else {
    safeLog("warn", "ARI credentials not configured; call.dial/call.hangup will return errors");
  }

  const server = createHttpServer();
  const wss = createWebSocketServer(server);

  server.listen(PORT, HOST, () => {
    safeLog("info", "Hermes Phone Gateway listening", {
      host: HOST,
      port: PORT,
      health_endpoint: `http://${HOST}:${PORT}${HEALTH_ROUTE}`,
      ws_endpoint: `ws://${HOST}:${PORT}${WS_ROUTE}`,
      public_endpoint: "https://hermesagent.conweb2.dpdns.org",
      ari_configured: ariConfigured,
    });
  });

  const shutdown = (signal: string) => {
    safeLog("info", `Received ${signal}, shutting down gracefully...`);
    for (const ws of wss.clients) {
      ws.close(1001, "Gateway shutting down");
    }
    server.close(() => {
      safeLog("info", "HTTP server closed");
      process.exit(0);
    });
    setTimeout(() => {
      safeLog("warn", "Forcing shutdown after 10s timeout");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGHUP", () => shutdown("SIGHUP"));
}

main();

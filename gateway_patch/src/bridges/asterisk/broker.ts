/**
 * @fileoverview Asterisk ARI integration broker.
 *
 * Talks to Asterisk ARI over localhost HTTP (Basic auth) and tracks channel
 * state by polling. No AMI, no media handling.
 */

import { type CallStatusPayload } from "../../types/index.js";

export type CallStateCallback = (callId: string, state: CallStatusPayload["state"]) => void;

interface AriChannel {
  id: string;
  state: string;
  name: string;
  caller?: { number?: string; name?: string };
  connected?: { number?: string; name?: string };
}

interface AriClientOptions {
  baseUrl?: string;
  username: string;
  password: string;
}

export class AsteriskAriClient {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private readonly pollTimers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly lastState = new Map<string, CallStatusPayload["state"]>();
  private onStateChange?: CallStateCallback;

  constructor(opts: AriClientOptions) {
    this.baseUrl = (opts.baseUrl || "http://127.0.0.1:8088").replace(/\/$/, "");
    this.username = opts.username;
    this.password = opts.password;
  }

  setStateChangeCallback(cb: CallStateCallback): void {
    this.onStateChange = cb;
  }

  async ping(): Promise<boolean> {
    try {
      await this.request("/ari/asterisk/info", "GET");
      return true;
    } catch {
      return false;
    }
  }

  async originate(callId: string): Promise<{ channelId: string; state: CallStatusPayload["state"] }> {
    const channel = (await this.request("/ari/channels", "POST", {
      endpoint: "PJSIP/3264",
      app: "hermes-call",
      appArgs: callId,
      callerId: "Hermes Call",
    })) as AriChannel;

    const state = this.mapChannelState(channel.state);
    this.startPolling(callId, channel.id);
    return { channelId: channel.id, state };
  }

  async hangup(channelId: string): Promise<void> {
    this.stopPolling(channelId);
    try {
      await this.request(`/ari/channels/${encodeURIComponent(channelId)}`, "DELETE");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("404")) {
        return;
      }
      throw err;
    }
  }

  private async request(
    path: string,
    method: "GET" | "POST" | "DELETE",
    query: Record<string, string> = {},
    body?: unknown,
  ): Promise<unknown> {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }

    const auth = Buffer.from(`${this.username}:${this.password}`).toString("base64");
    const headers: Record<string, string> = {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ARI ${method} ${path} returned ${response.status}: ${text}`);
    }

    if (response.status === 204) {
      return undefined;
    }

    return response.json();
  }

  private startPolling(callId: string, channelId: string): void {
    this.stopPolling(channelId);

    const poll = async (): Promise<void> => {
      try {
        const channel = (await this.request(
          `/ari/channels/${encodeURIComponent(channelId)}`,
          "GET",
        )) as AriChannel;

        const state = this.mapChannelState(channel.state);
        this.emit(callId, state);

        if (state === "completed" || state === "failed") {
          this.stopPolling(channelId);
        }
      } catch (err) {
        this.emit(callId, "completed");
        this.stopPolling(channelId);
      }
    };

    // Poll immediately and then every 800ms.
    void poll();
    const timer = setInterval(() => void poll(), 800);
    this.pollTimers.set(channelId, timer);
  }

  private stopPolling(channelId: string): void {
    const timer = this.pollTimers.get(channelId);
    if (timer) {
      clearInterval(timer);
      this.pollTimers.delete(channelId);
    }
  }

  private emit(callId: string, state: CallStatusPayload["state"]): void {
    if (this.lastState.get(callId) === state) return;
    this.lastState.set(callId, state);
    this.onStateChange?.(callId, state);
  }

  private mapChannelState(state: string): CallStatusPayload["state"] {
    switch (state.toLowerCase()) {
      case "down":
        return "dialing";
      case "ring":
      case "ringing":
        return "ringing";
      case "up":
        return "active";
      case "busy":
        return "failed";
      case "congestion":
      case "unallocated":
      case "hangup":
        return "completed";
      default:
        return "dialing";
    }
  }
}

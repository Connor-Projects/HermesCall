/**
 * Lightweight, redacting logger.
 *
 * Rules:
 *  - Never log credentials, tokens, secrets, PINs, or SIP passwords.
 *  - Keep logs useful for debugging UI state and gateway events.
 *  - Redaction is applied before anything reaches the console.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const DEFAULT_LEVEL: LogLevel = 'info';

// Redact values that follow common credential-like keys. This is defense in
// depth; the real rule is "never put secrets in log messages".
const REDACT_KEYS = [
  'password',
  'secret',
  'token',
  'pin',
  'apikey',
  'api_key',
  'sip_secret',
  'authorization',
  'deviceToken',
  'refreshToken',
  'accessToken',
];

const redactPattern = new RegExp(
  `\\b(${REDACT_KEYS.join('|')})\\s*[:=]\\s*[^\\s&,"}\\]]+`,
  'gi',
);

function sanitize(message: string): string {
  return message.replace(redactPattern, (_match, key) => `${key}=<redacted>`);
}

class Logger {
  private level: LogLevel;

  constructor() {
    const env = process.env?.EXPO_PUBLIC_LOG_LEVEL;
    this.level = (env as LogLevel) || DEFAULT_LEVEL;
  }

  private log(level: LogLevel, ...args: unknown[]): void {
    if (LEVELS[level] < LEVELS[this.level]) return;

    const prefix = `[HermesCall][${level.toUpperCase()}]`;
    const formatted = args.map((arg) => {
      if (typeof arg === 'string') return sanitize(arg);
      try {
        return sanitize(JSON.stringify(arg));
      } catch {
        return '<unserializable>';
      }
    });

    console[level](prefix, ...formatted);
  }

  debug(...args: unknown[]): void {
    this.log('debug', ...args);
  }

  info(...args: unknown[]): void {
    this.log('info', ...args);
  }

  warn(...args: unknown[]): void {
    this.log('warn', ...args);
  }

  error(...args: unknown[]): void {
    this.log('error', ...args);
  }
}

export const logger = new Logger();

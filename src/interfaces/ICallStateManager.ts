import type { CallState } from '../types';

/**
 * Abstraction for the local call state machine.
 *
 * The state manager owns the UI-visible lifecycle of a call and delegates
 * actual media/signaling to the gateway connection. Incoming calls will be
 * injected by the gateway connection in a later milestone.
 */
export interface ICallStateManager {
  /** Current immutable snapshot of the call state. */
  getState(): CallState;

  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: (state: CallState) => void): () => void;

  /** Place an outgoing call to the given number/extension. */
  dial(number: string): Promise<void>;

  /** Answer an incoming call. */
  answer(): Promise<void>;

  /** End the current call. */
  hangUp(): Promise<void>;
}

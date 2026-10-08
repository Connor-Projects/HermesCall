import { useEffect, useState } from 'react';
import type { ICallStateManager } from '../interfaces';
import type { CallState } from '../types';

/**
 * React hook that subscribes to the call state manager.
 */
export function useCallState(manager: ICallStateManager): CallState {
  const [state, setState] = useState<CallState>(() => manager.getState());

  useEffect(() => {
    return manager.subscribe((newState) => setState(newState));
  }, [manager]);

  return state;
}

import type { ICallStateManager, IGatewayConnection } from '../../interfaces';
import type { CallState, CallStatus } from '../../types';
import { logger } from '../../utils/logger';

const IDLE_STATE: CallState = {
  status: 'idle',
  remoteNumber: '',
  direction: null,
  startTime: null,
  endTime: null,
  isMock: false,
};

/**
 * Local call state manager.
 *
 * In this milestone all calls are local mock calls. The state manager sends
 * signaling messages to the injected gateway connection, but the mock
 * connection does not forward them. The lifecycle is intentionally simple so
 * the UI can be exercised without touching Asterisk.
 */
export class LocalCallStateManager implements ICallStateManager {
  private state: CallState = { ...IDLE_STATE };
  private listeners = new Set<(state: CallState) => void>();
  private mockTimer: number | null = null;

  private readonly gateway: IGatewayConnection;

  constructor(gateway: IGatewayConnection) {
    this.gateway = gateway;
  }

  getState(): CallState {
    return { ...this.state };
  }

  subscribe(listener: (state: CallState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(partial: Partial<CallState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => listener(this.getState()));
  }

  async dial(number: string): Promise<void> {
    if (this.state.status !== 'idle') {
      logger.warn('Cannot dial while another call is active');
      return;
    }

    if (!number) {
      logger.warn('Cannot dial empty number');
      return;
    }

    logger.info('Starting local mock call to:', number);

    this.setState({
      status: 'dialing',
      remoteNumber: number,
      direction: 'outgoing',
      startTime: null,
      endTime: null,
      error: undefined,
      isMock: true,
    });

    await this.gateway.send({
      type: 'call.invite',
      payload: { destination: number, extension: '1001' },
    });

    // Mock progression for UI testing only.
    this.scheduleStatusChange('ringing', 800);
    this.scheduleStatusChange('active', 2200);
  }

  async answer(): Promise<void> {
    if (this.state.status !== 'ringing') {
      logger.warn('Cannot answer a call that is not ringing');
      return;
    }

    logger.info('Answering local mock call');
    this.clearMockTimer();
    this.setState({ status: 'active', startTime: new Date(), isMock: true });
  }

  async hangUp(): Promise<void> {
    if (this.state.status === 'idle' || this.state.status === 'ended') {
      return;
    }

    logger.info('Hanging up local mock call');
    this.clearMockTimer();

    this.setState({ status: 'ending' });

    await this.gateway.send({
      type: 'call.hangup',
      payload: { callId: 'mock-call-id' },
    });

    this.setState({
      status: 'ended',
      endTime: new Date(),
    });

    // Return to idle after a short delay so the UI can show the ended state.
    this.mockTimer = setTimeout(() => {
      this.setState({ ...IDLE_STATE });
    }, 1500);
  }

  private scheduleStatusChange(status: CallStatus, delay: number): void {
    this.clearMockTimer();
    this.mockTimer = setTimeout(() => {
      this.setState({ status, startTime: status === 'active' ? new Date() : this.state.startTime });
    }, delay);
  }

  private clearMockTimer(): void {
    if (this.mockTimer) {
      clearTimeout(this.mockTimer);
      this.mockTimer = null;
    }
  }
}

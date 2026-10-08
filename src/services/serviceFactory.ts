import type {
  IAuthService,
  ICallAuthorizationService,
  ICallStateManager,
  IDevicePairingService,
  IGatewayConnection,
} from '../interfaces';
import { LocalCallStateManager } from './local/LocalCallStateManager';
import { MockAuthService } from './mock/MockAuthService';
import { MockCallAuthorizationService } from './mock/MockCallAuthorizationService';
import { MockDevicePairingService } from './mock/MockDevicePairingService';
import { MockGatewayConnection } from './mock/MockGatewayConnection';

import { HermesGatewayConnection } from './real/HermesGatewayConnection';

/**
 * Central factory for service instances.
 *
 * The gateway connection is now the live WSS implementation. Auth, pairing, and
 * call-authorization services remain mocked until the gateway exposes those
 * endpoints; swapping them later will not require UI changes.
 */

const useMockGateway = process.env.EXPO_PUBLIC_HERMES_GATEWAY_USE_MOCK === 'true';

const gatewayConnection: IGatewayConnection = useMockGateway
  ? new MockGatewayConnection()
  : new HermesGatewayConnection();
const authService: IAuthService = new MockAuthService();
const pairingService: IDevicePairingService = new MockDevicePairingService();
const callAuthorizationService: ICallAuthorizationService =
  new MockCallAuthorizationService();
const callStateManager: ICallStateManager = new LocalCallStateManager(
  gatewayConnection,
);

export const services = {
  gatewayConnection,
  authService,
  pairingService,
  callAuthorizationService,
  callStateManager,
} as const;

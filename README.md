# Hermes Call

A secure, modular React Native phone client for the Hermes Phone Gateway. The
app is the only Internet-facing client component; it never connects directly to
Asterisk.

```
Phone app (Hermes Call)
    ↓ HTTPS/WSS
Hermes Phone Gateway  ← public-facing only
    ↓ local/private interface
Asterisk @ 192.168.3.146
    ↓
SIP/RTP
```

## Status

v0.1.0 — foundation milestone. The UI is functional, but all network and
Asterisk integration is mocked or explicitly unimplemented.

## Platform choice

- **Framework:** React Native with **Expo SDK 57** and **Expo Router**.
- **Target:** Android (and iOS) native app.
- **Why:** The previous web prototype is replaced by a real native app so it can
  eventually run as a phone dialer, handle push notifications, and store the
  device token in the OS keychain. Node.js/npm + Expo were already available and
  avoid managing raw Android/iOS projects by hand.

## Security notes

- No SIP, AMI, ARI, or RTP credentials live in the client.
- Telegram bot tokens, SIP secrets, and gateway signing keys are server-side
  only.
- Client configuration is supplied through `EXPO_PUBLIC_*` environment
  variables; secrets are never committed (see `.env.example`).
- The logger redacts values that follow credential-like keys.
- Call PINs are never stored or validated locally; that will happen on the
  gateway.

## Project structure

```text
HermesCall/
├── .env.example                 # Client config template (no secrets)
├── .gitignore
├── app.json                     # Expo manifest
├── eslint.config.js
├── package.json
├── README.md
├── tsconfig.json
└── src/
    ├── app/
    │   ├── _layout.tsx          # Expo Router root layout
    │   └── index.tsx            # Main phone screen
    ├── types/
    │   ├── index.ts             # Domain types + gateway message shapes
    │   └── env.d.ts             # EXPO_PUBLIC_* type declarations
    ├── interfaces/              # Stable contracts (DI boundaries)
    │   ├── IAuthService.ts
    │   ├── IDevicePairingService.ts
    │   ├── ICallAuthorizationService.ts
    │   ├── IGatewayConnection.ts
    │   ├── ICallStateManager.ts
    │   └── IAsteriskIntegration.ts
    ├── services/
    │   ├── serviceFactory.ts    # Wires implementations
    │   ├── mock/                # Mock services for UI development
    │   │   ├── MockAuthService.ts
    │   │   ├── MockDevicePairingService.ts
    │   │   ├── MockCallAuthorizationService.ts
    │   │   └── MockGatewayConnection.ts
    │   ├── local/
    │   │   └── LocalCallStateManager.ts
    │   └── UnimplementedAsteriskIntegration.ts
    ├── components/
    │   ├── StatusBar.tsx
    │   ├── DialPad.tsx
    │   ├── CallControls.tsx
    │   ├── PairingPanel.tsx
    │   └── SettingsPanel.tsx
    ├── hooks/
    │   └── useCallState.ts
    └── utils/
        ├── logger.ts            # Redacting logger
        └── randomId.ts          # RN-safe ID generator
```

## What is implemented vs. mocked

Implemented:
- Native phone UI with dial pad, call/hang-up, call status, and tab navigation.
- Local call state machine (`idle → dialing → ringing → active → ended`).
- Pairing UI flow (request code, enter code, pair/unpair).
- Call-authorization toggle and PIN input UI.
- Settings UI for mock sign-in/out.
- Redacting logger.
- TypeScript interfaces for every major boundary.

Mocked (clearly marked in UI/logs):
- `MockAuthService` — accepts any non-empty credentials, returns fake tokens.
- `MockDevicePairingService` — generates a local 6-digit code, returns a fake
  device token/extension 1001.
- `MockCallAuthorizationService` — accepts any 4+ digit PIN locally.
- `MockGatewayConnection` — fakes connection status; `send()` logs and discards
  messages.
- `LocalCallStateManager` — progresses a mock call locally for UI testing; no
  real audio or Asterisk involvement.

Unimplemented (explicit stubs):
- `UnimplementedAsteriskIntegration` — the app must never call Asterisk
  directly. This interface belongs on the Hermes Phone Gateway.

## Commands

```powershell
cd G:/Dev/HermesCall

# Install dependencies
npm install

# Type-check
npm run typecheck

# Lint
npx eslint .

# Start the Expo dev server
npx expo start

# Run on a connected Android device/emulator
npx expo run:android

# Run on web (for quick UI smoke tests)
npx expo start --web
```

## Building an Android APK

For a debug APK during development:

```powershell
npx expo prebuild --platform android
cd android
.\gradlew assembleDebug
```

The unsigned debug APK will be at
`android/app/build/outputs/apk/debug/app-debug.apk`.

For a signed release APK, configure `android.signingConfig` in
`android/app/build.gradle` (or use EAS Build) and run:

```powershell
.\gradlew assembleRelease
```

## Next steps (awaiting instructions)

1. Build the Hermes Phone Gateway (public HTTPS/WSS server) that authenticates
   the device token, bridges to Asterisk on the private interface, and sends
   pairing codes via Telegram.
2. Replace the mock services in `src/services/serviceFactory.ts` with real
   gateway clients (WSS + secure token storage).
3. Add WebRTC media handling through the gateway.
4. Keep Asterisk ports (5060/5061, 5038, 8088, RTP 10000-20000) private.

declare namespace NodeJS {
  interface ProcessEnv {
    readonly EXPO_PUBLIC_HERMES_GATEWAY_URL?: string;
    readonly EXPO_PUBLIC_HERMES_GATEWAY_USE_MOCK?: string;
    readonly EXPO_PUBLIC_LOG_LEVEL?: string;
  }
}

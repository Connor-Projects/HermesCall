import { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CallControls } from '../components/CallControls';
import { DialPad } from '../components/DialPad';
import { PairingPanel } from '../components/PairingPanel';
import { SettingsPanel } from '../components/SettingsPanel';
import { StatusBar as AppStatusBar } from '../components/StatusBar';
import { useCallState } from '../hooks/useCallState';
import { services } from '../services/serviceFactory';
import { logger } from '../utils/logger';
import type { DeviceIdentity } from '../types';

type Tab = 'phone' | 'pairing' | 'settings';

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>('phone');
  const [number, setNumber] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState(
    services.gatewayConnection.status,
  );
  const [pairedDevice, setPairedDevice] = useState<DeviceIdentity | null>(
    () => services.pairingService.getPairedDevice(),
  );
  const [authenticated, setAuthenticated] = useState(() =>
    services.authService.isAuthenticated(),
  );

  const callState = useCallState(services.callStateManager);

  useEffect(() => {
    services.gatewayConnection
      .connect()
      .then(() => {
        setConnectionStatus(services.gatewayConnection.status);
      })
      .catch((err: Error) => {
        logger.error('Gateway connect failed:', err.message);
        setConnectionStatus(services.gatewayConnection.status);
      });
  }, []);

  const handleDigit = (digit: string) => {
    setNumber((prev) => prev + digit);
    setPinError(null);
  };

  const handleDelete = () => {
    setNumber((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setNumber('');
    setPinError(null);
  };

  const handleCall = async () => {
    if (services.callAuthorizationService.isAuthorizationRequired()) {
      setPinError(null);
      const result = await services.callAuthorizationService.authorize(pin);
      if (!result.authorized) {
        setPinError(result.reason ?? 'Authorization failed');
        logger.warn('Call authorization denied:', result.reason);
        return;
      }
    }

    logger.info('Placing call to:', number);
    await services.callStateManager.dial(number);
  };

  const handleHangUp = async () => {
    await services.callStateManager.hangUp();
  };

  const toggleConnection = async () => {
    try {
      if (services.gatewayConnection.status === 'connected') {
        await services.gatewayConnection.disconnect();
      } else {
        await services.gatewayConnection.connect();
      }
    } catch (err) {
      logger.error('Gateway toggle failed:', err instanceof Error ? err.message : String(err));
    }
    setConnectionStatus(services.gatewayConnection.status);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <AppStatusBar
        connectionStatus={connectionStatus}
        pairedDevice={pairedDevice}
        authenticated={authenticated}
      />

      <View style={styles.tabs}>
        {(['phone', 'pairing', 'settings'] as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.mainContent}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'phone' && (
          <View style={styles.phonePanel}>
            <Pressable
              style={styles.connectionButton}
              onPress={toggleConnection}
            >
              <Text style={styles.connectionButtonText}>
                {connectionStatus === 'connected'
                  ? 'Disconnect Hermes Gateway'
                  : 'Connect Hermes Gateway'}
              </Text>
            </Pressable>

            {services.callAuthorizationService.isAuthorizationRequired() && (
              <View>
                <TextInput
                  style={styles.pinInput}
                  value={pin}
                  onChangeText={(text) => {
                    setPin(text);
                    setPinError(null);
                  }}
                  placeholder="Call PIN"
                  placeholderTextColor="#5f6368"
                  keyboardType="number-pad"
                  maxLength={8}
                  secureTextEntry
                />
                {pinError && <Text style={styles.error}>{pinError}</Text>}
              </View>
            )}

            <DialPad
              number={number}
              onDigit={handleDigit}
              onDelete={handleDelete}
              onClear={handleClear}
            />
            <CallControls
              state={callState}
              onCall={handleCall}
              onHangUp={handleHangUp}
            />
          </View>
        )}

        {activeTab === 'pairing' && (
          <PairingPanel
            pairingService={services.pairingService}
            onPaired={setPairedDevice}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel
            authService={services.authService}
            callAuthorizationService={services.callAuthorizationService}
            onAuthenticatedChange={setAuthenticated}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Hermes Call v0.1.0 — {connectionStatus === 'connected'
            ? 'Hermes Phone Gateway connected'
            : 'Hermes Phone Gateway disconnected'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1115',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#181b21',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#8ab4f8',
  },
  tabText: {
    color: '#9aa0a6',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#8ab4f8',
  },
  main: {
    flex: 1,
  },
  mainContent: {
    padding: 16,
    gap: 16,
  },
  phonePanel: {
    gap: 16,
  },
  connectionButton: {
    backgroundColor: '#22262e',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  connectionButtonText: {
    color: '#e8eaed',
  },
  pinInput: {
    backgroundColor: '#22262e',
    color: '#e8eaed',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  error: {
    color: '#f28b82',
    marginTop: 6,
  },
  footer: {
    padding: 12,
    backgroundColor: '#181b21',
    borderTopWidth: 1,
    borderTopColor: '#22262e',
  },
  footerText: {
    color: '#9aa0a6',
    fontSize: 12,
    textAlign: 'center',
  },
});

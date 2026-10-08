import { View, Text, StyleSheet } from 'react-native';
import type { ConnectionStatus } from '../interfaces';
import type { DeviceIdentity } from '../types';

interface StatusBarProps {
  connectionStatus: ConnectionStatus;
  pairedDevice: DeviceIdentity | null;
  authenticated: boolean;
}

export function StatusBar({
  connectionStatus,
  pairedDevice,
  authenticated,
}: StatusBarProps) {
  const extension = pairedDevice?.extension ?? '—';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.dot, styles[connectionStatus]]} />
        <Text style={styles.status}>{connectionStatus}</Text>
      </View>
      <Text style={styles.account}>
        {authenticated ? 'Signed in' : 'Not signed in'} • Extension: {extension}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#181b21',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  disconnected: { backgroundColor: '#f28b82' },
  connecting: { backgroundColor: '#fdd663' },
  connected: { backgroundColor: '#81c995' },
  status: {
    color: '#e8eaed',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  account: {
    color: '#9aa0a6',
    marginTop: 4,
  },
});

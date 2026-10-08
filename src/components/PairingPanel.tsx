import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import type { IDevicePairingService } from '../interfaces';
import type { DeviceIdentity } from '../types';
import { logger } from '../utils/logger';

interface PairingPanelProps {
  pairingService: IDevicePairingService;
  onPaired: (device: DeviceIdentity | null) => void;
}

export function PairingPanel({ pairingService, onPaired }: PairingPanelProps) {
  const [code, setCode] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairedDevice, setPairedDevice] = useState<DeviceIdentity | null>(
    () => pairingService.getPairedDevice(),
  );
  const [error, setError] = useState<string | null>(null);

  const requestCode = async () => {
    setError(null);
    try {
      const pc = await pairingService.requestPairingCode();
      setPairingCode(pc.code);
      logger.info('Pairing code requested, expires at:', pc.expiresAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request code');
    }
  };

  const pair = async () => {
    setError(null);
    try {
      const device = await pairingService.pairWithCode(code);
      setPairedDevice(device);
      onPaired(device);
      logger.info('Paired device:', device.deviceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pairing failed');
    }
  };

  const unpair = () => {
    pairingService.unpair();
    setPairedDevice(null);
    onPaired(null);
  };

  if (pairedDevice) {
    return (
      <View style={styles.panel}>
        <Text style={styles.title}>Device paired</Text>
        <Text style={styles.text}>Extension: {pairedDevice.extension ?? '—'}</Text>
        <Text style={styles.text}>Device ID: {pairedDevice.deviceId}</Text>
        <Text style={styles.text}>
          Paired at: {new Date(pairedDevice.pairedAt).toLocaleString()}
        </Text>
        <Pressable style={styles.button} onPress={unpair}>
          <Text style={styles.buttonText}>Unpair this device</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Pair this device</Text>
      <Text style={styles.text}>
        A pairing code will be delivered through Telegram by the Hermes backend.
        In this mock version the code is generated locally.
      </Text>

      <Pressable style={styles.button} onPress={requestCode}>
        <Text style={styles.buttonText}>Request pairing code</Text>
      </Pressable>

      {pairingCode && (
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{pairingCode}</Text>
          <Text style={styles.hint}>Enter this code below</Text>
        </View>
      )}

      <View style={styles.row}>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={(text) => setCode(text.replace(/\D/g, ''))}
          placeholder="6-digit code"
          placeholderTextColor="#5f6368"
        />
        <Pressable style={styles.primaryButton} onPress={pair}>
          <Text style={styles.primaryButtonText}>Pair</Text>
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#181b21',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  title: {
    color: '#e8eaed',
    fontSize: 20,
    fontWeight: '700',
  },
  text: {
    color: '#9aa0a6',
  },
  button: {
    backgroundColor: '#22262e',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#e8eaed',
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#8ab4f8',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#041e49',
    fontSize: 16,
    fontWeight: '700',
  },
  codeBox: {
    backgroundColor: '#22262e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  codeText: {
    color: '#8ab4f8',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 8,
  },
  hint: {
    color: '#9aa0a6',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#22262e',
    color: '#e8eaed',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  error: {
    color: '#f28b82',
  },
});

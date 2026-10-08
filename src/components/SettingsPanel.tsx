import { useState } from 'react';
import { View, Text, TextInput, Pressable, Switch, StyleSheet } from 'react-native';
import type { IAuthService, ICallAuthorizationService } from '../interfaces';
import { logger } from '../utils/logger';

interface SettingsPanelProps {
  authService: IAuthService;
  callAuthorizationService: ICallAuthorizationService;
  onAuthenticatedChange: (authenticated: boolean) => void;
}

export function SettingsPanel({
  authService,
  callAuthorizationService,
  onAuthenticatedChange,
}: SettingsPanelProps) {
  const [authRequired, setAuthRequired] = useState(
    callAuthorizationService.isAuthorizationRequired(),
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [pinResult, setPinResult] = useState<string | null>(null);

  const toggleAuth = (value: boolean) => {
    callAuthorizationService.setAuthorizationRequired(value);
    setAuthRequired(value);
  };

  const testPin = async () => {
    setPinResult(null);
    const result = await callAuthorizationService.authorize(pin);
    setPinResult(
      result.authorized
        ? 'Call authorized (mock)'
        : `Not authorized: ${result.reason ?? 'unknown'}`,
    );
    if (result.authorized) {
      logger.info('Mock call authorization succeeded');
    }
  };

  const signIn = async () => {
    setAuthMessage(null);
    try {
      await authService.signIn({ username, password });
      setPassword('');
      setAuthMessage('Signed in (mock)');
      onAuthenticatedChange(true);
    } catch (err) {
      setAuthMessage(err instanceof Error ? err.message : 'Sign-in failed');
      logger.warn('Mock sign-in failed:', err);
    }
  };

  const signOut = async () => {
    setAuthMessage(null);
    await authService.signOut();
    setAuthMessage('Signed out');
    onAuthenticatedChange(false);
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        {authService.isAuthenticated() ? (
          <Pressable style={styles.button} onPress={signOut}>
            <Text style={styles.buttonText}>Sign out</Text>
          </Pressable>
        ) : (
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor="#5f6368"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#5f6368"
              secureTextEntry
            />
            <Pressable style={styles.button} onPress={signIn}>
              <Text style={styles.buttonText}>Sign in (mock)</Text>
            </Pressable>
          </View>
        )}
        {authMessage && <Text style={styles.hint}>{authMessage}</Text>}
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.text}>Require PIN before placing calls</Text>
          <Switch
            value={authRequired}
            onValueChange={toggleAuth}
            trackColor={{ false: '#3c4043', true: '#8ab4f8' }}
            thumbColor={authRequired ? '#041e49' : '#9aa0a6'}
          />
        </View>
      </View>

      {authRequired && (
        <View style={styles.section}>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={setPin}
              placeholder="Test PIN"
              placeholderTextColor="#5f6368"
              keyboardType="number-pad"
              maxLength={8}
              secureTextEntry
            />
            <Pressable style={styles.button} onPress={testPin}>
              <Text style={styles.buttonText}>Test authorization</Text>
            </Pressable>
          </View>
          {pinResult && <Text style={styles.hint}>{pinResult}</Text>}
        </View>
      )}

      <Text style={styles.hint}>
        These controls are mocked. Real authentication and PIN verification will
        happen on the Hermes Phone Gateway.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#181b21',
    borderRadius: 12,
    padding: 16,
    gap: 20,
  },
  title: {
    color: '#e8eaed',
    fontSize: 20,
    fontWeight: '700',
  },
  section: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#22262e',
    color: '#e8eaed',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  button: {
    backgroundColor: '#22262e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#e8eaed',
    fontSize: 14,
  },
  text: {
    color: '#e8eaed',
    flex: 1,
  },
  hint: {
    color: '#9aa0a6',
    fontSize: 13,
  },
});

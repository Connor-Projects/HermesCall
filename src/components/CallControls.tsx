import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { CallState } from '../types';

interface CallControlsProps {
  state: CallState;
  onCall: () => void;
  onHangUp: () => void;
}

function formatDuration(start: Date | null): string {
  if (!start) return '00:00';
  const seconds = Math.floor((Date.now() - start.getTime()) / 1000);
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export function CallControls({ state, onCall, onHangUp }: CallControlsProps) {
  const isActive =
    state.status === 'dialing' ||
    state.status === 'ringing' ||
    state.status === 'active';
  const showDuration = state.status === 'active' && state.startTime;

  return (
    <View style={styles.container}>
      <View style={styles.statusBox}>
        <Text style={styles.statusText}>
          {state.status}
          {state.remoteNumber ? ` — ${state.remoteNumber}` : ''}
        </Text>
        {showDuration && (
          <Text style={styles.duration}>{formatDuration(state.startTime)}</Text>
        )}
      </View>

      <View style={styles.row}>
        <Pressable
          style={[styles.button, styles.callButton, isActive && styles.disabled]}
          onPress={onCall}
          disabled={isActive}
        >
          <Text style={styles.callText}>Call</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.hangupButton, !isActive && styles.disabled]}
          onPress={onHangUp}
          disabled={!isActive}
        >
          <Text style={styles.hangupText}>Hang up</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  statusBox: {
    backgroundColor: '#181b21',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statusText: {
    color: '#e8eaed',
    fontSize: 18,
    textTransform: 'capitalize',
  },
  duration: {
    color: '#9aa0a6',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  callButton: {
    backgroundColor: '#81c995',
  },
  hangupButton: {
    backgroundColor: '#f28b82',
  },
  disabled: {
    opacity: 0.5,
  },
  callText: {
    color: '#052e16',
    fontSize: 18,
    fontWeight: '700',
  },
  hangupText: {
    color: '#3b0a0a',
    fontSize: 18,
    fontWeight: '700',
  },
});

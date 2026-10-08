import { View, Text, Pressable, StyleSheet } from 'react-native';

const DIGITS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];

interface DialPadProps {
  number: string;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onClear: () => void;
}

export function DialPad({ number, onDigit, onDelete, onClear }: DialPadProps) {
  return (
    <View style={styles.container}>
      <View style={styles.display}>
        <Text style={styles.displayText}>
          {number || <Text style={styles.placeholder}>Enter number</Text>}
        </Text>
      </View>

      <View style={styles.grid}>
        {DIGITS.flat().map((digit) => (
          <Pressable
            key={digit}
            style={styles.digitKey}
            onPress={() => onDigit(digit)}
          >
            <Text style={styles.digitText}>{digit}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.row}>
        <Pressable style={styles.utilityKey} onPress={onClear}>
          <Text style={styles.utilityText}>Clear</Text>
        </Pressable>
        <Pressable style={styles.utilityKey} onPress={onDelete}>
          <Text style={styles.utilityText}>⌫</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  display: {
    backgroundColor: '#181b21',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  displayText: {
    color: '#e8eaed',
    fontSize: 28,
  },
  placeholder: {
    color: '#5f6368',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  digitKey: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#181b21',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    color: '#e8eaed',
    fontSize: 28,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  utilityKey: {
    flex: 1,
    backgroundColor: '#22262e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  utilityText: {
    color: '#e8eaed',
    fontSize: 16,
  },
});

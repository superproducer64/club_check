import { View, Text, Switch, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useLearningStore } from '../../stores/useLearningStore';
import { getDb } from '../../lib/db/init';

const DELAYS = [0, 4, 8];
const STYLE_LABELS = { walking: 'Walking', push_cart: 'Push Cart', riding: 'Riding Cart' } as const;

export default function SettingsScreen() {
  const { alertMode, reminderDelaySec, playingStyle, updateSetting } = useSettingsStore();
  const resetLearning = useLearningStore((s) => s.resetLearning);

  const confirmReset = () =>
    Alert.alert(
      'Reset learned greens?',
      'Club Check will forget the green locations it has learned for every course.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await getDb().runAsync('UPDATE course_history SET saved_hole_layout = NULL');
            resetLearning();
          },
        },
      ]
    );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <Text style={styles.sectionTitle}>Reminder</Text>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Say "Club Check" out loud</Text>
        <Switch
          value={alertMode === 'voice'}
          onValueChange={(val) => updateSetting('alertMode', val ? 'voice' : 'vibration')}
        />
      </View>
      <Text style={styles.note}>
        When your phone is locked, Club Check always sends a notification with sound.
      </Text>

      <Text style={styles.rowLabelStandalone}>Delay after leaving the green</Text>
      <View style={styles.segment}>
        {DELAYS.map((d) => (
          <Pressable
            key={d}
            style={[styles.segmentItem, reminderDelaySec === d && styles.segmentItemActive]}
            onPress={() => updateSetting('reminderDelaySec', d)}
          >
            <Text style={[styles.segmentText, reminderDelaySec === d && styles.segmentTextActive]}>
              {d === 0 ? 'Right away' : `${d} sec`}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Default playing style</Text>
      <View style={styles.segment}>
        {(Object.keys(STYLE_LABELS) as (keyof typeof STYLE_LABELS)[]).map((k) => (
          <Pressable
            key={k}
            style={[styles.segmentItem, playingStyle === k && styles.segmentItemActive]}
            onPress={() => updateSetting('playingStyle', k)}
          >
            <Text style={[styles.segmentText, playingStyle === k && styles.segmentTextActive]}>{STYLE_LABELS[k]}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Learning</Text>
      <Pressable style={styles.row} onPress={confirmReset}>
        <Text style={[styles.rowLabel, { color: '#C62828' }]}>Reset learned greens</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Privacy</Text>
      <Text style={styles.note}>
        Everything Club Check records stays on this phone. No account, no cloud, no ads, no tracking.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  sectionTitle: { fontSize: 13, color: '#999', marginTop: 28, marginBottom: 8, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  rowLabel: { fontSize: 16, flexShrink: 1 },
  rowLabelStandalone: { fontSize: 16, marginTop: 20, marginBottom: 10 },
  note: { fontSize: 13, color: '#888', marginTop: 8, lineHeight: 18 },
  segment: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 12, padding: 4 },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  segmentItemActive: { backgroundColor: '#2E7D32' },
  segmentText: { fontSize: 14, fontWeight: '600', color: '#555' },
  segmentTextActive: { color: '#fff' },
});

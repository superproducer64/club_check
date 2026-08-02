import { View, Text, Switch, StyleSheet } from 'react-native';
import { useSettingsStore } from '../../stores/useSettingsStore';

export default function SettingsScreen() {
  const { alertMode, updateSetting, darkMode } = useSettingsStore();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Alerts</Text>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Voice reminders</Text>
        <Switch
          value={alertMode === 'voice'}
          onValueChange={(val) => updateSetting('alertMode', val ? 'voice' : 'vibration')}
        />
      </View>

      <Text style={styles.sectionTitle}>Display</Text>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Dark mode</Text>
        <Switch value={darkMode} onValueChange={(val) => updateSetting('darkMode', val)} />
      </View>

      {/* Reminder Delay, Reminder Distance, GPS Accuracy, Voice Selection,
          Metric/Imperial, and Reset Learning sliders/pickers from the PRD
          are not yet built — this is the minimal boot-time version */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  sectionTitle: { fontSize: 13, color: '#999', marginTop: 24, marginBottom: 8, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  rowLabel: { fontSize: 16 },
});

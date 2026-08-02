import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import * as roundsDb from '../../../lib/db/rounds';

interface HistoryRow {
  id: string;
  course_name: string;
  started_at: number;
  duration_sec: number | null;
  status: string;
}

export default function HistoryScreen() {
  const [rounds, setRounds] = useState<HistoryRow[]>([]);

  useEffect(() => {
    roundsDb.getHistory().then(setRounds);
  }, []);

  if (rounds.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No rounds played yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rounds}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.courseName}>{item.course_name}</Text>
          <Text style={styles.meta}>
            {new Date(item.started_at).toLocaleDateString()} ·{' '}
            {item.duration_sec ? `${Math.round(item.duration_sec / 60)} min` : '—'}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#999', fontSize: 15 },
  list: { padding: 24 },
  row: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  courseName: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, color: '#999', marginTop: 4 },
});

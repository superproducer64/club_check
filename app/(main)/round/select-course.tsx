import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useRoundStore } from '../../../stores/useRoundStore';
import * as roundsDb from '../../../lib/db/rounds';
import * as courseHistoryDb from '../../../lib/db/courseHistory';

// NOTE: No course database/geocoding is wired up yet — this is manual
// entry only for MVP. Recent courses list comes from course_history,
// which populates automatically as rounds get played (see courseHistory.ts).
export default function SelectCourseScreen() {
  const [courseName, setCourseName] = useState('');
  const [recentCourses, setRecentCourses] = useState<
    { course_id: string; course_name: string }[]
  >([]);
  const startRound = useRoundStore((s) => s.startRound);

  const handleStart = async (name: string, existingCourseId?: string) => {
    if (!name.trim()) return;

    const courseId = existingCourseId ?? slugify(name);
    // Playing style should come from onboarding-stored default; hardcoded
    // here as a placeholder until settings wiring for a per-round override
    // is built — flagging as a known gap, not a silent assumption
    const playingStyle: 'riding' | 'push_cart' | 'walking' = 'riding';

    startRound(courseId, name, playingStyle);

    const { activeRoundId, startedAt } = useRoundStore.getState();
    if (activeRoundId && startedAt) {
      await roundsDb.create({
        id: activeRoundId,
        courseId,
        courseName: name,
        playingStyle,
        startedAt,
      });
    }

    router.replace('/(main)/round/active');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Golf Course</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter course name"
        value={courseName}
        onChangeText={setCourseName}
      />

      <Pressable
        style={[styles.startButton, !courseName.trim() && styles.startButtonDisabled]}
        onPress={() => handleStart(courseName)}
        disabled={!courseName.trim()}
      >
        <Text style={styles.startButtonText}>Start Round</Text>
      </Pressable>

      {recentCourses.length > 0 && (
        <FlatList
          data={recentCourses}
          keyExtractor={(item) => item.course_id}
          style={styles.recentList}
          renderItem={({ item }) => (
            <Pressable
              style={styles.recentItem}
              onPress={() => handleStart(item.course_name, item.course_id)}
            >
              <Text style={styles.recentItemText}>{item.course_name}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  label: { fontSize: 14, color: '#666', marginBottom: 8, marginTop: 40 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 12, padding: 16, fontSize: 16 },
  startButton: {
    backgroundColor: '#2E7D32',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  startButtonDisabled: { opacity: 0.4 },
  startButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  recentList: { marginTop: 24 },
  recentItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  recentItemText: { fontSize: 16 },
});

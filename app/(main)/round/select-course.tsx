import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useRoundStore, type PlayingStyle } from '../../../stores/useRoundStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import * as roundsDb from '../../../lib/db/rounds';
import * as courseHistoryDb from '../../../lib/db/courseHistory';

const STYLES: { value: PlayingStyle; label: string }[] = [
  { value: 'walking', label: 'Walking' },
  { value: 'push_cart', label: 'Push Cart' },
  { value: 'riding', label: 'Riding Cart' },
];

// Courses are entered by name; Club Check learns each course's greens as you
// play it, so a course gets more accurate every round.
export default function SelectCourseScreen() {
  const [courseName, setCourseName] = useState('');
  const [recentCourses, setRecentCourses] = useState<{ course_id: string; course_name: string }[]>([]);
  const savedStyle = useSettingsStore((s) => s.playingStyle);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const [playingStyle, setPlayingStyle] = useState<PlayingStyle>(savedStyle);
  const [starting, setStarting] = useState(false);
  const startRound = useRoundStore((s) => s.startRound);

  useEffect(() => {
    courseHistoryDb.getRecentCourses(10).then(setRecentCourses).catch(() => setRecentCourses([]));
  }, []);

  const handleStart = async (name: string, existingCourseId?: string) => {
    const trimmed = name.trim();
    if (!trimmed || starting) return;
    setStarting(true);

    const courseId = existingCourseId ?? slugify(trimmed);
    updateSetting('playingStyle', playingStyle);
    startRound(courseId, trimmed, playingStyle);

    const { activeRoundId, startedAt } = useRoundStore.getState();
    if (activeRoundId && startedAt) {
      await courseHistoryDb.touchCourse(courseId, trimmed);
      await roundsDb.create({ id: activeRoundId, courseId, courseName: trimmed, playingStyle, startedAt });
    }

    router.replace('/(main)/round/active');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.label}>How are you playing today?</Text>
      <View style={styles.segment}>
        {STYLES.map((s) => (
          <Pressable
            key={s.value}
            style={[styles.segmentItem, playingStyle === s.value && styles.segmentItemActive]}
            onPress={() => setPlayingStyle(s.value)}
          >
            <Text style={[styles.segmentText, playingStyle === s.value && styles.segmentTextActive]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Golf course</Text>
      <TextInput
        style={styles.input}
        placeholder="Course name"
        value={courseName}
        onChangeText={setCourseName}
        returnKeyType="go"
        onSubmitEditing={() => handleStart(courseName)}
      />

      <Pressable
        style={[styles.startButton, (!courseName.trim() || starting) && styles.startButtonDisabled]}
        onPress={() => handleStart(courseName)}
        disabled={!courseName.trim() || starting}
      >
        <Text style={styles.startButtonText}>Start Round</Text>
      </Pressable>

      {recentCourses.length > 0 && (
        <>
          <Text style={[styles.label, { marginTop: 32 }]}>Recent courses</Text>
          <FlatList
            data={recentCourses}
            keyExtractor={(item) => item.course_id}
            renderItem={({ item }) => (
              <Pressable style={styles.recentItem} onPress={() => handleStart(item.course_name, item.course_id)}>
                <Text style={styles.recentItemText}>{item.course_name}</Text>
                <Text style={styles.recentItemGo}>Start ›</Text>
              </Pressable>
            )}
          />
        </>
      )}
    </KeyboardAvoidingView>
  );
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  label: { fontSize: 14, color: '#666', marginBottom: 8, marginTop: 16 },
  segment: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 12, padding: 4 },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  segmentItemActive: { backgroundColor: '#2E7D32' },
  segmentText: { fontSize: 14, fontWeight: '600', color: '#555' },
  segmentTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 12, padding: 16, fontSize: 16 },
  startButton: { backgroundColor: '#2E7D32', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 16 },
  startButtonDisabled: { opacity: 0.4 },
  startButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  recentItemText: { fontSize: 16 },
  recentItemGo: { fontSize: 15, color: '#2E7D32', fontWeight: '600' },
});

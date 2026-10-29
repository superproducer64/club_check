import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useRoundStore } from '../../stores/useRoundStore';

export default function HomeScreen() {
  const activeRoundId = useRoundStore((s) => s.activeRoundId);

  // A round is still in progress (app was closed mid-round): go straight back to it.
  useEffect(() => {
    if (activeRoundId) router.replace('/(main)/round/active');
  }, [activeRoundId]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Club Check</Text>
        <Text style={styles.tagline}>Never leave a club behind.</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push('/(main)/round/select-course')}
        >
          <Text style={styles.primaryButtonText}>Start Round</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => router.push('/(main)/history')}>
          <Text style={styles.secondaryButtonText}>Previous Round</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => router.push('/(main)/settings')}>
          <Text style={styles.secondaryButtonText}>Settings</Text>
        </Pressable>

        <Pressable style={styles.tertiaryButton} onPress={() => router.push('/(main)/help')}>
          <Text style={styles.tertiaryButtonText}>Help</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'space-between', backgroundColor: '#fff' },
  header: { marginTop: 80, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '700' },
  tagline: { fontSize: 15, color: '#666', marginTop: 6 },
  actions: { gap: 12, marginBottom: 40 },
  primaryButton: { backgroundColor: '#2E7D32', padding: 18, borderRadius: 16, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondaryButton: { padding: 16, borderRadius: 16, alignItems: 'center', backgroundColor: '#F0F0F0' },
  secondaryButtonText: { fontSize: 16, fontWeight: '500' },
  tertiaryButton: { padding: 12, alignItems: 'center' },
  tertiaryButtonText: { color: '#999', fontSize: 14 },
});

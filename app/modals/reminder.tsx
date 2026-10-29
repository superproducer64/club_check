import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { confirmReminder, dismissReminder, flagFalsePositive } from '../../lib/detection/roundSession';

export default function ReminderModal() {
  const { reminderId } = useLocalSearchParams<{ reminderId: string }>();
  const [responded, setResponded] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleConfirm = async () => {
    if (responded || !reminderId) return;
    setResponded(true);
    await confirmReminder(reminderId, Date.now());
    router.back();
  };

  const handleDismiss = async () => {
    if (responded || !reminderId) return;
    setResponded(true);
    await dismissReminder(reminderId);
    router.back();
  };

  const handleFalsePositive = async () => {
    if (responded || !reminderId) return;
    setResponded(true);
    await flagFalsePositive(reminderId);
    router.back();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Animated.View style={[styles.iconCircle, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.iconGlyph}>⛳</Text>
        </Animated.View>

        <Text style={styles.title}>Club Check</Text>
        <Text style={styles.subtitle}>Check your clubs before you drive away</Text>

        <Pressable
          style={({ pressed }) => [styles.confirmButton, pressed && styles.confirmButtonPressed]}
          onPress={handleConfirm}
          disabled={responded}
        >
          <Text style={styles.confirmButtonText}>All Clubs Accounted For</Text>
        </Pressable>

        <Pressable style={styles.dismissButton} onPress={handleDismiss} disabled={responded}>
          <Text style={styles.dismissButtonText}>Dismiss</Text>
        </Pressable>

        <Pressable style={styles.falsePositiveButton} onPress={handleFalsePositive} disabled={responded}>
          <Text style={styles.falsePositiveText}>This wasn't the green</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconGlyph: { fontSize: 32 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 28, textAlign: 'center' },
  confirmButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmButtonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  confirmButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  dismissButton: { paddingVertical: 12, marginBottom: 4 },
  dismissButtonText: { color: '#999', fontSize: 15 },
  falsePositiveButton: { paddingVertical: 8 },
  falsePositiveText: { color: '#BBB', fontSize: 13 },
});

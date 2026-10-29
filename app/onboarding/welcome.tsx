import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

// NOTE: This is a placeholder single-screen onboarding to get the app
// booting end-to-end. The full PRD onboarding (Playing Style, Round
// Length, permissions walkthrough) is designed but not yet built as
// separate screens — see plan notes. Wiring here just sets the
// completion flag so index.tsx routes to Home on subsequent launches.
export default function WelcomeScreen() {
  const handleContinue = () => {
    storage.set('onboardingComplete', true);
    router.replace('/(main)/home');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Club Check</Text>
      <Text style={styles.tagline}>Never leave a club behind.</Text>
      <Text style={styles.body}>
        Start a round, put your phone away, and play. When you walk or drive off a green, your
        phone says "Club Check" so you look in your bag before you go. No sensors, no tags, no
        extra hardware.
      </Text>
      <Text style={styles.small}>
        When you start your first round, Club Check will ask to use your location "Always" (your
        phone is usually locked in a pocket or bag when you leave a green) and to send
        notifications. Location is only used during rounds and never leaves your phone.
      </Text>
      <Pressable style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 34, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  tagline: { fontSize: 16, color: '#2E7D32', fontWeight: '600', textAlign: 'center', marginBottom: 20 },
  small: { fontSize: 13, color: '#888', lineHeight: 19, textAlign: 'center', marginBottom: 32 },
  body: { fontSize: 16, color: '#555', lineHeight: 24, textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: '#2E7D32', padding: 18, borderRadius: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

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
      <Text style={styles.body}>
        Club Check learns when you're leaving a green and gives you a simple reminder before the
        cart pulls away — no sensors, no tags, no extra hardware.
      </Text>
      <Pressable style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 34, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  body: { fontSize: 16, color: '#555', lineHeight: 24, textAlign: 'center', marginBottom: 40 },
  button: { backgroundColor: '#2E7D32', padding: 18, borderRadius: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

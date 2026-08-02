import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
const ONBOARDING_COMPLETE_KEY = 'onboardingComplete';

export default function Index() {
  useEffect(() => {
    const done = storage.getBoolean(ONBOARDING_COMPLETE_KEY);
    router.replace(done ? '/(main)/home' : '/onboarding/welcome');
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}

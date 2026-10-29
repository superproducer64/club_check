// Must be first: defines the background location task before anything else runs.
import '../lib/detection/backgroundLocationTask';

import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { initDatabase } from '../lib/db/init';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useRoundStore } from '../stores/useRoundStore';
import { restoreSession } from '../lib/detection/roundSession';
import {
  registerReminderCategory,
  registerNotificationResponseListener,
} from '../lib/notifications/reminderNotifications';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const hydrate = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    (async () => {
      await initDatabase();
      hydrate();
      await registerReminderCategory();
      unsubscribe = registerNotificationResponseListener();
      // A round was in progress when the app was closed: pick it back up.
      if (useRoundStore.getState().activeRoundId) {
        await restoreSession().catch((err) => console.warn('[ClubCheck] restore failed:', err));
      }
      setReady(true);
    })();

    return () => {
      unsubscribe?.();
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }}>
        <Stack.Screen name="(main)/round/select-course" options={{ headerShown: true, title: 'Start Round', headerBackTitle: 'Home' }} />
        <Stack.Screen name="(main)/history/index" options={{ headerShown: true, title: 'Previous Rounds', headerBackTitle: 'Home' }} />
        <Stack.Screen name="(main)/settings" options={{ headerShown: true, title: 'Settings', headerBackTitle: 'Back' }} />
        <Stack.Screen name="(main)/help" options={{ headerShown: true, title: 'Help', headerBackTitle: 'Home' }} />
        <Stack.Screen
          name="modals/reminder"
          options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
        />
      </Stack>
    </>
  );
}

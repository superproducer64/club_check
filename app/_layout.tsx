import { useEffect, useState } from 'react';
import { Slot } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { initDatabase } from '../lib/db/init';
import { useSettingsStore } from '../stores/useSettingsStore';
import { registerReminderCategory, registerNotificationResponseListener } from '../lib/notifications/reminderNotifications';

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
      setReady(true);
    })();

    return () => {
      unsubscribe?.();
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}

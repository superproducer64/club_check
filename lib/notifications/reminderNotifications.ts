import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

const REMINDER_CATEGORY = 'club-check-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerReminderCategory() {
  await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
    {
      identifier: 'CONFIRM_CLUBS',
      buttonTitle: 'All Clubs Accounted For',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'DISMISS',
      buttonTitle: 'Dismiss',
      options: { opensAppToForeground: false },
    },
  ]);
}

interface FireReminderNotificationParams {
  reminderId: string;
  wasAppForegrounded: boolean;
}

export async function fireReminderNotification({ reminderId }: FireReminderNotificationParams) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Club Check',
      body: 'Check your clubs before you drive away',
      categoryIdentifier: REMINDER_CATEGORY,
      data: { reminderId, type: 'club-check-reminder' },
    },
    trigger: null,
  });
}

export function registerNotificationResponseListener() {
  const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
    const { reminderId, type } = response.notification.request.content.data as {
      reminderId?: string;
      type?: string;
    };
    if (type !== 'club-check-reminder' || !reminderId) return;

    const actionId = response.actionIdentifier;

    if (actionId === 'CONFIRM_CLUBS') {
      const { confirmReminder } = await import('../detection/activeControllerRef');
      await confirmReminder(reminderId, Date.now());
      return;
    }

    if (actionId === 'DISMISS') {
      const { dismissReminder } = await import('../detection/activeControllerRef');
      await dismissReminder(reminderId);
      return;
    }

    if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      router.push({ pathname: '/modals/reminder', params: { reminderId } });
    }
  });

  return () => subscription.remove();
}

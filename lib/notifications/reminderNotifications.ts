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
      identifier: 'NOT_GREEN',
      buttonTitle: "That wasn't the green",
      options: { opensAppToForeground: false },
    },
  ]);
}

/** Ask once, up front (when a round starts), so the first reminder isn't swallowed. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return requested.granted;
}

interface FireReminderNotificationParams {
  reminderId: string;
  silent?: boolean;
}

export async function fireReminderNotification({ reminderId, silent = false }: FireReminderNotificationParams) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Club Check',
      body: 'Check your clubs before you leave the green.',
      sound: silent ? false : 'default',
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
      const { confirmReminder } = await import('../detection/roundSession');
      await confirmReminder(reminderId, Date.now());
      return;
    }

    if (actionId === 'NOT_GREEN') {
      const { flagFalsePositive } = await import('../detection/roundSession');
      await flagFalsePositive(reminderId);
      return;
    }

    if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      router.push({ pathname: '/modals/reminder', params: { reminderId } });
    }
  });

  return () => subscription.remove();
}

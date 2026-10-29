import * as TaskManager from 'expo-task-manager';
import type * as Location from 'expo-location';

/**
 * Background location task. This module must be imported at app startup
 * (app/_layout.tsx does it) so the task is defined before the OS delivers
 * locations — including when it relaunches the app in the background.
 */
export const LOCATION_TASK_NAME = 'club-check-location-tracking';

type LocationUpdateHandler = (locations: Location.LocationObject[]) => void;
let activeHandler: LocationUpdateHandler | null = null;

export function registerLocationHandler(handler: LocationUpdateHandler) {
  activeHandler = handler;
}

export function unregisterLocationHandler() {
  activeHandler = null;
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[ClubCheck] background location task error:', error.message);
    return;
  }
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  if (!locations?.length) return;

  if (!activeHandler) {
    // The app was relaunched in the background mid-round: rebuild the round
    // controller from persisted state, then hand it these locations.
    const { restoreSession } = await import('./roundSession');
    await restoreSession();
  }
  activeHandler?.(locations);
});

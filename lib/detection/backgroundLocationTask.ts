import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

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
  if (data && activeHandler) {
    const { locations } = data as { locations: Location.LocationObject[] };
    activeHandler(locations);
  }
});

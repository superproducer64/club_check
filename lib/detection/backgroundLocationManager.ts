import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { LOCATION_TASK_NAME, registerLocationHandler, unregisterLocationHandler } from './backgroundLocationTask';

export async function requestBackgroundLocationPermissions(): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return false;

  const background = await Location.requestBackgroundPermissionsAsync();
  return background.status === 'granted';
}

interface StartTrackingOptions {
  accuracy: Location.Accuracy;
  onLocations: (locations: Location.LocationObject[]) => void;
}

export async function startBackgroundTracking({ accuracy, onLocations }: StartTrackingOptions) {
  const hasStarted = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }

  registerLocationHandler(onLocations);

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy,
    timeInterval: 2000,
    distanceInterval: 3,
    activityType: Location.ActivityType.Fitness,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Club Check is watching your round',
      notificationBody: 'Monitoring for green departures',
      notificationColor: '#2E7D32',
    },
    pausesUpdatesAutomatically: false,
  });
}

export async function stopBackgroundTracking() {
  const hasStarted = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
  unregisterLocationHandler();
}

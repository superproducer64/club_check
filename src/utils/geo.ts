import { GPSCoordinate, DepartureState } from '../types';

/**
 * Calculates distance in meters between two lat/lng points using Haversine formula
 */
export function getHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert meters to Yards
 */
export function metersToYards(meters: number): number {
  return Math.round(meters * 1.09361);
}

/**
 * Convert m/s to mph
 */
export function msToMph(ms: number): number {
  return Math.round(ms * 2.23694 * 10) / 10;
}

/**
 * Calculates bearing/heading in degrees from point A to point B
 */
export function getBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export interface DepartureEvaluation {
  newState: DepartureState;
  shouldTriggerReminder: boolean;
  distanceToGreenMeters: number;
  currentSpeedMph: number;
}

/**
 * Logic evaluating whether user is entering, remaining on, or departing from green
 */
export function evaluateGreenDeparture(
  currentCoord: GPSCoordinate,
  greenLat: number,
  greenLng: number,
  currentState: DepartureState,
  dwellTimeSeconds: number,
  reminderDistanceThresholdMeters: number = 25
): DepartureEvaluation {
  const distMeters = getHaversineDistanceMeters(
    currentCoord.latitude,
    currentCoord.longitude,
    greenLat,
    greenLng
  );

  let rawSpeedMph = 0;
  if (currentCoord.speed !== null && currentCoord.speed >= 0) {
    rawSpeedMph = msToMph(currentCoord.speed);
  }

  let newState: DepartureState = currentState;
  let shouldTriggerReminder = false;

  // Green Radius Thresholds:
  // - Inner green area: < 18m
  // - Outer departure boundary: > reminderDistanceThresholdMeters (e.g. 25m)
  
  if (currentState === 'APPROACHING') {
    if (distMeters <= 20) {
      newState = 'ON_GREEN';
    }
  } else if (currentState === 'ON_GREEN') {
    // Check if moving away beyond threshold
    // Minimum dwell time on green (e.g., at least 10s spent putting/approaching)
    if (distMeters > reminderDistanceThresholdMeters && dwellTimeSeconds >= 5) {
      newState = 'DEPARTING';
      shouldTriggerReminder = true;
    }
  } else if (currentState === 'DEPARTING') {
    if (distMeters > reminderDistanceThresholdMeters + 15) {
      newState = 'CLEAR';
    }
  } else if (currentState === 'CLEAR') {
    if (distMeters <= 20) {
      newState = 'ON_GREEN';
    } else if (distMeters > 50) {
      newState = 'APPROACHING';
    }
  }

  return {
    newState,
    shouldTriggerReminder,
    distanceToGreenMeters: Math.round(distMeters),
    currentSpeedMph: rawSpeedMph,
  };
}

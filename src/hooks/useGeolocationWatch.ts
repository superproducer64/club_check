import { useEffect, useRef, useState } from 'react';
import { GPSCoordinate } from '../types';

interface UseGeolocationWatchOptions {
  enabled: boolean;
  highAccuracy?: boolean;
  onPosition: (coord: GPSCoordinate) => void;
  onError?: (err: GeolocationPositionError) => void;
}

/**
 * Wraps navigator.geolocation.watchPosition, keeping the latest callbacks in
 * refs so the watch itself only restarts when `enabled`/`highAccuracy` change.
 */
export function useGeolocationWatch({ enabled, highAccuracy = true, onPosition, onError }: UseGeolocationWatchOptions) {
  const onPositionRef = useRef(onPosition);
  const onErrorRef = useRef(onError);
  onPositionRef.current = onPosition;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!enabled || !('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        onPositionRef.current({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          timestamp: pos.timestamp,
        });
      },
      (err) => onErrorRef.current?.(err),
      { enableHighAccuracy: highAccuracy, timeout: 10000, maximumAge: 1000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled, highAccuracy]);
}

/**
 * One-shot best-effort location lookup, used to sort/search nearby courses.
 */
export function useOneShotLocation(): { lat?: number; lng?: number } {
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000 }
    );
  }, []);

  return coords;
}

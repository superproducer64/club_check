import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.clubcheck.app',
  appName: 'Club Check',
  webDir: 'dist',
  android: {
    // Required by @capacitor-community/background-geolocation to prevent
    // location updates halting after ~5 minutes in the background.
    // See: https://github.com/capacitor-community/background-geolocation/issues/89
    useLegacyBridge: true,
  },
  plugins: {
    LocalNotifications: {
      iconColor: '#10b981',
      // Uses the default system notification sound for now. To ship a custom
      // "Club Check" chime sound instead, add the audio file to
      // ios/App/App/ (as a resource, e.g. club_check_alert.wav) and
      // android/app/src/main/res/raw/club_check_alert.wav, then set
      // `sound: 'club_check_alert.wav'` here.
    },
  },
};

export default config;

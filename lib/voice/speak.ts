import * as ExpoSpeech from 'expo-speech';

interface SpeakOptions {
  voice?: string;
  volume?: number;
  toneOnly?: boolean;
}

/**
 * Wraps Expo Speech with Club Check's settings. toneOnly is a placeholder
 * for a future non-verbal audio cue (chime) rather than spoken text —
 * for MVP it still speaks, since a dedicated tone asset hasn't been
 * chosen yet. Swap the toneOnly branch for Audio.Sound playback once
 * a tone asset is picked.
 */
export async function speak(text: string, options: SpeakOptions = {}) {
  const { volume = 1.0 } = options;

  // expo-speech doesn't take a volume param directly on most platforms —
  // this is normalized here so callers don't need to know that quirk
  await ExpoSpeech.speak(text, {
    rate: 0.95,
    pitch: 1.0,
    volume,
  });
}

export function stopSpeaking() {
  ExpoSpeech.stop();
}

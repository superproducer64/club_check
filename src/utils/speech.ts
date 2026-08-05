import { VoicePhrase, AudioTone } from '../types';

/**
 * Plays a pleasant double-chime audio tone using Web Audio API
 */
export function playChimeSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    
    const ctx = new AudioCtx();
    
    // First chime note (E5 - 659Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.4);

    // Second chime note (B5 - 987.77Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, ctx.currentTime + 0.15);
    gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.65);
  } catch (err) {
    console.warn('Web Audio chime not supported or restricted', err);
  }
}

/**
 * Triggers device vibration if available
 */
export function triggerHapticVibration(): void {
  if ('vibrate' in navigator) {
    try {
      // Distinct double pulse vibration pattern for golf cart alert
      navigator.vibrate([200, 100, 300]);
    } catch {
      // Ignore if blocked by permissions
    }
  }
}

/**
 * Announces speech using Web Speech Synthesis API
 */
export function speakAlert(
  text: VoicePhrase | string,
  options: {
    volume?: number;
    pitch?: number;
    rate?: number;
    tone?: AudioTone;
    haptic?: boolean;
  } = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    const {
      volume = 1.0,
      pitch = 1.0,
      rate = 1.0,
      tone = 'standard',
      haptic = true,
    } = options;

    if (haptic) {
      triggerHapticVibration();
    }

    if (tone === 'silent') {
      resolve(true);
      return;
    }

    if (tone === 'vibrate_only') {
      resolve(true);
      return;
    }

    if (tone === 'chime_only') {
      playChimeSound();
      resolve(true);
      return;
    }

    if (tone === 'voice_and_chime') {
      playChimeSound();
    }

    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      playChimeSound();
      resolve(false);
      return;
    }

    // Cancel any previous pending speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volume;
    utterance.pitch = pitch;
    utterance.rate = rate;

    // Try to pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen'))
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      resolve(true);
    };

    utterance.onerror = (e) => {
      console.warn('Speech error', e);
      resolve(false);
    };

    window.speechSynthesis.speak(utterance);
  });
}

import { RoundController } from './roundController';
import { initDatabase } from '../db/init';
import { useRoundStore } from '../../stores/useRoundStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { isTrackingRunning } from './backgroundLocationManager';

/**
 * Owns the single RoundController for the active round. Its lifetime follows
 * the round (Start Round → End Round), not any screen, so opening the reminder
 * modal, Settings, or locking the phone never stops monitoring.
 */
let controller: RoundController | null = null;
let restoring: Promise<RoundController | null> | null = null;

export function getController() {
  return controller;
}

/** Start monitoring for the round currently in useRoundStore (foreground only). */
export async function startSession(): Promise<void> {
  const { activeRoundId, courseId, playingStyle } = useRoundStore.getState();
  if (!activeRoundId || !courseId || !playingStyle) return;

  if (controller?.id === activeRoundId) {
    // Already running for this round; make sure location updates still are too.
    if (await isTrackingRunning()) return;
    await controller.start();
    return;
  }

  controller = new RoundController({ roundId: activeRoundId, courseId, playingStyle });
  await controller.start();
}

/**
 * Rebuild the controller from persisted state without restarting location
 * updates. Safe to call repeatedly; used by the background task and on launch.
 */
export async function restoreSession(): Promise<RoundController | null> {
  if (controller) return controller;
  if (restoring) return restoring;

  restoring = (async () => {
    await initDatabase();
    useSettingsStore.getState().hydrate();
    const { activeRoundId, courseId, playingStyle } = useRoundStore.getState();
    if (!activeRoundId || !courseId || !playingStyle) return null;

    const c = new RoundController({ roundId: activeRoundId, courseId, playingStyle });
    await c.attach();
    controller = c;
    return c;
  })();

  try {
    return await restoring;
  } finally {
    restoring = null;
  }
}

export async function endSession() {
  const c = controller;
  controller = null;
  if (c) await c.stop();
}

async function withController<T>(fn: (c: RoundController) => Promise<T>): Promise<T | undefined> {
  const c = controller ?? (await restoreSession());
  return c ? fn(c) : undefined;
}

export function confirmReminder(reminderId: string, respondedAt: number) {
  return withController((c) => c.confirmReminder(reminderId, respondedAt));
}

export function dismissReminder(reminderId: string) {
  return withController((c) => c.dismissReminder(reminderId));
}

export function flagFalsePositive(reminderId: string) {
  return withController((c) => c.flagFalsePositive(reminderId));
}

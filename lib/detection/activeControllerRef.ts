import type { RoundController } from './roundController';

let activeController: RoundController | null = null;

export function setActiveController(controller: RoundController | null) {
  activeController = controller;
}

export async function confirmReminder(reminderId: string, respondedAt: number) {
  await activeController?.confirmReminder(reminderId, respondedAt);
}

export async function dismissReminder(reminderId: string) {
  await activeController?.dismissReminder(reminderId);
}

export async function flagFalsePositive(reminderId: string) {
  await activeController?.flagFalsePositive(reminderId);
}

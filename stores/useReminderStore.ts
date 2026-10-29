import * as Crypto from 'expo-crypto';
import { create } from 'zustand';

interface PendingReminder {
  id: string;
  triggeredAt: number;
  lat: number;
  lng: number;
}

interface ReminderState {
  pendingReminder: PendingReminder | null;
  lastReminderId: string | null;

  triggerReminder: (lat: number, lng: number) => string;
  confirmReminder: () => void;
  dismissReminder: () => void;
  flagFalsePositive: () => void;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  pendingReminder: null,
  lastReminderId: null,

  triggerReminder: (lat, lng) => {
    const id = Crypto.randomUUID();
    set({
      pendingReminder: { id, triggeredAt: Date.now(), lat, lng },
      lastReminderId: id,
    });
    return id;
  },

  confirmReminder: () => {
    set({ pendingReminder: null });
  },

  dismissReminder: () => {
    set({ pendingReminder: null });
  },

  flagFalsePositive: () => {
    set({ pendingReminder: null });
  },
}));

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

  triggerReminder: (id: string, lat: number, lng: number) => void;
  /** Clear the pending reminder once the golfer has responded to it. */
  resolve: (id: string) => void;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  pendingReminder: null,
  lastReminderId: null,

  triggerReminder: (id, lat, lng) =>
    set({
      pendingReminder: { id, triggeredAt: Date.now(), lat, lng },
      lastReminderId: id,
    }),

  resolve: (id) => {
    if (get().pendingReminder?.id === id) set({ pendingReminder: null });
  },
}));

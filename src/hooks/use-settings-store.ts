// Preferences of this device, saved to a small JSON file so they survive an
// app restart. Reading happens once, synchronously, when the store is made.

import { create } from "zustand";
import { File, Paths } from "expo-file-system";

type Preferences = {
  soundEnabled: boolean;
};

type SettingsState = Preferences & {
  toggleSound: () => void;
};

const DEFAULTS: Preferences = { soundEnabled: true };

const file = new File(Paths.document, "preferences.json");

/** Reads saved preferences, or the defaults if nothing valid is saved. */
function load(): Preferences {
  try {
    if (!file.exists) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(file.textSync()) };
  } catch {
    return DEFAULTS;
  }
}

function save(preferences: Preferences) {
  try {
    if (!file.exists) file.create();
    file.write(JSON.stringify(preferences));
  } catch (error) {
    console.log("Could not save preferences:", error);
  }
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  ...load(),
  toggleSound: () => {
    const soundEnabled = !get().soundEnabled;
    set({ soundEnabled });
    save({ soundEnabled });
  },
}));

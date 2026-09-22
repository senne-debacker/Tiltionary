// src/hooks/use-ding-sound.ts
// Het "ding" bij een juiste gok.
//
// De speler wordt bovenaan de app aangemaakt (in de root-layout) en niet in
// het spelscherm: zodra iedereen geraden heeft wisselt dat scherm meteen, en
// expo-audio ruimt zijn speler op bij unmount — je zou het geluid dan afkappen
// voor je het hoort. Het scherm vraagt via playDing() enkel om afspelen.

import { useEffect } from "react";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import { create } from "zustand";

type SoundState = {
  play: () => void;
  setPlay: (play: () => void) => void;
};

const useSoundStore = create<SoundState>()((set) => ({
  play: () => {},
  setPlay: (play) => set({ play }),
}));

/** Speelt het ding-geluidje af (alleen voor jezelf). */
export function playDing() {
  useSoundStore.getState().play();
}

/** Eén keer aanroepen, bovenaan de app. */
export function useDingSound() {
  const player = useAudioPlayer(require("../../assets/ding.mp3"));
  const setPlay = useSoundStore((state) => state.setPlay);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch((e) =>
      console.log("Audio mode error:", e),
    );
  }, []);

  useEffect(() => {
    setPlay(() => {
      try {
        player.seekTo(0).finally(() => player.play());
      } catch (error) {
        console.log("Fout bij afspelen ding:", error);
      }
    });
  }, [player, setPlay]);
}

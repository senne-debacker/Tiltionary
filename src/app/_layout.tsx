// src/app/_layout.tsx
// De buitenste laag van de app. Hier staat alles wat mag blijven leven terwijl
// je van scherm wisselt: het geluidje en de statusbalk.
//
// Welk scherm je ziet is niet iets wat je zelf aanklikt maar wat uit je sessie
// volgt: zodra je in een kamer zit verdwijnt het startscherm en verschijnt de
// kamer. Dat regelen we met Stack.Protected in plaats van met router.push().

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useDingSound } from "@/hooks/use-ding-sound";
import { useSessionStore } from "@/hooks/use-session-store";
import { startFeedback } from "@/logic/feedback";

startFeedback();

export default function RootLayout() {
  const code = useSessionStore((state) => state.code);

  useDingSound();

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!code}>
          <Stack.Screen name="index" />
        </Stack.Protected>

        <Stack.Protected guard={!!code}>
          <Stack.Screen name="room" />
        </Stack.Protected>

        <Stack.Screen name="sandbox" />
      </Stack>
    </SafeAreaProvider>
  );
}

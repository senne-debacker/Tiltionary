// Outermost layer of the app, for everything that outlives a single screen.
//
// Which screen you see follows from your session instead of from a tap: once
// you are in a room, the home screen disappears and the room appears. That is
// handled with Stack.Protected instead of router.push().

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useSessionStore } from "@/hooks/use-session-store";
import { startFeedback } from "@/logic/feedback";

startFeedback();

export default function RootLayout() {
  const code = useSessionStore((state) => state.code);

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

// Outermost layer of the app, for everything that outlives a single screen:
// fonts, sound and the status bar.
//
// Which screen you see follows from your session instead of from a tap: once
// you are in a room, the home screen disappears and the room appears. That is
// handled with Stack.Protected instead of router.push().

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  GoogleSans_400Regular,
  GoogleSans_500Medium,
  GoogleSans_600SemiBold,
  GoogleSans_700Bold,
} from "@expo-google-fonts/google-sans";
import { GoogleSansCode_500Medium } from "@expo-google-fonts/google-sans-code";

import { useSessionStore } from "@/hooks/use-session-store";
import { startFeedback } from "@/logic/feedback";

startFeedback();

export default function RootLayout() {
  const code = useSessionStore((state) => state.code);
  const [fontsLoaded, fontError] = useFonts({
    GoogleSans_400Regular,
    GoogleSans_500Medium,
    GoogleSans_600SemiBold,
    GoogleSans_700Bold,
    GoogleSansCode_500Medium,
  });

  // Rendering before the fonts load would flash the system font. If loading
  // fails, the app still starts with the system font.
  if (!fontsLoaded && !fontError) return null;

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

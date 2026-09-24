// Route "/": the home screen, where you pick a name and create or join a room.

import { router } from "expo-router";

import LobbyScreen from "@/screens/LobbyScreen";

export default function IndexRoute() {
  return <LobbyScreen onSandbox={() => router.push("/sandbox")} />;
}

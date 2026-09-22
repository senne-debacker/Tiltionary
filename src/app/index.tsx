// src/app/index.tsx
// Startscherm (route "/"): naam kiezen, kamer maken of joinen.

import { router } from "expo-router";

import LobbyScreen from "@/screens/LobbyScreen";

export default function IndexRoute() {
  return <LobbyScreen onSandbox={() => router.push("/sandbox")} />;
}

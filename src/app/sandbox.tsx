// Route "/sandbox": free drawing outside of a room.

import { router } from "expo-router";

import SandboxScreen from "@/screens/SandboxScreen";

export default function SandboxRoute() {
  return <SandboxScreen onExit={() => router.back()} />;
}

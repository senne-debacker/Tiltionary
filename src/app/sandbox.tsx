// src/app/sandbox.tsx
// Vrij tekenen, los van een kamer.

import { router } from "expo-router";

import SandboxScreen from "@/screens/SandboxScreen";

export default function SandboxRoute() {
  return <SandboxScreen onExit={() => router.back()} />;
}

// The "leave" or "end game" button shown on every screen during a game.
// It is only the button. The confirmation comes from useLeaveRoom.

import type { StyleProp, ViewStyle } from "react-native";
import { Button } from "@/components/button";
import { useTheme } from "@/hooks/use-theme";

type LeaveButtonProps = {
  isHost: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function LeaveButton({ isHost, onPress, style }: LeaveButtonProps) {
  const theme = useTheme();

  return (
    <Button
      label={isHost ? "Stoppen" : "Verlaten"}
      icon={{ ios: "xmark", android: "close" }}
      variant="outline"
      tint={theme.redText}
      size="sm"
      onPress={onPress}
      accessibilityLabel={isHost ? "Spel beëindigen" : "Kamer verlaten"}
      style={style}
    />
  );
}

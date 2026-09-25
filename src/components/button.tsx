// Pill-shaped button in the styleboard style: a flat fill with a thin
// outline, or only an outline. Every button in the app uses it.

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SymbolView, type AndroidSymbol, type SFSymbol } from "expo-symbols";

import { ThemedText } from "@/components/themed-text";
import { ON_COLOR, spacing, stroke, type BrandColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/** An SF Symbol for iOS with its Material Symbol for Android. */
export type Icon = { ios: SFSymbol; android: AndroidSymbol };

type ButtonProps = {
  label?: string;
  onPress: () => void;
  /** Fill color. "ink" fills with the text color. Ignored for outline buttons. */
  color?: BrandColor | "ink";
  variant?: "filled" | "outline";
  size?: "sm" | "md" | "lg";
  icon?: Icon;
  /** Text and icon color for outline buttons. */
  tint?: string;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const SIZES = {
  sm: { height: 36, paddingHorizontal: spacing.md, icon: 15, text: "smallStrong" },
  md: { height: 46, paddingHorizontal: spacing.lg, icon: 17, text: "strong" },
  lg: { height: 56, paddingHorizontal: spacing.xl, icon: 19, text: "heading" },
} as const;

export function Button({
  label,
  onPress,
  color = "blue",
  variant = "filled",
  size = "md",
  icon,
  tint,
  disabled = false,
  loading = false,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const filled = variant === "filled";
  const sizing = SIZES[size];

  const background = !filled ? "transparent" : color === "ink" ? theme.text : theme[color];
  const foreground = !filled
    ? (tint ?? theme.text)
    : color === "ink"
      ? theme.background
      : ON_COLOR[color];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        styles.button,
        {
          height: sizing.height,
          paddingHorizontal: label ? sizing.paddingHorizontal : 0,
          width: label ? undefined : sizing.height,
          backgroundColor: background,
          borderColor: theme.line,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {icon && (
            <SymbolView
              name={{ ios: icon.ios, android: icon.android, web: icon.android }}
              size={sizing.icon}
              tintColor={foreground}
            />
          )}
          {!!label && (
            <ThemedText type={sizing.text} style={{ color: foreground }}>
              {label}
            </ThemedText>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: 999,
    borderWidth: stroke.regular,
  },
  pressed: { opacity: 0.8, transform: [{ translateY: 1 }] },
  disabled: { opacity: 0.35 },
});

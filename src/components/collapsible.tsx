// Dropdown that shows or hides its content under a tappable title.
// Based on the Collapsible from the course example. It animates with
// LayoutAnimation because Reanimated is not part of this app's native build.

import { useState, type PropsWithChildren } from "react";
import { LayoutAnimation, Pressable, StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { ThemedText } from "@/components/themed-text";
import { radius, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type CollapsibleProps = PropsWithChildren<{ title: string }>;

export function Collapsible({ title, children }: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen((open) => !open);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [styles.heading, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
      >
        <ThemedText themeColor="primary" style={styles.title}>
          {title}
        </ThemedText>
        <SymbolView
          name={{ ios: "chevron.down", android: "expand_more", web: "expand_more" }}
          size={14}
          weight="bold"
          tintColor={theme.primary}
          style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}
        />
      </Pressable>

      {isOpen && (
        <View style={[styles.content, { backgroundColor: theme.surfaceLight }]}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  pressed: { opacity: 0.7 },
  title: { fontSize: 15 },
  content: {
    marginTop: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
});

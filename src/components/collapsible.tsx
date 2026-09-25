// Dropdown that shows or hides its content under a tappable title.
// Based on the Collapsible from the course example. It animates with
// LayoutAnimation because Reanimated is not part of this app's native build.

import { useState, type PropsWithChildren } from "react";
import { LayoutAnimation, Pressable, StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { ThemedText } from "@/components/themed-text";
import { radius, spacing, stroke } from "@/constants/theme";
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
    <View style={[styles.card, { borderColor: theme.line, backgroundColor: theme.surface }]}>
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [styles.heading, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
      >
        <ThemedText type="strong" style={styles.title}>
          {title}
        </ThemedText>
        <View style={[styles.chevron, { borderColor: theme.line, backgroundColor: theme.yellow }]}>
          <SymbolView
            name={{ ios: "chevron.down", android: "expand_more", web: "expand_more" }}
            size={13}
            weight="bold"
            tintColor="#1F1F1F"
            style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}
          />
        </View>
      </Pressable>

      {isOpen && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", borderWidth: stroke.regular, borderRadius: radius.lg },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.7 },
  title: { flex: 1 },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: stroke.regular,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
});

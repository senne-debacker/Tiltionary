// One row in a player list: a rank badge, the name with small tags, and an
// optional score and kick button.

import { StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { Button } from "@/components/button";
import { ThemedText } from "@/components/themed-text";
import { ON_COLOR, fonts, radius, spacing, stroke, type BrandColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { Player } from "@/types/game";

/** Badge colors for the top three: first, second and third place. */
export const RANK_COLORS: BrandColor[] = ["yellow", "blue", "green"];

type PlayerRowProps = {
  player: Player;
  /** Zero-based position. The top three get a colored badge. */
  rank?: number;
  showScore?: boolean;
  /** Points this player just earned. */
  gained?: number;
  isYou?: boolean;
  isDrawer?: boolean;
  onKick?: () => void;
};

function Tag({ label, color }: { label: string; color: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tag, { borderColor: theme.line, backgroundColor: color }]}>
      <ThemedText type="code" style={styles.tagText}>
        {label}
      </ThemedText>
    </View>
  );
}

export default function PlayerRow({
  player,
  rank,
  showScore = false,
  gained,
  isYou = false,
  isDrawer = false,
  onKick,
}: PlayerRowProps) {
  const theme = useTheme();
  const rankColor = rank !== undefined ? RANK_COLORS[rank] : undefined;

  return (
    <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      {rank !== undefined && (
        <View
          style={[
            styles.badge,
            {
              borderColor: theme.line,
              backgroundColor: rankColor ? theme[rankColor] : theme.surfaceMuted,
            },
          ]}
        >
          <ThemedText
            type="smallStrong"
            style={rankColor ? { color: ON_COLOR[rankColor] } : undefined}
          >
            {rank + 1}
          </ThemedText>
        </View>
      )}

      <View style={styles.nameBlock}>
        <ThemedText type="strong" numberOfLines={1} style={styles.name}>
          {player.name}
        </ThemedText>
        {isDrawer && (
          <SymbolView
            name={{ ios: "pencil", android: "edit", web: "edit" }}
            size={15}
            tintColor={theme.text}
          />
        )}
        {player.isHost && <Tag label="host" color={theme.yellowSoft} />}
        {isYou && <Tag label="jij" color={theme.blueSoft} />}
      </View>

      {!!gained && gained > 0 && (
        <ThemedText type="smallStrong" themeColor="greenText" style={styles.gained}>
          +{gained}
        </ThemedText>
      )}
      {showScore && <ThemedText style={styles.score}>{player.score || 0}</ThemedText>}
      {!!onKick && (
        <Button
          icon={{ ios: "xmark", android: "close" }}
          variant="outline"
          tint={theme.redText}
          size="sm"
          onPress={onKick}
          accessibilityLabel={`${player.name} verwijderen`}
          style={styles.kick}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: stroke.regular,
    marginBottom: spacing.sm,
    minHeight: 56,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: stroke.regular,
    alignItems: "center",
    justifyContent: "center",
  },
  nameBlock: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { flexShrink: 1 },
  tag: {
    borderWidth: stroke.thin,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  tagText: { color: "#1F1F1F" },
  gained: { fontFamily: fonts.mono },
  score: { fontFamily: fonts.bold, fontSize: 18, minWidth: 44, textAlign: "right" },
  kick: { marginLeft: spacing.xs },
});

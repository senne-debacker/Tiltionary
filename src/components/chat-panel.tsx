// Chat list with an input row, used in the waiting room and during a turn.
// The input text lives in local state so typing never re-renders the screen.

import { useState } from "react";
import { StyleSheet, View, TextInput } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Button } from "@/components/button";
import { ThemedText } from "@/components/themed-text";
import { fonts, radius, spacing, stroke } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { StyleProp, ViewStyle } from "react-native";
import type { ChatMessageWithId } from "@/types/game";

type ChatPanelProps = {
  messages?: ChatMessageWithId[];
  onSend?: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
};

function Message({ item }: { item: ChatMessageWithId }) {
  if (item.type === "system") {
    return (
      <ThemedText
        type="code"
        themeColor={item.tone === "success" ? "greenText" : "textMuted"}
        style={styles.system}
      >
        {item.text}
      </ThemedText>
    );
  }

  return (
    <ThemedText type="small" style={styles.message}>
      <ThemedText type="smallStrong">{item.name} </ThemedText>
      {item.text}
    </ThemedText>
  );
}

function ChatPanel({
  messages = [],
  onSend,
  disabled,
  placeholder,
  style,
}: ChatPanelProps) {
  const [text, setText] = useState("");
  const theme = useTheme();

  const send = () => {
    const value = text.trim();
    if (!value || disabled) return;
    setText("");
    onSend?.(value);
  };

  return (
    <View style={[styles.container, { borderColor: theme.line }, style]}>
      {/* FlashList fills its parent with flex: 1, so the parent needs a
          fixed height. Without it the list collapses to 0px and hides
          every message. */}
      <View style={styles.list}>
        <FlashList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <Message item={item} />}
          contentContainerStyle={styles.listContent}
          maintainVisibleContentPosition={{
            autoscrollToBottomThreshold: 0.2,
            startRenderingFromBottom: true,
          }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <ThemedText type="code" themeColor="textDim">
              nog geen berichten
            </ThemedText>
          }
        />
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.surface, color: theme.text, borderColor: theme.line },
            disabled && styles.inputDisabled,
          ]}
          placeholder={placeholder || "Typ je gok..."}
          placeholderTextColor={theme.textDim}
          value={text}
          onChangeText={setText}
          onSubmitEditing={send}
          editable={!disabled}
          returnKeyType="send"
          submitBehavior="submit"
          maxLength={40}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Button
          icon={{ ios: "arrow.up", android: "arrow_upward" }}
          onPress={send}
          disabled={disabled}
          accessibilityLabel="Versturen"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderTopWidth: stroke.regular },
  list: { height: 132 },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  message: { marginBottom: spacing.xs },
  system: { marginBottom: spacing.sm },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    height: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: stroke.regular,
    fontFamily: fonts.medium,
    fontSize: 16,
    // iOS spaces out placeholder letters in a custom font unless this is set.
    letterSpacing: 0,
  },
  inputDisabled: { opacity: 0.45 },
});

export default ChatPanel;

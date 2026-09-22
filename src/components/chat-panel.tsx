// src/components/chat-panel.tsx
// Houdt de tekst van het invoerveld in eigen state, zodat typen het spelscherm
// niet laat hertekenen. Onnodig hertekenen tijdens het tekenen (~60x per
// seconde) wordt door de React Compiler afgevangen.

import React, { useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { SymbolView } from "expo-symbols";
import { radius, spacing } from "@/constants/theme";
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
  const theme = useTheme();

  if (item.type === "system") {
    return (
      <Text
        style={[
          styles.system,
          { color: item.tone === "success" ? theme.success : theme.warning },
          item.tone === "success" && styles.systemSuccess,
        ]}
      >
        {item.text}
      </Text>
    );
  }

  return (
    <Text style={[styles.message, { color: theme.text }]}>
      <Text style={[styles.author, { color: theme.textMuted }]}>
        {item.name}:{" "}
      </Text>
      {item.text}
    </Text>
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
  const listRef = useRef<FlashListRef<ChatMessageWithId>>(null);
  const theme = useTheme();

  const send = () => {
    const value = text.trim();
    if (!value || disabled) return;
    setText("");
    onSend?.(value);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }, style]}>
      <FlashList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Message item={item} />}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: true })
        }
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.textDim }]}>
            Typ hier je gok...
          </Text>
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.surfaceLighter, color: theme.text },
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
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: disabled ? theme.border : theme.primary },
          ]}
          onPress={send}
          disabled={disabled}
        >
          <SymbolView
            name={{ ios: "paperplane.fill", android: "send", web: "send" }}
            tintColor="#FFFFFF"
            size={20}
            fallback={<Text style={styles.buttonText}>➤</Text>}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  list: { maxHeight: 150 },
  listContent: { padding: spacing.md, paddingBottom: spacing.xs },
  empty: { fontStyle: "italic", fontSize: 13 },
  message: { fontSize: 14, marginBottom: spacing.xs },
  author: { fontWeight: "bold" },
  system: { fontSize: 14, fontStyle: "italic", marginBottom: spacing.xs },
  systemSuccess: { fontWeight: "bold" },
  inputRow: { flexDirection: "row", padding: spacing.md, paddingTop: spacing.xs },
  input: {
    flex: 1,
    paddingHorizontal: spacing.lg - 1,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    marginRight: spacing.sm + 2,
    fontSize: 16,
  },
  inputDisabled: { opacity: 0.4 },
  button: {
    paddingHorizontal: spacing.lg + 2,
    borderRadius: radius.sm,
    justifyContent: "center",
  },
  buttonText: { fontSize: 18, fontWeight: "bold", color: "#FFFFFF" },
});

export default ChatPanel;

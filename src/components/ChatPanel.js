// src/components/ChatPanel.js
// Eigen state voor het invoerveld, en React.memo eromheen: tijdens het tekenen
// rendert het spelscherm ~60x per seconde, en de chat hoeft dan niets te doen.

import React, { useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { colors, radius } from "../theme";

function Message({ item }) {
  if (item.type === "system") {
    return (
      <Text
        style={[
          styles.system,
          item.tone === "success" && styles.systemSuccess,
        ]}
      >
        {item.text}
      </Text>
    );
  }

  return (
    <Text style={styles.message}>
      <Text style={styles.author}>{item.name}: </Text>
      {item.text}
    </Text>
  );
}

function ChatPanel({ messages = [], onSend, disabled, placeholder, style }) {
  const [text, setText] = useState("");
  const listRef = useRef(null);

  const send = () => {
    const value = text.trim();
    if (!value || disabled) return;
    setText("");
    onSend?.(value);
  };

  return (
    <View style={[styles.container, style]}>
      <FlatList
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
          <Text style={styles.empty}>Typ hier je gok...</Text>
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, disabled && styles.inputDisabled]}
          placeholder={placeholder || "Typ je gok..."}
          placeholderTextColor={colors.textDim}
          value={text}
          onChangeText={setText}
          onSubmitEditing={send}
          editable={!disabled}
          returnKeyType="send"
          blurOnSubmit={false}
          maxLength={40}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.button, disabled && styles.buttonDisabled]}
          onPress={send}
          disabled={disabled}
        >
          <Text style={styles.buttonText}>➤</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface },
  list: { maxHeight: 150 },
  listContent: { padding: 12, paddingBottom: 4 },
  empty: { color: colors.textDim, fontStyle: "italic", fontSize: 13 },
  message: { color: colors.text, fontSize: 14, marginBottom: 4 },
  author: { fontWeight: "bold", color: colors.textMuted },
  system: {
    color: colors.warning,
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 4,
  },
  systemSuccess: { color: colors.success, fontWeight: "bold" },
  inputRow: { flexDirection: "row", padding: 12, paddingTop: 4 },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceLighter,
    color: colors.text,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: radius.sm,
    marginRight: 10,
    fontSize: 16,
  },
  inputDisabled: { opacity: 0.4 },
  button: {
    backgroundColor: colors.success,
    paddingHorizontal: 18,
    borderRadius: radius.sm,
    justifyContent: "center",
  },
  buttonDisabled: { backgroundColor: colors.border },
  buttonText: { color: colors.text, fontSize: 18, fontWeight: "bold" },
});

export default React.memo(ChatPanel);

import { useTheme } from "@/context/ThemeProvider";
import { clockTime } from "@/lib/format";
import { Message } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  /** Shown above the bubble for other people's messages in group capsules. */
  senderName?: string;
}

export function MessageBubble({ message, isOwn, senderName }: MessageBubbleProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, isOwn ? styles.own : styles.other]}>
      {!isOwn && senderName ? (
        <Text style={[styles.sender, { color: colors.textSecondary }]}>{senderName}</Text>
      ) : null}
      <View
        style={[
          styles.bubble,
          isOwn
            ? { backgroundColor: colors.bubbleOwn, borderBottomRightRadius: 6 }
            : { backgroundColor: colors.bubbleOther, borderBottomLeftRadius: 6 },
        ]}
      >
        <Text style={[styles.text, { color: isOwn ? colors.bubbleOwnText : colors.text }]}>
          {message.content}
        </Text>
        <View style={styles.meta}>
          <Text
            style={[
              styles.time,
              { color: isOwn ? colors.bubbleOwnText : colors.textSecondary, opacity: 0.7 },
            ]}
          >
            {clockTime(message.created_at)}
          </Text>
          {isOwn && (
            <Ionicons
              name={message.is_read ? "checkmark-done" : "checkmark"}
              size={14}
              color={colors.bubbleOwnText}
              style={{ opacity: 0.7 }}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    maxWidth: "82%",
  },
  own: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  other: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  sender: {
    fontSize: 12,
    marginBottom: 2,
    marginLeft: 6,
  },
  bubble: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  time: {
    fontSize: 12,
  },
});

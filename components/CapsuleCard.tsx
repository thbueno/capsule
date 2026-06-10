import { useTheme } from "@/context/ThemeProvider";
import { Capsule } from "@/types";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface CapsuleCardProps {
  capsule: Capsule;
  onPress: () => void;
  /** Signed URL of the capsule's latest photo, used as cover when present. */
  coverUrl?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  memories: "memories",
  ideas: "ideas",
  trips: "trips",
  checklist: "check-list",
  "tv-show": "TV show",
  event: "event",
};

/** Outlined capsule card from the capsules grid design. */
export function CapsuleCard({ capsule, onPress, coverUrl }: CapsuleCardProps) {
  const { colors } = useTheme();
  const cover = coverUrl ?? capsule.cover_url;

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {cover ? <Image source={{ uri: cover }} style={styles.cover} resizeMode="cover" /> : null}
      <View style={[styles.chip, { borderColor: colors.primary }]}>
        <Text style={[styles.chipText, { color: colors.primary }]}>
          {CATEGORY_LABELS[capsule.category] ?? capsule.category}
        </Text>
      </View>
      <Text style={[styles.title, { color: colors.title }]} numberOfLines={2}>
        {capsule.title}
      </Text>
      {capsule.description ? (
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
          {capsule.description}
        </Text>
      ) : null}
      {capsule.is_group && capsule.member_count ? (
        <Text style={[styles.members, { color: colors.textSecondary }]}>
          {capsule.member_count} member{capsule.member_count === 1 ? "" : "s"}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  cover: {
    width: "100%",
    aspectRatio: 1.1,
    borderRadius: 16,
    marginBottom: 14,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 10,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 19,
  },
  members: {
    fontSize: 12,
    marginTop: 8,
  },
});

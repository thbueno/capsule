import { PrimaryButton } from "@/components/Buttons";
import { useTheme } from "@/context/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { createCapsule, sendMessage } from "@/lib/api";
import { Capsule, CAPSULE_CATEGORIES, CapsuleCategory } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateCapsule() {
  const { colors } = useTheme();
  const { userId } = useAuth();
  const params = useLocalSearchParams<{
    friendshipId?: string;
    friendId?: string;
    friendName?: string;
    group?: string;
  }>();

  // Opened from the home nav (no friendship) → always a group capsule.
  const fromFriendship = !!params.friendshipId;
  const [isGroup, setIsGroup] = useState(!fromFriendship || params.group === "1");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CapsuleCategory>("memories");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<Capsule | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Missing title", "Give your capsule a name.");
      return;
    }
    if (!userId) return;

    setCreating(true);
    try {
      const capsule = await createCapsule({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        createdBy: userId,
        friendshipId: isGroup ? undefined : params.friendshipId,
        isGroup,
      });

      // Friendship capsules drop a card into the chat thread.
      if (!isGroup && params.friendshipId) {
        await sendMessage({
          senderId: userId,
          friendshipId: params.friendshipId,
          content: `Created the capsule "${capsule.title}"`,
          capsuleRef: capsule.id,
        });
        router.back();
        return;
      }

      // Group capsules show the invite code before continuing.
      setCreated(capsule);
    } catch (error: any) {
      console.error("Error creating capsule:", error);
      Alert.alert("Error", error.message ?? "Failed to create capsule");
    } finally {
      setCreating(false);
    }
  };

  if (created) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.successContent}>
          <Ionicons name="checkmark-circle" size={64} color={colors.activeGreen} />
          <Text style={[styles.successTitle, { color: colors.title }]}>
            “{created.title}” is ready
          </Text>
          <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
            Share this invite code — anyone with it can join and add their photos and messages.
          </Text>

          <TouchableOpacity
            style={[styles.codeBox, { borderColor: colors.primary }]}
            onPress={async () => {
              await Clipboard.setStringAsync(created.invite_code ?? "");
              Alert.alert("Copied", "Invite code copied to clipboard.");
            }}
          >
            <Text style={[styles.code, { color: colors.primary }]}>{created.invite_code}</Text>
            <Ionicons name="copy-outline" size={22} color={colors.primary} />
          </TouchableOpacity>

          <PrimaryButton
            label="Share invite"
            onPress={() =>
              Share.share({
                message: `Join my "${created.title}" capsule on Capsule! Open the app, tap "Join a capsule" and enter the code ${created.invite_code}.`,
              })
            }
            style={{ alignSelf: "stretch", marginBottom: 12 }}
          />
          <TouchableOpacity
            onPress={() => router.replace({ pathname: "/capsule", params: { id: created.id } })}
          >
            <Text style={[styles.openLink, { color: colors.textSecondary }]}>
              Open the capsule →
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={colors.title} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.title }]}>Create a Capsule</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {fromFriendship && !isGroup && params.friendName ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            A shared space with {params.friendName}
          </Text>
        ) : null}

        <Text style={[styles.label, { color: colors.textSecondary }]}>Title</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.title }]}
          placeholder="e.g. Movies for this weekend"
          placeholderTextColor={colors.textSecondary}
          value={title}
          onChangeText={setTitle}
          maxLength={50}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            { borderColor: colors.border, color: colors.title },
          ]}
          placeholder="What goes in this capsule?"
          placeholderTextColor={colors.textSecondary}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={160}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
        <View style={styles.categories}>
          {CAPSULE_CATEGORIES.map((option) => {
            const isActive = option.value === category;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.categoryChip,
                  { borderColor: isActive ? colors.primary : colors.border },
                  isActive && { backgroundColor: colors.overlayLight },
                ]}
                onPress={() => setCategory(option.value)}
              >
                <Text
                  style={{
                    color: isActive ? colors.primary : colors.textSecondary,
                    fontWeight: "500",
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {fromFriendship && (
          <View style={[styles.groupToggle, { borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.groupToggleTitle, { color: colors.title }]}>
                Group capsule
              </Text>
              <Text style={[styles.groupToggleHint, { color: colors.textSecondary }]}>
                Open it up beyond the two of you — friends join with an invite code (great for
                weddings and trips).
              </Text>
            </View>
            <Switch
              value={isGroup}
              onValueChange={setIsGroup}
              trackColor={{ true: colors.primary }}
            />
          </View>
        )}

        <PrimaryButton
          label={isGroup ? "Create group capsule" : "Create Capsule"}
          onPress={handleCreate}
          loading={creating}
          disabled={!title.trim()}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  groupToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    marginTop: 24,
  },
  groupToggleTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  groupToggleHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  successContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 28,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 2,
    borderRadius: 18,
    borderStyle: "dashed",
    paddingHorizontal: 28,
    paddingVertical: 16,
    marginBottom: 28,
  },
  code: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 5,
  },
  openLink: {
    fontSize: 15,
    fontWeight: "500",
  },
});

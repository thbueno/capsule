import { Avatar } from "@/components/Avatar";
import { BottomNav } from "@/components/BottomNav";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/context/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { fetchConversations, fetchGroupCapsules } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { Capsule, Conversation } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home() {
  const { colors } = useTheme();
  const { userId } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groups, setGroups] = useState<Capsule[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [convos, groupCapsules] = await Promise.all([
        fetchConversations(userId),
        fetchGroupCapsules(userId),
      ]);
      convos.sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
      setConversations(convos);
      setGroups(groupCapsules);
    } catch (error) {
      console.error("Error loading home:", error);
    }
  }, [userId]);

  // Refresh whenever the screen regains focus so unread counts stay current.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filtered = search.trim()
    ? conversations.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    : conversations;

  const openChat = (conversation: Conversation) => {
    router.push({
      pathname: "/chat",
      params: {
        friendshipId: conversation.friendshipId,
        friendId: conversation.profileId,
        friendName: conversation.name,
        friendAvatar: conversation.avatar ?? "",
      },
    });
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity style={styles.row} onPress={() => openChat(item)} activeOpacity={0.7}>
      <Avatar uri={item.avatar} name={item.name} size={72} />
      <View style={styles.rowContent}>
        <Text style={[styles.rowName, { color: colors.title }]}>{item.name}</Text>
        <View style={styles.statsRow}>
          <Ionicons name="image-outline" size={15} color={colors.text} />
          <Text style={[styles.statsText, { color: colors.text }]}>
            {item.momentCount} moments
          </Text>
          <Ionicons name="heart-outline" size={15} color={colors.text} style={{ marginLeft: 10 }} />
          <Text style={[styles.statsText, { color: colors.text }]}>
            {item.capsuleCount} Capsules
          </Text>
        </View>
        {item.lastMessage ? (
          <Text style={[styles.preview, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowMeta}>
        <Text style={[styles.time, { color: colors.textSecondary }]}>
          {timeAgo(item.lastMessageAt)}
        </Text>
        {item.unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.activeGreen }]}>
            <Text style={styles.badgeText}>{item.unreadCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={[styles.searchBar, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.title }]}
          />
        </View>
        <Ionicons name="heart-circle" size={40} color={colors.title} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.friendshipId}
        renderItem={renderConversation}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          groups.length > 0 ? (
            <View style={styles.groupsSection}>
              <Text style={[styles.groupsTitle, { color: colors.textSecondary }]}>
                Group capsules
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {groups.map((group) => (
                  <TouchableOpacity
                    key={group.id}
                    style={[styles.groupCard, { borderColor: colors.border }]}
                    onPress={() => router.push({ pathname: "/capsule", params: { id: group.id } })}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="people-outline" size={20} color={colors.primary} />
                    <Text style={[styles.groupTitle, { color: colors.title }]} numberOfLines={1}>
                      {group.title}
                    </Text>
                    <Text style={[styles.groupMeta, { color: colors.textSecondary }]}>
                      {timeAgo(group.last_activity_at)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No friends yet"
            subtitle="Add a friend to start sharing moments and capsules."
          />
        }
      />

      <BottomNav />
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  groupsSection: {
    marginBottom: 16,
  },
  groupsTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  groupCard: {
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 10,
    width: 150,
    gap: 4,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  groupMeta: {
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  rowContent: {
    flex: 1,
    marginLeft: 14,
  },
  rowName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 3,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  statsText: {
    fontSize: 13,
  },
  preview: {
    fontSize: 14,
  },
  rowMeta: {
    alignItems: "flex-end",
    gap: 8,
    marginLeft: 8,
  },
  time: {
    fontSize: 13,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});

import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/context/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchIncomingRequests,
  IncomingRequest,
  ProfileSearchResult,
  respondToRequest,
  searchProfiles,
  sendFriendRequest,
} from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Friends() {
  const { colors } = useTheme();
  const { userId } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [searching, setSearching] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!userId) return;
    try {
      setRequests(await fetchIncomingRequests(userId));
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  }, [userId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleSearch = async () => {
    if (!searchTerm.trim() || !userId) return;
    setSearching(true);
    try {
      const found = await searchProfiles(searchTerm.trim(), userId);
      setResults(found.filter((user) => user.friendshipStatus !== "accepted"));
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (targetId: string) => {
    if (!userId) return;
    try {
      await sendFriendRequest(userId, targetId);
      setResults((prev) =>
        prev.map((user) =>
          user.id === targetId
            ? { ...user, friendshipStatus: "pending", requestedByMe: true }
            : user
        )
      );
    } catch {
      Alert.alert("Error", "Could not send request.");
    }
  };

  const handleRespond = async (friendshipId: string, status: "accepted" | "blocked") => {
    try {
      await respondToRequest(friendshipId, status);
      setRequests((prev) => prev.filter((r) => r.friendshipId !== friendshipId));
    } catch {
      Alert.alert("Error", "Could not update request.");
    }
  };

  const actionFor = (user: ProfileSearchResult) => {
    if (user.friendshipStatus === "pending") {
      if (user.requestedByMe) {
        return (
          <View style={[styles.pillButton, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Requested</Text>
          </View>
        );
      }
      return (
        <TouchableOpacity
          style={[styles.pillButton, { backgroundColor: colors.activeGreen }]}
          onPress={() => user.friendshipId && handleRespond(user.friendshipId, "accepted")}
        >
          <Text style={styles.pillButtonText}>Accept</Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={[styles.pillButton, { backgroundColor: colors.primary }]}
        onPress={() => handleAdd(user.id)}
      >
        <Text style={styles.pillButtonText}>Add</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={colors.title} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.title }]}>Friends</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.searchBar, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search by username or handle"
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.title }]}
            autoCapitalize="none"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={handleSearch} disabled={searching}>
            <Ionicons name="arrow-forward-circle" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {results.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Search results
            </Text>
            {results.map((user) => (
              <View key={user.id} style={styles.row}>
                <Avatar uri={user.avatar_url} name={user.username} size={52} />
                <View style={styles.rowContent}>
                  <Text style={[styles.rowName, { color: colors.title }]}>{user.username}</Text>
                  {user.handle ? (
                    <Text style={[styles.rowHandle, { color: colors.textSecondary }]}>
                      @{user.handle}
                    </Text>
                  ) : null}
                </View>
                {actionFor(user)}
              </View>
            ))}
          </>
        )}

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Incoming requests
        </Text>
        {requests.length === 0 ? (
          <EmptyState
            icon="mail-open-outline"
            title="No pending requests"
            subtitle="When someone adds you, it shows up here."
          />
        ) : (
          requests.map((request) => (
            <View key={request.friendshipId} style={styles.row}>
              <Avatar
                uri={request.profile?.avatar_url}
                name={request.profile?.username ?? "?"}
                size={52}
              />
              <View style={styles.rowContent}>
                <Text style={[styles.rowName, { color: colors.title }]}>
                  {request.profile?.username}
                </Text>
                {request.profile?.handle ? (
                  <Text style={[styles.rowHandle, { color: colors.textSecondary }]}>
                    @{request.profile.handle}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={[styles.pillButton, { backgroundColor: colors.activeGreen }]}
                onPress={() => handleRespond(request.friendshipId, "accepted")}
              >
                <Text style={styles.pillButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton]}
                onPress={() => handleRespond(request.friendshipId, "blocked")}
              >
                <Ionicons name="close-circle-outline" size={28} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
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
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 50,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 24,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowName: {
    fontSize: 16,
    fontWeight: "600",
  },
  rowHandle: {
    fontSize: 13,
  },
  pillButton: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  pillButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  iconButton: {
    padding: 2,
  },
});

import { StarterCard } from "@/components/StarterCard";
import { useTheme } from '@/context/ThemeProvider';
import { supabase } from "@/lib/supabase";
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

interface Starter {
  id: string;
  text: string;
  colour: string;
  category: string;
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "memories", label: "Memories" },
  { key: "fun", label: "Fun" },
  { key: "future", label: "Future" },
  { key: "curiosity", label: "Curiosity" },
  { key: "challenges", label: "Challenges" },
  { key: "appreciation", label: "Appreciation" },
];

export default function StartConversation() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { friendshipId, friendId, friendName, returnToChat } = params;
  
  const [activeFilter, setActiveFilter] = useState("all");
  const [starters, setStarters] = useState<Starter[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchStarters(activeFilter);
    }
  }, [activeFilter, userId]);

  const getUserId = async () => {
    try {
      const { data: authData, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Auth error:", error);
        Alert.alert("Error", "Failed to authenticate user");
        return;
      }
      if (authData?.user?.id) {
        setUserId(authData.user.id);
      } else {
        Alert.alert("Error", "No authenticated user found");
        router.back();
      }
    } catch (err) {
      console.error("Error getting user:", err);
      Alert.alert("Error", "Failed to authenticate");
    }
  };

  const fetchStarters = async (filter: string) => {
    setLoading(true);
    try {
      let query = supabase.from("starters").select("*");

      if (filter !== "all") {
        query = query.eq("category", filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching starters:", error);
        Alert.alert("Error", "Failed to load conversation starters");
        return;
      }

      if (data) {
        const shuffled = data.sort(() => 0.5 - Math.random()).slice(0, 6);
        setStarters(shuffled);
      }
    } catch (err) {
      console.error("Error fetching starters:", err);
      Alert.alert("Error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleStarterSelect = async (starter: Starter) => {
    if (!userId || !friendshipId || !friendId) {
      Alert.alert("Error", "Missing required information");
      return;
    }

    if (creating) return; // Prevent double-tap

    setCreating(true);
    try {
      // First, check if a thread already exists for this starter
      const { data: existingThreads, error: threadCheckError } = await supabase
        .from('starter_threads')
        .select('id')
        .eq('starter_id', starter.id)
        .eq('friendships_id', friendshipId as string);

      if (threadCheckError) {
        console.error('Error checking existing thread:', threadCheckError);
        throw new Error('Failed to check existing conversations');
      }

      const existingThread = existingThreads && existingThreads.length > 0 ? existingThreads[0] : null;

      if (threadCheckError) {
        console.error('Error checking existing thread:', threadCheckError);
        throw new Error('Failed to check existing conversations');
      }

      let threadId: string;

      if (existingThread) {
        // Use existing thread
        threadId = existingThread.id;
        
        // Update the last_message_at timestamp
        const { error: updateError } = await supabase
          .from('starter_threads')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', threadId);

        if (updateError) {
          console.error('Error updating thread:', updateError);
          // Don't throw - this is not critical
        }
      } else {
        // Create a new thread for this starter
        const { data: newThread, error: threadError } = await supabase
          .from('starter_threads')
          .insert({
            starter_id: starter.id,
            friendships_id: friendshipId as string,
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (threadError) {
          console.error('Error creating thread:', threadError);
          throw new Error('Failed to create conversation thread');
        }

        threadId = newThread.id;
      }

      // Send the starter message to the thread
      const { error: messageError } = await supabase.from('messages').insert({
        sender_id: userId,
        recipient_id: friendId as string,
        friendships_id: friendshipId as string,
        content: starter.text,
        starter_id: starter.id,
        thread_id: threadId,
        is_read: false
      });

      if (messageError) {
        console.error('Error sending starter:', messageError);
        throw new Error('Failed to send starter message');
      }

      // Navigate back to chat
      if (returnToChat === 'true') {
        router.back();
      } else {
        router.replace({
          pathname: "/chat",
          params: { 
            friendshipId, 
            friendId, 
            friendName,
            activeThread: threadId 
          }
        });
      }
    } catch (err) {
      console.error('Error handling starter selection:', err);
      const message = err instanceof Error ? err.message : "Something went wrong";
      Alert.alert("Error", message);
    } finally {
      setCreating(false);
    }
  };

  const renderFilterPills = () => {
    return (
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const starterColor =
            f.key === "all"
              ? colors.primary
              : starters.find((s) => s.category === f.key)?.colour || colors.primary;

          const isActive = f.key === activeFilter;

          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.pill,
                {
                  backgroundColor: isActive ? starterColor : colors.backgroundSecondary,
                  borderColor: starterColor,
                  borderWidth: 1,
                },
              ]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text
                style={[
                  styles.pillText,
                  {
                    color: isActive ? "#fff" : starterColor,
                  }
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  if (!userId) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Start a Thread
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Show friend name if available */}
      {friendName && (
        <View style={styles.friendInfo}>
          <Text style={[styles.friendText, { color: colors.textSecondary }]}>
            Starting conversation with: {friendName}
          </Text>
        </View>
      )}

      {/* Info message */}
      <View style={[styles.infoBox, { backgroundColor: colors.backgroundSecondary }]}>
        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.text }]}>
          Each starter creates its own conversation thread that you can return to anytime
        </Text>
      </View>

      {/* Filter Pills */}
      {renderFilterPills()}

      {/* Starters Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={starters}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.cardWrapper}
              onPress={() => handleStarterSelect(item)}
              disabled={creating}
            >
              <StarterCard
                key={`starter-${item.id}`}
                text={item.text}
                backgroundColor={item.colour}
                onResponse={() => handleStarterSelect(item)}
              />
              {creating && (
                <View style={styles.creatingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No starters available for this category
              </Text>
              <TouchableOpacity 
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                onPress={() => fetchStarters(activeFilter)}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  friendInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  friendText: {
    fontSize: 14,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  row: {
    justifyContent: 'space-between',
  },
  cardWrapper: {
    flex: 0.48,
    marginBottom: 16,
    position: 'relative',
  },
  creatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
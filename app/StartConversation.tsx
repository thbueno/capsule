import { StarterCard } from "@/components/StarterCard";
import { useTheme } from '@/context/ThemeProvider';
import { supabase } from "@/lib/supabase";
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
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

  useEffect(() => {
    getUserId();
    fetchStarters(activeFilter);
  }, [activeFilter]);

  const getUserId = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.id) {
      setUserId(authData.user.id);
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
        return;
      }

      if (data) {
        const shuffled = data.sort(() => 0.5 - Math.random()).slice(0, 6);
        setStarters(shuffled);
      }
    } catch (err) {
      console.error("Error fetching starters:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStarterSelect = async (starter: Starter) => {
    if (!userId || !friendshipId || !friendId) {
      Alert.alert("Error", "Missing required information");
      return;
    }

    try {
      // Send the starter message to the chat
      const { error } = await supabase.from('messages').insert({
        sender_id: userId,
        recipient_id: friendId as string,
        friendships_id: friendshipId as string,
        content: starter.text,
        starter_id: starter.id, // Track that this is a starter message
      });

      if (error) {
        console.error('Error sending starter:', error);
        Alert.alert("Error", "Failed to send starter message");
        return;
      }

      // Navigate back to chat if returnToChat flag is set
      if (returnToChat === 'true') {
        router.back();
      } else {
        Alert.alert("Success", "Starter sent to chat!");
      }
    } catch (err) {
      console.error('Error handling starter selection:', err);
      Alert.alert("Error", "Something went wrong");
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
                style={{
                  color: isActive ? "#fff" : starterColor,
                  fontWeight: "600",
                }}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

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
          Choose a Starter
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Show friend name if available */}
      {friendName && (
        <View style={styles.friendInfo}>
          <Text style={[styles.friendText, { color: colors.textSecondary }]}>
            Sending to: {friendName}
          </Text>
        </View>
      )}

      {/* Filter Pills */}
      {renderFilterPills()}

      {/* Starters Grid */}
      <FlatList
        data={starters}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={() => fetchStarters(activeFilter)}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.cardWrapper}
            onPress={() => handleStarterSelect(item)}
          >
            <StarterCard
              key={`starter-${item.id}`}
              text={item.text}
              backgroundColor={item.colour}
              onResponse={() => handleStarterSelect(item)}
            />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  friendInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  friendText: {
    fontSize: 14,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardWrapper: {
    flex: 1,
    marginHorizontal: 6,
  },
});
import { StarterCard } from "@/components/StarterCard"; // adjust path if needed
import { useTheme } from '@/context/ThemeProvider';
import { supabase } from "@/lib/supabase";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
  const [activeFilter, setActiveFilter] = useState("all");
  const [starters, setStarters] = useState<Starter[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStarters(activeFilter);
  }, [activeFilter]);

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

  const renderFilterPills = () => {
    return (
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          // find db colour of first starter in that category if exists
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          <View style={styles.cardWrapper}>
            <StarterCard
              key={`starter-${item.id}`}
              text={item.text}
              backgroundColor={item.colour}
              onResponse={() => console.log("Starter response")}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
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

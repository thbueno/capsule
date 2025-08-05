import { useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function SharedPage() {
  const { friendId } = useLocalSearchParams();
  const [friend, setFriend] = useState<any>(null);

  useEffect(() => {
    const fetchFriend = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("id", friendId)
        .single();

      if (error) {
        console.error("Error fetching friend:", error);
        return;
      }

      setFriend(data);
    };

    fetchFriend();
  }, [friendId]);

  return (
    <View style={styles.container}>
      {friend ? (
        <>
          <Text style={styles.title}>Shared Page with {friend.username}</Text>
          <Text>Name: {friend.full_name}</Text>
          {/* You can add shared notes/photos/messages here */}
        </>
      ) : (
        <Text>Loading friend data...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
});
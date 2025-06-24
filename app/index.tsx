import { useEffect, useState } from "react";
import { View, Text, Button, FlatList, StyleSheet, TouchableOpacity} from "react-native";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";

type Friend = {
  id: string;
  username: string;
};


export default function Index() {
  const [friends, setFriends] = useState<Friend[]>([]);

  const [userId, setUserId] = useState<string | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login" as any);
  };

  useEffect(() => {
    const fetchFriends = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id ?? null;
      setUserId(uid);

      if (!uid) return;

      const { data, error } = await supabase
        .from("friendships")
        .select(`
          id,
          user_id,
          friend_id,
          user_profile: user_id (
            id,
            username
          ),
          friend_profile: friend_id (
            id,
            username
          )
        `)
        .or(`user_id.eq.${uid},friend_id.eq.${uid}`)
        .eq("status", "accepted");

      if (error) {
        console.error("❌ Error fetching friends:", error);
        return;
      }

      // pick the other user's profile (not the current user)
      const friendsList: Friend[] = data.map((f: any) => {
      const isSender = f.user_id === uid;
      return {
        id: f.id,
        username: isSender ? f.friend_profile?.username : f.user_profile?.username,
      };
    });

      setFriends(friendsList);
    };

    fetchFriends();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Welcome! You're logged in.</Text>

      <Button title="View Friend Requests" onPress={() => router.push("/friend-requests" as any)} />

      <Text style={styles.subheader}>Your Friends:</Text>
      {friends.length === 0 ? (
        <Text style={{ marginBottom: 10 }}>No accepted friends yet.</Text>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/shared/${item.id}` as any)}>
              <View style={styles.friendItem}>
                <View style={styles.avatar} />
                <Text>{item.username}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
    alignItems: "center",
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  subheader: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: "600",
    alignSelf: "flex-start",
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ccc",
  },
});

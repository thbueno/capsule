

import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Button,
  Alert,
} from "react-native";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";

export default function FriendRequests() {
  const [requests, setRequests] = useState<any[]>([]);


  useEffect(() => {
    const fetchRequests = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid =(authData?.user?.id ?? null);

      if (!uid) return;

      const { data, error } = await supabase
        .from("friendships")
        .select("id, user_id, profiles: user_id (username, handle)")
        .eq("friend_id", uid)
        .eq("status", "pending");

      if (error) {
        console.error("❌ Error fetching friend requests:", error);
      } else {
        setRequests(data);
      }
    };

    fetchRequests();
  }, []);

  const updateStatus = async (id: string, newStatus: "accepted" | "blocked") => {
    const { error } = await supabase
      .from("friendships")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      console.error("❌ Error updating friendship:", error);
      Alert.alert("Error", "Could not update request.");
    } else {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
        Incoming Friend Requests
      </Text>

      {requests.length === 0 ? (
        <Text>No pending requests.</Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={{
                padding: 10,
                borderBottomColor: "#eee",
                borderBottomWidth: 1,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View>
                <Text style={{ fontWeight: "bold" }}>
                  {item.profiles.username}
                </Text>
                <Text style={{ color: "gray" }}>@{item.profiles.handle}</Text>
              </View>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  onPress={() => updateStatus(item.id, "accepted")}
                  style={{
                    backgroundColor: "green",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 5,
                    marginRight: 5,
                  }}
                >
                  <Text style={{ color: "white" }}>Accept</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => updateStatus(item.id, "blocked")}
                  style={{
                    backgroundColor: "red",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 5,
                  }}
                >
                  <Text style={{ color: "white" }}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Button title="Back to Home" onPress={() => router.replace("/")} />
    </View>
  );
}



import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Button,
  Alert,
  TextInput,
} from "react-native";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";

export default function FriendRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id ?? null;
      setUserId(uid);

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

  const handleSearch = async () => {
    if (!searchTerm || !userId) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, handle")
      .ilike("username", `%${searchTerm}%`)
      .neq("id", userId) // exclude self

    if (error) {
      console.error("❌ Error searching users:", error);
      return;
    }

    setSearchResults(data);
  };

  const sendFriendRequest = async (targetId: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from("friendships")
      .insert({
        user_id: userId,
        friend_id: targetId,
        status: "pending",
      });

    if (error) {
      console.error("❌ Error sending friend request:", error);
      Alert.alert("Error", "Could not send request.");
    } else {
      Alert.alert("Success", "Friend request sent!");
      setSearchResults((prev) => prev.filter((user) => user.id !== targetId));
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
        Find Friends
      </Text>

      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        <TextInput
          placeholder="Search username..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#ccc",
            padding: 8,
            borderRadius: 6,
            marginRight: 8,
          }}
        />
        <Button title="Search" onPress={handleSearch} />
      </View>

      {searchResults.length > 0 && (
        <>
          <Text style={{ fontWeight: "bold", marginBottom: 6 }}>
            Search Results
          </Text>
          {searchResults.map((user) => (
            <View
              key={user.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 8,
              }}
            >
              <View>
                <Text style={{ fontWeight: "bold" }}>{user.username}</Text>
                <Text style={{ color: "gray" }}>@{user.handle}</Text>
              </View>
              <TouchableOpacity
                onPress={() => sendFriendRequest(user.id)}
                style={{
                  backgroundColor: "#007bff",
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 5,
                }}
              >
                <Text style={{ color: "white" }}>Add</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      <Text style={{ fontSize: 18, fontWeight: "bold", marginVertical: 16 }}>
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

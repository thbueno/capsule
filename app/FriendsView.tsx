// app/friends/FriendsView.tsx
import { FriendsCarousel } from "@/components/FriendsCarousel";
import { useTheme } from "@/context/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { Friend } from "@/types";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StatusBar, StyleSheet, View } from "react-native";

export default function FriendsView() {
  const { colors } = useTheme();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchFriends = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id ?? null;
      if (!uid) return;
      setUserId(uid);

      const { data, error } = await supabase
        .from("friendships")
        .select(`
          id,
          user_id,
          friend_id,
          user_profile: user_id (
            id,
            username,
            avatar_url
          ),
          friend_profile: friend_id (
            id,
            username,
            avatar_url
          )
        `)
        .or(`user_id.eq.${uid},friend_id.eq.${uid}`)
        .eq("status", "accepted");

      if (error) {
        console.error("Error fetching friends:", error);
        return;
      }

      const friendsList: Friend[] = data.map((friendship: any) => {
        const isSender = friendship.user_id === uid;
        const friendProfile = isSender
          ? friendship.friend_profile
          : friendship.user_profile;

        return {
          friendshipId: friendship.id,
          profileId: friendProfile?.id ?? "",
          id: friendProfile?.id ?? "",
          name: friendProfile?.username ?? "Unknown",
          avatar:
            friendProfile?.avatar_url ??
            `https://picsum.photos/120/120?random=${Math.floor(
              Math.random() * 1000
            )}`,
          isOnline: false,
        };
      });

      setFriends(friendsList);
    };

    fetchFriends();
  }, []);

  const handleFriendSelect = (friendId: string) => {
    const friend = friends.find((f) => f.profileId === friendId);
    if (friend) {
      router.push({
        pathname: "/chat",
        params: {
          friendshipId: friend.friendshipId,
          friendId: friend.profileId,
          friendName: friend.name,
          friendAvatar: friend.avatar,
        },
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <FriendsCarousel
        friends={friends}
        selectedFriendId={""}
        onFriendSelect={handleFriendSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
  },
});

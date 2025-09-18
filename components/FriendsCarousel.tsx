import { router } from "expo-router";
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeProvider';
import { Friend } from '../types';

interface FriendsCarouselProps {
  friends: Friend[];
  selectedFriendId: string;
  onFriendSelect: (friendId: string) => void;
}

export const FriendsCarousel: React.FC<FriendsCarouselProps> = ({
  friends,
  selectedFriendId,
  onFriendSelect,
}) => {
  const { colors } = useTheme();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Add Friend Button */}
      <TouchableOpacity
        style={styles.friendItem}
        onPress={() => router.push("/friend-requests")}
        activeOpacity={0.9}
      >
        <View style={[styles.avatarLarge, styles.manageButtonInner]}>
          <Text style={styles.manageButtonText}>+</Text>
        </View>
        <Text style={[styles.friendName, { color: colors.text }]}>Add</Text>
      </TouchableOpacity>

      {/* Friend Avatars */}
      {friends.map((friend) => {
        const isSelected = friend.profileId === selectedFriendId;
        return (
          <TouchableOpacity
            key={friend.friendshipId}
            style={styles.friendItem}
            onPress={() => onFriendSelect(friend.profileId)}
            activeOpacity={0.9}
          >
            <View style={styles.avatarContainer}>
              <View
                style={[
                  styles.avatarLarge,
                  {
                    borderColor: isSelected ? colors.activeGreen : "transparent",
                  },
                ]}
              >
                {friend.avatar ? (
                  <>
                    <Image
                      source={
                        friend.avatar.startsWith("http")
                          ? { uri: friend.avatar }
                          : require("../assets/default-avatar.jpg")
                      }
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                    {!isSelected && <View style={styles.dimOverlay} />}
                  </>
                ) : (
                  <View
                    style={[
                      styles.avatarPlaceholder,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                )}
              </View>

              {friend.isOnline && (
                <View
                  style={[
                    styles.onlineIndicator,
                    {
                      backgroundColor: colors.activeGreen,
                      borderColor: colors.background,
                    },
                  ]}
                />
              )}
            </View>
            <Text style={[styles.friendName, { color: colors.text }]}>
              {friend.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 200, // taller to fit names and big avatars
    paddingVertical: 20,
  },
  contentContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 24, // more spacing between items
  },
  friendItem: {
    width: 120, // bigger tiles
    alignItems: "center",
    justifyContent: "flex-start",
  },
  avatarContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
    backgroundColor: "transparent",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  friendName: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  manageButtonInner: {
    backgroundColor: "#ccc",
  },
  manageButtonText: {
    fontSize: 40,
    color: "#333",
    fontWeight: "bold",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
});

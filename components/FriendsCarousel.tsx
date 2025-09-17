import React from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View, Text} from 'react-native';
import { useTheme } from '../context/ThemeProvider';
import { router } from "expo-router";
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
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <TouchableOpacity
        style={styles.friendItem}
        onPress={() => router.push("/friend-requests")}
        activeOpacity={0.8}
      >
        <View style={[styles.avatar, styles.manageButtonInner]}>
          <Text style={styles.manageButtonText}>+</Text>
        </View>
      </TouchableOpacity>

      {friends.map((friend) => {
        const isSelected = friend.profileId === selectedFriendId;
        return (
          <TouchableOpacity
            key={friend.friendshipId}
            style={styles.friendItem}
            onPress={() => onFriendSelect(friend.profileId)}
            activeOpacity={0.8}
          >
            <View style={styles.avatarContainer}>
              <View
                style={[
                  styles.avatar,
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
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};


const styles = StyleSheet.create({
  container: {
    height: 90,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 16,
  },
  contentContainer: {
    gap: 16,
  },
  manageButtonInner: {
    backgroundColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },

  manageButtonText: {
    fontSize: 24,
    color: "#333",
    fontWeight: "bold",
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 70, // matches friendItem width
  },

  friendItem: {
    width: 70,
    height: 70, // ensures touchable is the full avatar
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },

  
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: 'transparent',
  },

  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)', // dim effect instead of opacity on container
  },

  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  grayscale: {
    // Note: React Native doesn't support CSS filters like grayscale
    // This would need a library like react-native-color-matrix-image-filters
    // For now, we'll rely on opacity for the inactive state
  },
  
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
});
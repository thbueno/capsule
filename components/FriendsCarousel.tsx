import React from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeProvider';
import { FriendsCarouselProps } from '../types';

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
      {friends.map((friend) => {
        const isSelected = friend.id === selectedFriendId;
        
        return (
          <TouchableOpacity
            key={friend.id}
            style={styles.friendItem}
            onPress={() => onFriendSelect(friend.id)}
            activeOpacity={0.8}
          >
            <View style={styles.avatarContainer}>
              <View
                style={[
                  styles.avatar,
                  {
                    borderColor: isSelected ? colors.activeGreen : 'transparent',
                    opacity: isSelected ? 1 : 0.6,
                  },
                ]}
              >
                {friend.avatar ? (
                  <Image
                    source={{ uri: friend.avatar }}
                    style={[
                      styles.avatarImage,
                      !isSelected && styles.grayscale,
                    ]}
                  />
                ) : (
                  // Placeholder for avatar
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]} />
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
  friendItem: {
    width: 70,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
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
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
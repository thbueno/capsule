import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeProvider';
import { Friend } from '../types';

interface CompactHeaderProps {
  friends: Friend[];
  selectedFriendId: string;
  onFriendSelect: (friendshipId: string, profileId: string) => void;
  activeFilter: string;
  onFilterChange: (filter: "all" | "starters" | "moments") => void;
}

export const CompactHeader: React.FC<CompactHeaderProps> = ({
  friends,
  selectedFriendId,
  onFriendSelect,
  activeFilter,
  onFilterChange,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const filters = [
    { key: "all" as const, label: "all" },
    { key: "starters" as const, label: "starters" },
    { key: "moments" as const, label: "moments" },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 8,
          height: insets.top + 80,
        },
      ]}
    >
      {/* Filter Tabs */}
      <View style={styles.filtersContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterTab,
              {
                backgroundColor:
                  activeFilter === filter.key
                    ? colors.primary
                    : colors.overlayLight,
              },
            ]}
            onPress={() => onFilterChange(filter.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color:
                    activeFilter === filter.key
                      ? colors.title
                      : colors.text,
                },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Friend Avatars */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.friendsScroll}
          contentContainerStyle={styles.friendsContainer}
        >
          {friends.slice(0, 3).map((friend, index) => (
            <TouchableOpacity
              key={friend.friendshipId}
              style={[
                styles.friendAvatar,
                {
                  marginRight: index < 2 ? -8 : 0,
                  borderColor: colors.background,
                  zIndex: friends.length - index,
                },
              ]}
              onPress={() =>
                onFriendSelect(friend.friendshipId, friend.profileId)
              }
              activeOpacity={0.8}
            >
              <Image
                source={
                  friend.avatar && friend.avatar.startsWith("http")
                    ? { uri: friend.avatar }
                    : require("../assets/default-avatar.jpg")
                }
                style={[styles.avatarImage]}
              />
            </TouchableOpacity>
          ))}

          {friends.length > 3 && (
            <View
              style={[
                styles.moreIndicator,
                { backgroundColor: colors.textSecondary },
              ]}
            >
              <Text
                style={[styles.moreText, { color: colors.background }]}
              >
                +{friends.length - 3}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    justifyContent: 'flex-end',
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  friendsScroll: {
    flex: 1,
    marginLeft: 8,
  },
  friendsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  friendAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  moreIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  moreText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
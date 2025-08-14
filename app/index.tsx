import React, { useEffect, useState, useRef } from "react";
import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatInterface } from "@/components/ChatInterface";
import { CompactHeader } from "@/components/CompactHeader";
import { FriendsCarousel } from "@/components/FriendsCarousel";
import { Header } from "@/components/Header";
import { MomentCard } from "@/components/MomentCard";
import { StarterCard } from "@/components/StarterCard";
import { ThemeProvider, useTheme } from "@/context/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { Friend } from "@/types";
import { SharedFriendPage } from "@/app/shared-friend";

// Replace these later with Supabase-connected 
const sampleStarters = [ 
  { id: "1", text: "What's the most interesting thing that happened to you this week?" },
  { id: "2", text: "If you could have dinner with anyone, living or dead, who would it be?" },
  { id: "3", text: "What's a skill you'd love to learn and why?" }
]; 
    
const sampleMoments = [ 
  { id: "1", imageUri: "https://picsum.photos/400/500?random=10" }, 
  { id: "2", imageUri: "https://picsum.photos/400/500?random=11" },
  { id: "3", imageUri: "https://picsum.photos/400/500?random=12" }
];

function MainScreenContent() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  // State management
  const [userId, setUserId] = useState<string | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  
  // Selection state - keeping all three for different components that might need them
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [selectedFriendshipId, setSelectedFriendshipId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<"main" | "sharedFriend">("main");
  const [activeFilter, setActiveFilter] = useState<"all" | "starters" | "moments">("all");
  const [isChatMode, setIsChatMode] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const SCROLL_THRESHOLD = 150;

  useEffect(() => {
    const fetchFriends = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id ?? null;
      if (!uid) {
        console.log("No authenticated user found");
        return;
      }
      setUserId(uid);

      // Fetch current user's profile for avatar
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", uid)
        .single();

      if (profileError) {
        console.warn("Failed to fetch user profile:", profileError.message);
      } else {
        setUserAvatarUrl(profileData?.avatar_url ?? null);
      }

      // Fetch friendships with profile data
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
        console.error("❌ Error fetching friends:", error);
        return;
      }

      console.log("Fetched friendships data:", data);

      // Transform the data to match Friend type
      const friendsList: Friend[] = data.map((friendship: any) => {
        // Determine which profile is the friend (not the current user)
        const isSender = friendship.user_id === uid;
        const friendProfile = isSender ? friendship.friend_profile : friendship.user_profile;
        
        return {
          friendshipId: friendship.id,           // The friendship record ID
          profileId: friendProfile?.id ?? "",    // The friend's profile ID
          id: friendProfile?.id ?? "",           // Also set id for compatibility
          name: friendProfile?.username ?? "Unknown",
          avatar: friendProfile?.avatar_url ?? `https://picsum.photos/120/120?random=${Math.floor(Math.random() * 1000)}`,
          isOnline: false, // You can implement online status tracking later
        };
      });

      console.log("Processed friends list:", friendsList);
      setFriends(friendsList);
      
      // Set the first friend as selected if any exist
      if (friendsList.length > 0) {
        const firstFriend = friendsList[0];
        setSelectedFriendId(firstFriend.profileId);
        setSelectedFriendshipId(firstFriend.friendshipId);
        setSelectedProfileId(firstFriend.profileId);
      }
    };

    fetchFriends();
  }, []);

  // Animation values
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const compactHeaderOpacity = scrollY.interpolate({
    inputRange: [SCROLL_THRESHOLD - 50, SCROLL_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const friendsCarouselOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const chatInterfaceOpacity = scrollY.interpolate({
    inputRange: [SCROLL_THRESHOLD - 50, SCROLL_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const selectedFriend = friends.find((f) => f.profileId === selectedFriendId);

  // Handle friend selection - update all related state
  const handleFriendSelect = (friendId: string) => {
    const friend = friends.find(f => f.profileId === friendId);
    if (friend) {
      setSelectedFriendId(friend.profileId);
      setSelectedFriendshipId(friend.friendshipId);
      setViewMode("sharedFriend");
    }
  };

  const handleFilterChange = (filter: "all" | "starters" | "moments") => {
    setActiveFilter(filter);
  };

  const handleSendMessage = (message: string) => {
    console.log("Send message:", message);
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  const getFilteredContent = () => {
    const content = [];

    if (activeFilter === "all" || activeFilter === "starters") {
      content.push(
        ...sampleStarters.map((starter) => (
          <StarterCard
            key={`starter-${starter.id}`}
            text={starter.text}
            onResponse={() => console.log("Starter response")}
          />
        ))
      );
    }

    if (activeFilter === "all" || activeFilter === "moments") {
      content.push(
        ...sampleMoments.map((moment) => (
          <MomentCard
            key={`moment-${moment.id}`}
            imageUri={moment.imageUri}
            onAddPress={() => console.log("Add moment")}
          />
        ))
      );
    }

    return content;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor={colors.background} />

      {/* Full Header */}
      <Animated.View style={[styles.headerContainer, { opacity: headerOpacity}]}>
        <Header 
          title="Capsules"
          avatarUrl={userAvatarUrl ?? undefined}
          onProfilePress={() => console.log("Profile pressed")} 
        />
      </Animated.View>

      {/* Compact Header */}
      <Animated.View
        style={[
          styles.compactHeaderContainer,
          {
            opacity: compactHeaderOpacity,
            transform: [
              {
                translateY: compactHeaderOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-80, 0],
                }),
              },
            ],
          },
        ]}
      >
        <CompactHeader
          friends={friends}
          selectedFriendId={selectedFriendId || ""}
          onFriendSelect={handleFriendSelect}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />
      </Animated.View>

      {/* Friends Carousel */}
      <Animated.View style={{ opacity: friendsCarouselOpacity,  zIndex: 15 }}>
        <FriendsCarousel
          friends={friends}
          selectedFriendId={selectedFriendId || ""}
          onFriendSelect={handleFriendSelect}
        />
      </Animated.View>

      <Animated.ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {viewMode === "main" ? (
          <>
            <View style={{ height: 200 }} />
            {getFilteredContent()}
          </>
        ) : (
          <SharedFriendPage
            friendshipId={selectedFriendshipId!}
            onBack={() => setViewMode("main")}
          />
        )}
      </Animated.ScrollView>

      {/* Chat Interface */}
      <Animated.View
        style={[
          styles.chatContainer,
          {
            opacity: chatInterfaceOpacity,
            transform: [
              {
                translateY: chatInterfaceOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
          },
        ]}
        pointerEvents={isChatMode ? "auto" : "none"}
      >
        <ChatInterface
          selectedFriendName={selectedFriend?.name}
          onSendMessage={handleSendMessage}
          onCameraPress={() => console.log("Camera pressed")}
          onGalleryPress={() => console.log("Gallery pressed")}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  compactHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 11,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 200, // Space for headers and friends carousel
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  chatContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 12,
  },
});

export default function App() {
  return (
    <ThemeProvider>
      <MainScreenContent />
    </ThemeProvider>
  );
}


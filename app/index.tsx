import React, { useEffect, useState, useRef } from "react";
import {
  Animated,
  StatusBar,
  StyleSheet,
  View,
  TouchableOpacity,
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
import { ChatScreen } from "./chat";

function MainScreenContent() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  // State management
  const [userId, setUserId] = useState<string | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  
  // Selection state
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [selectedFriendshipId, setSelectedFriendshipId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // View mode management
  const [viewMode, setViewMode] = useState<"main" | "sharedFriend" | "chat">("main");
  const [chatFriend, setChatFriend] = useState<Friend | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "starters" | "moments">("all");

  const scrollY = useRef(new Animated.Value(0)).current;
  const SCROLL_THRESHOLD = 150;

  const [starters, setStarters] = useState<any[]>([]);

  useEffect(() => {
    const fetchStarters = async () => {
      const { data, error } = await supabase
        .from("starters")
        .select("*");

      if (error) {
        console.error("Error fetching starters:", error);
        return;
      }

      if (data) {
        const shuffled = data.sort(() => 0.5 - Math.random()).slice(0, 5);
        setStarters(shuffled);
      }
    };

    fetchStarters();
  }, []);

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
        console.error("Error fetching friends:", error);
        return;
      }

      // Transform the data to match Friend type
      const friendsList: Friend[] = data.map((friendship: any) => {
        const isSender = friendship.user_id === uid;
        const friendProfile = isSender ? friendship.friend_profile : friendship.user_profile;
        
        return {
          friendshipId: friendship.id,
          profileId: friendProfile?.id ?? "",
          id: friendProfile?.id ?? "",
          name: friendProfile?.username ?? "Unknown",
          avatar: friendProfile?.avatar_url ?? `https://picsum.photos/120/120?random=${Math.floor(Math.random() * 1000)}`,
          isOnline: false,
        };
      });

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

  // Function to open chat with the selected friend
  const openChat = () => {
    const friend = friends.find(f => f.profileId === selectedFriendId);
    if (friend) {
      setChatFriend(friend);
      setViewMode("chat");
    }
  };

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

  // Handle friend selection
  const handleFriendSelect = (friendId: string) => {
    const friend = friends.find(f => f.profileId === friendId);
    if (friend) {
      setSelectedFriendId(friend.profileId);
      setSelectedFriendshipId(friend.friendshipId);
      setSelectedProfileId(friend.profileId);
      // Don't automatically open sharedFriend view, just update selection
    }
  };

  const handleFilterChange = (filter: "all" | "starters" | "moments") => {
    setActiveFilter(filter);
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  const getFilteredContent = () => {
    const content = [];

    if (activeFilter === "all" || activeFilter === "starters") {
      content.push(
        ...starters.map((starter) => (
          <StarterCard
            key={`starter-${starter.id}`}
            text={starter.text}
            backgroundColor={starter.colour}
            onResponse={() => console.log("Starter response")}
          />
        ))
      );
    }

    if (activeFilter === "all" || activeFilter === "moments") {
      // Sample moments for now
      const sampleMoments = [ 
        { id: "1", imageUri: "https://picsum.photos/400/500?random=10" }, 
        { id: "2", imageUri: "https://picsum.photos/400/500?random=11" },
        { id: "3", imageUri: "https://picsum.photos/400/500?random=12" }
      ];
      
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

  // Handle chat interface interactions
  const handleChatInterfacePress = () => {
    openChat();
  };

  const handleSendQuickMessage = (message: string) => {
    // For quick messages, you might want to send directly without opening full chat
    // Or you could open chat and pre-fill the message
    openChat();
    // TODO: Pass the message to the chat screen to send
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor={colors.background} />

      {viewMode === "chat" && chatFriend ? (
        <ChatScreen
          friendshipId={chatFriend.friendshipId}
          friendId={chatFriend.profileId}
          friendName={chatFriend.name}
          friendAvatar={chatFriend.avatar}
          onBack={() => {
            setViewMode("main");
            setChatFriend(null);
          }}
        />
      ) : (
        <>
          {/* Full Header */}
          <Animated.View style={[styles.headerContainer, { opacity: headerOpacity }]}>
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
          <Animated.View style={{ opacity: friendsCarouselOpacity, zIndex: 15 }}>
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
            ) : viewMode === "sharedFriend" ? (
              <SharedFriendPage
                friendshipId={selectedFriendshipId!}
                onBack={() => setViewMode("main")}
              />
            ) : null}
          </Animated.ScrollView>

          {/* Persistent Chat Interface */}
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
          >
            <TouchableOpacity 
              activeOpacity={0.95}
              onPress={handleChatInterfacePress}
              style={styles.chatTouchable}
            >
              <ChatInterface
                selectedFriendName={selectedFriend?.name}
                onSendMessage={handleSendQuickMessage}
                onCameraPress={() => {
                  openChat();
                  // TODO: Open camera in chat view
                }}
                onGalleryPress={() => {
                  openChat();
                  // TODO: Open gallery in chat view
                }}
              />
            </TouchableOpacity>
          </Animated.View>
        </>
      )}
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
    paddingTop: 200,
    paddingHorizontal: 16,
    paddingBottom: 120, // Increased to account for chat interface
  },
  chatContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 12,
  },
  chatTouchable: {
    width: '100%',
  },
});

export default function App() {
  return (
    <ThemeProvider>
      <MainScreenContent />
    </ThemeProvider>
  );
}
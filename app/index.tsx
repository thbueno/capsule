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

// Replace these later with Supabase-connected data
const sampleStarters = [
  {
    id: "1",
    text: "What's the most interesting thing that happened to you this week?",
  },
  {
    id: "2",
    text: "If you could have dinner with anyone, living or dead, who would it be?",
  },
  { id: "3", text: "What's a skill you'd love to learn and why?" },
];

const sampleMoments = [
  { id: "1", imageUri: "https://picsum.photos/400/500?random=10" },
  { id: "2", imageUri: "https://picsum.photos/400/500?random=11" },
  { id: "3", imageUri: "https://picsum.photos/400/500?random=12" },
];

function MainScreenContent() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "starters" | "moments">("all");
  const [isChatMode, setIsChatMode] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const SCROLL_THRESHOLD = 150;
  const headerHeight = insets.top + 72;

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

      const friendsList: Friend[] = data.map((f: any) => {
        const isSender = f.user_id === uid;
        const profile = isSender ? f.friend_profile : f.user_profile;

        return {
          id: f.id,
          name: profile?.username ?? "Unknown", // 🔄 Rename `username` → `name`
          avatar: `https://picsum.photos/120/120?random=${Math.floor(Math.random() * 1000)}`,
          isOnline: false, // 🔧 Dummy value unless you track online status
        };
      });

      setFriends(friendsList);
      if (friendsList.length > 0) {
        setSelectedFriendId(friendsList[0].id);
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

  const contentPaddingBottom = scrollY.interpolate({
    inputRange: [SCROLL_THRESHOLD - 50, SCROLL_THRESHOLD],
    outputRange: [0, 100],
    extrapolate: "clamp",
  });

  const selectedFriend = friends.find((f) => f.id === selectedFriendId);

  const handleFriendSelect = (friendId: string) => {
    setSelectedFriendId(friendId);
  };

  const handleFilterChange = (filter: "all" | "starters" | "moments") => {
    setActiveFilter(filter);
  };

  const handleSendMessage = (message: string) => {
    console.log("Send message:", message);
  };

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
      <Animated.View style={[styles.headerContainer, { opacity: headerOpacity }]}>
        <Header title="Capsules" onProfilePress={() => console.log("Profile pressed")} />
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

      {/* Scrollable Content */}
      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: false,
            listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
              setIsChatMode(event.nativeEvent.contentOffset.y >= SCROLL_THRESHOLD);
            },
          }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: headerHeight,
          paddingBottom: contentPaddingBottom,
        }}
      >
        <Animated.View style={{ opacity: friendsCarouselOpacity }}>
          <FriendsCarousel
            friends={friends}
            selectedFriendId={selectedFriendId || ""}
            onFriendSelect={handleFriendSelect}
          />
        </Animated.View>

        {getFilteredContent()}
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

export default function Index() {
  return (
    <ThemeProvider>
      <MainScreenContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  compactHeaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 11,
  },
  chatContainer: {
    zIndex: 12,
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
});

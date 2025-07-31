import { ChatInterface } from "@/components/ChatInterface";
import { CompactHeader } from "@/components/CompactHeader";
import React from "react";
import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FriendsCarousel } from "../components/FriendsCarousel";
import { Header } from "../components/Header";
import { MomentCard } from "../components/MomentCard";
import { StarterCard } from "../components/StarterCard";
import { ThemeProvider, useTheme } from "../context/ThemeProvider";

// Sample data - will be moved to proper data management later
const sampleFriends = [
  {
    id: "1",
    name: "Alice",
    avatar: "https://picsum.photos/120/120?random=1",
    isOnline: true,
  },
  {
    id: "2",
    name: "Bob",
    avatar: "https://picsum.photos/120/120?random=2",
    isOnline: false,
  },
  {
    id: "3",
    name: "Charlie",
    avatar: "https://picsum.photos/120/120?random=3",
    isOnline: true,
  },
  {
    id: "4",
    name: "Diana",
    avatar: "https://picsum.photos/120/120?random=4",
    isOnline: false,
  },
  {
    id: "5",
    name: "Eve",
    avatar: "https://picsum.photos/120/120?random=5",
    isOnline: true,
  },
];

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
  const [selectedFriendId, setSelectedFriendId] = React.useState<string>("1");
  const [activeFilter, setActiveFilter] = React.useState<
    "all" | "starters" | "moments"
  >("all");
  const [isChatMode, setIsChatMode] = React.useState(false);

  // Animation values
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const SCROLL_THRESHOLD = 150;

  // Animated values for header transformation
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

  const handleProfilePress = () => {
    console.log("Profile pressed");
  };

  const handleFriendSelect = (friendId: string) => {
    setSelectedFriendId(friendId);
  };

  const handleStarterResponse = () => {
    console.log("Starter response pressed");
  };

  const handleMomentAdd = () => {
    console.log("Add moment pressed");
  };

  const handleFilterChange = (filter: "all" | "starters" | "moments") => {
    setActiveFilter(filter);
  };

  const handleSendMessage = (message: string) => {
    console.log("Send message:", message);
  };

  const handleCameraPress = () => {
    console.log("Camera pressed");
  };

  const handleGalleryPress = () => {
    console.log("Gallery pressed");
  };

  // Filter content based on active filter
  const getFilteredContent = () => {
    const content = [];

    if (activeFilter === "all" || activeFilter === "starters") {
      content.push(
        ...sampleStarters.map((starter) => (
          <StarterCard
            key={`starter-${starter.id}`}
            text={starter.text}
            onResponse={handleStarterResponse}
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
            onAddPress={handleMomentAdd}
          />
        ))
      );
    }

    return content;
  };

  const selectedFriend = sampleFriends.find((f) => f.id === selectedFriendId);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.background}
        translucent={true}
      />
      {/* Original Header */}
      <Animated.View
        style={[styles.headerContainer, { opacity: headerOpacity }]}
      >
        <Header title="Capsules" onProfilePress={handleProfilePress} />
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
          friends={sampleFriends}
          selectedFriendId={selectedFriendId}
          onFriendSelect={handleFriendSelect}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: false,
            listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
              const offsetY = event.nativeEvent.contentOffset.y;
              setIsChatMode(offsetY >= SCROLL_THRESHOLD);
            },
          }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingBottom: contentPaddingBottom,
        }}
      >
        {/* Friends Carousel */}
        <Animated.View style={{ opacity: friendsCarouselOpacity }}>
          <FriendsCarousel
            friends={sampleFriends}
            selectedFriendId={selectedFriendId}
            onFriendSelect={handleFriendSelect}
          />
        </Animated.View>

        {/* Filtered Content */}
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
          onCameraPress={handleCameraPress}
          onGalleryPress={handleGalleryPress}
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
    top: 0, // Will be positioned using safe area insets in the component
    left: 0,
    right: 0,
    zIndex: 11,
  },
  chatContainer: {
    zIndex: 12,
  },
});

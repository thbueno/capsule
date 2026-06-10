import { Avatar } from "@/components/Avatar";
import { CapsuleCard } from "@/components/CapsuleCard";
import { EmptyState } from "@/components/EmptyState";
import { FilterPills } from "@/components/FilterPills";
import { MessageBubble } from "@/components/MessageBubble";
import { MomentCard } from "@/components/MomentCard";
import { OutlineButton } from "@/components/Buttons";
import { useTheme } from "@/context/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchCapsule,
  fetchFriendshipCapsules,
  fetchFriendshipMessages,
  fetchMoment,
  fetchMoments,
  fetchStarters,
  markFriendshipRead,
  sendMessage,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Capsule, Message, Moment, Starter } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TabType = "all" | "capsules" | "moments";

const TABS: { value: TabType; label: string }[] = [
  { value: "all", label: "all" },
  { value: "capsules", label: "capsules" },
  { value: "moments", label: "moments" },
];

export default function ChatScreen() {
  const params = useLocalSearchParams<{
    friendshipId: string;
    friendId: string;
    friendName: string;
    friendAvatar?: string;
  }>();
  const friendshipId = params.friendshipId;
  const friendId = params.friendId;
  const friendName = params.friendName ?? "Friend";

  const { colors } = useTheme();
  const { userId } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [messages, setMessages] = useState<Message[]>([]);
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [starters, setStarters] = useState<Starter[]>([]);
  const [showStarters, setShowStarters] = useState(false);
  const [viewerMoment, setViewerMoment] = useState<Moment | null>(null);

  const momentsById = useMemo(() => {
    const map: Record<string, Moment> = {};
    for (const moment of moments) map[moment.id] = moment;
    return map;
  }, [moments]);

  const capsulesById = useMemo(() => {
    const map: Record<string, Capsule> = {};
    for (const capsule of capsules) map[capsule.id] = capsule;
    return map;
  }, [capsules]);

  // Keep latest state available to the realtime handler without resubscribing.
  const momentsRef = useRef(momentsById);
  momentsRef.current = momentsById;
  const capsulesRef = useRef(capsulesById);
  capsulesRef.current = capsulesById;

  const load = useCallback(async () => {
    if (!userId || !friendshipId) return;
    try {
      const [messagesData, capsulesData, momentsData] = await Promise.all([
        fetchFriendshipMessages(friendshipId),
        fetchFriendshipCapsules(friendshipId),
        fetchMoments({ friendshipId }),
      ]);
      setMessages(messagesData);
      setCapsules(capsulesData);
      setMoments(momentsData);
      markFriendshipRead(friendshipId, friendId);
    } catch (error) {
      console.error("Error loading chat:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, friendshipId, friendId]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh moments/capsules when returning from the create screens.
  useFocusEffect(
    useCallback(() => {
      if (!loading) load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // One realtime channel per open chat.
  useEffect(() => {
    if (!userId || !friendshipId) return;

    const channel = supabase
      .channel(`chat:${friendshipId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `friendship_id=eq.${friendshipId}`,
        },
        async (payload) => {
          const message = payload.new as Message;
          if (message.capsule_id) return; // capsule threads live on their own screen

          if (message.moment_id && !momentsRef.current[message.moment_id]) {
            const moment = await fetchMoment(message.moment_id);
            if (moment) setMoments((prev) => [moment, ...prev]);
          }
          if (message.capsule_ref && !capsulesRef.current[message.capsule_ref]) {
            const capsule = await fetchCapsule(message.capsule_ref);
            if (capsule) setCapsules((prev) => [capsule, ...prev]);
          }

          setMessages((prev) =>
            prev.some((m) => m.id === message.id) ? prev : [message, ...prev]
          );
          if (message.sender_id === friendId) {
            markFriendshipRead(friendshipId, friendId);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "capsules",
          filter: `friendship_id=eq.${friendshipId}`,
        },
        (payload) => {
          const capsule = payload.new as Capsule;
          setCapsules((prev) =>
            prev.some((c) => c.id === capsule.id) ? prev : [capsule, ...prev]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, friendshipId, friendId]);

  const handleSend = useCallback(async () => {
    const content = inputText.trim();
    if (!content || !userId || sending) return;

    setSending(true);
    setInputText("");
    try {
      const message = await sendMessage({ senderId: userId, friendshipId, content });
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [message, ...prev]
      );
    } catch (error) {
      console.error("Error sending message:", error);
      setInputText(content);
    } finally {
      setSending(false);
    }
  }, [inputText, userId, friendshipId, sending]);

  const openStarters = useCallback(async () => {
    setShowStarters(true);
    if (starters.length === 0) {
      try {
        setStarters(await fetchStarters());
      } catch (error) {
        console.error("Error loading starters:", error);
      }
    }
  }, [starters.length]);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isOwn = item.sender_id === userId;

      if (item.moment_id && momentsById[item.moment_id]) {
        const moment = momentsById[item.moment_id];
        return (
          <TouchableOpacity
            style={[styles.momentMessage, isOwn ? styles.alignRight : styles.alignLeft]}
            onPress={() => setViewerMoment(moment)}
            activeOpacity={0.85}
          >
            <MomentCard
              title={moment.title}
              reflection={moment.reflection}
              images={moment.photoUrls}
            />
          </TouchableOpacity>
        );
      }

      if (item.capsule_ref && capsulesById[item.capsule_ref]) {
        const capsule = capsulesById[item.capsule_ref];
        return (
          <View style={[styles.capsuleMessage, isOwn ? styles.alignRight : styles.alignLeft]}>
            <CapsuleCard
              capsule={capsule}
              onPress={() => router.push({ pathname: "/capsule", params: { id: capsule.id } })}
            />
          </View>
        );
      }

      return <MessageBubble message={item} isOwn={isOwn} />;
    },
    [userId, momentsById, capsulesById]
  );

  const photoTiles = useMemo(
    () =>
      moments.flatMap((moment) =>
        moment.photoUrls.map((url, index) => ({
          key: `${moment.id}-${index}`,
          url,
          moment,
        }))
      ),
    [moments]
  );

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header: back · pills · avatar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={colors.title} />
        </TouchableOpacity>
        <FilterPills options={TABS} active={activeTab} onChange={setActiveTab} />
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/profile", params: { id: friendId } })}
        >
          <Avatar uri={params.friendAvatar} name={friendName} size={44} />
        </TouchableOpacity>
      </View>

      {activeTab === "all" && (
        <>
          <FlatList
            key="chat-messages"
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.invertedEmpty}>
                <EmptyState
                  icon="chatbubble-outline"
                  title={`Say hi to ${friendName}`}
                  subtitle="Stuck for words? Tap the heart for a conversation starter."
                />
              </View>
            }
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
          >
            <View style={styles.inputRow}>
              <View style={[styles.inputBubble, { backgroundColor: colors.backgroundSecondary }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.title }]}
                  placeholder={`chat with ${friendName}...`}
                  placeholderTextColor={colors.textSecondary}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                />
                {inputText.trim() ? (
                  <TouchableOpacity onPress={handleSend} disabled={sending}>
                    <Ionicons name="arrow-up-circle" size={30} color={colors.primary} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.inputIcon}
                onPress={() =>
                  router.push({ pathname: "/share-moment", params: { friendshipId, friendId } })
                }
              >
                <Ionicons name="image-outline" size={26} color={colors.title} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.inputIcon} onPress={openStarters}>
                <Ionicons name="heart-outline" size={26} color={colors.title} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </>
      )}

      {activeTab === "capsules" && (
        <>
          <FlatList
            key="chat-capsules"
            data={capsules}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.gridItem}>
                <CapsuleCard
                  capsule={item}
                  onPress={() => router.push({ pathname: "/capsule", params: { id: item.id } })}
                />
              </View>
            )}
            ListEmptyComponent={
              <EmptyState
                icon="folder-open-outline"
                title="No capsules yet"
                subtitle={`Create a capsule to collect ideas, plans and memories with ${friendName}.`}
              />
            }
          />
          <View style={styles.footerCta}>
            <OutlineButton
              label="Create a Capsule"
              onPress={() =>
                router.push({
                  pathname: "/create-capsule",
                  params: { friendshipId, friendId, friendName },
                })
              }
            />
          </View>
        </>
      )}

      {activeTab === "moments" && (
        <>
          <FlatList
            key="chat-moments"
            data={photoTiles}
            keyExtractor={(item) => item.key}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => setViewerMoment(item.moment)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: item.url }} style={styles.photoTile} resizeMode="cover" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <EmptyState
                icon="images-outline"
                title="No moments yet"
                subtitle="Share photos of the moments you don't want to forget."
              />
            }
          />
          <View style={styles.footerCta}>
            <OutlineButton
              label="Create a moment"
              onPress={() =>
                router.push({ pathname: "/share-moment", params: { friendshipId, friendId } })
              }
            />
          </View>
        </>
      )}

      {/* Conversation starters */}
      <Modal
        visible={showStarters}
        animationType="slide"
        transparent
        onRequestClose={() => setShowStarters(false)}
      >
        <TouchableOpacity
          style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowStarters(false)}
        >
          <View style={[styles.startersSheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.startersTitle, { color: colors.title }]}>
              Conversation starters
            </Text>
            <FlatList
              data={starters}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.starterRow, { borderColor: colors.border }]}
                  onPress={() => {
                    setInputText(item.text);
                    setShowStarters(false);
                  }}
                >
                  <Text style={[styles.starterCategory, { color: colors.primary }]}>
                    {item.category}
                  </Text>
                  <Text style={[styles.starterText, { color: colors.title }]}>{item.text}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<ActivityIndicator color={colors.primary} />}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Full moment viewer */}
      <Modal
        visible={!!viewerMoment}
        animationType="fade"
        transparent
        onRequestClose={() => setViewerMoment(null)}
      >
        <TouchableOpacity
          style={[styles.modalBackdrop, styles.viewerBackdrop, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setViewerMoment(null)}
        >
          {viewerMoment && (
            <MomentCard
              title={viewerMoment.title}
              reflection={viewerMoment.reflection}
              images={viewerMoment.photoUrls}
              width={Dimensions.get("window").width - 48}
            />
          )}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  invertedEmpty: {
    transform: [{ scaleY: -1 }],
  },
  momentMessage: {
    marginBottom: 10,
  },
  capsuleMessage: {
    marginBottom: 10,
    width: "75%",
  },
  alignRight: {
    alignSelf: "flex-end",
  },
  alignLeft: {
    alignSelf: "flex-start",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  inputBubble: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 26,
    paddingLeft: 18,
    paddingRight: 8,
    minHeight: 52,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 110,
    paddingVertical: 14,
  },
  inputIcon: {
    padding: 4,
  },
  gridRow: {
    gap: 14,
  },
  gridList: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  gridItem: {
    flex: 1,
  },
  photoTile: {
    width: "100%",
    aspectRatio: 0.75,
    borderRadius: 22,
    marginBottom: 14,
  },
  footerCta: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  viewerBackdrop: {
    justifyContent: "center",
    alignItems: "center",
  },
  startersSheet: {
    maxHeight: "70%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  startersTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  starterRow: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  },
  starterCategory: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  starterText: {
    fontSize: 15,
    lineHeight: 21,
  },
});

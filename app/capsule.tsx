import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { FilterPills } from "@/components/FilterPills";
import { MessageBubble } from "@/components/MessageBubble";
import { MomentCard } from "@/components/MomentCard";
import { OutlineButton } from "@/components/Buttons";
import { useTheme } from "@/context/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchCapsule,
  fetchCapsuleMembers,
  fetchCapsuleMessages,
  fetchMoment,
  fetchMoments,
  sendMessage,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Capsule, CapsuleMember, Message, Moment } from "@/types";
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
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TabType = "chat" | "photos";

const TABS: { value: TabType; label: string }[] = [
  { value: "chat", label: "chat" },
  { value: "photos", label: "photos" },
];

export default function CapsuleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { userId } = useAuth();

  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [members, setMembers] = useState<CapsuleMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("chat");
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewerMoment, setViewerMoment] = useState<Moment | null>(null);

  const momentsById = useMemo(() => {
    const map: Record<string, Moment> = {};
    for (const moment of moments) map[moment.id] = moment;
    return map;
  }, [moments]);
  const momentsRef = useRef(momentsById);
  momentsRef.current = momentsById;

  const membersById = useMemo(() => {
    const map: Record<string, CapsuleMember> = {};
    for (const member of members) map[member.profileId] = member;
    return map;
  }, [members]);

  const load = useCallback(async () => {
    if (!id || !userId) return;
    try {
      const [capsuleData, membersData, messagesData, momentsData] = await Promise.all([
        fetchCapsule(id),
        fetchCapsuleMembers(id),
        fetchCapsuleMessages(id),
        fetchMoments({ capsuleId: id }),
      ]);
      setCapsule(capsuleData);
      setMembers(membersData);
      setMessages(messagesData);
      setMoments(momentsData);
    } catch (error) {
      console.error("Error loading capsule:", error);
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  useEffect(() => {
    if (!id || !userId) return;

    const channel = supabase
      .channel(`capsule:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `capsule_id=eq.${id}`,
        },
        async (payload) => {
          const message = payload.new as Message;
          if (message.moment_id && !momentsRef.current[message.moment_id]) {
            const moment = await fetchMoment(message.moment_id);
            if (moment) setMoments((prev) => [moment, ...prev]);
          }
          setMessages((prev) =>
            prev.some((m) => m.id === message.id) ? prev : [message, ...prev]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, userId]);

  const handleSend = useCallback(async () => {
    const content = inputText.trim();
    if (!content || !userId || sending) return;
    setSending(true);
    setInputText("");
    try {
      const message = await sendMessage({ senderId: userId, capsuleId: id, content });
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [message, ...prev]
      );
    } catch (error) {
      console.error("Error sending message:", error);
      setInputText(content);
    } finally {
      setSending(false);
    }
  }, [inputText, userId, id, sending]);

  const shareInvite = useCallback(() => {
    if (!capsule?.invite_code) return;
    Share.share({
      message: `Join my "${capsule.title}" capsule on Capsule! Open the app, tap "Join a capsule" and enter the code ${capsule.invite_code}.`,
    });
  }, [capsule]);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isOwn = item.sender_id === userId;
      const senderName = capsule?.is_group ? membersById[item.sender_id]?.name : undefined;

      if (item.moment_id && momentsById[item.moment_id]) {
        const moment = momentsById[item.moment_id];
        return (
          <View style={isOwn ? styles.alignRight : styles.alignLeft}>
            {!isOwn && senderName ? (
              <Text style={[styles.momentSender, { color: colors.textSecondary }]}>
                {senderName}
              </Text>
            ) : null}
            <TouchableOpacity onPress={() => setViewerMoment(moment)} activeOpacity={0.85}>
              <MomentCard
                title={moment.title}
                reflection={moment.reflection}
                images={moment.photoUrls}
              />
            </TouchableOpacity>
          </View>
        );
      }

      return <MessageBubble message={item} isOwn={isOwn} senderName={senderName} />;
    },
    [userId, momentsById, membersById, capsule?.is_group, colors.textSecondary]
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

  if (loading || !capsule) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <EmptyState icon="alert-circle-outline" title="Capsule not found" />
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={colors.title} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.title }]} numberOfLines={1}>
            {capsule.title}
          </Text>
          <View style={[styles.categoryChip, { borderColor: colors.primary }]}>
            <Text style={[styles.categoryText, { color: colors.primary }]}>
              {capsule.category}
            </Text>
          </View>
        </View>
        {capsule.is_group && capsule.invite_code ? (
          <TouchableOpacity
            style={[styles.inviteButton, { backgroundColor: colors.primary }]}
            onPress={shareInvite}
          >
            <Ionicons name="share-outline" size={16} color="#fff" />
            <Text style={styles.inviteCode}>{capsule.invite_code}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* Members row (groups) */}
      {capsule.is_group && members.length > 0 && (
        <View style={styles.membersRow}>
          {members.slice(0, 8).map((member) => (
            <View key={member.profileId} style={styles.memberAvatar}>
              <Avatar uri={member.avatar} name={member.name} size={34} shape="circle" />
            </View>
          ))}
          <Text style={[styles.membersLabel, { color: colors.textSecondary }]}>
            {members.length} member{members.length === 1 ? "" : "s"}
          </Text>
        </View>
      )}

      {capsule.description ? (
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
          {capsule.description}
        </Text>
      ) : null}

      <View style={styles.tabs}>
        <FilterPills options={TABS} active={activeTab} onChange={setActiveTab} />
      </View>

      {activeTab === "chat" ? (
        <>
          <FlatList
            key="capsule-chat"
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
                  title="Start the conversation"
                  subtitle={
                    capsule.is_group
                      ? "Everyone in this capsule can chat and add photos."
                      : "Messages here stay inside this capsule."
                  }
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
                  placeholder={`add to ${capsule.title}...`}
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
                  router.push({ pathname: "/share-moment", params: { capsuleId: capsule.id } })
                }
              >
                <Ionicons name="image-outline" size={26} color={colors.title} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </>
      ) : (
        <>
          <FlatList
            key="capsule-photos"
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
                title="No photos yet"
                subtitle={
                  capsule.is_group
                    ? "Share the invite code so everyone can add their photos here."
                    : "Add the first photos to this capsule."
                }
              />
            }
          />
          <View style={styles.footerCta}>
            <OutlineButton
              label="Add photos"
              onPress={() =>
                router.push({ pathname: "/share-moment", params: { capsuleId: capsule.id } })
              }
            />
          </View>
        </>
      )}

      {/* Full moment viewer */}
      <Modal
        visible={!!viewerMoment}
        animationType="fade"
        transparent
        onRequestClose={() => setViewerMoment(null)}
      >
        <TouchableOpacity
          style={[styles.viewerBackdrop, { backgroundColor: colors.overlay }]}
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "700",
  },
  categoryChip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "500",
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inviteCode: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
  membersRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  memberAvatar: {
    marginRight: -8,
  },
  membersLabel: {
    fontSize: 13,
    marginLeft: 16,
  },
  description: {
    fontSize: 14,
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  tabs: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: "center",
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  invertedEmpty: {
    transform: [{ scaleY: -1 }],
  },
  momentSender: {
    fontSize: 12,
    marginBottom: 2,
    marginLeft: 6,
  },
  alignRight: {
    alignSelf: "flex-end",
    marginBottom: 10,
  },
  alignLeft: {
    alignSelf: "flex-start",
    marginBottom: 10,
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
  viewerBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

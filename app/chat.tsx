import { useTheme } from '@/context/ThemeProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { MomentCard } from "../components/MomentCard";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  friendships_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  starter_id?: string; // Add starter_id to track starter-initiated messages
  moment_id?: string;
}

interface SharedMoment {
  id: string;
  title: string;
  reflection: string;
  storage_path: string; // could be CSV of image URIs
}


interface ChatScreenProps {
  friendshipId: string;
  friendId: string;
  friendName: string;
  friendAvatar?: string;
  onBack: () => void;
}

type TabType = 'all' | 'starters';

export function ChatScreen({
  friendshipId,
  friendId,
  friendName,
  friendAvatar,
  onBack,
}: ChatScreenProps) {
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [starterMessages, setStarterMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [inputText, setInputText] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [startersMap, setStartersMap] = useState<Record<string, string>>({});
  const [momentsMap, setMomentsMap] = useState<Record<string, SharedMoment>>({});
  const flatListRef = useRef<FlatList>(null);  
  const router = useRouter();

  useEffect(() => {
    initializeChat();

    const subscription = supabase
      .channel(`chat:${friendshipId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `friendships_id=eq.${friendshipId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;

          // Starter colors
          if (newMessage.starter_id && !startersMap[newMessage.starter_id]) {
            const { data: starterData } = await supabase
              .from('starters')
              .select('id, colour')
              .eq('id', newMessage.starter_id)
              .single();

            if (starterData) {
              setStartersMap(prev => ({ ...prev, [starterData.id]: starterData.colour }));
            }
          }

          // Moment data
          if (newMessage.moment_id && !momentsMap[newMessage.moment_id]) {
            const { data: momentData } = await supabase
              .from('shared_photos')
              .select('*')
              .eq('id', newMessage.moment_id)
              .single();

            if (momentData) {
              setMomentsMap(prev => ({ ...prev, [momentData.id]: momentData }));
            }
          }

          // Add message to state
          setMessages(prev => [newMessage, ...prev]);

          // Starter messages
          if (newMessage.starter_id) {
            setStarterMessages(prev => [newMessage, ...prev]);
          }

          // Mark as read
          if (newMessage.sender_id === friendId) {
            markMessageAsRead(newMessage.id);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [friendshipId, friendId, startersMap, momentsMap]);


  const initializeChat = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) return;
      setUserId(uid);

      // Fetch messages
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('friendships_id', friendshipId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(messagesData || []);
      setStarterMessages(messagesData?.filter(m => m.starter_id) || []);

      // Starter colors
      const starterIds = messagesData?.map(m => m.starter_id).filter(Boolean) || [];
      if (starterIds.length > 0) {
        const { data: startersData } = await supabase
          .from('starters')
          .select('id, colour')
          .in('id', starterIds);

        const map: Record<string, string> = {};
        startersData?.forEach(s => {
          map[s.id] = s.colour;
        });
        setStartersMap(map);
      }

      // Fetch moment data
      const momentIds = messagesData?.map(m => m.moment_id).filter(Boolean) as string[] || [];
      if (momentIds.length > 0) {
        const { data: momentsData } = await supabase
          .from('shared_photos')
          .select('*')
          .in('id', momentIds);

        const map: Record<string, SharedMoment> = {};
        momentsData?.forEach(m => {
          map[m.id] = m;
        });
        setMomentsMap(map);
      }

      // Mark unread messages as read
      const unreadIds = messagesData
        ?.filter(m => m.recipient_id === uid && !m.is_read)
        .map(m => m.id) || [];

      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setLoading(false);
    }
  };



  const markMessageAsRead = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);
  };

  const sendMessage = async (starterId?: string) => {
    if (!inputText.trim() || !userId || sending) return;

    setSending(true);
    const messageContent = inputText.trim();
    setInputText('');

    try {
      const messageData: any = {
        sender_id: userId,
        recipient_id: friendId,
        friendships_id: friendshipId,
        content: messageContent,
      };

      // Add starter_id if provided
      if (starterId) {
        messageData.starter_id = starterId;
      }

      const { error } = await supabase.from('messages').insert(messageData);

      if (error) {
        console.error('Error sending message:', error);
        setInputText(messageContent); // Restore input on error
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setInputText(messageContent);
    } finally {
      setSending(false);
    }
  };

 const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === userId;
    const starterColor = item.starter_id ? startersMap[item.starter_id] : null;

    // ✅ Render a moment message
    if (item.moment_id && momentsMap[item.moment_id]) {
      const moment = momentsMap[item.moment_id];

      // Split storage_path into an array of image URIs
      const images = moment.storage_path.includes(',')
        ? moment.storage_path.split(',')
        : [moment.storage_path];

      return (
        <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
          <MomentCard
            title={moment.title}
            reflection={moment.reflection}
            images={images}
          />
        </View>
      );
    }

    // ✅ Regular or starter message
    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        <View
          style={[
            styles.messageBubble,
            { backgroundColor: starterColor || (isOwnMessage ? colors.primary : colors.backgroundSecondary) },
          ]}
        >
          {item.starter_id && activeTab === 'all' && (
            <View style={[styles.starterBadge, { backgroundColor: starterColor || colors.background }]}>
              <Ionicons name="sparkles" size={12} color="#fff" />
              <Text style={styles.starterBadgeText}>Starter</Text>
            </View>
          )}
          <Text style={[styles.messageText, { color: isOwnMessage ? '#fff' : colors.text }]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, { color: isOwnMessage ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };




  const handleOpenOverlay = () => setShowOverlay(true);
  const handleCloseOverlay = () => setShowOverlay(false);

  const handleStartConversation = () => {
    setShowOverlay(false);
    router.push({
      pathname: "/StartConversation",
      params: { 
        friendshipId, 
        friendId,
        friendName,
        returnToChat: 'true' // Flag to return to chat after selection
      },
    });
  };

  const handleCreateMoment = () => {
    setShowOverlay(false);
    router.push({
      pathname: "/ShareMoment",
      params: { friendshipId, friendId },
    });
  };

  const getDisplayMessages = () => {
    return activeTab === 'all' ? messages : starterMessages;
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          {friendAvatar ? (
            <Image source={{ uri: friendAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{friendName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={[styles.headerTitle, { color: colors.text }]}>{friendName}</Text>
        </View>

        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'all' && styles.activeTab,
            activeTab === 'all' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'all' ? '#fff' : colors.textSecondary }
          ]}>
            All Messages
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'starters' && styles.activeTab,
            activeTab === 'starters' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setActiveTab('starters')}
        >
          <Ionicons 
            name="sparkles" 
            size={16} 
            color={activeTab === 'starters' ? '#fff' : colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'starters' ? '#fff' : colors.textSecondary }
          ]}>
            Starters ({starterMessages.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={getDisplayMessages()}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={activeTab === 'starters' ? 'sparkles-outline' : 'chatbubble-outline'} 
              size={48} 
              color={colors.textSecondary} 
            />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {activeTab === 'starters' 
                ? 'No starter conversations yet' 
                : 'Start a conversation'}
            </Text>
          </View>
        }
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={[styles.inputContainer, { backgroundColor: colors.background }]}>
          <TouchableOpacity style={styles.attachButton} onPress={handleOpenOverlay}>
            <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
          </TouchableOpacity>

          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            onSubmitEditing={() => sendMessage()}
          />

          <TouchableOpacity
            style={[styles.sendButton, { opacity: inputText.trim() ? 1 : 0.5 }]}
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || sending}
          >
            <Ionicons
              name="send"
              size={24}
              color={inputText.trim() ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Overlay */}
      <Modal
        visible={showOverlay}
        animationType="fade"
        transparent
        onRequestClose={handleCloseOverlay}
      >
        <TouchableOpacity
          style={styles.overlayBackground}
          activeOpacity={1}
          onPress={handleCloseOverlay}
        >
          <View style={[styles.overlayContent, { backgroundColor: colors.background }]}>
            <TouchableOpacity style={styles.overlayOption} onPress={handleStartConversation}>
              <Ionicons name="sparkles-outline" size={24} color={colors.primary} />
              <Text style={[styles.overlayText, { color: colors.text }]}>Start Conversation</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.overlayOption} onPress={handleCreateMoment}>
              <Ionicons name="images-outline" size={24} color={colors.primary} />
              <Text style={[styles.overlayText, { color: colors.text }]}>Share a Moment</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  menuButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageContainer: {
    marginVertical: 4,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
  },
  starterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  starterBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  attachButton: {
    paddingBottom: 8,
    paddingRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    maxHeight: 100,
  },
  sendButton: {
    paddingBottom: 8,
    paddingLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  overlayContent: {
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  overlayOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  overlayText: {
    fontSize: 16,
    marginLeft: 12,
  },
});
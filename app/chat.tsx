import { useTheme } from '@/context/ThemeProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  starter_id?: string;
  moment_id?: string;
  thread_id?: string; // New field for thread association
}

interface StarterThread {
  id: string;
  starter_id: string;
  friendships_id: string;
  created_at: string;
  last_message_at: string;
  starter?: {
    id: string;
    text: string;
    colour: string;
    category: string;
  };
  message_count?: number;
  unread_count?: number;
}

interface SharedMoment {
  id: string;
  title: string;
  reflection: string;
  storage_path: string;
}

interface ChatScreenProps {
  friendshipId: string;
  friendId: string;
  friendName: string;
  friendAvatar?: string;
  onBack: () => void;
}

type TabType = 'all' | 'starters' | 'thread';

export function ChatScreen({
  friendshipId,
  friendId,
  friendName,
  friendAvatar,
  onBack,
}: ChatScreenProps) {
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [starterThreads, setStarterThreads] = useState<StarterThread[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [activeThread, setActiveThread] = useState<StarterThread | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [startersMap, setStartersMap] = useState<Record<string, any>>({});
  const [momentsMap, setMomentsMap] = useState<Record<string, SharedMoment>>({});
  
  const signedUrlCache = useRef<Record<string, { url: string; timestamp: number }>>({});
  const processingMoments = useRef<Set<string>>(new Set());
  const flatListRef = useRef<FlatList>(null);  
  const router = useRouter();

  const getSignedMoment = useCallback(async (moment: any): Promise<SharedMoment> => {
    if (processingMoments.current.has(moment.id)) {
      return moment;
    }
    
    processingMoments.current.add(moment.id);
    
    try {
      const paths = moment.storage_path.includes(",")
        ? moment.storage_path.split(",")
        : [moment.storage_path];

      const signedUrls: string[] = [];
      const now = Date.now();
      const cacheExpiry = 3000000;

      for (const path of paths) {
        const cached = signedUrlCache.current[path];
        
        if (cached && (now - cached.timestamp) < cacheExpiry) {
          signedUrls.push(cached.url);
        } else {
          const { data: urlData, error } = await supabase.storage
            .from("shared-photos")
            .createSignedUrl(path.replace("shared-photos/", ""), 3600);

          if (!error && urlData?.signedUrl) {
            signedUrlCache.current[path] = {
              url: urlData.signedUrl,
              timestamp: now
            };
            signedUrls.push(urlData.signedUrl);
          } else if (cached) {
            signedUrls.push(cached.url);
          }
        }
      }

      return {
        ...moment,
        storage_path: signedUrls.join(","),
      };
    } finally {
      processingMoments.current.delete(moment.id);
    }
  }, []);

  const processMomentsData = useCallback(async (momentsData: any[]) => {
    const newMomentsMap: Record<string, SharedMoment> = {};
    
    for (const m of momentsData) {
      if (!momentsMap[m.id]) {
        const signedMoment = await getSignedMoment(m);
        newMomentsMap[signedMoment.id] = signedMoment;
      } else {
        newMomentsMap[m.id] = momentsMap[m.id];
      }
    }
    
    return newMomentsMap;
  }, [momentsMap, getSignedMoment]);

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

          // Handle starter data
          if (newMessage.starter_id && !startersMap[newMessage.starter_id]) {
            const { data: starterData } = await supabase
              .from('starters')
              .select('*')
              .eq('id', newMessage.starter_id)
              .single();

            if (starterData) {
              setStartersMap(prev => ({ ...prev, [starterData.id]: starterData }));
            }
          }

          // Handle moment data
          if (newMessage.moment_id && !momentsMap[newMessage.moment_id]) {
            const { data: momentData } = await supabase
              .from('shared_photos')
              .select('*')
              .eq('id', newMessage.moment_id)
              .single();

            if (momentData) {
              const signedMoment = await getSignedMoment(momentData);
              setMomentsMap(prev => ({ ...prev, [signedMoment.id]: signedMoment }));
            }
          }

          // Add to appropriate message list
          if (newMessage.thread_id) {
            // It's a thread message
            if (activeThread && newMessage.thread_id === activeThread.id) {
              setThreadMessages(prev => [newMessage, ...prev]);
            }
            // Update thread list last message time
            setStarterThreads(prev => prev.map(thread => 
              thread.id === newMessage.thread_id 
                ? { ...thread, last_message_at: newMessage.created_at, message_count: (thread.message_count || 0) + 1 }
                : thread
            ));
          } else {
            // Regular message
            setMessages(prev => [newMessage, ...prev]);
          }

          // Mark as read if from friend
          if (newMessage.sender_id === friendId) {
            markMessageAsRead(newMessage.id);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [friendshipId, friendId, startersMap, momentsMap, getSignedMoment, activeThread]);

  const initializeChat = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) return;
      setUserId(uid);

      // Fetch regular messages (non-thread)
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('friendships_id', friendshipId)
        .is('thread_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(messagesData || []);

      // Fetch starter threads
      const { data: threadsData } = await supabase
        .from('starter_threads')
        .select(`
          *,
          starter:starters(*)
        `)
        .eq('friendships_id', friendshipId)
        .order('last_message_at', { ascending: false });

      if (threadsData) {
        // Get message counts for each thread
        const threadsWithCounts = await Promise.all(
          threadsData.map(async (thread) => {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('thread_id', thread.id);
            
            const { count: unreadCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('thread_id', thread.id)
              .eq('recipient_id', uid)
              .eq('is_read', false);

            return {
              ...thread,
              message_count: count || 0,
              unread_count: unreadCount || 0
            };
          })
        );
        
        setStarterThreads(threadsWithCounts);
      }

      // Fetch starter data
      const starterIds = [...(messagesData?.map(m => m.starter_id).filter(Boolean) || []), ...(threadsData?.map(t => t.starter_id) || [])];
      if (starterIds.length > 0) {
        const { data: startersData } = await supabase
          .from('starters')
          .select('*')
          .in('id', starterIds);

        const startersMapData: Record<string, any> = {};
        startersData?.forEach(s => {
          startersMapData[s.id] = s;
        });
        setStartersMap(startersMapData);
      }

      // Process moments
      const momentIds = messagesData?.map(m => m.moment_id).filter(Boolean) as string[] || [];
      if (momentIds.length > 0) {
        const { data: momentsData } = await supabase
          .from('shared_photos')
          .select('*')
          .in('id', momentIds);

        if (momentsData && momentsData.length > 0) {
          const processedMoments = await processMomentsData(momentsData);
          setMomentsMap(processedMoments);
        }
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

  const loadThreadMessages = async (thread: StarterThread) => {
    setActiveThread(thread);
    setActiveTab('thread');
    
    // Fetch messages for this thread
    const { data: threadMessagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: false });

    setThreadMessages(threadMessagesData || []);

    // Mark unread messages as read
    if (userId) {
      const unreadIds = threadMessagesData
        ?.filter(m => m.recipient_id === userId && !m.is_read)
        .map(m => m.id) || [];

      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
        // Update local unread count
        setStarterThreads(prev => prev.map(t => 
          t.id === thread.id ? { ...t, unread_count: 0 } : t
        ));
      }
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);
  };

  const sendMessage = async () => {
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

      // If in thread view, add thread_id
      if (activeTab === 'thread' && activeThread) {
        messageData.thread_id = activeThread.id;
        messageData.starter_id = activeThread.starter_id;
      }

      const { error } = await supabase.from('messages').insert(messageData);

      if (error) {
        console.error('Error sending message:', error);
        setInputText(messageContent);
      } else if (activeThread) {
        // Update thread's last_message_at
        await supabase
          .from('starter_threads')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', activeThread.id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setInputText(messageContent);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === userId;
    const starter = item.starter_id ? startersMap[item.starter_id] : null;
    const starterColor = starter?.colour;

    if (item.moment_id && momentsMap[item.moment_id]) {
      const moment = momentsMap[item.moment_id];
      const images = moment.storage_path.includes(',')
        ? moment.storage_path.split(',')
        : [moment.storage_path];

      return (
        <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
          <MomentCard
            key={`moment-${item.moment_id}`}
            title={moment.title}
            reflection={moment.reflection}
            images={images}
          />
        </View>
      );
    }

    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        <View
          style={[
            styles.messageBubble,
            { backgroundColor: starterColor || (isOwnMessage ? colors.primary : colors.backgroundSecondary) },
          ]}
        >
          <Text style={[styles.messageText, { color: starterColor ? '#fff' : (isOwnMessage ? '#fff' : colors.text) }]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, { color: starterColor || isOwnMessage ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  }, [userId, startersMap, momentsMap, colors]);

  const renderStarterThread = ({ item }: { item: StarterThread }) => {
    const starter = item.starter || startersMap[item.starter_id];
    const hasUnread = item.unread_count && item.unread_count > 0;

    return (
      <TouchableOpacity 
        style={[styles.threadCard, { backgroundColor: colors.backgroundSecondary }]}
        onPress={() => loadThreadMessages(item)}
      >
        <View style={[styles.threadColorBar, { backgroundColor: starter?.colour || colors.primary }]} />
        <View style={styles.threadContent}>
          <View style={styles.threadHeader}>
            <Text style={[styles.threadTitle, { color: colors.text }]} numberOfLines={2}>
              {starter?.text || 'Loading...'}
            </Text>
            {hasUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadText}>{item.unread_count}</Text>
              </View>
            )}
          </View>
          <View style={styles.threadFooter}>
            <Text style={[styles.threadCategory, { color: colors.textSecondary }]}>
              {starter?.category || 'conversation'}
            </Text>
            <Text style={[styles.threadMeta, { color: colors.textSecondary }]}>
              {item.message_count || 0} messages
            </Text>
          </View>
          <Text style={[styles.threadTime, { color: colors.textSecondary }]}>
            {new Date(item.last_message_at).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
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
        returnToChat: 'true'
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

  const getDisplayContent = useCallback(() => {
    if (activeTab === 'thread' && activeThread) {
      return threadMessages;
    }
    return messages;
  }, [activeTab, messages, threadMessages, activeThread]);

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
        <TouchableOpacity 
          onPress={activeTab === 'thread' ? () => setActiveTab('starters') : onBack} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          {activeTab === 'thread' && activeThread ? (
            <View style={styles.threadHeaderInfo}>
              <View style={[styles.threadDot, { backgroundColor: startersMap[activeThread.starter_id]?.colour || colors.primary }]} />
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                Thread: {startersMap[activeThread.starter_id]?.category || 'Conversation'}
              </Text>
            </View>
          ) : (
            <>
              {friendAvatar ? (
                <Image source={{ uri: friendAvatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>{friendName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Text style={[styles.headerTitle, { color: colors.text }]}>{friendName}</Text>
            </>
          )}
        </View>

        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tab Switcher - hide when in thread view */}
      {activeTab !== 'thread' && (
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
              Threads ({starterThreads.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Thread starter info */}
      {activeTab === 'thread' && activeThread && (
        <View style={[styles.threadInfoBar, { backgroundColor: startersMap[activeThread.starter_id]?.colour || colors.primary }]}>
          <Ionicons name="sparkles" size={16} color="#fff" />
          <Text style={styles.threadInfoText} numberOfLines={2}>
            {startersMap[activeThread.starter_id]?.text}
          </Text>
        </View>
      )}

      {/* Content */}
      {activeTab === 'starters' ? (
        <FlatList
          data={starterThreads}
          renderItem={renderStarterThread}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.threadsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="sparkles-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No starter threads yet
              </Text>
              <TouchableOpacity 
                style={[styles.startButton, { backgroundColor: colors.primary }]}
                onPress={handleStartConversation}
              >
                <Text style={styles.startButtonText}>Start a Conversation</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <FlatList
          ref={flatListRef}
          data={getDisplayContent()}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {activeTab === 'thread' ? 'Start the conversation' : 'No messages yet'}
              </Text>
            </View>
          }
        />
      )}

      {/* Input - only show for 'all' tab or when in thread */}
      {(activeTab === 'all' || activeTab === 'thread') && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <View style={[styles.inputContainer, { backgroundColor: colors.background }]}>
            {activeTab === 'all' && (
              <TouchableOpacity style={styles.attachButton} onPress={handleOpenOverlay}>
                <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
              </TouchableOpacity>
            )}

            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder={activeTab === 'thread' ? "Reply to thread..." : "Type a message..."}
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
      )}

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
  threadHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  threadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
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
  threadInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  threadInfoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  threadsList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  threadCard: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  threadColorBar: {
    width: 4,
  },
  threadContent: {
    flex: 1,
    padding: 12,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  threadTitle: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  threadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  threadCategory: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
  threadMeta: {
    fontSize: 13,
  },
  threadTime: {
    fontSize: 12,
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
  startButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
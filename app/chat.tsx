import { useTheme } from '@/context/ThemeProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  moment_id?: string;
  capsule_id?: string;
}

interface Capsule {
  id: string;
  friendships_id: string;
  title: string;
  description?: string;
  capsule_type: string;
  created_by: string;
  last_activity_at: string;
  created_at: string;
  message_count?: number;
  unread_count?: number;
}

interface SharedMoment {
  id: string;
  title: string;
  reflection: string;
  storage_path: string;
  created_at: string;
  uploader_id: string;
  shared_with_id: string;
  capsule_id?: string;
}

interface ChatScreenProps {
  friendshipId: string;
  friendId: string;
  friendName: string;
  friendAvatar?: string;
  onBack: () => void;
}

type TabType = 'all' | 'capsules' | 'moments' | 'capsule';

const useAuth = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const getUser = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!mounted) return;
        setUserId(authData?.user?.id || null);
      } catch (err) {
        console.error('Auth error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setUserId(session?.user?.id || null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { userId, isLoading };
};

const useSignedUrls = () => {
  const signedUrlCache = useRef<Record<string, { url: string; timestamp: number }>>({});
  
  const getSignedMoment = useCallback(async (moment: any): Promise<SharedMoment> => {
    try {
      const paths = moment.storage_path.includes(",")
        ? moment.storage_path.split(",")
        : [moment.storage_path];

      const signedUrls: string[] = [];
      const now = Date.now();
      const cacheExpiry = 50 * 60 * 1000;

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
    } catch (err) {
      console.error('Error getting signed URL:', err);
      return moment;
    }
  }, []);

  return { getSignedMoment };
};

export function ChatScreen({
  friendshipId,
  friendId,
  friendName,
  friendAvatar,
  onBack,
}: ChatScreenProps) {
  const { colors } = useTheme();
  const { userId, isLoading: authLoading } = useAuth();
  const { getSignedMoment } = useSignedUrls();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [moments, setMoments] = useState<SharedMoment[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [activeCapsule, setActiveCapsule] = useState<Capsule | null>(null);
  const [capsuleMessages, setCapsuleMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  
  const [momentsMap, setMomentsMap] = useState<Record<string, SharedMoment>>({});
  
  const flatListRef = useRef<FlatList>(null);  
  const router = useRouter();

  const initializeChat = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    
    try {
      const [messagesResult, capsulesResult, momentsResult] = await Promise.allSettled([
        supabase
          .from('messages')
          .select('*')
          .eq('friendships_id', friendshipId)
          .is('capsule_id', null)
          .order('created_at', { ascending: false })
          .limit(50),
        
        supabase
          .from('capsules')
          .select('*')
          .eq('friendships_id', friendshipId)
          .order('last_activity_at', { ascending: false }),
        
        supabase
          .from('shared_photos')
          .select('*')
          .or(`uploader_id.eq.${userId},shared_with_id.eq.${userId}`)
          .order('created_at', { ascending: false })
      ]);

      const messagesData = messagesResult.status === 'fulfilled' ? messagesResult.value.data || [] : [];
      const capsulesData = capsulesResult.status === 'fulfilled' ? capsulesResult.value.data || [] : [];
      const momentsData = momentsResult.status === 'fulfilled' ? momentsResult.value.data || [] : [];
      
      setMessages(messagesData);

      // Get counts for capsules
      const capsulesWithCounts = await Promise.all(
        capsulesData.map(async (capsule) => {
          const [messageCountResult, unreadCountResult] = await Promise.allSettled([
            supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('capsule_id', capsule.id),
            supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('capsule_id', capsule.id)
              .eq('recipient_id', userId)
              .eq('is_read', false)
          ]);

          return {
            ...capsule,
            message_count: messageCountResult.status === 'fulfilled' ? messageCountResult.value.count || 0 : 0,
            unread_count: unreadCountResult.status === 'fulfilled' ? unreadCountResult.value.count || 0 : 0
          };
        })
      );
      
      setCapsules(capsulesWithCounts);

      // Process moments with signed URLs
      if (momentsData.length > 0) {
        const processedMoments = await Promise.all(
          momentsData.map(moment => getSignedMoment(moment))
        );
        setMoments(processedMoments);
        
        const momentsMapData: Record<string, SharedMoment> = {};
        processedMoments.forEach(m => {
          momentsMapData[m.id] = m;
        });
        setMomentsMap(momentsMapData);
      }

      // Mark unread as read
      const unreadIds = messagesData
        .filter(m => m.recipient_id === userId && !m.is_read)
        .map(m => m.id);

      if (unreadIds.length > 0) {
        supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
      }

    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, friendshipId, getSignedMoment]);

  useEffect(() => {
    if (!userId || !friendshipId) return;

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

          if (newMessage.moment_id && !momentsMap[newMessage.moment_id]) {
            const { data } = await supabase
              .from('shared_photos')
              .select('*')
              .eq('id', newMessage.moment_id)
              .single();
            
            if (data) {
              const signedMoment = await getSignedMoment(data);
              setMomentsMap(prev => ({ ...prev, [signedMoment.id]: signedMoment }));
            }
          }

          if (newMessage.capsule_id) {
            if (activeCapsule && newMessage.capsule_id === activeCapsule.id) {
              setCapsuleMessages(prev => [newMessage, ...prev]);
            }
            setCapsules(prev => prev.map(cap => 
              cap.id === newMessage.capsule_id 
                ? { 
                    ...cap, 
                    last_activity_at: newMessage.created_at, 
                    message_count: (cap.message_count || 0) + 1,
                    unread_count: newMessage.sender_id === friendId 
                      ? (cap.unread_count || 0) + 1 
                      : cap.unread_count
                  }
                : cap
            ));
          } else {
            setMessages(prev => [newMessage, ...prev]);
          }

          if (newMessage.sender_id === friendId) {
            supabase.from('messages').update({ is_read: true }).eq('id', newMessage.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'capsules',
          filter: `friendships_id=eq.${friendshipId}`,
        },
        async (payload) => {
          const newCapsule = payload.new as Capsule;
          setCapsules(prev => [{ ...newCapsule, message_count: 0, unread_count: 0 }, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shared_photos',
        },
        async (payload) => {
          const newMoment = payload.new as SharedMoment;
          // Check if this moment is relevant to this friendship
          if (newMoment.uploader_id === userId || newMoment.shared_with_id === userId) {
            const signedMoment = await getSignedMoment(newMoment);
            setMoments(prev => [signedMoment, ...prev]);
            setMomentsMap(prev => ({ ...prev, [signedMoment.id]: signedMoment }));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, friendshipId, friendId, momentsMap, activeCapsule, getSignedMoment]);

  useEffect(() => {
    if (!authLoading && userId) {
      initializeChat();
    }
  }, [authLoading, userId, initializeChat]);

  const loadCapsuleMessages = useCallback(async (capsule: Capsule) => {
    if (!userId) return;
    
    setActiveCapsule(capsule);
    setActiveTab('capsule');
    
    try {
      const { data: capsuleMessagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('capsule_id', capsule.id)
        .order('created_at', { ascending: false });

      setCapsuleMessages(capsuleMessagesData || []);

      const unreadIds = capsuleMessagesData
        ?.filter(m => m.recipient_id === userId && !m.is_read)
        .map(m => m.id) || [];

      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
        setCapsules(prev => prev.map(c => 
          c.id === capsule.id ? { ...c, unread_count: 0 } : c
        ));
      }
    } catch (error) {
      console.error('Error loading capsule messages:', error);
    }
  }, [userId]);

  const sendMessage = useCallback(async () => {
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

      if (activeTab === 'capsule' && activeCapsule) {
        messageData.capsule_id = activeCapsule.id;
      }

      const { error } = await supabase.from('messages').insert(messageData);

      if (error) throw error;

      if (activeCapsule) {
        await supabase
          .from('capsules')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('id', activeCapsule.id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setInputText(messageContent);
    } finally {
      setSending(false);
    }
  }, [inputText, userId, friendId, friendshipId, activeTab, activeCapsule, sending]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === userId;

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
            { backgroundColor: isOwnMessage ? colors.primary : colors.backgroundSecondary },
          ]}
        >
          <Text style={[styles.messageText, { color: isOwnMessage ? '#fff' : colors.text }]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, { color: isOwnMessage ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  }, [userId, momentsMap, colors]);

  const renderCapsule = useCallback(({ item }: { item: Capsule }) => {
    const hasUnread = item.unread_count && item.unread_count > 0;
    const iconName = 
      item.capsule_type === 'photos' ? 'images' :
      item.capsule_type === 'recipes' ? 'restaurant' :
      item.capsule_type === 'plans' ? 'calendar' :
      item.capsule_type === 'general' ? 'folder' : 'chatbubbles';

    return (
      <TouchableOpacity 
        style={[styles.capsuleCard, { backgroundColor: colors.backgroundSecondary }]}
        onPress={() => loadCapsuleMessages(item)}
      >
        <View style={styles.capsuleIcon}>
          <Ionicons name={iconName as any} size={24} color={colors.primary} />
        </View>
        <View style={styles.capsuleContent}>
          <View style={styles.capsuleHeader}>
            <Text style={[styles.capsuleTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {hasUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadText}>{item.unread_count}</Text>
              </View>
            )}
          </View>
          {item.description && (
            <Text style={[styles.capsuleDescription, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.capsuleFooter}>
            <Text style={[styles.capsuleMeta, { color: colors.textSecondary }]}>
              {item.message_count || 0} messages
            </Text>
            <Text style={[styles.capsuleTime, { color: colors.textSecondary }]}>
              {new Date(item.last_activity_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [colors, loadCapsuleMessages]);

  const renderMoment = useCallback(({ item }: { item: SharedMoment }) => {
    const images = item.storage_path.includes(',')
      ? item.storage_path.split(',')
      : [item.storage_path];

    return (
      <View style={styles.momentContainer}>
        <MomentCard
          title={item.title}
          reflection={item.reflection}
          images={images}
        />
        <Text style={[styles.momentDate, { color: colors.textSecondary }]}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    );
  }, [colors]);

  const displayContent = useMemo(() => {
    if (activeTab === 'capsule' && activeCapsule) {
      return capsuleMessages;
    }
    return messages;
  }, [activeTab, messages, capsuleMessages, activeCapsule]);

  const handleOpenOverlay = useCallback(() => setShowOverlay(true), []);
  const handleCloseOverlay = useCallback(() => setShowOverlay(false), []);

  const handleCreateCapsule = useCallback(() => {
    setShowOverlay(false);
    router.push({
      pathname: "/CreateCapsule",
      params: { 
        friendshipId, 
        friendId,
        friendName,
        returnToChat: 'true'
      },
    });
  }, [router, friendshipId, friendId, friendName]);

  const handleCreateMoment = useCallback(() => {
    setShowOverlay(false);
    router.push({
      pathname: "/ShareMoment",
      params: { friendshipId, friendId },
    });
  }, [router, friendshipId, friendId]);

  if (authLoading || loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Please log in to continue
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity 
          onPress={activeTab === 'capsule' ? () => setActiveTab('capsules') : onBack} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          {activeTab === 'capsule' && activeCapsule ? (
            <View style={styles.capsuleHeaderInfo}>
              <Ionicons 
                name={
                  activeCapsule.capsule_type === 'photos' ? 'images' :
                  activeCapsule.capsule_type === 'recipes' ? 'restaurant' :
                  activeCapsule.capsule_type === 'plans' ? 'calendar' :
                  activeCapsule.capsule_type === 'general' ? 'folder' : 'chatbubbles'
                } 
                size={20} 
                color={colors.primary} 
              />
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                {activeCapsule.title}
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

      {/* Tab Switcher */}
      {activeTab !== 'capsule' && (
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
              activeTab === 'capsules' && styles.activeTab,
              activeTab === 'capsules' && { backgroundColor: colors.primary }
            ]}
            onPress={() => setActiveTab('capsules')}
          >
            <Ionicons 
              name="folder" 
              size={16} 
              color={activeTab === 'capsules' ? '#fff' : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'capsules' ? '#fff' : colors.textSecondary }
            ]}>
              Capsules ({capsules.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'moments' && styles.activeTab,
              activeTab === 'moments' && { backgroundColor: colors.primary }
            ]}
            onPress={() => setActiveTab('moments')}
          >
            <Ionicons 
              name="images" 
              size={16} 
              color={activeTab === 'moments' ? '#fff' : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'moments' ? '#fff' : colors.textSecondary }
            ]}>
              Moments ({moments.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Capsule info bar */}
      {activeTab === 'capsule' && activeCapsule?.description && (
        <View style={[styles.capsuleInfoBar, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.capsuleInfoText, { color: colors.textSecondary }]} numberOfLines={2}>
            {activeCapsule.description}
          </Text>
        </View>
      )}

      {/* Content */}
      {activeTab === 'capsules' ? (
        <FlatList
          data={capsules}
          renderItem={renderCapsule}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.capsulesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No capsules yet
              </Text>
              <TouchableOpacity 
                style={[styles.startButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateCapsule}
              >
                <Text style={styles.startButtonText}>Create a Capsule</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : activeTab === 'moments' ? (
        <FlatList
          data={moments}
          renderItem={renderMoment}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.momentsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No moments shared yet
              </Text>
              <TouchableOpacity 
                style={[styles.startButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateMoment}
              >
                <Text style={styles.startButtonText}>Share a Moment</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <FlatList
          ref={flatListRef}
          data={displayContent}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={8}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {activeTab === 'capsule' ? 'Start the conversation' : 'No messages yet'}
              </Text>
            </View>
          }
        />
      )}

      {/* Input */}
      {(activeTab === 'all' || activeTab === 'capsule') && (
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
              placeholder={activeTab === 'capsule' ? "Reply to capsule..." : "Type a message..."}
              placeholderTextColor={colors.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              onSubmitEditing={sendMessage}
            />

            <TouchableOpacity
              style={[styles.sendButton, { opacity: inputText.trim() ? 1 : 0.5 }]}
              onPress={sendMessage}
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
            <TouchableOpacity style={styles.overlayOption} onPress={handleCreateCapsule}>
              <Ionicons name="folder-outline" size={24} color={colors.primary} />
              <Text style={[styles.overlayText, { color: colors.text }]}>Create Capsule</Text>
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
  errorText: {
    marginTop: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  backButton: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  capsuleHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  menuButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  activeTab: {
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  capsuleInfoBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  capsuleInfoText: {
    fontSize: 14,
  },
  capsulesList: {
    padding: 16,
  },
  capsuleCard: {
    flexDirection: 'row',
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
  },
  capsuleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  capsuleContent: {
    flex: 1,
  },
  capsuleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  capsuleTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  capsuleDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  capsuleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  capsuleMeta: {
    fontSize: 12,
  },
  capsuleTime: {
    fontSize: 12,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  momentsList: {
    padding: 16,
  },
  momentContainer: {
    marginBottom: 16,
  },
  momentDate: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 8,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  messageText: {
    fontSize: 16,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  startButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  attachButton: {
    marginRight: 8,
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    padding: 8,
    marginBottom: 4,
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  overlayOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  overlayText: {
    fontSize: 16,
    marginLeft: 12,
  },
});
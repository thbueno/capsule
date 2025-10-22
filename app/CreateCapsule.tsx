import { useTheme } from '@/context/ThemeProvider';
import { supabase } from "@/lib/supabase";
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";



export default function CreateCapsule() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { friendshipId, friendId, friendName } = params;
  
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  React.useEffect(() => {
    getUserId();
  }, []);

  const getUserId = async () => {
    const { data: authData } = await supabase.auth.getUser();
    setUserId(authData?.user?.id || null);
  };

  const handleCreateCapsule = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title for your capsule");
      return;
    }

    if (!userId || !friendshipId) {
      Alert.alert("Error", "Missing required information");
      return;
    }

    setCreating(true);
    try {
      const { data: newCapsule, error } = await supabase
        .from('capsules')
        .insert({
          friendships_id: friendshipId as string,
          title: title.trim(),
          created_by: userId,
          last_activity_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert("Success", "Capsule created!");
      router.back();
    } catch (err) {
      console.error('Error creating capsule:', err);
      Alert.alert("Error", "Failed to create capsule");
    } finally {
      setCreating(false);
    }
  };

  if (!userId) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Create Capsule
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {friendName && (
        <View style={styles.friendInfo}>
          <Text style={[styles.friendText, { color: colors.textSecondary }]}>
            Creating capsule with: {friendName}
          </Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.label, { color: colors.text }]}>Capsule Title *</Text>
        <TextInput
          style={[styles.input, { 
            color: colors.text, 
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.backgroundSecondary 
          }]}
          placeholder="e.g., Travel Plans, Recipe Ideas, Movie Nights"
          placeholderTextColor={colors.textSecondary}
          value={title}
          onChangeText={setTitle}
          maxLength={50}
        />
        <Text style={[styles.charCount, { color: colors.textSecondary }]}>
          {title.length}/50
        </Text>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.createButton,
            { 
              backgroundColor: colors.primary,
              opacity: title.trim() ? 1 : 0.5 
            }
          ]}
          onPress={handleCreateCapsule}
          disabled={!title.trim() || creating}
        >
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Capsule</Text>
          )}
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  friendInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  friendText: {
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  createButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
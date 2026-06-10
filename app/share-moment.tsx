import { PrimaryButton } from "@/components/Buttons";
import { useTheme } from "@/context/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { shareMoment } from "@/lib/api";
import { pickImages } from "@/lib/images";
import { PickedImage } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MAX_PHOTOS = 5;

export default function ShareMomentScreen() {
  const { colors } = useTheme();
  const { userId } = useAuth();
  const params = useLocalSearchParams<{
    friendshipId?: string;
    friendId?: string;
    capsuleId?: string;
  }>();

  const [images, setImages] = useState<PickedImage[]>([]);
  const [title, setTitle] = useState("");
  const [reflection, setReflection] = useState("");
  const [sharing, setSharing] = useState(false);

  const addImages = async () => {
    const remaining = MAX_PHOTOS - images.length;
    if (remaining <= 0) {
      Alert.alert("Limit reached", `You can share up to ${MAX_PHOTOS} photos per moment.`);
      return;
    }
    const picked = await pickImages(remaining);
    if (picked.length > 0) setImages((prev) => [...prev, ...picked]);
  };

  const handleShare = async () => {
    if (!userId) return;
    if (images.length === 0) {
      Alert.alert("Add photos", "Pick at least one photo to share.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Add a title", "Give your moment a short title.");
      return;
    }

    setSharing(true);
    try {
      await shareMoment({
        uploaderId: userId,
        images,
        title: title.trim(),
        reflection: reflection.trim(),
        friendshipId: params.friendshipId || undefined,
        capsuleId: params.capsuleId || undefined,
      });
      router.back();
    } catch (error: any) {
      console.error("Error sharing moment:", error);
      Alert.alert("Upload failed", error.message ?? "Something went wrong.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={colors.title} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.title }]}>Create a moment</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.photoGrid}>
          {images.map((image, index) => (
            <View key={index} style={styles.photoWrapper}>
              <Image source={{ uri: image.uri }} style={styles.photo} />
              <TouchableOpacity
                style={styles.removePhoto}
                onPress={() => setImages((prev) => prev.filter((_, i) => i !== index))}
              >
                <Ionicons name="close-circle" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < MAX_PHOTOS && (
            <TouchableOpacity
              style={[styles.addPhoto, { borderColor: colors.primary }]}
              onPress={addImages}
            >
              <Ionicons name="add" size={36} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Title</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.title }]}
          placeholder="What's this moment?"
          placeholderTextColor={colors.textSecondary}
          value={title}
          onChangeText={setTitle}
          maxLength={60}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Reflection</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            { borderColor: colors.border, color: colors.title },
          ]}
          placeholder="Why does it matter?"
          placeholderTextColor={colors.textSecondary}
          value={reflection}
          onChangeText={setReflection}
          multiline
          maxLength={280}
        />

        <PrimaryButton
          label={sharing ? "Sharing..." : "Share moment"}
          onPress={handleShare}
          loading={sharing}
          disabled={images.length === 0 || !title.trim()}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerTitle: {
    fontSize: 19,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  photoWrapper: {
    position: "relative",
  },
  photo: {
    width: 104,
    height: 104,
    borderRadius: 16,
  },
  removePhoto: {
    position: "absolute",
    top: -8,
    right: -8,
  },
  addPhoto: {
    width: 104,
    height: 104,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
});

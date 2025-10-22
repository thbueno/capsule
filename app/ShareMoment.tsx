import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { MomentCard } from "../components/MomentCard";
import { useTheme } from "../context/ThemeProvider";
import { supabase } from "../lib/supabase";

interface ShareMomentProps {
  friendId: string;
  friendshipId: string; 
  onShared?: () => void;
}

interface ImageAsset {
  uri: string;
  base64?: string | null;
  type?: "image" | "video" | "livePhoto" | "pairedVideo";
}



export const ShareMoment: React.FC<ShareMomentProps> = ({
  onShared,
}) => {
  const params = useLocalSearchParams();
  const friendshipId = params.friendshipId as string;
  const friendId = params.friendId as string;

  const { colors } = useTheme();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [title, setTitle] = useState("");
  const [reflection, setReflection] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    console.log("Images updated:", images.map(img => img.uri));
  }, [images]);

  // Fetch the current user ID on component mount - same as SharedFriendPage
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      setCurrentUserId(userId ?? null);
    };

    fetchCurrentUser();
  }, [friendId]);

  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert("Limit reached", "You can upload up to 5 pictures.");
      return;
    }

    // Request permissions first
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission denied", "Camera roll permission is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: Platform.OS === "web" ? 0.5 : 0.8,
      base64: true, // ✅ Always request base64 like the working version
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImages((prev) => [
        ...prev,
        { 
          uri: asset.uri, 
          base64: asset.base64,
          type: asset.type
        } as ImageAsset, // ✅ Type assertion to match interface
      ]);
    }
    console.log(images.map(img => img.uri));
  };
  
  const handleUpload = async () => {
    if (!currentUserId) {
      Alert.alert("Authentication Error", "Please log in again.");
      return;
    }

    if (!title || !reflection || images.length === 0) {
      Alert.alert("Missing info", "Please add images, a title, and reflection.");
      return;
    }

    try {
      setUploading(true);

      const uploadedPaths: string[] = [];

      // Upload all images first
      for (const image of images) {
        let fileExt = "jpg";
        if (image.type && image.type === "image") {
          const uriExt = image.uri.split(".").pop()?.toLowerCase();
          if (uriExt && ["jpg", "jpeg", "png", "gif", "webp"].includes(uriExt)) {
            fileExt = uriExt === "jpeg" ? "jpg" : uriExt;
          }
        }

        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const sortedFolder = [currentUserId, friendId].sort().join("_");
        const filePath = `${sortedFolder}/${fileName}`;
        const bucket = "shared-photos";

        let fileToUpload;
        if (Platform.OS === "web") {
          const response = await fetch(image.uri);
          fileToUpload = await response.blob();
        } else {
          if (!image.base64) throw new Error("Base64 data missing for mobile upload");
          fileToUpload = decode(image.base64);
        }

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, fileToUpload, {
            contentType: image.type || "image/jpeg",
            upsert: false,
          });

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
        uploadedPaths.push(`${bucket}/${filePath}`);
      }

      // Insert moment metadata (one row for all images)
      const { data: momentData, error: insertError } = await supabase
        .from("shared_photos")
        .insert({
          uploader_id: currentUserId,
          shared_with_id: friendId,
          storage_path: uploadedPaths.join(","), // store all paths in one field
          title,
          reflection,
        })
        .select();

      if (insertError) throw insertError;
      const momentId = momentData[0].id;

      // Insert message referencing the moment
      const { error: messageError } = await supabase.from("messages").insert({
        sender_id: currentUserId,
        recipient_id: friendId,
        friendships_id: friendshipId as string,
        content: "Shared a moment",
        moment_id: momentId,
      });

      if (messageError) throw messageError;

      Alert.alert("Success", "Your moment has been shared!");
      setImages([]);
      setTitle("");
      setReflection("");
      onShared?.();

    } catch (err: any) {
      console.error("🔥 Upload error:", err);
      Alert.alert("Upload failed", err.message || "An unexpected error occurred");
    } finally {
      setUploading(false);
    }
  };



  return (
  <ScrollView style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
    <TextInput
      value={title}
      onChangeText={setTitle}
      placeholder="Title"
      placeholderTextColor={colors.textSecondary}
      style={{ color: colors.text, marginBottom: 10 }}
    />

    <TextInput
      value={reflection}
      onChangeText={setReflection}
      placeholder="Reflection"
      placeholderTextColor={colors.textSecondary}
      style={{ color: colors.text, marginBottom: 10 }}
      multiline
    />

    {images.length > 0 && (
      <ScrollView horizontal style={{ marginVertical: 16 }}>
        {images.map((img, idx) => (
          <View key={idx} style={{ marginRight: 10 }}>
            <MomentCard
              title={title}
              reflection={reflection}
              images={[img.uri]}
            />
            <TouchableOpacity
              onPress={() => setImages(prev => prev.filter((_, i) => i !== idx))}
              style={{ position: "absolute", top: 5, right: 5 }}
            >
              <Text style={{ color: "red", fontWeight: "bold" }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    )}

    <Button title="Pick Image" onPress={pickImage} />
    <Button title="Upload Moment" onPress={handleUpload} disabled={uploading} />
  </ScrollView>
);

};

export default ShareMoment;


const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    fontSize: 16,
    marginBottom: 12,
  },
  counter: {
    marginVertical: 8,
    fontSize: 14,
    textAlign: "right",
  },
});

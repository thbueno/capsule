import { useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet, Button, Alert, Platform } from "react-native";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";

export default function SharedPage() {
  const { friendId: friendshipId } = useLocalSearchParams(); // this is actually the friendship record ID
  const [userId, setUserId] = useState<string | null>(null);
  const [friend, setFriend] = useState<any>(null);

  useEffect(() => {
    const fetchFriend = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id;
      setUserId(authData.user?.id ?? null);

      if (!currentUserId || !friendshipId) return;

      // 1. Get the friendship row
      const { data: friendship, error: friendshipError } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .eq("id", friendshipId)
        .single();

      if (friendshipError) {
        console.error("❌ Error fetching friendship:", friendshipError);
        return;
      }

      // 2. Determine the "friend"
      const otherId =
        friendship.user_id === currentUserId
          ? friendship.friend_id
          : friendship.user_id;

      // 3. Fetch profile of the other user
      const { data: friendProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, first_name, last_name, avatar_url")
        .eq("id", otherId)
        .single();

      if (profileError) {
        console.error("❌ Error fetching friend profile:", profileError);
        return;
      }

      setFriend(friendProfile);
    };

    fetchFriend();
  }, [friendshipId]);

    const handleUpload = async () => {
    try {
        if (!userId || !friend?.id) {
        console.warn("Missing userId or friend.id", { userId, friendId: friend?.id });
        return;
        }

        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
        Alert.alert("Permission denied", "Camera roll permission is required.");
        return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
        });

        console.log("📷 Picker result:", result);

        if (result.canceled || !result.assets?.[0]) {
        console.warn("Image selection canceled or invalid.");
        return;
        }

        const image = result.assets[0];
        // Fix: Get extension from MIME type instead of URI
        let fileExt = "jpg"; // default
        if (image.type) {
            // image.type is like "image/jpeg" or "image/png"
            fileExt = image.type.split("/")[1] || "jpg";
            if (fileExt === "jpeg") fileExt = "jpg"; // normalize
        }

        const fileName = `${Date.now()}.${fileExt}`;
        const sortedFolder = [userId, friend.id].sort().join("_");
        const filePath = `${sortedFolder}/${fileName}`;
        const bucket = "shared-photos";

        const base64 = image.base64!;
        console.log("🧬 Base64 string length:", base64.length);

        let fileToUpload;
        
        if (Platform.OS === 'web') {
            // On web, fetch the file from URI
            const response = await fetch(image.uri);
            fileToUpload = await response.blob();
        } else {
            // On native, use base64
            const base64 = image.base64!;
            const fileBuffer = decode(base64);
            fileToUpload = fileBuffer;
        }

        console.log("📦 File to upload:", fileToUpload);
        console.log("📦 File type:", typeof fileToUpload);
        
        console.log("⬆️ Uploading to Supabase:", {
            bucket,
            filePath,
            contentType: image.type || "image/jpeg",
        });

        const { data, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, fileToUpload, {
                contentType: image.type || "image/jpeg",
                upsert: false,
            });

        if (uploadError) {
            console.error("🚫 Upload error:", uploadError);
            console.error("🚫 Error details:", JSON.stringify(uploadError, null, 2));
            Alert.alert("Upload failed", uploadError.message);
            return;
        }

        console.log("✅ Upload successful data:", data);
        console.log("✅ Upload successful, inserting metadata...");

        const { error: insertError } = await supabase.from("shared_photos").insert({
        uploader_id: userId,
        shared_with_id: friend.id,
        storage_path: `${bucket}/${filePath}`,
        });

        if (insertError) {
        console.error("❗ DB insert error:", insertError);
        Alert.alert("Metadata insert failed", insertError.message);
        return;
        }

        Alert.alert("Success", "Image uploaded successfully!");
    } catch (err) {
        console.error("🔥 Unexpected error during upload:", err);
    }
    };


  return (
    <View style={styles.container}>
      {friend ? (
        <>
          <Text style={styles.title}>Shared Page with {friend.username}</Text>
          <Text>Name: {friend.first_name} {friend.last_name}  </Text>
          <Button title="Upload Image" onPress={handleUpload} />
        </>
      ) : (
        <Text>Loading friend data...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
});

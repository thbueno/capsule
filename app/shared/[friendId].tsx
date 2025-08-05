import { useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet, Button, Alert, Platform, ScrollView, Image, Dimensions, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";

const { width: screenWidth } = Dimensions.get('window');

export default function SharedPage() {
  const { friendId: friendshipId } = useLocalSearchParams(); // this is actually the friendship record ID
  const [userId, setUserId] = useState<string | null>(null);
  const [friend, setFriend] = useState<any>(null);
  const [sharedPhotos, setSharedPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

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
        setLoading(false);
        return;
      }

      setFriend(friendProfile);
      
      // 4. Fetch shared photos
      await fetchSharedPhotos(currentUserId, otherId);
      setLoading(false);
    };

    fetchFriend();
  }, [friendshipId]);

  const fetchSharedPhotos = async (currentUserId: string, friendId: string) => {
    try {
      // Get photos shared between these two users
      const { data: photos, error } = await supabase
        .from("shared_photos")
        .select("*")
        .or(`and(uploader_id.eq.${currentUserId},shared_with_id.eq.${friendId}),and(uploader_id.eq.${friendId},shared_with_id.eq.${currentUserId})`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching photos:", error);
        return;
      }

      // Get signed URLs for each photo
      const photosWithUrls = await Promise.all(
        photos.map(async (photo) => {
          const { data: urlData } = await supabase.storage
            .from("shared-photos")
            .createSignedUrl(photo.storage_path.replace("shared-photos/", ""), 3600); // 1 hour expiry

          return {
            ...photo,
            imageUrl: urlData?.signedUrl || null,
          };
        })
      );

      setSharedPhotos(photosWithUrls.filter(photo => photo.imageUrl));
    } catch (error) {
      console.error("❌ Error in fetchSharedPhotos:", error);
    }
  };

  const handleUpload = async () => {
    try {
      if (!userId || !friend?.id) {
        console.warn("Missing userId or friend.id", { userId, friendId: friend?.id });
        return;
      }

      setUploading(true);

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission denied", "Camera roll permission is required.");
        setUploading(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: Platform.OS === 'web' ? 0.5 : 0.8, // Lower quality for web
        base64: true,
      });

      console.log("📷 Picker result:", result);

      if (result.canceled || !result.assets?.[0]) {
        console.warn("Image selection canceled or invalid.");
        setUploading(false);
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
        setUploading(false);
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
        setUploading(false);
        return;
      }

      Alert.alert("Success", "Image uploaded successfully!");
      
      // Refresh the photos after successful upload
      await fetchSharedPhotos(userId, friend.id);
      setUploading(false);
    } catch (err) {
      console.error("🔥 Unexpected error during upload:", err);
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {friend ? (
        <>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Shared with {friend.username}</Text>
            <Text style={styles.subtitle}>{friend.first_name} {friend.last_name}</Text>
          </View>

          {/* Photo Carousel */}
          <View style={styles.carouselContainer}>
            {sharedPhotos.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContent}
                snapToInterval={screenWidth * 0.8 + 15} // Image width + margin
                decelerationRate="fast"
              >
                {sharedPhotos.map((photo, index) => (
                  <View key={photo.id} style={styles.imageContainer}>
                    <Image
                      source={{ uri: photo.imageUrl }}
                      style={styles.carouselImage}
                      resizeMode="cover"
                    />
                    <Text style={styles.imageDate}>
                      {new Date(photo.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No shared photos yet</Text>
                <Text style={styles.emptySubtext}>Upload your first photo to get started!</Text>
              </View>
            )}
          </View>

          {/* Upload Button */}
          <View style={styles.uploadContainer}>
            <Button 
              title={uploading ? "Uploading..." : "Upload Image"} 
              onPress={handleUpload} 
              disabled={uploading}
            />
          </View>
        </>
      ) : (
        <View style={styles.centerContent}>
          <Text>Error loading friend data</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  carouselContainer: {
    flex: 1,
    paddingVertical: 20,
  },
  carouselContent: {
    paddingHorizontal: 10,
  },
  imageContainer: {
    marginHorizontal: 7.5,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  carouselImage: {
    width: screenWidth * 0.8,
    height: screenWidth * 0.8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  imageDate: {
    padding: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  uploadContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
});
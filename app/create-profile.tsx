import { useState } from "react";
import {
  View,
  Text,
  Platform,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";
import { decode } from "base64-arraybuffer";


export default function CreateProfile() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [handle, setHandle] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission denied", "Camera roll permission is required.");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: Platform.OS === "web" ? 0.5 : 0.8,
      base64: true,
      allowsEditing: true,
    });

    console.log("📷 Picker result:", result);

    if (result.canceled || !result.assets?.[0]) {
      Alert.alert("Cancelled", "Image selection was cancelled.");
      return null;
    }

    const image = result.assets[0];

    let fileExt = "jpg";
    if (image.type) {
      fileExt = image.type.split("/")[1] || "jpg";
      if (fileExt === "jpeg") fileExt = "jpg";
    }

    const filePath = `${userId}.${fileExt}`;
    const bucket = "profile-pictures";

    let fileToUpload;

    if (Platform.OS === "web") {
      const response = await fetch(image.uri);
      fileToUpload = await response.blob();
    } else {
      const base64 = image.base64!;
      const fileBuffer = decode(base64); // This gives us an ArrayBuffer
      fileToUpload = fileBuffer;
    }

    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileToUpload, {
        contentType: image.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("❌ Upload error:", uploadError);
      Alert.alert("Upload failed", uploadError.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData?.publicUrl ?? null;
    console.log("✅ Uploaded avatar URL:", publicUrl);
    return publicUrl;
  };

  const handleCreateProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert("Not logged in");
      return;
    }

    setLoading(true);

    let avatarUrl: string | null = null;
    if (imageUri) {
      avatarUrl = await uploadAvatar(user.id);
    }

    const { error } = await supabase.from("profiles").insert([
      {
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        username,
        handle,
        avatar_url: avatarUrl,
      },
    ]);

    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      router.replace("/" as any);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Your Profile</Text>

      <TextInput value={firstName} onChangeText={setFirstName} placeholder="First Name" style={styles.input} />
      <TextInput value={lastName} onChangeText={setLastName} placeholder="Last Name" style={styles.input} />
      <TextInput value={username} onChangeText={setUsername} placeholder="Username" style={styles.input} />
      <TextInput value={handle} onChangeText={setHandle} placeholder="Handle (e.g. @yourname)" style={styles.input} autoCapitalize="none" />

      <Button title="Choose Profile Picture" onPress={pickImage} />
      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}

      <View style={{ marginTop: 16 }}>
        <Button title={loading ? "Creating..." : "Create Profile"} onPress={handleCreateProfile} disabled={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 12,
    borderRadius: 5,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginTop: 12,
    alignSelf: "center",
  },
});

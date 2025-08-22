import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

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
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
    <SafeAreaView style={styles.container}>
      {/* Status Bar Area */}
      <View style={styles.statusBar}>
        <View style={styles.dynamicIsland} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressStep, styles.progressStepActive]} />
        <View style={[styles.progressStep, styles.progressStepActive]} />
        <View style={styles.progressStep} />
        <View style={styles.progressStep} />
      </View>

      {/* Navigation Header */}
      <View style={styles.navigationHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={16} color="#6B6B6B" />
        </TouchableOpacity>
      </View>

      {/* Page Title */}
      <Text style={styles.pageTitle}>Create Profile</Text>

      {/* Avatar Section */}
      <View style={styles.avatarContainer}>
        <TouchableOpacity style={styles.avatarCircle} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person-outline" size={48} color="#D4A574" />
          )}
          <View style={styles.editButton}>
            <Ionicons name="pencil" size={18} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Form Fields */}
      <View style={styles.formContainer}>
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>First Name</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter your first name"
            placeholderTextColor="#A8A8A8"
            style={styles.fieldInput}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Last Name</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Enter your last name"
            placeholderTextColor="#A8A8A8"
            style={styles.fieldInput}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="your username"
            placeholderTextColor="#A8A8A8"
            style={styles.fieldInput}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Handle</Text>
          <TextInput
            value={handle}
            onChangeText={setHandle}
            placeholder="@yourname"
            placeholderTextColor="#A8A8A8"
            style={styles.fieldInput}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Spacer to push button to bottom */}
      <View style={styles.spacer} />

      {/* Primary Button */}
      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
        onPress={handleCreateProfile}
        disabled={loading}
      >
        <Text style={styles.primaryButtonText}>
          {loading ? "Creating..." : "save changes"}
        </Text>
      </TouchableOpacity>

      {/* Link Text */}
      <TouchableOpacity onPress={() => router.replace("/login")}>
        <Text style={styles.linkText}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F2E8", // Primary background from design system
    width: "100%",
    minHeight: "100%",
  },
  statusBar: {
    height: 44,
    backgroundColor: "transparent",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  dynamicIsland: {
    width: 126,
    height: 37,
    backgroundColor: "#000000",
    borderRadius: 19,
    position: "absolute",
    top: 8,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  progressStep: {
    height: 4,
    flex: 1,
    borderRadius: 2,
    backgroundColor: "#E8E5DD", // Pale gray from design system
  },
  progressStepActive: {
    backgroundColor: "#FF4D36", // Orange accent from design system
  },
  navigationHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    marginTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#E8E5DD",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 33.6, // 1.2 line height
    letterSpacing: -0.56, // -0.02em
    color: "#2D2D2D", // Primary text color
    textAlign: "center",
    marginTop: 32,
    marginBottom: 48,
    marginHorizontal: 20,
  },
  avatarContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 48,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    backgroundColor: "transparent",
    borderWidth: 3,
    borderColor: "#D4A574", // Accent gold color
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarImage: {
    width: 114, // Slightly smaller to account for border
    height: 114,
    borderRadius: 57,
  },
  editButton: {
    width: 36,
    height: 36,
    backgroundColor: "#2D2D2D",
    borderRadius: 18,
    position: "absolute",
    bottom: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  fieldContainer: {
    marginBottom: 32,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 19.6, // 1.4 line height
    color: "#D4A574", // Accent gold color
    marginBottom: 12,
  },
  fieldInput: {
    width: "100%",
    height: 56,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#E8E5DD",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "400",
    color: "#2D2D2D",
  },
  spacer: {
    flex: 1,
  },
  primaryButton: {
    height: 56,
    backgroundColor: "#FF4D36", // Orange accent
    borderRadius: 12,
    marginHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.32, // 0.02em
  },
  linkText: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24, // 1.5 line height
    color: "#D4A574", // Accent gold color
    textAlign: "center",
    marginHorizontal: 20,
    marginBottom: 32,
  },
});

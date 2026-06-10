import { PrimaryButton } from "@/components/Buttons";
import { useTheme } from "@/context/ThemeProvider";
import { pickImages, uploadImage } from "@/lib/images";
import { supabase } from "@/lib/supabase";
import { PickedImage } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateProfile() {
  const { colors } = useTheme();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [handle, setHandle] = useState("");
  const [avatar, setAvatar] = useState<PickedImage | null>(null);
  const [loading, setLoading] = useState(false);

  const pickAvatar = async () => {
    const [image] = await pickImages(1);
    if (image) setAvatar(image);
  };

  const handleCreateProfile = async () => {
    if (!username.trim()) {
      Alert.alert("Missing info", "Pick a username.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("Not logged in");
      return;
    }

    setLoading(true);
    try {
      let avatarUrl: string | null = null;
      if (avatar) {
        const path = await uploadImage("profile-pictures", user.id, avatar, {
          upsert: true,
          fileName: "avatar.jpg",
        });
        const { data } = supabase.storage.from("profile-pictures").getPublicUrl(path);
        // Cache-bust so a replaced avatar shows up immediately.
        avatarUrl = data?.publicUrl ? `${data.publicUrl}?v=${Date.now()}` : null;
      }

      const { error } = await supabase.from("profiles").insert({
        id: user.id,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        username: username.trim(),
        handle: handle.trim().replace(/^@/, "") || null,
        avatar_url: avatarUrl,
      });
      if (error) throw error;

      router.replace("/");
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Could not create profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.title, { color: colors.title }]}>Create Profile</Text>

          <View style={styles.avatarContainer}>
            <TouchableOpacity
              style={[styles.avatarCircle, { borderColor: colors.primary }]}
              onPress={pickAvatar}
            >
              {avatar ? (
                <Image source={{ uri: avatar.uri }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person-outline" size={48} color={colors.primary} />
              )}
              <View style={[styles.editBadge, { backgroundColor: colors.title }]}>
                <Ionicons name="pencil" size={16} color={colors.background} />
              </View>
            </TouchableOpacity>
          </View>

          {(
            [
              { label: "First Name", value: firstName, set: setFirstName, placeholder: "Enter your first name" },
              { label: "Last Name", value: lastName, set: setLastName, placeholder: "Enter your last name" },
              { label: "Username", value: username, set: setUsername, placeholder: "your username" },
              { label: "Handle", value: handle, set: setHandle, placeholder: "@yourname" },
            ] as const
          ).map((field) => (
            <View key={field.label} style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{field.label}</Text>
              <TextInput
                value={field.value}
                onChangeText={field.set}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize={
                  field.label === "Username" || field.label === "Handle" ? "none" : "words"
                }
                style={[styles.input, { borderColor: colors.border, color: colors.title }]}
              />
            </View>
          ))}

          <PrimaryButton
            label="Save profile"
            onPress={handleCreateProfile}
            loading={loading}
            style={{ marginTop: 12 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 24,
    marginBottom: 32,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderWidth: 3,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  editBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    position: "absolute",
    bottom: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 52,
  },
});

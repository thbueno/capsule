import { Avatar } from "@/components/Avatar";
import { OutlineButton } from "@/components/Buttons";
import { useTheme } from "@/context/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfile } from "@/lib/api";
import { pickImages, uploadImage } from "@/lib/images";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { colors, colorScheme, toggleTheme } = useTheme();
  const { userId } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();

  const profileId = params.id || userId;
  const isOwn = profileId === userId;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profileId) return;
    setProfile(await fetchProfile(profileId));
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    load();
  }, [load]);

  const changeAvatar = async () => {
    if (!userId) return;
    const [image] = await pickImages(1);
    if (!image) return;
    try {
      const path = await uploadImage("profile-pictures", userId, image, {
        upsert: true,
        fileName: "avatar.jpg",
      });
      const { data } = supabase.storage.from("profile-pictures").getPublicUrl(path);
      const avatarUrl = data?.publicUrl ? `${data.publicUrl}?v=${Date.now()}` : null;
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", userId);
      if (error) throw error;
      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev));
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Could not update avatar");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={colors.title} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.title }]}>
          {isOwn ? "Your profile" : "Profile"}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <TouchableOpacity disabled={!isOwn} onPress={changeAvatar}>
          <Avatar
            uri={profile?.avatar_url}
            name={profile?.username ?? "?"}
            size={120}
          />
          {isOwn && (
            <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="pencil" size={16} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        <Text style={[styles.name, { color: colors.title }]}>
          {profile?.username ?? "Unknown"}
        </Text>
        {profile?.handle ? (
          <Text style={[styles.handle, { color: colors.textSecondary }]}>@{profile.handle}</Text>
        ) : null}
        {profile?.first_name || profile?.last_name ? (
          <Text style={[styles.fullName, { color: colors.text }]}>
            {[profile?.first_name, profile?.last_name].filter(Boolean).join(" ")}
          </Text>
        ) : null}

        {isOwn && (
          <View style={styles.settings}>
            <View style={[styles.settingRow, { borderColor: colors.border }]}>
              <Ionicons name="moon-outline" size={22} color={colors.title} />
              <Text style={[styles.settingLabel, { color: colors.title }]}>Dark mode</Text>
              <Switch
                value={colorScheme === "dark"}
                onValueChange={toggleTheme}
                trackColor={{ true: colors.primary }}
              />
            </View>

            <OutlineButton label="Sign out" onPress={handleSignOut} style={{ marginTop: 24 }} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    flex: 1,
    alignItems: "center",
    paddingTop: 32,
    paddingHorizontal: 24,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 26,
    fontWeight: "700",
    marginTop: 16,
  },
  handle: {
    fontSize: 15,
    marginTop: 2,
  },
  fullName: {
    fontSize: 15,
    marginTop: 6,
  },
  settings: {
    alignSelf: "stretch",
    marginTop: 40,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
});

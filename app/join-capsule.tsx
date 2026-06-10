import { PrimaryButton } from "@/components/Buttons";
import { useTheme } from "@/context/ThemeProvider";
import { joinCapsule } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function JoinCapsule() {
  const { colors } = useTheme();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    const trimmed = code.trim();
    if (trimmed.length < 6) {
      Alert.alert("Invalid code", "Invite codes are 6 characters long.");
      return;
    }
    setJoining(true);
    try {
      const capsuleId = await joinCapsule(trimmed);
      router.replace({ pathname: "/capsule", params: { id: capsuleId } });
    } catch {
      Alert.alert("Couldn't join", "That invite code doesn't match any capsule.");
    } finally {
      setJoining(false);
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
      </View>

      <View style={styles.content}>
        <Ionicons name="people-circle-outline" size={64} color={colors.primary} />
        <Text style={[styles.title, { color: colors.title }]}>Join a capsule</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Got an invite code from a friend? Enter it below to join their group capsule — a wedding
          album, a trip, anything you&apos;re collecting together.
        </Text>

        <TextInput
          style={[styles.codeInput, { borderColor: colors.primary, color: colors.title }]}
          placeholder="ABC123"
          placeholderTextColor={colors.textSecondary}
          value={code}
          onChangeText={(value) => setCode(value.toUpperCase())}
          autoCapitalize="characters"
          maxLength={6}
        />

        <PrimaryButton
          label="Join capsule"
          onPress={handleJoin}
          loading={joining}
          disabled={code.trim().length < 6}
          style={{ alignSelf: "stretch" }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
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
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 48,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginTop: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32,
  },
  codeInput: {
    borderWidth: 2,
    borderRadius: 18,
    borderStyle: "dashed",
    paddingHorizontal: 24,
    paddingVertical: 16,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 6,
    textAlign: "center",
    alignSelf: "stretch",
    marginBottom: 24,
  },
});

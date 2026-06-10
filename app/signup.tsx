import { PrimaryButton } from "@/components/Buttons";
import { useTheme } from "@/context/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Signup() {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Missing info", "Fill out all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Check passwords", "Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Weak password", "Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert("Sign up failed", error.message);
      return;
    }

    // If email confirmation is disabled, a session exists and the auth
    // listener routes straight to profile creation. Otherwise the user must
    // confirm via email first.
    if (!data.session) {
      Alert.alert("Check your email", "Confirm your email to finish registration.");
      router.replace("/login");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.content}
      >
        <View style={styles.logoRow}>
          <Ionicons name="heart-circle" size={56} color={colors.primary} />
          <Text style={[styles.appName, { color: colors.title }]}>capsule</Text>
        </View>

        <Text style={[styles.title, { color: colors.title }]}>Sign up</Text>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="example@gmail.com"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[styles.input, { borderColor: colors.border, color: colors.title }]}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Create a password</Text>
          <View>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="must be 8 characters"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassword}
              style={[styles.input, { borderColor: colors.border, color: colors.title }]}
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword((v) => !v)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm password</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="repeat password"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry={!showPassword}
            style={[styles.input, { borderColor: colors.border, color: colors.title }]}
          />
        </View>

        <PrimaryButton label="Sign up" onPress={handleSignup} loading={loading} />

        <TouchableOpacity style={styles.link} onPress={() => router.replace("/login")}>
          <Text style={[styles.linkText, { color: colors.textSecondary }]}>
            Already have an account?{" "}
            <Text style={{ color: colors.primary, fontWeight: "600" }}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  logoRow: {
    alignItems: "center",
    marginBottom: 24,
  },
  appName: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 36,
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
  eyeIcon: {
    position: "absolute",
    right: 16,
    top: 16,
  },
  link: {
    alignItems: "center",
    marginTop: 24,
  },
  linkText: {
    fontSize: 14,
  },
});

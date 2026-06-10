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

export default function Login() {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing info", "Enter your email and password.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert("Sign in failed", error.message);
    // On success the auth listener in _layout redirects automatically.
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

        <Text style={[styles.title, { color: colors.title }]}>Sign in</Text>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="example@gmail.com"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { borderColor: colors.border, color: colors.title }]}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
          <View>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="must be 8 characters"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassword}
              style={[styles.input, { borderColor: colors.border, color: colors.title }]}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword((v) => !v)}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <PrimaryButton label="Log in" onPress={handleLogin} loading={loading} />

        <TouchableOpacity style={styles.link} onPress={() => router.replace("/signup")}>
          <Text style={[styles.linkText, { color: colors.textSecondary }]}>
            Don&apos;t have an account?{" "}
            <Text style={{ color: colors.primary, fontWeight: "600" }}>Sign up</Text>
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

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      alert(error.message);
    }
    // ✅ REMOVED: router.push("/") - Let the layout handle the redirect!
    // The auth state change in layout will automatically redirect to the right place
  };

  const goToRegister = () => {
    router.replace("/signup" as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button and progress indicator */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color="#2C2C2C" />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
        </View>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <Text style={styles.title}>Sign in</Text>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="example@gmail.com"
              placeholderTextColor="#D4B896"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Create a password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="must be 8 characters"
                placeholderTextColor="#D4B896"
                secureTextEntry
                style={styles.passwordInput}
              />
              <TouchableOpacity style={styles.eyeIcon}>
                <Ionicons name="eye-outline" size={20} color="#B8956A" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              loading && styles.primaryButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "Logging in..." : "Log in"}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Or Register with</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity style={styles.secondaryButton}>
            <Ionicons name="logo-google" size={20} color="#2C2C2C" />
            <Text style={styles.secondaryButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>
              Already have an account?{" "}
              <Text style={styles.linkTextBold} onPress={goToRegister}>
                Log in
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDF6F0", // Exact background from design system
    paddingHorizontal: 24,
    minHeight: "100%",
  },
  header: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
    marginTop: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8, // Design system specifies 8px
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(184, 149, 106, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressContainer: {
    flex: 1,
    marginLeft: 16,
  },
  progressBar: {
    height: 3, // Design system specifies 3px
    backgroundColor: "rgba(184, 149, 106, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    width: "25%", // Design system specifies 25%
    backgroundColor: "#FF4B33", // Exact accent color
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: "600",
    lineHeight: 38.4, // 1.2 line height
    letterSpacing: -0.5,
    color: "#2D2D2D", // Exact primary text color
    textAlign: "center",
    marginBottom: 48, // Design system spacing
  },
  form: {
    gap: 24,
  },
  fieldGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#B8956A", // Exact secondary text color
    marginBottom: 8,
  },
  input: {
    width: "100%",
    padding: 16,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(184, 149, 106, 0.3)", // Design system border
    borderRadius: 12,
    color: "#2D2D2D",
    minHeight: 52,
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    width: "100%",
    padding: 16,
    paddingRight: 48,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(184, 149, 106, 0.3)",
    borderRadius: 12,
    color: "#2D2D2D",
    minHeight: 52,
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: [{ translateY: -10 }],
    padding: 4,
  },
  primaryButton: {
    width: "100%",
    padding: 16,
    backgroundColor: "#FF4B33", // Exact accent color
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    minHeight: 52,
  },
  primaryButtonDisabled: {
    backgroundColor: "#D4B896", // Design system disabled color
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 32, // Design system spacing
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(184, 149, 106, 0.3)",
  },
  dividerText: {
    fontSize: 14,
    color: "#B8956A",
    paddingHorizontal: 16,
    backgroundColor: "#FDF6F0",
  },
  secondaryButton: {
    width: "100%",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(184, 149, 106, 0.3)",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2D2D2D",
  },
  linkContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  linkText: {
    fontSize: 14,
    textAlign: "center",
    color: "#B8956A",
  },
  linkTextBold: {
    fontSize: 14,
    color: "#2D2D2D", // Design system link color
    fontWeight: "500",
  },
});

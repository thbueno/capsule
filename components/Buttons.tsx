import { useTheme } from "@/context/ThemeProvider";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

/** Big rounded outline CTA ("Create a moment", "Create a Capsule"). */
export function OutlineButton({ label, onPress, disabled, loading, style }: ButtonProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.button, { borderColor: colors.primary, borderWidth: 1.5 }, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Text style={[styles.label, { color: colors.primary }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

/** Filled orange CTA. */
export function PrimaryButton({ label, onPress, disabled, loading, style }: ButtonProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.primary }, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[styles.label, { color: "#fff" }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  label: {
    fontSize: 17,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.5,
  },
});

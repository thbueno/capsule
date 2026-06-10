import { useTheme } from "@/context/ThemeProvider";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
  /** Squircle (default, like the designs) or full circle. */
  shape?: "squircle" | "circle";
}

export function Avatar({ uri, name, size = 48, shape = "squircle" }: AvatarProps) {
  const { colors } = useTheme();
  const radius = shape === "circle" ? size / 2 : size * 0.36;
  const frame = { width: size, height: size, borderRadius: radius };

  if (uri && uri.startsWith("http")) {
    return <Image source={{ uri }} style={frame} resizeMode="cover" />;
  }

  return (
    <View style={[frame, styles.fallback, { backgroundColor: colors.backgroundSecondary }]}>
      <Text style={{ color: colors.title, fontWeight: "700", fontSize: size * 0.4 }}>
        {(name || "?").charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    justifyContent: "center",
    alignItems: "center",
  },
});

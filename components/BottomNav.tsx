import { useTheme } from "@/context/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

/** Floating pill nav from the home design: friends · new capsule · home · settings. */
export function BottomNav() {
  const { colors, theme } = useTheme();

  return (
    <View style={[styles.bar, { backgroundColor: colors.backgroundSecondary }, theme.shadows.md]}>
      <TouchableOpacity style={styles.item} onPress={() => router.push("/friends")}>
        <Ionicons name="person-outline" size={26} color={colors.title} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.item}
        onPress={() => router.push({ pathname: "/create-capsule", params: { group: "1" } })}
      >
        <Ionicons name="images-outline" size={26} color={colors.title} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.item} onPress={() => router.push("/join-capsule")}>
        <Ionicons name="heart-circle-outline" size={28} color={colors.title} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.item} onPress={() => router.push("/profile")}>
        <Ionicons name="settings-outline" size={26} color={colors.title} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    height: 64,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 12,
  },
  item: {
    padding: 10,
  },
});

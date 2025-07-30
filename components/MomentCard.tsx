import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { useTheme } from "../context/ThemeProvider";
import { MomentCardProps } from "../types";

export const MomentCard: React.FC<MomentCardProps> = ({
  imageUri,
  onAddPress,
}) => {
  const { colors, theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.backgroundSecondary,
          ...theme.shadows.lg,
        },
      ]}
    >
      <Image
        source={{ uri: imageUri }}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Gradient overlay */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.6)"]}
        style={styles.gradientOverlay}
      />

      <TouchableOpacity
        style={[
          styles.addButton,
          {
            backgroundColor: colors.background,
            ...theme.shadows.md,
          },
        ]}
        onPress={onAddPress}
        activeOpacity={0.8}
      >
        {/* Plus icon placeholder */}
        <View style={styles.plusIcon}>
          <View
            style={[styles.plusHorizontal, { backgroundColor: colors.title }]}
          />
          <View
            style={[styles.plusVertical, { backgroundColor: colors.title }]}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    overflow: "hidden",
    aspectRatio: 0.8, // 4:5 aspect ratio
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  addButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  plusIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  plusHorizontal: {
    position: "absolute",
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  plusVertical: {
    position: "absolute",
    width: 2,
    height: 16,
    borderRadius: 1,
  },
});

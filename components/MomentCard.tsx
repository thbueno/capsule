import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Dimensions, FlatList, Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeProvider";
import { MomentCardProps } from "../types";

const { width } = Dimensions.get("window");
const containerWidth = Dimensions.get("window").width - 40; // matches container margins
const containerHeight = containerWidth / 0.8;


export const MomentCard: React.FC<MomentCardProps> = ({
  title,
  reflection,
  images
}) => {
  const { colors, theme } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);


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
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / width
          );
          setActiveIndex(index);
        }}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={styles.image}
            resizeMode="cover"
          />
        )}
        keyExtractor={(_, index) => index.toString()}
      />

      {/* Gradient overlay for text */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.6)"]}
        style={styles.gradientOverlay}
      />

      {/* Title and reflection */}
      <View style={styles.textOverlay}>
        {title ? <Text style={[styles.title, { color: colors.title }]}>{title}</Text> : null}
        {reflection ? (
          <Text style={[styles.reflection, { color: colors.text }]} numberOfLines={3}>
            {reflection}
          </Text>
        ) : null}
      </View>
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
    width: containerWidth,
    height: containerHeight,   // fill the card height
    borderRadius: 20,    // match container
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  textOverlay: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  reflection: {
    fontSize: 14,
  },
});

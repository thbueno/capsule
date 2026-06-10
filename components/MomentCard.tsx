import { useTheme } from "@/context/ThemeProvider";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { FlatList, Image, StyleSheet, Text, View } from "react-native";

interface MomentCardProps {
  title: string;
  reflection: string;
  images: string[];
  /** Card width; height follows the 4:5 design ratio. */
  width?: number;
}

/** Photo card with gradient caption overlay — used inline in chat threads. */
export function MomentCard({ title, reflection, images, width = 260 }: MomentCardProps) {
  const { theme } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const height = width / 0.8;

  return (
    <View style={[styles.container, { width, height }, theme.shadows.md]}>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={{ width, height }} resizeMode="cover" />
        )}
        keyExtractor={(_, index) => index.toString()}
      />

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.65)"]}
        style={styles.gradientOverlay}
        pointerEvents="none"
      />

      <View style={styles.textOverlay} pointerEvents="none">
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {reflection ? (
          <Text style={styles.reflection} numberOfLines={3}>
            {reflection}
          </Text>
        ) : null}
      </View>

      {images.length > 1 && (
        <View style={styles.dots} pointerEvents="none">
          {images.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, { opacity: index === activeIndex ? 1 : 0.4 }]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#00000010",
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 110,
  },
  textOverlay: {
    position: "absolute",
    bottom: 14,
    left: 14,
    right: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  reflection: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
  },
  dots: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    flexDirection: "row",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
});

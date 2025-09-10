import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeProvider';
import { StarterCardProps } from '../types';

export const StarterCard: React.FC<StarterCardProps & { backgroundColor?: string }> = ({
  text,
  onResponse,
  backgroundColor,
}) => {
  const { colors, theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: backgroundColor || colors.cardBackground, // 👈 use category hex if available
          ...theme.shadows.md,
        },
      ]}
      onPress={onResponse}
      activeOpacity={0.9}
    >
      {/* Quote icon placeholder */}
      <View style={styles.quoteIcon}>
        <Text style={[styles.quoteText, { color: colors.cardText }]}>"</Text>
      </View>

      <Text style={[styles.text, { color: colors.cardText }]}>
        {text}
      </Text>

      <TouchableOpacity
        style={[styles.responseButton, { backgroundColor: colors.overlayLight }]}
        onPress={onResponse}
        activeOpacity={0.7}
      >
        <Text style={[styles.responseIcon, { color: colors.cardText }]}>💬</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginHorizontal: 20,
    marginBottom: 16,
    minHeight: 100,
    justifyContent: 'center',
    position: 'relative',
  },
  quoteIcon: {
    marginBottom: 12,
  },
  quoteText: {
    fontSize: 24,
    fontWeight: '300',
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24, // 1.5 line height
    textAlign: 'left',
  },
  responseButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  responseIcon: {
    fontSize: 16,
  },
});
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeProvider';
import { HeaderProps } from '../types';

export const Header: React.FC<HeaderProps> = ({ title, onProfilePress }) => {
  const { colors, theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.title }]}>
        {title}
      </Text>
      
      <TouchableOpacity 
        style={[styles.profileButton, { borderColor: colors.primary }]}
        onPress={onProfilePress}
        activeOpacity={0.7}
      >
        {/* Placeholder for profile avatar - will be replaced with actual image */}
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    paddingHorizontal: 20,
    paddingTop: 44, // Status bar offset
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
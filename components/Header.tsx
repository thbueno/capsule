import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeProvider';
import { HeaderProps } from '../types';

export const Header: React.FC<HeaderProps> = ({ title, onProfilePress, avatarUrl }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: colors.background,
        paddingTop: insets.top + 12, // Safe area + additional padding
        height: insets.top + 72, // Safe area + content height
      }
    ]}>
      <Text style={[styles.title, { color: colors.title }]}>
        {title}
      </Text>
      
      <TouchableOpacity 
      style={[styles.profileButton, { borderColor: colors.primary }]}
      onPress={onProfilePress}
      activeOpacity={0.7}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={styles.avatarImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end', // Align to bottom of container
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
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeProvider';

interface ChatInterfaceProps {
  selectedFriendName?: string;
  onSendMessage?: (message: string) => void;
  onCameraPress?: () => void;
  onGalleryPress?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  selectedFriendName = 'Lewis',
  onSendMessage,
  onCameraPress,
  onGalleryPress,
}) => {
  const { colors, theme } = useTheme();
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && onSendMessage) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.backgroundSecondary,
              color: colors.text,
            },
          ]}
          placeholder={`chat with ${selectedFriendName}...`}
          placeholderTextColor={colors.textSecondary}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
        />
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={onCameraPress}
            activeOpacity={0.7}
          >
            {/* Camera icon placeholder */}
            <View style={styles.iconPlaceholder}>
              <Text style={[styles.iconText, { color: colors.text }]}>📷</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={onGalleryPress}
            activeOpacity={0.7}
          >
            {/* Gallery icon placeholder */}
            <View style={styles.iconPlaceholder}>
              <Text style={[styles.iconText, { color: colors.text }]}>🖼️</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 34, // Safe area bottom
    borderTopWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 44,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
  },
});
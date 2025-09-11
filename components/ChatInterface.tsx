import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View,
  Keyboard 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeProvider';

interface ChatInterfaceProps {
  selectedFriendName?: string;
  onSendMessage?: (message: string) => void;
  onCameraPress?: () => void;
  onGalleryPress?: () => void;
  onFocus?: () => void; // Add this for when the input is focused
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  selectedFriendName = 'a friend',
  onSendMessage,
  onCameraPress,
  onGalleryPress,
  onFocus,
}) => {
  const { colors } = useTheme();
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSend = () => {
    if (message.trim() && onSendMessage) {
      onSendMessage(message.trim());
      setMessage('');
      Keyboard.dismiss();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (onFocus) {
      onFocus();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.background, 
          borderTopColor: colors.border,
          shadowColor: colors.text,
        }
      ]}
    >
      <View style={styles.inputContainer}>
        <View 
          style={[
            styles.inputWrapper,
            { 
              backgroundColor: colors.backgroundSecondary,
              borderColor: isFocused ? colors.primary : 'transparent',
              borderWidth: isFocused ? 1 : 0,
            }
          ]}
        >
          <TextInput
            style={[
              styles.textInput,
              { color: colors.text }
            ]}
            placeholder={`Chat with ${selectedFriendName}...`}
            placeholderTextColor={colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            onFocus={handleFocus}
            onBlur={handleBlur}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          
          {/* Send button appears when there's text */}
          {message.trim().length > 0 ? (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSend}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={colors.primary} 
              />
            </TouchableOpacity>
          ) : null}
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.actionButton, 
              { backgroundColor: colors.backgroundSecondary }
            ]}
            onPress={onCameraPress}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="camera-outline" 
              size={22} 
              color={colors.text} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.actionButton, 
              { backgroundColor: colors.backgroundSecondary }
            ]}
            onPress={onGalleryPress}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="images-outline" 
              size={22} 
              color={colors.text} 
            />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Visual indicator that this is tappable */}
      {!isFocused && (
        <View style={styles.tapIndicator}>
          <Text style={[styles.tapText, { color: colors.textSecondary }]}>
            Tap to open chat
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 34, // Safe area bottom
    borderTopWidth: 1,
    // Add shadow for elevation
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    marginRight: 4,
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
  tapIndicator: {
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
  },
  tapText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
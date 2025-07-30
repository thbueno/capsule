// theme.ts - Global theme configuration
export const theme = {
  colors: {
    light: {
      title: '#0F0F0F',
      background: '#f8f5f0',
      backgroundSecondary: '#ffffff',
      primary: '#44ff00',
      secondary: '#FF1200',
      text: '#5b645b',
      textSecondary: '#8a8a8a',
      border: '#e5e5e5',
      overlay: 'rgba(0, 0, 0, 0.7)',
      overlayLight: 'rgba(0, 0, 0, 0.1)',
      cardBackground: '#3a3a3a',
      cardText: '#ffffff',
      activeGreen: '#44ff00',
      inactiveGray: '#8a8a8a',
    },
    dark: {
      title: '#ffffff',
      background: '#1a1a1a',
      backgroundSecondary: '#2a2a2a',
      primary: '#44ff00',
      secondary: '#FF1200',
      text: '#e0e0e0',
      textSecondary: '#a0a0a0',
      border: '#404040',
      overlay: 'rgba(255, 255, 255, 0.1)',
      overlayLight: 'rgba(255, 255, 255, 0.05)',
      cardBackground: '#2a2a2a',
      cardText: '#ffffff',
      activeGreen: '#44ff00',
      inactiveGray: '#6a6a6a',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    component: 16,
    section: 24,
    page: 20,
  },
  typography: {
    h1: { fontSize: 28, fontWeight: '700', lineHeight: 1.2 },
    h2: { fontSize: 24, fontWeight: '600', lineHeight: 1.3 },
    h3: { fontSize: 20, fontWeight: '600', lineHeight: 1.4 },
    body: { fontSize: 16, fontWeight: '400', lineHeight: 1.4 },
    bodySmall: { fontSize: 14, fontWeight: '400', lineHeight: 1.4 },
    caption: { fontSize: 12, fontWeight: '400', lineHeight: 1.3 },
    appTitle: { fontSize: 22, fontWeight: '600', lineHeight: 1.2 },
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
    card: 16,
    button: 12,
    moment: 20,
  },
} as const;

// tailwind.config.js - NativeWind configuration
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theme colors using CSS variables
        title: 'var(--title)',
        background: 'var(--background)',
        'background-secondary': 'var(--background-secondary)',
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        text: 'var(--text)',
        'text-secondary': 'var(--text-secondary)',
        border: 'var(--border)',
        overlay: 'var(--overlay)',
        'overlay-light': 'var(--overlay-light)',
        'card-background': 'var(--card-background)',
        'card-text': 'var(--card-text)',
        'active-green': 'var(--active-green)',
        'inactive-gray': 'var(--inactive-gray)',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '48px',
        component: '16px',
        section: '24px',
        page: '20px',
      },
      fontSize: {
        h1: ['28px', { lineHeight: '1.2', fontWeight: '700' }],
        h2: ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        h3: ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['16px', { lineHeight: '1.4', fontWeight: '400' }],
        'body-small': ['14px', { lineHeight: '1.4', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '1.3', fontWeight: '400' }],
        'app-title': ['22px', { lineHeight: '1.2', fontWeight: '600' }],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        card: '16px',
        button: '12px',
        moment: '20px',
      },
      gap: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        component: '16px',
        section: '24px',
      },
    },
  },
  plugins: [],
};

// ThemeProvider.tsx - React Context for theme management
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';

type Theme = 'light' | 'dark';
type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  colors: typeof theme.colors.light;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>('light');

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setCurrentTheme(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => subscription?.remove();
  }, []);

  const toggleTheme = () => {
    setCurrentTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const colors = theme.colors[currentTheme];

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

// Example Component Implementation
interface HeaderProps {
  title: string;
  onProfilePress?: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  onProfilePress, 
  showBackButton, 
  onBackPress 
}) => {
  const { colors } = useTheme();
  
  return (
    <View 
      className="h-[60px] px-page flex-row items-center justify-between mt-[44px]"
      style={{ backgroundColor: colors.background }}
    >
      {showBackButton && (
        <TouchableOpacity 
          onPress={onBackPress}
          className="mr-md"
        >
          <Icon name="chevron-left" size={24} color={colors.title} />
        </TouchableOpacity>
      )}
      
      <Text 
        className="text-app-title font-semibold flex-1 text-center"
        style={{ color: colors.title }}
      >
        {title}
      </Text>
      
      <TouchableOpacity onPress={onProfilePress}>
        <View 
          className="w-9 h-9 rounded-full border-2"
          style={{ borderColor: colors.primary }}
        >
          <Image 
            source={{ uri: 'profile-url' }}
            className="w-full h-full rounded-full"
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

// Friends Carousel Component
interface Friend {
  id: string;
  avatar: string;
  isActive?: boolean;
  isOnline?: boolean;
}

interface FriendsCarouselProps {
  friends: Friend[];
  selectedFriendId?: string;
  onFriendSelect: (friendId: string) => void;
}

export const FriendsCarousel: React.FC<FriendsCarouselProps> = ({
  friends,
  selectedFriendId,
  onFriendSelect,
}) => {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="h-[90px] px-page py-3 mb-md"
      contentContainerStyle={{ gap: theme.spacing.md }}
    >
      {friends.map((friend) => {
        const isSelected = friend.id === selectedFriendId;
        
        return (
          <TouchableOpacity
            key={friend.id}
            onPress={() => onFriendSelect(friend.id)}
            className="w-[70px] items-center"
          >
            <View className="relative">
              <View
                className={`w-[60px] h-[60px] rounded-full border-2 ${
                  isSelected ? 'opacity-100' : 'opacity-60'
                }`}
                style={{
                  borderColor: isSelected ? colors.activeGreen : 'transparent',
                }}
              >
                <Image
                  source={{ uri: friend.avatar }}
                  className="w-full h-full rounded-full"
                  style={{
                    opacity: isSelected ? 1 : 0.6,
                  }}
                />
              </View>
              
              {friend.isOnline && (
                <View
                  className="absolute bottom-1 right-1 w-3 h-3 rounded-full border-2"
                  style={{
                    backgroundColor: colors.activeGreen,
                    borderColor: colors.background,
                  }}
                />
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

// Starter Card Component
interface StarterCardProps {
  text: string;
  onResponse?: () => void;
}

export const StarterCard: React.FC<StarterCardProps> = ({ text, onResponse }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      className="mx-page mb-md p-5 rounded-card min-h-[100px] justify-center relative"
      style={{ backgroundColor: colors.cardBackground }}
      onPress={onResponse}
    >
      <Icon name="quote" size={24} color={colors.cardText} className="mb-3" />
      
      <Text
        className="text-body font-medium leading-relaxed"
        style={{ color: colors.cardText }}
      >
        {text}
      </Text>
      
      <TouchableOpacity
        className="absolute bottom-4 right-4 w-8 h-8 rounded-full items-center justify-center"
        style={{ backgroundColor: colors.overlayLight }}
        onPress={onResponse}
      >
        <Icon name="message-circle" size={16} color={colors.cardText} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// Moment Card Component
interface MomentCardProps {
  imageUri: string;
  onAddPress?: () => void;
}

export const MomentCard: React.FC<MomentCardProps> = ({ imageUri, onAddPress }) => {
  const { colors } = useTheme();

  return (
    <View className="mx-page mb-lg rounded-moment overflow-hidden aspect-[4/5]">
      <Image
        source={{ uri: imageUri }}
        className="w-full h-full"
        resizeMode="cover"
      />
      
      {/* Gradient Overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)']}
        className="absolute bottom-0 left-0 right-0 h-[120px]"
      />
      
      <TouchableOpacity
        className="absolute bottom-4 right-4 w-12 h-12 rounded-full items-center justify-center"
        style={{ backgroundColor: colors.background }}
        onPress={onAddPress}
      >
        <Icon name="plus" size={24} color={colors.title} />
      </TouchableOpacity>
    </View>
  );
};

// Usage in main App component
export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        {/* Your app navigation */}
      </NavigationContainer>
    </ThemeProvider>
  );
}
// Core data models for the Capsules app

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  isOnline?: boolean;
}

export interface StarterCard {
  id: string;
  text: string;
  category?: string;
}

export interface MomentCard {
  id: string;
  imageUri: string;
  timestamp?: Date;
  author?: string;
}

// Component prop interfaces
export interface HeaderProps {
  title: string;
  onProfilePress?: () => void;
}

export interface FriendsCarouselProps {
  friends: Friend[];
  selectedFriendId?: string;
  onFriendSelect: (friendId: string) => void;
}

export interface StarterCardProps {
  text: string;
  onResponse?: () => void;
}

export interface MomentCardProps {
  imageUri: string;
  onAddPress?: () => void;
}

// Filter types
export type FilterType = 'all' | 'starters' | 'moments';
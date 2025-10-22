// Core data models for the Capsules app

export interface Friend {
  friendshipId: string; // ID of the friendship record in Supabase
  profileId: string;    // ID of the friend's profile
  name: string;
  avatar: string;
  isOnline: boolean;
}

export interface StarterCard {
  id: string;
  text: string;
  category?: string;
}

export interface MomentCard {
  id: string;
  imageUri: string;
  title: string;
  reflection: string;
  timestamp?: Date;
  author?: string;
}

// Component prop interfaces
export interface HeaderProps {
  title: string;
  onProfilePress: () => void;
  avatarUrl?: string;
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
  images: string | string[];
  title: string;
  reflection: string;
  onAddPress?: () => void;
}

// Filter types
export type FilterType = 'all' | 'starters' | 'moments';
// Core data models for the Capsule app.

export interface Profile {
  id: string;
  username: string;
  handle: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export interface Friend {
  friendshipId: string;
  profileId: string;
  name: string;
  handle: string | null;
  avatar: string | null;
}

/** A friend row on the home screen, enriched with activity stats. */
export interface Conversation extends Friend {
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  momentCount: number;
  capsuleCount: number;
}

export type CapsuleCategory =
  | 'memories'
  | 'ideas'
  | 'trips'
  | 'checklist'
  | 'tv-show'
  | 'event';

export const CAPSULE_CATEGORIES: { value: CapsuleCategory; label: string }[] = [
  { value: 'memories', label: 'memories' },
  { value: 'ideas', label: 'ideas' },
  { value: 'trips', label: 'trips' },
  { value: 'checklist', label: 'check-list' },
  { value: 'tv-show', label: 'TV show' },
  { value: 'event', label: 'event' },
];

export interface Capsule {
  id: string;
  title: string;
  description: string | null;
  category: CapsuleCategory;
  cover_url: string | null;
  is_group: boolean;
  invite_code: string | null;
  friendship_id: string | null;
  created_by: string;
  created_at: string;
  last_activity_at: string;
  member_count?: number;
}

export interface CapsuleMember {
  profileId: string;
  name: string;
  avatar: string | null;
  role: 'owner' | 'member';
}

export interface Moment {
  id: string;
  uploader_id: string;
  friendship_id: string | null;
  capsule_id: string | null;
  title: string;
  reflection: string;
  created_at: string;
  /** Signed display URLs, resolved from moment_photos. */
  photoUrls: string[];
}

export interface Message {
  id: string;
  sender_id: string;
  friendship_id: string | null;
  capsule_id: string | null;
  content: string;
  moment_id: string | null;
  capsule_ref: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Starter {
  id: string;
  text: string;
  category: string;
}

export interface PickedImage {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
}

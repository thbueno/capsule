import {
  Capsule,
  CapsuleCategory,
  CapsuleMember,
  Conversation,
  Friend,
  Message,
  Moment,
  PickedImage,
  Profile,
  Starter,
} from "@/types";
import { supabase } from "./supabase";
import { uploadImage } from "./images";

const SHARED_BUCKET = "shared-photos";
const SIGNED_URL_TTL = 60 * 60; // seconds
const SIGNED_URL_REFRESH_MARGIN = 5 * 60 * 1000; // refresh 5 min before expiry

// ---------------------------------------------------------------------------
// Signed URLs (module-level cache so every screen shares it)
// ---------------------------------------------------------------------------

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now();
  const result: Record<string, string> = {};
  const missing: string[] = [];

  for (const path of paths) {
    const cached = signedUrlCache.get(path);
    if (cached && cached.expiresAt - SIGNED_URL_REFRESH_MARGIN > now) {
      result[path] = cached.url;
    } else {
      missing.push(path);
    }
  }

  if (missing.length > 0) {
    const { data, error } = await supabase.storage
      .from(SHARED_BUCKET)
      .createSignedUrls(missing, SIGNED_URL_TTL);
    if (error) throw error;
    for (const entry of data ?? []) {
      if (entry.signedUrl && entry.path) {
        signedUrlCache.set(entry.path, {
          url: entry.signedUrl,
          expiresAt: now + SIGNED_URL_TTL * 1000,
        });
        result[entry.path] = entry.signedUrl;
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Profiles & friends
// ---------------------------------------------------------------------------

export async function fetchProfile(id: string): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return data;
}

interface FriendshipRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  user_profile: Profile | null;
  friend_profile: Profile | null;
}

const FRIENDSHIP_SELECT = `
  id, user_id, friend_id, status,
  user_profile:profiles!friendships_user_id_fkey (id, username, handle, first_name, last_name, avatar_url),
  friend_profile:profiles!friendships_friend_id_fkey (id, username, handle, first_name, last_name, avatar_url)
`;

function toFriend(row: FriendshipRow, uid: string): Friend {
  const profile = row.user_id === uid ? row.friend_profile : row.user_profile;
  return {
    friendshipId: row.id,
    profileId: profile?.id ?? "",
    name: profile?.username ?? "Unknown",
    handle: profile?.handle ?? null,
    avatar: profile?.avatar_url ?? null,
  };
}

export async function fetchFriends(uid: string): Promise<Friend[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select(FRIENDSHIP_SELECT)
    .or(`user_id.eq.${uid},friend_id.eq.${uid}`)
    .eq("status", "accepted");
  if (error) throw error;
  return ((data ?? []) as unknown as FriendshipRow[]).map((row) => toFriend(row, uid));
}

/** Home screen rows: every accepted friend + last message and activity stats. */
export async function fetchConversations(uid: string): Promise<Conversation[]> {
  const friends = await fetchFriends(uid);

  return Promise.all(
    friends.map(async (friend) => {
      const [lastMessage, unread, moments, capsules] = await Promise.all([
        supabase
          .from("messages")
          .select("content, created_at")
          .eq("friendship_id", friend.friendshipId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("friendship_id", friend.friendshipId)
          .eq("sender_id", friend.profileId)
          .eq("is_read", false),
        supabase
          .from("moments")
          .select("*", { count: "exact", head: true })
          .eq("friendship_id", friend.friendshipId),
        supabase
          .from("capsules")
          .select("*", { count: "exact", head: true })
          .eq("friendship_id", friend.friendshipId),
      ]);

      return {
        ...friend,
        lastMessage: lastMessage.data?.content ?? null,
        lastMessageAt: lastMessage.data?.created_at ?? null,
        unreadCount: unread.count ?? 0,
        momentCount: moments.count ?? 0,
        capsuleCount: capsules.count ?? 0,
      };
    })
  );
}

export interface ProfileSearchResult extends Profile {
  friendshipId: string | null;
  friendshipStatus: string | null;
  requestedByMe: boolean;
}

export async function searchProfiles(term: string, uid: string): Promise<ProfileSearchResult[]> {
  const { data: users, error } = await supabase
    .from("profiles")
    .select("*")
    .or(`username.ilike.%${term}%,handle.ilike.%${term}%`)
    .neq("id", uid)
    .limit(20);
  if (error) throw error;
  if (!users || users.length === 0) return [];

  const ids = users.map((u) => u.id);
  const { data: friendships } = await supabase
    .from("friendships")
    .select("id, user_id, friend_id, status")
    .or(
      `and(user_id.eq.${uid},friend_id.in.(${ids.join(",")})),and(friend_id.eq.${uid},user_id.in.(${ids.join(",")}))`
    );

  return users.map((user) => {
    const friendship = friendships?.find(
      (f) => f.user_id === user.id || f.friend_id === user.id
    );
    return {
      ...user,
      friendshipId: friendship?.id ?? null,
      friendshipStatus: friendship?.status ?? null,
      requestedByMe: friendship?.user_id === uid,
    };
  });
}

export async function sendFriendRequest(uid: string, targetId: string): Promise<void> {
  const { error } = await supabase
    .from("friendships")
    .insert({ user_id: uid, friend_id: targetId, status: "pending" });
  if (error) throw error;
}

export interface IncomingRequest {
  friendshipId: string;
  profile: Profile;
}

export async function fetchIncomingRequests(uid: string): Promise<IncomingRequest[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select(`id, profile:profiles!friendships_user_id_fkey (id, username, handle, first_name, last_name, avatar_url)`)
    .eq("friend_id", uid)
    .eq("status", "pending");
  if (error) throw error;
  return ((data ?? []) as unknown as { id: string; profile: Profile }[]).map((row) => ({
    friendshipId: row.id,
    profile: row.profile,
  }));
}

export async function respondToRequest(
  friendshipId: string,
  status: "accepted" | "blocked"
): Promise<void> {
  const { error } = await supabase
    .from("friendships")
    .update({ status })
    .eq("id", friendshipId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function fetchFriendshipMessages(
  friendshipId: string,
  limit = 100
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("friendship_id", friendshipId)
    .is("capsule_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchCapsuleMessages(capsuleId: string, limit = 100): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("capsule_id", capsuleId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(input: {
  senderId: string;
  friendshipId?: string;
  capsuleId?: string;
  content: string;
  momentId?: string;
  capsuleRef?: string;
}): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      sender_id: input.senderId,
      friendship_id: input.friendshipId ?? null,
      capsule_id: input.capsuleId ?? null,
      content: input.content,
      moment_id: input.momentId ?? null,
      capsule_ref: input.capsuleRef ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Mark everything the friend sent in this chat as read. */
export async function markFriendshipRead(friendshipId: string, friendId: string): Promise<void> {
  await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("friendship_id", friendshipId)
    .eq("sender_id", friendId)
    .eq("is_read", false);
}

// ---------------------------------------------------------------------------
// Capsules
// ---------------------------------------------------------------------------

export async function fetchFriendshipCapsules(friendshipId: string): Promise<Capsule[]> {
  const { data, error } = await supabase
    .from("capsules")
    .select("*")
    .eq("friendship_id", friendshipId)
    .order("last_activity_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Group capsules the user belongs to (wedding albums, trips, …). */
export async function fetchGroupCapsules(uid: string): Promise<Capsule[]> {
  const { data, error } = await supabase
    .from("capsule_members")
    .select("capsule:capsules (*)")
    .eq("profile_id", uid);
  if (error) throw error;
  const capsules = ((data ?? []) as unknown as { capsule: Capsule | null }[])
    .map((row) => row.capsule)
    .filter((c): c is Capsule => !!c && c.is_group);
  capsules.sort((a, b) => b.last_activity_at.localeCompare(a.last_activity_at));
  return capsules;
}

export async function fetchCapsule(id: string): Promise<Capsule | null> {
  const { data } = await supabase.from("capsules").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function fetchCapsuleMembers(capsuleId: string): Promise<CapsuleMember[]> {
  const { data, error } = await supabase
    .from("capsule_members")
    .select("role, profile:profiles (id, username, avatar_url)")
    .eq("capsule_id", capsuleId);
  if (error) throw error;
  return ((data ?? []) as unknown as {
    role: "owner" | "member";
    profile: { id: string; username: string; avatar_url: string | null } | null;
  }[]).map((row) => ({
    profileId: row.profile?.id ?? "",
    name: row.profile?.username ?? "Unknown",
    avatar: row.profile?.avatar_url ?? null,
    role: row.role,
  }));
}

export async function createCapsule(input: {
  title: string;
  description?: string;
  category: CapsuleCategory;
  createdBy: string;
  friendshipId?: string;
  isGroup?: boolean;
}): Promise<Capsule> {
  const { data, error } = await supabase
    .from("capsules")
    .insert({
      title: input.title,
      description: input.description || null,
      category: input.category,
      created_by: input.createdBy,
      friendship_id: input.friendshipId ?? null,
      is_group: input.isGroup ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function joinCapsule(code: string): Promise<string> {
  const { data, error } = await supabase.rpc("join_capsule", { code });
  if (error) throw error;
  return data as string;
}

// ---------------------------------------------------------------------------
// Moments
// ---------------------------------------------------------------------------

interface MomentRow {
  id: string;
  uploader_id: string;
  friendship_id: string | null;
  capsule_id: string | null;
  title: string;
  reflection: string;
  created_at: string;
  moment_photos: { storage_path: string; position: number }[];
}

async function resolveMomentRows(rows: MomentRow[]): Promise<Moment[]> {
  const allPaths = rows.flatMap((row) => row.moment_photos.map((p) => p.storage_path));
  const urls = allPaths.length > 0 ? await signedUrls(allPaths) : {};

  return rows.map((row) => ({
    id: row.id,
    uploader_id: row.uploader_id,
    friendship_id: row.friendship_id,
    capsule_id: row.capsule_id,
    title: row.title,
    reflection: row.reflection,
    created_at: row.created_at,
    photoUrls: [...row.moment_photos]
      .sort((a, b) => a.position - b.position)
      .map((p) => urls[p.storage_path])
      .filter((u): u is string => !!u),
  }));
}

export async function fetchMoments(scope: {
  friendshipId?: string;
  capsuleId?: string;
}): Promise<Moment[]> {
  let query = supabase
    .from("moments")
    .select("*, moment_photos (storage_path, position)")
    .order("created_at", { ascending: false });
  if (scope.capsuleId) query = query.eq("capsule_id", scope.capsuleId);
  else if (scope.friendshipId) query = query.eq("friendship_id", scope.friendshipId);
  else return [];

  const { data, error } = await query;
  if (error) throw error;
  return resolveMomentRows((data ?? []) as unknown as MomentRow[]);
}

export async function fetchMoment(id: string): Promise<Moment | null> {
  const { data } = await supabase
    .from("moments")
    .select("*, moment_photos (storage_path, position)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const [moment] = await resolveMomentRows([data as unknown as MomentRow]);
  return moment ?? null;
}

/**
 * Upload photos, create the moment + photo rows, and post a chat message
 * referencing it. Works for both friendship chats and (group) capsules.
 */
export async function shareMoment(input: {
  uploaderId: string;
  images: PickedImage[];
  title: string;
  reflection: string;
  friendshipId?: string;
  capsuleId?: string;
}): Promise<Moment> {
  const paths: string[] = [];
  for (const image of input.images) {
    paths.push(await uploadImage(SHARED_BUCKET, input.uploaderId, image));
  }

  const { data: moment, error: momentError } = await supabase
    .from("moments")
    .insert({
      uploader_id: input.uploaderId,
      friendship_id: input.friendshipId ?? null,
      capsule_id: input.capsuleId ?? null,
      title: input.title,
      reflection: input.reflection,
    })
    .select()
    .single();
  if (momentError) throw momentError;

  const { error: photosError } = await supabase.from("moment_photos").insert(
    paths.map((path, position) => ({ moment_id: moment.id, storage_path: path, position }))
  );
  if (photosError) throw photosError;

  await sendMessage({
    senderId: input.uploaderId,
    friendshipId: input.friendshipId,
    capsuleId: input.capsuleId,
    content: input.title || "Shared a moment",
    momentId: moment.id,
  });

  const [resolved] = await resolveMomentRows([
    {
      ...moment,
      moment_photos: paths.map((path, position) => ({ storage_path: path, position })),
    } as MomentRow,
  ]);
  return resolved;
}

// ---------------------------------------------------------------------------
// Starters
// ---------------------------------------------------------------------------

export async function fetchStarters(): Promise<Starter[]> {
  const { data, error } = await supabase.from("starters").select("*");
  if (error) throw error;
  return data ?? [];
}

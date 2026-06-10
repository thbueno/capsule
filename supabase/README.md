# Supabase setup

The old project was paused and can't be restarted, so the app expects a fresh
Supabase project provisioned with [`schema.sql`](./schema.sql).

## Steps

1. Create a new project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the entire contents of
   `supabase/schema.sql`, and run it. This creates:
   - tables: `profiles`, `friendships`, `capsules`, `capsule_members`,
     `moments`, `moment_photos`, `messages`, `starters`
   - all row level security policies
   - the `join_capsule(code)` RPC used to join group capsules by invite code
   - triggers that auto-generate invite codes and auto-fill capsule membership
   - realtime publication for `messages`, `capsules`, and `moments`
   - storage buckets `profile-pictures` (public) and `shared-photos` (private,
     signed-URL access) with their policies
   - seed conversation starters
3. (Recommended) In **Authentication → Providers → Email**, disable
   "Confirm email" while testing so sign-ups can log in immediately.
4. Copy the project URL and anon key from **Settings → API** into `.env`:

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   ```

5. Restart the dev server (`npm start`) so Expo picks up the new env vars.

## Data model in one minute

- **friendships** link exactly two users (`pending` → `accepted`).
- **capsules** are named containers of messages + photos. Two flavours:
  - *friendship capsules* live inside a 1-to-1 chat (`friendship_id` set);
    both friends are auto-added as members.
  - *group capsules* (`is_group = true`) have a 6-character `invite_code`.
    Anyone with the code joins via the `join_capsule` RPC — e.g. a wedding
    capsule every guest drops their photos into.
- **moments** are photo posts (1–5 photos in `moment_photos`) shared into a
  friendship or a capsule.
- **messages** belong to either a friendship (the main chat) or a capsule
  (its thread), and can attach a moment (`moment_id`) or reference a capsule
  inline (`capsule_ref`).
- Access control is membership-based and enforced entirely by RLS — the
  `is_friendship_participant` / `is_capsule_member` helper functions are
  `security definer` so policies never recurse.

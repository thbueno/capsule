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

## Troubleshooting

**"new row violates row-level security policy" (code 42501)**
The tables exist but the policies don't. The SQL editor runs a script as a
single transaction, so if any statement failed, everything from that run was
rolled back — and a partial setup (e.g. tables created separately, RLS on,
no policies) produces exactly this error. The script is idempotent: just run
the whole `schema.sql` again. Then verify with:

```sql
select tablename, policyname from pg_policies where schemaname = 'public' order by 1, 2;
```

You should see ~24 policies across the 8 tables.

**"must be owner of table objects" / storage policy notice**
On some projects the SQL editor can't create policies on `storage.objects`.
The script catches this and finishes anyway (you'll see a NOTICE). Create the
five storage policies via **Dashboard → Storage → Policies** instead,
mirroring the definitions at the bottom of `schema.sql`:
- `profile-pictures`: public SELECT; authenticated INSERT/UPDATE restricted to
  `(storage.foldername(name))[1] = auth.uid()::text`
- `shared-photos`: authenticated INSERT restricted to own folder (same
  expression); authenticated SELECT for own folder **or**
  `exists (select 1 from public.moment_photos mp where mp.storage_path = name and public.can_view_moment(mp.moment_id))`

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

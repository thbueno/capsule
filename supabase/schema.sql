-- ============================================================================
-- Capsule — full database schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).
--
-- The script is IDEMPOTENT: it is safe to run repeatedly, including over a
-- database where the tables already exist — policies, functions and triggers
-- are dropped/replaced each run. If a previous run failed partway (the SQL
-- editor rolls back the whole run on error), just run this again.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- TABLES
-- ----------------------------------------------------------------------------

-- One row per auth user.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  handle text unique,
  first_name text,
  last_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- A friend request / friendship between exactly two users.
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  constraint friendships_no_self check (user_id <> friend_id),
  constraint friendships_unique_pair unique (user_id, friend_id)
);

-- A capsule is a named, typed container of messages and photos.
-- Two flavours:
--   * friendship capsule: lives inside a 1-to-1 chat (friendship_id set)
--   * group capsule:      is_group = true, joinable by invite_code
--     (e.g. a wedding where every guest adds their photos)
create table if not exists public.capsules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'memories'
    check (category in ('memories', 'ideas', 'trips', 'checklist', 'tv-show', 'event')),
  cover_url text,
  is_group boolean not null default false,
  invite_code text unique,
  friendship_id uuid references public.friendships (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  constraint capsules_scope check (is_group or friendship_id is not null)
);

-- Membership of a capsule. Filled automatically for friendship capsules,
-- grown via invite code for group capsules.
create table if not exists public.capsule_members (
  capsule_id uuid not null references public.capsules (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (capsule_id, profile_id)
);

-- A moment is a photo post (1..5 photos) with a title and reflection,
-- shared either into a friendship or into a capsule.
create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid not null references public.profiles (id) on delete cascade,
  friendship_id uuid references public.friendships (id) on delete cascade,
  capsule_id uuid references public.capsules (id) on delete cascade,
  title text not null default '',
  reflection text not null default '',
  created_at timestamptz not null default now(),
  constraint moments_scope check (friendship_id is not null or capsule_id is not null)
);

-- Individual photos belonging to a moment. storage_path is the object path
-- inside the private "shared-photos" bucket (no bucket prefix).
create table if not exists public.moment_photos (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments (id) on delete cascade,
  storage_path text not null,
  position int not null default 0
);

-- Chat messages. Scoped either to a friendship (1-to-1 chat) or a capsule
-- (capsule thread, incl. group capsules). moment_id attaches a photo moment;
-- capsule_ref renders an inline "capsule card" in the chat.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  friendship_id uuid references public.friendships (id) on delete cascade,
  capsule_id uuid references public.capsules (id) on delete cascade,
  content text not null default '',
  moment_id uuid references public.moments (id) on delete set null,
  capsule_ref uuid references public.capsules (id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint messages_scope check (friendship_id is not null or capsule_id is not null)
);

-- Conversation starter prompts.
create table if not exists public.starters (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  category text not null
    check (category in ('memories', 'fun', 'future', 'curiosity', 'challenges', 'appreciation'))
);

-- Indexes for the hot query paths.
create index if not exists friendships_user_idx on public.friendships (user_id, status);
create index if not exists friendships_friend_idx on public.friendships (friend_id, status);
create index if not exists capsules_friendship_idx on public.capsules (friendship_id);
create index if not exists capsule_members_profile_idx on public.capsule_members (profile_id);
create index if not exists moments_friendship_idx on public.moments (friendship_id, created_at desc);
create index if not exists moments_capsule_idx on public.moments (capsule_id, created_at desc);
create index if not exists moment_photos_moment_idx on public.moment_photos (moment_id, position);
create index if not exists messages_friendship_idx on public.messages (friendship_id, created_at desc);
create index if not exists messages_capsule_idx on public.messages (capsule_id, created_at desc);

-- ----------------------------------------------------------------------------
-- HELPER FUNCTIONS (security definer so RLS policies don't recurse)
-- ----------------------------------------------------------------------------

create or replace function public.is_friendship_participant(fid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from friendships
    where id = fid and (user_id = auth.uid() or friend_id = auth.uid())
  );
$$;

create or replace function public.is_capsule_member(cid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from capsule_members
    where capsule_id = cid and profile_id = auth.uid()
  );
$$;

-- Can the current user see a given moment? (used by storage policies too)
create or replace function public.can_view_moment(mid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from moments m
    where m.id = mid
      and (
        m.uploader_id = auth.uid()
        or (m.friendship_id is not null and public.is_friendship_participant(m.friendship_id))
        or (m.capsule_id is not null and public.is_capsule_member(m.capsule_id))
      )
  );
$$;

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------

-- Group capsules get a 6-character invite code on creation.
create or replace function public.capsules_set_invite_code()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.is_group and new.invite_code is null then
    loop
      new.invite_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
      exit when not exists (select 1 from capsules where invite_code = new.invite_code);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists capsules_invite_code on public.capsules;
create trigger capsules_invite_code
  before insert on public.capsules
  for each row execute function public.capsules_set_invite_code();

-- Auto-fill membership: creator becomes owner; for friendship capsules the
-- other friend becomes a member immediately.
create or replace function public.capsules_seed_members()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  other uuid;
begin
  insert into capsule_members (capsule_id, profile_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;

  if new.friendship_id is not null then
    select case when user_id = new.created_by then friend_id else user_id end
      into other
      from friendships where id = new.friendship_id;
    if other is not null then
      insert into capsule_members (capsule_id, profile_id)
      values (new.id, other)
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists capsules_members on public.capsules;
create trigger capsules_members
  after insert on public.capsules
  for each row execute function public.capsules_seed_members();

-- Keep capsules fresh whenever something is posted into them.
create or replace function public.touch_capsule_activity()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.capsule_id is not null then
    update capsules set last_activity_at = now() where id = new.capsule_id;
  end if;
  return new;
end;
$$;

drop trigger if exists messages_touch_capsule on public.messages;
create trigger messages_touch_capsule
  after insert on public.messages
  for each row execute function public.touch_capsule_activity();

drop trigger if exists moments_touch_capsule on public.moments;
create trigger moments_touch_capsule
  after insert on public.moments
  for each row execute function public.touch_capsule_activity();

-- ----------------------------------------------------------------------------
-- RPC: join a group capsule with an invite code
-- ----------------------------------------------------------------------------

create or replace function public.join_capsule(code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  cid uuid;
begin
  select id into cid
  from capsules
  where invite_code = upper(trim(code)) and is_group;

  if cid is null then
    raise exception 'Invalid invite code';
  end if;

  insert into capsule_members (capsule_id, profile_id)
  values (cid, auth.uid())
  on conflict do nothing;

  return cid;
end;
$$;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.capsules enable row level security;
alter table public.capsule_members enable row level security;
alter table public.moments enable row level security;
alter table public.moment_photos enable row level security;
alter table public.messages enable row level security;
alter table public.starters enable row level security;

-- profiles: readable by any signed-in user (needed for friend search),
-- writable only by the owner.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update to authenticated using (id = auth.uid());

-- friendships: only participants can see them; anyone can send a request as
-- themselves; either side can update the status (accept / block).
drop policy if exists "friendships_select" on public.friendships;
create policy "friendships_select" on public.friendships
  for select to authenticated
  using (user_id = auth.uid() or friend_id = auth.uid());
drop policy if exists "friendships_insert" on public.friendships;
create policy "friendships_insert" on public.friendships
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "friendships_update" on public.friendships;
create policy "friendships_update" on public.friendships
  for update to authenticated
  using (user_id = auth.uid() or friend_id = auth.uid());
drop policy if exists "friendships_delete" on public.friendships;
create policy "friendships_delete" on public.friendships
  for delete to authenticated
  using (user_id = auth.uid() or friend_id = auth.uid());

-- capsules: visible to members and to the creator. (The creator check also
-- makes INSERT ... RETURNING work — membership is added by an AFTER trigger,
-- which runs too late for the returned row's SELECT policy check.)
drop policy if exists "capsules_select" on public.capsules;
create policy "capsules_select" on public.capsules
  for select to authenticated
  using (created_by = auth.uid() or public.is_capsule_member(id));
drop policy if exists "capsules_insert" on public.capsules;
create policy "capsules_insert" on public.capsules
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (friendship_id is null or public.is_friendship_participant(friendship_id))
  );
drop policy if exists "capsules_update" on public.capsules;
create policy "capsules_update" on public.capsules
  for update to authenticated using (public.is_capsule_member(id));
drop policy if exists "capsules_delete" on public.capsules;
create policy "capsules_delete" on public.capsules
  for delete to authenticated using (created_by = auth.uid());

-- capsule_members: members can see the roster. Direct inserts are limited to
-- triggers / the join_capsule RPC (both run as security definer), so no
-- insert policy is granted here.
drop policy if exists "capsule_members_select" on public.capsule_members;
create policy "capsule_members_select" on public.capsule_members
  for select to authenticated
  using (profile_id = auth.uid() or public.is_capsule_member(capsule_id));
drop policy if exists "capsule_members_delete" on public.capsule_members;
create policy "capsule_members_delete" on public.capsule_members
  for delete to authenticated using (profile_id = auth.uid());

-- moments: visible inside the friendship or capsule they belong to.
drop policy if exists "moments_select" on public.moments;
create policy "moments_select" on public.moments
  for select to authenticated
  using (
    uploader_id = auth.uid()
    or (friendship_id is not null and public.is_friendship_participant(friendship_id))
    or (capsule_id is not null and public.is_capsule_member(capsule_id))
  );
drop policy if exists "moments_insert" on public.moments;
create policy "moments_insert" on public.moments
  for insert to authenticated
  with check (
    uploader_id = auth.uid()
    and (friendship_id is null or public.is_friendship_participant(friendship_id))
    and (capsule_id is null or public.is_capsule_member(capsule_id))
  );
drop policy if exists "moments_delete" on public.moments;
create policy "moments_delete" on public.moments
  for delete to authenticated using (uploader_id = auth.uid());

-- moment_photos follow their parent moment.
drop policy if exists "moment_photos_select" on public.moment_photos;
create policy "moment_photos_select" on public.moment_photos
  for select to authenticated using (public.can_view_moment(moment_id));
drop policy if exists "moment_photos_insert" on public.moment_photos;
create policy "moment_photos_insert" on public.moment_photos
  for insert to authenticated
  with check (
    exists (select 1 from public.moments m where m.id = moment_id and m.uploader_id = auth.uid())
  );
drop policy if exists "moment_photos_delete" on public.moment_photos;
create policy "moment_photos_delete" on public.moment_photos
  for delete to authenticated
  using (
    exists (select 1 from public.moments m where m.id = moment_id and m.uploader_id = auth.uid())
  );

-- messages: scoped to the friendship / capsule. Participants may update
-- (used to mark messages as read).
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select to authenticated
  using (
    (friendship_id is not null and public.is_friendship_participant(friendship_id))
    or (capsule_id is not null and public.is_capsule_member(capsule_id))
  );
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (friendship_id is null or public.is_friendship_participant(friendship_id))
    and (capsule_id is null or public.is_capsule_member(capsule_id))
  );
drop policy if exists "messages_update" on public.messages;
create policy "messages_update" on public.messages
  for update to authenticated
  using (
    (friendship_id is not null and public.is_friendship_participant(friendship_id))
    or (capsule_id is not null and public.is_capsule_member(capsule_id))
  );

-- starters: read-only reference data.
drop policy if exists "starters_select" on public.starters;
create policy "starters_select" on public.starters
  for select to authenticated using (true);

-- ----------------------------------------------------------------------------
-- REALTIME (each wrapped so re-runs don't abort on "already in publication")
-- ----------------------------------------------------------------------------

do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.capsules;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.moments;
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- STORAGE
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('profile-pictures', 'profile-pictures', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('shared-photos', 'shared-photos', false)
on conflict (id) do nothing;

-- Storage policies. On some Supabase projects the SQL editor role isn't the
-- owner of storage.objects, in which case policy DDL here fails — the block
-- below catches that and tells you to add them via the dashboard instead of
-- aborting (and rolling back!) the rest of this script.
do $$
begin
  -- Avatars: world-readable, each user writes only inside their own folder.
  drop policy if exists "avatars_read" on storage.objects;
  create policy "avatars_read" on storage.objects
    for select using (bucket_id = 'profile-pictures');

  drop policy if exists "avatars_write" on storage.objects;
  create policy "avatars_write" on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'profile-pictures'
      and (storage.foldername(name))[1] = auth.uid()::text
    );

  drop policy if exists "avatars_update" on storage.objects;
  create policy "avatars_update" on storage.objects
    for update to authenticated
    using (
      bucket_id = 'profile-pictures'
      and (storage.foldername(name))[1] = auth.uid()::text
    );

  -- Shared photos: uploads go into "{uploader_id}/...", reads are allowed for
  -- the uploader and anyone who can view the moment the photo belongs to.
  drop policy if exists "shared_photos_insert" on storage.objects;
  create policy "shared_photos_insert" on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'shared-photos'
      and (storage.foldername(name))[1] = auth.uid()::text
    );

  drop policy if exists "shared_photos_select" on storage.objects;
  create policy "shared_photos_select" on storage.objects
    for select to authenticated
    using (
      bucket_id = 'shared-photos'
      and (
        (storage.foldername(name))[1] = auth.uid()::text
        or exists (
          select 1 from public.moment_photos mp
          where mp.storage_path = name and public.can_view_moment(mp.moment_id)
        )
      )
    );
exception when insufficient_privilege then
  raise notice 'Could not create storage policies (not owner of storage.objects).';
  raise notice 'Create them manually: Dashboard -> Storage -> Policies. See supabase/README.md.';
end $$;

-- ----------------------------------------------------------------------------
-- SEED DATA — conversation starters (only inserted once)
-- ----------------------------------------------------------------------------

insert into public.starters (text, category)
select * from (values
  ('What''s the last glitch in your thinking that led to a surprisingly good idea?', 'curiosity'),
  ('What tiny detail from this week do you never want to forget?', 'memories'),
  ('What''s a memory of us that always makes you smile?', 'memories'),
  ('If we could teleport anywhere right now for one hour, where are we going?', 'fun'),
  ('What''s the most useless talent you have?', 'fun'),
  ('What''s something you want us to do together in the next year?', 'future'),
  ('Where do you hope to be living in five years?', 'future'),
  ('What question have you been afraid to google lately?', 'curiosity'),
  ('What''s the hardest thing you''re dealing with right now?', 'challenges'),
  ('What''s a fear you''d like to outgrow this year?', 'challenges'),
  ('What''s something I did that meant more to you than I probably realised?', 'appreciation'),
  ('What''s one thing about our friendship you''re grateful for today?', 'appreciation')
) as seed(text, category)
where not exists (select 1 from public.starters);

-- ----------------------------------------------------------------------------
-- VERIFY: after running, this should list ~24 policies across 8 tables.
-- ----------------------------------------------------------------------------
-- select tablename, policyname from pg_policies where schemaname = 'public' order by 1, 2;

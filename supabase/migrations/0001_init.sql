-- Kidstagram initial schema
-- Principles:
--   * Parents own accounts. Children never sign up alone.
--   * Data minimisation: nickname + avatar only, birth month (not date of birth).
--   * Private by default. Children only see their own stuff and their approved friends' stuff.
--   * No direct messages. Children interact through comments on projects.
--   * Every write from a child goes through a server-side text check.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('parent', 'child', 'moderator');
create type public.account_status as enum ('active', 'paused');
create type public.project_kind as enum ('game', 'show');
create type public.project_visibility as enum ('private', 'friends');
create type public.moderation_status as enum ('ok', 'flagged', 'removed');
create type public.friendship_status as enum ('pending', 'accepted', 'declined');
create type public.report_status as enum ('open', 'actioned', 'dismissed');

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  nickname text not null check (char_length(nickname) between 2 and 24),
  avatar text not null default 'star',
  parent_id uuid references public.profiles (id) on delete cascade,
  -- First day of the birth month. We never store the exact date of birth.
  birth_month date,
  -- Short code a child's parent can share offline so friends can connect.
  friend_code text unique,
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  constraint child_has_parent check (role <> 'child' or (parent_id is not null and birth_month is not null and friend_code is not null))
);

create index profiles_parent_idx on public.profiles (parent_id);

-- Age in whole years from the birth month.
create or replace function public.age_years(p_birth_month date)
returns int language sql immutable as $$
  select extract(year from age(current_date, p_birth_month))::int
$$;

-- Age bands: 'little' 5-8, 'middle' 9-12, 'teen' 13-16.
create or replace function public.age_band(p_birth_month date)
returns text language sql stable as $$
  select case
    when p_birth_month is null then null
    when public.age_years(p_birth_month) <= 8 then 'little'
    when public.age_years(p_birth_month) <= 12 then 'middle'
    else 'teen'
  end
$$;

-- ---------------------------------------------------------------------------
-- Parental consent records (COPPA verifiable parental consent audit trail)
-- ---------------------------------------------------------------------------
create table public.parental_consents (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  policy_version text not null,
  -- e.g. 'attestation' (dev only), 'card_check', 'id_check', 'video_call'
  method text not null,
  signed_name text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Friendships (no search: children connect by friend code; under-13s need parent approval)
-- ---------------------------------------------------------------------------
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  addressee_accepted boolean not null default false,
  requester_parent_ok boolean not null default false,
  addressee_parent_ok boolean not null default false,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint no_self_friend check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

-- ---------------------------------------------------------------------------
-- Projects, steps, helpers, comments, reports
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind public.project_kind not null,
  title text not null check (char_length(title) between 1 and 60),
  description text not null default '' check (char_length(description) <= 1000),
  visibility public.project_visibility not null default 'private',
  cover_path text,
  -- What the kid built: game settings or show scenes. See src/lib/content.ts.
  content jsonb not null default '{}'::jsonb check (pg_column_size(content) < 32000),
  moderation public.moderation_status not null default 'ok',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_owner_idx on public.projects (owner_id);

create table public.project_helpers (
  project_id uuid not null references public.projects (id) on delete cascade,
  helper_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, helper_id)
);

create table public.project_steps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  position int not null,
  body text not null check (char_length(body) between 1 and 1000),
  media_path text,
  moderation public.moderation_status not null default 'ok',
  created_at timestamptz not null default now()
);
create index project_steps_project_idx on public.project_steps (project_id, position);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  -- Little kids (5-8) can only send preset comments; preset_key is set and body is the preset text.
  preset_key text,
  body text not null check (char_length(body) between 1 and 300),
  moderation public.moderation_status not null default 'ok',
  created_at timestamptz not null default now()
);
create index comments_project_idx on public.comments (project_id, created_at);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('project', 'step', 'comment', 'profile')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 300),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so policies can use them without recursion)
-- ---------------------------------------------------------------------------
create or replace function public.my_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_moderator()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'moderator' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.my_parent_id()
returns uuid language sql stable security definer set search_path = public as $$
  select parent_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_parent_of(p_child uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = p_child and parent_id = auth.uid())
$$;

create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a))
  )
$$;

create or replace function public.is_active_child()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'child' and status = 'active')
$$;

create or replace function public.can_view_project(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project
      and (
        p.owner_id = auth.uid()
        or public.is_parent_of(p.owner_id)
        or public.is_moderator()
        or (p.moderation <> 'removed' and (
              exists (select 1 from public.project_helpers h where h.project_id = p.id and h.helper_id = auth.uid())
              or (p.visibility = 'friends' and public.are_friends(p.owner_id, auth.uid()))
           ))
      )
  )
$$;

create or replace function public.can_edit_project(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active_child() and exists (
    select 1 from public.projects p
    where p.id = p_project
      and p.moderation <> 'removed'
      and (p.owner_id = auth.uid()
           or exists (select 1 from public.project_helpers h where h.project_id = p.id and h.helper_id = auth.uid()))
  )
$$;

-- ---------------------------------------------------------------------------
-- Server-side text safety check. Mirrors src/lib/moderation.ts.
-- Blocks personal info (emails, phone numbers, links, addresses, social handles)
-- and a starter word list. Replace with a proper moderation service before launch.
-- ---------------------------------------------------------------------------
create or replace function public.text_problem(p_text text)
returns text language plpgsql immutable as $$
declare
  t text := lower(coalesce(p_text, ''));
begin
  if t ~ '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then return 'email'; end if;
  if regexp_replace(t, '[^0-9]', '', 'g') ~ '[0-9]{7,}' then return 'phone'; end if;
  if t ~ '(https?://|www\.|\.(com|net|org|io|co|uk|gg|tv|me|app|xyz)\b)' then return 'link'; end if;
  if t ~ '\m(snap|snapchat|insta|instagram|tiktok|discord|whatsapp|telegram|kik)\M' then return 'social'; end if;
  if t ~ '\m[0-9]+\s+[a-z]+\s+(street|st|road|rd|avenue|ave|lane|ln|drive|dr|close|way)\M' then return 'address'; end if;
  if t ~ '\m(where do you live|what school|meet up|send (a )?pic|your address)\M' then return 'personal'; end if;
  if t ~ '\m(stupid|idiot|dumb|hate you|shut up|loser|ugly|kill)\M' then return 'unkind'; end if;
  return null;
end
$$;

create or replace function public.enforce_text_safety()
returns trigger language plpgsql as $$
declare
  problem text;
begin
  if tg_table_name = 'projects' then
    problem := coalesce(
      public.text_problem(new.title),
      public.text_problem(new.description),
      -- every piece of text inside the game or show (speech lines, win messages...)
      public.text_problem((select string_agg(v #>> '{}', ' ') from jsonb_path_query(new.content, 'strict $.**') v where jsonb_typeof(v) = 'string'))
    );
  else
    problem := public.text_problem(new.body);
  end if;
  if problem is not null then
    raise exception 'text_blocked:%', problem using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger projects_text_safety before insert or update of title, description, content on public.projects
  for each row execute function public.enforce_text_safety();
create trigger steps_text_safety before insert or update of body on public.project_steps
  for each row execute function public.enforce_text_safety();
create trigger comments_text_safety before insert or update of body on public.comments
  for each row execute function public.enforce_text_safety();

-- Preset comments. Keep in sync with src/lib/presets.ts.
create table public.comment_presets (
  key text primary key,
  body text not null
);
insert into public.comment_presets (key, body) values
  ('love_it', 'I love it! ❤️'),
  ('so_cool', 'This is so cool! 😎'),
  ('funny', 'That made me laugh! 😂'),
  ('great_idea', 'Great idea! 💡'),
  ('keep_going', 'Keep going, you can do it! 💪'),
  ('want_to_help', 'Can I help with this? 🙋'),
  ('add_more', 'Add more please! ➕'),
  ('well_done', 'Well done! ⭐');
alter table public.comment_presets enable row level security;
create policy presets_read on public.comment_presets for select using (true);

-- Little kids (5-8) may only post preset comments. Preset text always comes from the server table.
create or replace function public.enforce_comment_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  band text;
  preset text;
begin
  if new.preset_key is not null then
    select body into preset from public.comment_presets where key = new.preset_key;
    if preset is null then
      raise exception 'unknown_preset' using errcode = 'P0001';
    end if;
    new.body := preset;
    return new;
  end if;
  select public.age_band(birth_month) into band from public.profiles where id = new.author_id;
  if band = 'little' then
    raise exception 'presets_only' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger comments_rules before insert on public.comments
  for each row execute function public.enforce_comment_rules();

-- Recompute friendship status whenever an approval changes.
create or replace function public.update_friendship_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  req_needs_parent boolean;
  add_needs_parent boolean;
begin
  select public.age_years(birth_month) < 13 into req_needs_parent from public.profiles where id = new.requester_id;
  select public.age_years(birth_month) < 13 into add_needs_parent from public.profiles where id = new.addressee_id;
  if new.status = 'declined' then
    return new;
  end if;
  if new.addressee_accepted
     and (new.requester_parent_ok or not req_needs_parent)
     and (new.addressee_parent_ok or not add_needs_parent) then
    new.status := 'accepted';
  else
    new.status := 'pending';
  end if;
  return new;
end
$$;
create trigger friendships_status before insert or update on public.friendships
  for each row execute function public.update_friendship_status();

-- Only owner can add helpers, and only accepted friends.
create or replace function public.enforce_helper_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  owner uuid;
begin
  select owner_id into owner from public.projects where id = new.project_id;
  if not public.are_friends(owner, new.helper_id) then
    raise exception 'helper_must_be_friend' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger helpers_rules before insert on public.project_helpers
  for each row execute function public.enforce_helper_rules();

-- Friend lookup by code. Returns only nickname + avatar, never anything else.
create or replace function public.request_friend(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  target uuid;
  fid uuid;
begin
  if not public.is_active_child() then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  select id into target from public.profiles
    where friend_code = upper(trim(p_code)) and role = 'child' and status = 'active';
  if target is null then
    raise exception 'code_not_found' using errcode = 'P0001';
  end if;
  if target = auth.uid() then
    raise exception 'that_is_you' using errcode = 'P0001';
  end if;
  insert into public.friendships (requester_id, addressee_id)
    values (auth.uid(), target)
    on conflict (requester_id, addressee_id) do update set status = 'pending'
    returning id into fid;
  return fid;
end
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.parental_consents enable row level security;
alter table public.friendships enable row level security;
alter table public.projects enable row level security;
alter table public.project_helpers enable row level security;
alter table public.project_steps enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;

-- Profiles: yourself, your children, your parent, your friends, and people
-- connected to you through a pending friend request (so you can see who asked).
create policy profiles_select on public.profiles for select using (
  id = auth.uid()
  or parent_id = auth.uid()
  or id = public.my_parent_id()
  or public.is_moderator()
  or exists (
    select 1 from public.friendships f
    where (f.requester_id = auth.uid() and f.addressee_id = profiles.id)
       or (f.addressee_id = auth.uid() and f.requester_id = profiles.id)
       or (public.is_parent_of(f.requester_id) and f.addressee_id = profiles.id)
       or (public.is_parent_of(f.addressee_id) and f.requester_id = profiles.id)
  )
  or exists (
    select 1 from public.project_helpers h join public.projects p on p.id = h.project_id
    where public.can_view_project(p.id) and (h.helper_id = profiles.id or p.owner_id = profiles.id)
  )
);
-- Parents insert their own profile at sign-up. Children are created by the create-child function.
create policy profiles_insert_self on public.profiles for insert with check (
  id = auth.uid() and role = 'parent' and parent_id is null
);
-- Parents can update their own nickname, and pause/unpause their children.
create policy profiles_update on public.profiles for update using (
  id = auth.uid() or parent_id = auth.uid() or public.is_moderator()
);

-- Only nickname and avatar can be changed by the user. Parents (and moderators) can pause a child.
-- Role, parent, birth month and friend code are fixed once created (service role bypasses this: auth.uid() is null).
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.role is distinct from old.role or new.parent_id is distinct from old.parent_id
     or new.birth_month is distinct from old.birth_month or new.friend_code is distinct from old.friend_code then
    raise exception 'locked_field' using errcode = 'P0001';
  end if;
  if new.status is distinct from old.status and not (public.is_parent_of(new.id) or public.is_moderator()) then
    raise exception 'parent_only' using errcode = 'P0001';
  end if;
  if (new.nickname is distinct from old.nickname or new.avatar is distinct from old.avatar)
     and not (new.id = auth.uid() or public.is_parent_of(new.id)) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if new.nickname is distinct from old.nickname and public.text_problem(new.nickname) is not null then
    raise exception 'text_blocked:%', public.text_problem(new.nickname) using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

create policy consents_select on public.parental_consents for select using (parent_id = auth.uid() or public.is_moderator());
create policy consents_insert on public.parental_consents for insert with check (parent_id = auth.uid() and verified = false);

create policy friendships_select on public.friendships for select using (
  requester_id = auth.uid() or addressee_id = auth.uid()
  or public.is_parent_of(requester_id) or public.is_parent_of(addressee_id)
);
-- Inserts go through request_friend(). Updates: addressee accepts/declines, parents approve.
create policy friendships_update on public.friendships for update using (
  addressee_id = auth.uid() or requester_id = auth.uid()
  or public.is_parent_of(requester_id) or public.is_parent_of(addressee_id)
);
create policy friendships_delete on public.friendships for delete using (
  requester_id = auth.uid() or addressee_id = auth.uid()
  or public.is_parent_of(requester_id) or public.is_parent_of(addressee_id)
);

-- Stop children from approving on their parent's behalf.
create or replace function public.guard_friendship_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.requester_parent_ok is distinct from old.requester_parent_ok and not public.is_parent_of(new.requester_id) then
    raise exception 'parent_only' using errcode = 'P0001';
  end if;
  if new.addressee_parent_ok is distinct from old.addressee_parent_ok and not public.is_parent_of(new.addressee_id) then
    raise exception 'parent_only' using errcode = 'P0001';
  end if;
  if new.addressee_accepted is distinct from old.addressee_accepted and new.addressee_id <> auth.uid() then
    raise exception 'addressee_only' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger friendships_guard before update on public.friendships
  for each row execute function public.guard_friendship_update();

create policy projects_select on public.projects for select using (public.can_view_project(id));
create policy projects_insert on public.projects for insert with check (owner_id = auth.uid() and public.is_active_child());
create policy projects_update on public.projects for update using (
  (owner_id = auth.uid() and public.is_active_child()) or public.is_moderator()
);
create policy projects_delete on public.projects for delete using (
  owner_id = auth.uid() or public.is_parent_of(owner_id) or public.is_moderator()
);

-- Only moderators change moderation state.
create or replace function public.guard_moderation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and new.moderation is distinct from old.moderation and not public.is_moderator() then
    raise exception 'moderator_only' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger projects_moderation_guard before update on public.projects
  for each row execute function public.guard_moderation();

create policy helpers_select on public.project_helpers for select using (public.can_view_project(project_id));
create policy helpers_insert on public.project_helpers for insert with check (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()) and public.is_active_child()
);
create policy helpers_delete on public.project_helpers for delete using (
  helper_id = auth.uid()
  or exists (select 1 from public.projects p where p.id = project_id and (p.owner_id = auth.uid() or public.is_parent_of(p.owner_id)))
);

create policy steps_select on public.project_steps for select using (
  public.can_view_project(project_id) and (moderation <> 'removed' or public.is_moderator())
);
create policy steps_insert on public.project_steps for insert with check (
  author_id = auth.uid() and public.can_edit_project(project_id)
);
create policy steps_delete on public.project_steps for delete using (
  author_id = auth.uid() or public.is_parent_of(author_id) or public.is_moderator()
);

create policy comments_select on public.comments for select using (
  public.can_view_project(project_id) and (moderation <> 'removed' or public.is_moderator())
);
create policy comments_insert on public.comments for insert with check (
  author_id = auth.uid() and public.is_active_child() and public.can_view_project(project_id)
);
create policy comments_delete on public.comments for delete using (
  author_id = auth.uid() or public.is_parent_of(author_id) or public.is_moderator()
  or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
);
create policy comments_moderate on public.comments for update using (public.is_moderator());

create policy reports_insert on public.reports for insert with check (reporter_id = auth.uid());
create policy reports_select on public.reports for select using (reporter_id = auth.uid() or public.is_moderator());
create policy reports_update on public.reports for update using (public.is_moderator());

-- Auto-flag content that gets reported, so it's hidden from kids until reviewed... flagged stays
-- visible to owner; moderators decide whether to remove it.
create or replace function public.flag_reported_content()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.target_type = 'project' then
    update public.projects set moderation = 'flagged' where id = new.target_id and moderation = 'ok';
  elsif new.target_type = 'step' then
    update public.project_steps set moderation = 'flagged' where id = new.target_id and moderation = 'ok';
  elsif new.target_type = 'comment' then
    update public.comments set moderation = 'flagged' where id = new.target_id and moderation = 'ok';
  end if;
  return new;
end
$$;
create trigger reports_flag after insert on public.reports
  for each row execute function public.flag_reported_content();

-- Owner and helpers save what they built. Only the content changes; title and sharing stay with the owner.
create or replace function public.save_project_content(p_project uuid, p_content jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_edit_project(p_project) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  update public.projects set content = p_content, updated_at = now() where id = p_project;
end
$$;

-- ---------------------------------------------------------------------------
-- Child accounts. The parent's app signs the child up (username@kids.kidstagram.invalid),
-- then calls claim_child to attach it to the parent. No server code to deploy.
-- ---------------------------------------------------------------------------
create or replace function public.claim_child(
  p_child uuid, p_nickname text, p_avatar text, p_birth_year int, p_birth_month int
) returns text language plpgsql security definer set search_path = public as $$
declare
  bm date;
  code text;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
begin
  if public.my_role() is distinct from 'parent' then
    raise exception 'parents_only' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.parental_consents where parent_id = auth.uid()) then
    raise exception 'consent_required' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profiles where id = p_child) then
    raise exception 'already_claimed' using errcode = 'P0001';
  end if;
  -- Only a brand-new child login made in the last 15 minutes can be claimed.
  if not exists (
    select 1 from auth.users
    where id = p_child and email like '%@kids.kidstagram.invalid' and created_at > now() - interval '15 minutes'
  ) then
    raise exception 'child_login_not_found' using errcode = 'P0001';
  end if;
  bm := make_date(p_birth_year, p_birth_month, 1);
  if public.age_years(bm) < 5 or public.age_years(bm) > 16 then
    raise exception 'age_out_of_range' using errcode = 'P0001';
  end if;
  if public.text_problem(p_nickname) is not null then
    raise exception 'text_blocked:%', public.text_problem(p_nickname) using errcode = 'P0001';
  end if;
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where friend_code = code);
  end loop;
  insert into public.profiles (id, role, nickname, avatar, parent_id, birth_month, friend_code)
    values (p_child, 'child', trim(p_nickname), p_avatar, auth.uid(), bm, code);
  return code;
end
$$;

-- Deleting the login removes the profile, projects, comments and friendships (cascade).
create or replace function public.delete_child(p_child uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_parent_of(p_child) then
    raise exception 'not_your_child' using errcode = 'P0001';
  end if;
  delete from auth.users where id = p_child;
end
$$;

-- ---------------------------------------------------------------------------
-- Storage: private bucket, files live under <owner_id>/...
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('project-media', 'project-media', false)
  on conflict (id) do nothing;

create policy media_insert on storage.objects for insert with check (
  bucket_id = 'project-media' and (storage.foldername(name))[1] = auth.uid()::text and public.is_active_child()
);
create policy media_select on storage.objects for select using (
  bucket_id = 'project-media' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_parent_of(((storage.foldername(name))[1])::uuid)
    or public.are_friends(((storage.foldername(name))[1])::uuid, auth.uid())
    or public.is_moderator()
  )
);
create policy media_delete on storage.objects for delete using (
  bucket_id = 'project-media' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_parent_of(((storage.foldername(name))[1])::uuid)
  )
);

-- ---------------------------------------------------------------------------
-- Let the app reach the tables. Newer Supabase projects don't grant this by default.
-- Row level security above still decides what each person can see and change.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.comment_presets to anon;
grant execute on all functions in schema public to authenticated;

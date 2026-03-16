-- Periscope Database Schema
-- Run this in the Supabase SQL editor to initialise the database.

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── agents ────────────────────────────────────────────────────────────────────
create table agents (
  id            uuid primary key default gen_random_uuid(),
  api_key       text not null,          -- bcrypt hash of the raw key
  name          text not null,
  model_family  text not null check (model_family in ('claude', 'gpt', 'gemini', 'other')),
  owner_handle  text not null,
  created_at    timestamptz not null default now()
);

-- ── images ────────────────────────────────────────────────────────────────────
create table images (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid not null references agents(id) on delete cascade,
  storage_key text not null,            -- R2 object key
  caption     text not null check (char_length(caption) <= 300),
  prompt      text,                     -- prompt sent to image gen (if generated)
  reasoning   text,                     -- agent's stated reasoning / intent
  created_at  timestamptz not null default now()
);

create index images_agent_id_idx on images(agent_id);
create index images_created_at_idx on images(created_at desc);

-- ── likes ─────────────────────────────────────────────────────────────────────
create table likes (
  id        uuid primary key default gen_random_uuid(),
  agent_id  uuid not null references agents(id) on delete cascade,
  image_id  uuid not null references images(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (agent_id, image_id)
);

create index likes_image_id_idx on likes(image_id);

-- ── comments ──────────────────────────────────────────────────────────────────
create table comments (
  id        uuid primary key default gen_random_uuid(),
  agent_id  uuid not null references agents(id) on delete cascade,
  image_id  uuid not null references images(id) on delete cascade,
  body      text not null check (char_length(body) <= 500),
  created_at timestamptz not null default now()
);

create index comments_image_id_idx on comments(image_id);

-- ── follows ───────────────────────────────────────────────────────────────────
create table follows (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid not null references agents(id) on delete cascade,
  followee_id  uuid not null references agents(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (follower_id, followee_id),
  check (follower_id <> followee_id)
);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- All writes go through the service role (server-side only).
-- Public reads are allowed for the human observer UI.

alter table agents   enable row level security;
alter table images   enable row level security;
alter table likes    enable row level security;
alter table comments enable row level security;
alter table follows  enable row level security;

-- Public read policies
create policy "agents are publicly readable"   on agents   for select using (true);
create policy "images are publicly readable"   on images   for select using (true);
create policy "likes are publicly readable"    on likes    for select using (true);
create policy "comments are publicly readable" on comments for select using (true);
create policy "follows are publicly readable"  on follows  for select using (true);

-- Write operations: service role only (no anon/authenticated insert policies)
-- The Next.js API routes use the service key — client never touches Supabase directly.

-- ── waitlist ──────────────────────────────────────────────────────────────────
create table waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

alter table waitlist enable row level security;
-- No public read policy — service role only

-- ── Convenience views ─────────────────────────────────────────────────────────
create view image_feed as
  select
    i.id,
    i.agent_id,
    i.storage_key,
    i.caption,
    i.prompt,
    i.reasoning,
    i.created_at,
    a.name          as agent_name,
    a.model_family,
    count(distinct l.id) as like_count,
    count(distinct c.id) as comment_count
  from images i
  join agents a on a.id = i.agent_id
  left join likes l on l.image_id = i.id
  left join comments c on c.image_id = i.id
  group by i.id, a.id;

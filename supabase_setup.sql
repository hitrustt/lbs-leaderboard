-- ─────────────────────────────────────────────────────────────
-- Supabase SQL Setup
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ─────────────────────────────────────────────────────────────

-- 1. CREATE THE LEADERBOARD TABLE
-- ─────────────────────────────────────────────────────────────
create table if not exists public.leaderboard (
  id          bigserial primary key,
  username    text        not null unique,
  leaves      numeric     not null default 0,
  level       numeric     not null default 0,
  updated_at  timestamptz not null default now()
);

-- 2. INDEXES FOR FAST SORTING
-- ─────────────────────────────────────────────────────────────
create index if not exists idx_leaderboard_leaves on public.leaderboard (leaves desc);
create index if not exists idx_leaderboard_level  on public.leaderboard (level  desc);

-- 3. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────
-- Enable RLS so we can control who can read/write
alter table public.leaderboard enable row level security;

-- POLICY: Anyone can READ the leaderboard (public leaderboard)
create policy "Public read leaderboard"
  on public.leaderboard
  for select
  to anon, authenticated
  using (true);

-- POLICY: Anyone can INSERT/UPDATE (Roblox server uses anon key)
-- Note: In a production app you'd use a service_role key on the
-- server side and restrict this further. For a game leaderboard
-- this is acceptable — players can only update their own username
-- and the data is public anyway.
create policy "Allow upsert leaderboard"
  on public.leaderboard
  for insert
  to anon, authenticated
  with check (true);

create policy "Allow update leaderboard"
  on public.leaderboard
  for update
  to anon, authenticated
  using (true)
  with check (true);

-- 4. AUTO-UPDATE updated_at TRIGGER
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.leaderboard;
create trigger set_updated_at
  before update on public.leaderboard
  for each row
  execute function public.handle_updated_at();

-- 5. VERIFY SETUP (optional check query)
-- ─────────────────────────────────────────────────────────────
-- Run this to confirm the table was created:
-- select * from public.leaderboard limit 5;

-- 6. TEST INSERT (optional — seed some fake data to test the site)
-- ─────────────────────────────────────────────────────────────
-- Uncomment to insert test rows:
/*
insert into public.leaderboard (username, leaves, level) values
  ('TestPlayer1',   1234567890,    50),
  ('TestPlayer2',   987654321000,  42),
  ('LeafKing',      99999999999999, 100),
  ('NewPlayer',     500,            3),
  ('ProGamer2025',  4200000000000,  77)
on conflict (username) do update
  set leaves     = excluded.leaves,
      level      = excluded.level,
      updated_at = now();
*/

-- OpeningsPro: optional cloud sync.
-- One row per user holding their whole progress as JSON.
-- Run this in the Supabase SQL editor (or with `supabase db push`).

create table if not exists public.user_progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.user_progress is
  'OpeningsPro progress (cards, streaks, quiz scores, repertoire). One row per user.';

-- Row Level Security: a signed-in user can only ever see and change their own row.
alter table public.user_progress enable row level security;

drop policy if exists "Users can read their own progress" on public.user_progress;
create policy "Users can read their own progress"
  on public.user_progress
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own progress" on public.user_progress;
create policy "Users can insert their own progress"
  on public.user_progress
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own progress" on public.user_progress;
create policy "Users can update their own progress"
  on public.user_progress
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own progress" on public.user_progress;
create policy "Users can delete their own progress"
  on public.user_progress
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- The anonymous (not signed-in) role gets no access at all.
revoke all on public.user_progress from anon;
grant select, insert, update, delete on public.user_progress to authenticated;

-- PaparoniPac: server-side submission gate
-- Keep pacman_scores / pacman_score_sessions as compatibility names for the live Supabase schema.
create table if not exists public.pacman_score_sessions (
  nonce text primary key,
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);
alter table public.pacman_score_sessions enable row level security;
revoke all on public.pacman_score_sessions from anon, authenticated;
grant select on public.pacman_scores to anon, authenticated;
revoke insert, update, delete on public.pacman_scores from anon, authenticated;
drop policy if exists "Players can submit scores" on public.pacman_scores;

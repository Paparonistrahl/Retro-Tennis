-- Paparoni Pac-Man: server-side submission gate
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

# PaparoniPac leaderboard hardening

1. In the Supabase SQL Editor, run `supabase-hardening.sql`.
2. Deploy the Edge Function folder `supabase/functions/paparoni-pac-score` as function name `paparoni-pac-score`.
3. Set Edge Function secrets:
   - `SUPABASE_URL`: your project URL (without /rest/v1)
   - `SUPABASE_SERVICE_ROLE_KEY`: the server-only secret key (never put this in browser code or GitHub Pages)
   - `PAPARONIPAC_SIGNING_SECRET`: a new random secret of at least 32 bytes
4. The browser uses only the existing publishable key.

The existing score-table names `pacman_scores` and `pacman_score_sessions` are retained as database compatibility identifiers; renaming them requires a separate Supabase migration and updating the live `bright-service` function.

The function issues a signed one-use session token, enforces a minimum/maximum session duration, applies a generous score-per-time ceiling, and performs inserts with the server-only key. Direct browser inserts are revoked.

This is basic abuse resistance, not full anti-cheat: because gameplay still runs in the browser, a determined attacker can modify the game or automate play. Strong anti-cheat requires server-authoritative gameplay or replay validation, plus rate limiting/monitoring.

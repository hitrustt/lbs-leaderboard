/**
 * config.js
 * ─────────────────────────────────────────────────────────────
 * FILL IN YOUR SUPABASE CREDENTIALS HERE.
 *
 * 1. Go to https://supabase.com and create a free project.
 * 2. In your project: Settings → API
 *    - Copy "Project URL"  → SUPABASE_URL below
 *    - Copy "anon public"  → SUPABASE_ANON_KEY below
 *
 * The anon key is safe to expose publicly — row-level security
 * controls what it can read/write (we set that up in the SQL).
 */

const CONFIG = {
  SUPABASE_URL:      'https://ruabhtjybgeqvtnffvlm.supabase.co',       // e.g. https://xyzxyz.supabase.co
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YWJodGp5YmdlcXZ0bmZmdmxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMTM0MTIsImV4cCI6MjA5MTc4OTQxMn0.fpQyFqnF2ohQmGU0ul1TNfE-VvE1kJey9PU_f810C3w',  // starts with eyJ...

  // How many players to show on the leaderboard
  LIMIT: 100,

  // The name displayed in the header badge
  GAME_NAME: 'LBS',

  // Auto-refresh interval in milliseconds (0 = disabled)
  AUTO_REFRESH_MS: 60000, // 60 seconds
};

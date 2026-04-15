# Roblox Leaderboard

A free, live leaderboard website for a Roblox game — displaying **Leaves** and **Level** stats using the EternityNum suffix system.

**Stack:** Roblox HttpService → Supabase (free) → GitHub Pages (free)  
**Cost:** $0/month forever.

---

## Live Demo

> Add your GitHub Pages URL here once deployed, e.g.:  
> `https://yourusername.github.io/roblox-leaderboard`

---

## Setup Guide

### Step 1 — Create a Supabase Project (free)

1. Go to [https://supabase.com](https://supabase.com) and sign up (free)
2. Click **New project**, fill in a name and password
3. Wait ~2 minutes for the project to spin up
4. Go to **SQL Editor** → **New Query**
5. Paste the contents of [`supabase_setup.sql`](supabase_setup.sql) and click **Run**

### Step 2 — Get Your Supabase Credentials

1. In your Supabase project: **Settings** → **API**
2. Copy:
   - **Project URL** (looks like `https://xyzabc.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

### Step 3 — Configure the Website

Open `docs/config.js` and fill in:

```js
const CONFIG = {
  SUPABASE_URL:      'https://xyzabc.supabase.co',
  SUPABASE_ANON_KEY: 'eyJ...',
  GAME_NAME:         'Your Game Name',  // shown in the header badge
  LIMIT:             100,               // max players shown
  AUTO_REFRESH_MS:   60000,             // refresh every 60s (0 = off)
};
```

### Step 4 — Deploy to GitHub Pages (free)

1. Create a new repository on GitHub (e.g. `roblox-leaderboard`)
2. Push this entire project:
   ```bash
   git init
   git add .
   git commit -m "Initial leaderboard"
   git remote add origin https://github.com/YOURUSERNAME/roblox-leaderboard.git
   git push -u origin main
   ```
3. In your repo: **Settings** → **Pages** → Source: **Deploy from branch**
4. Branch: `main`, Folder: `/docs` → **Save**
5. Your site is live at: `https://YOURUSERNAME.github.io/roblox-leaderboard`

> It takes 1-2 minutes for GitHub Pages to first deploy.

### Step 5 — Add the Roblox Script

1. Open **Roblox Studio**
2. Go to **Game Settings** → **Security** → Enable **Allow HTTP Requests**
3. In the Explorer, find `ServerScriptService`
4. Right-click → **Insert Object** → **Script**
5. Paste the contents of `roblox/LeaderboardSync.lua`
6. Fill in your `SUPABASE_URL` and `SUPABASE_ANON_KEY` at the top of the script
7. **Important:** Update the `leaderstats` value names in `getPlayerStats()` to match yours:
   ```lua
   local leavesObj = leaderstats:FindFirstChild("Leaves")  -- change "Leaves" if needed
   local levelObj  = leaderstats:FindFirstChild("Level")   -- change "Level" if needed
   ```
8. Publish your game. Play it — stats will sync to Supabase automatically!

---

## How It Works

```
Roblox Game (Server Script)
       │
       │  HTTP POST (upsert)
       ▼
Supabase PostgreSQL
       │
       │  REST API (public read)
       ▼
GitHub Pages Website
       │
       │  Fetches & renders
       ▼
Leaderboard (formatted with EternityNum)
```

- **Sync triggers:** stat value changes, player leave, every 60s
- **EternityNum:** numbers display as `1.23 Mill`, `4.56 MeHect`, etc. up to the full range
- **No server needed** — pure static site + Supabase managed DB

---

## File Structure

```
roblox-leaderboard/
├── docs/                    ← GitHub Pages serves this folder
│   ├── index.html           ← The leaderboard website
│   ├── config.js            ← YOUR CREDENTIALS go here
│   ├── eternitynum.js       ← Number formatting library
│   └── app.js               ← Data fetching & rendering
├── roblox/
│   └── LeaderboardSync.lua  ← Paste into Roblox Studio
├── supabase_setup.sql       ← Run in Supabase SQL Editor
└── README.md
```

---

## Customization

**Change the game name:** Edit `CONFIG.GAME_NAME` in `docs/config.js`

**Change how many players show:** Edit `CONFIG.LIMIT`

**Stat names:** If your leaderstats objects aren't called `Leaves` / `Level`, update the `FindFirstChild(...)` calls in `LeaderboardSync.lua`

**Colors:** All CSS variables are at the top of `docs/index.html` in `:root { ... }`

---

## Built By

[Claude Luke](https://linkedin.com/in/claudeluke) — Computer Science student at University of New Orleans

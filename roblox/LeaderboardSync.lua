--[[
  LeaderboardSync.lua
  ─────────────────────────────────────────────────────────────
  Place this as a Script inside ServerScriptService.

  This script syncs player stats (Leaves, Level) to your Supabase
  leaderboard table whenever a player's stats change, and also
  when they leave.

  SETUP:
  1. In Roblox Studio → ServerScriptService → Create a Script
  2. Paste this entire file in
  3. Fill in SUPABASE_URL and SUPABASE_ANON_KEY below
  4. Enable HttpService in Game Settings → Security → Allow HTTP Requests
  ─────────────────────────────────────────────────────────────
--]]

-- ── CONFIGURATION ────────────────────────────────────────────
local SUPABASE_URL      = "YOUR_SUPABASE_URL_HERE"       -- e.g. https://xyzxyz.supabase.co
local SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY_HERE"  -- starts with eyJ...

-- How many seconds between auto-syncs while the player is in game
local SYNC_INTERVAL = 60  -- seconds

-- Name of the DataStore where your leaves/level are saved
-- Change these to match YOUR datastore names exactly!
local LEAVES_DATASTORE_NAME = "LeavesData"
local LEVEL_DATASTORE_NAME  = "LevelData"

-- ── SERVICES ─────────────────────────────────────────────────
local HttpService       = game:GetService("HttpService")
local Players           = game:GetService("Players")
local DataStoreService  = game:GetService("DataStoreService")
local RunService        = game:GetService("RunService")

-- ── LEADERSTAT READING ───────────────────────────────────────
-- This reads from the player's leaderstats folder (the in-game
-- leaderboard values). Adjust the ValueObject names to match yours.
local function getPlayerStats(player)
  local leaderstats = player:FindFirstChild("leaderstats")
  if not leaderstats then
    return nil, nil
  end

  local leavesObj = leaderstats:FindFirstChild("Leaves")
  local levelObj  = leaderstats:FindFirstChild("Level")

  local leaves = leavesObj and leavesObj.Value or 0
  local level  = levelObj  and levelObj.Value  or 0

  return leaves, level
end

-- ── SUPABASE UPSERT ──────────────────────────────────────────
-- Uses Supabase's upsert (insert or update) on the "leaderboard"
-- table, keyed by username.
local function upsertPlayer(username, leaves, level)
  if SUPABASE_URL == "YOUR_SUPABASE_URL_HERE" then
    warn("[Leaderboard] SUPABASE_URL not configured!")
    return
  end

  local url = SUPABASE_URL .. "/rest/v1/leaderboard"

  local body = HttpService:JSONEncode({
    username   = username,
    leaves     = leaves,
    level      = level,
    updated_at = os.date("!%Y-%m-%dT%H:%M:%SZ"),  -- UTC ISO 8601
  })

  local success, result = pcall(function()
    return HttpService:RequestAsync({
      Url    = url,
      Method = "POST",
      Headers = {
        ["Content-Type"]  = "application/json",
        ["apikey"]        = SUPABASE_ANON_KEY,
        ["Authorization"] = "Bearer " .. SUPABASE_ANON_KEY,
        ["Prefer"]        = "resolution=merge-duplicates",  -- upsert behavior
      },
      Body = body,
    })
  end)

  if not success then
    warn("[Leaderboard] HTTP request failed:", result)
  elseif result.StatusCode ~= 200 and result.StatusCode ~= 201 then
    warn("[Leaderboard] Supabase error", result.StatusCode, result.Body)
  else
    print("[Leaderboard] Synced:", username, "| Leaves:", leaves, "| Level:", level)
  end
end

-- ── SYNC PLAYER ──────────────────────────────────────────────
local function syncPlayer(player)
  local leaves, level = getPlayerStats(player)
  if leaves == nil then
    -- leaderstats not ready yet, try again shortly
    return
  end
  upsertPlayer(player.Name, leaves, level)
end

-- ── PLAYER EVENTS ────────────────────────────────────────────
local function onPlayerAdded(player)
  -- Wait for leaderstats to be created by your existing scripts
  local leaderstats = player:WaitForChild("leaderstats", 10)
  if not leaderstats then
    warn("[Leaderboard] No leaderstats found for", player.Name)
    return
  end

  -- Sync immediately on join
  syncPlayer(player)

  -- Also sync whenever a stat value changes
  local leavesObj = leaderstats:FindFirstChild("Leaves")
  local levelObj  = leaderstats:FindFirstChild("Level")

  if leavesObj then
    leavesObj.Changed:Connect(function()
      syncPlayer(player)
    end)
  end

  if levelObj then
    levelObj.Changed:Connect(function()
      syncPlayer(player)
    end)
  end
end

local function onPlayerRemoving(player)
  -- Always sync on leave to capture final state
  syncPlayer(player)
end

Players.PlayerAdded:Connect(onPlayerAdded)
Players.PlayerRemoving:Connect(onPlayerRemoving)

-- Hook any players already in game (e.g. during Studio testing)
for _, player in ipairs(Players:GetPlayers()) do
  task.spawn(onPlayerAdded, player)
end

-- ── PERIODIC SYNC ────────────────────────────────────────────
-- Syncs all players every SYNC_INTERVAL seconds as a safety net
task.spawn(function()
  while true do
    task.wait(SYNC_INTERVAL)
    for _, player in ipairs(Players:GetPlayers()) do
      task.spawn(syncPlayer, player)
    end
  end
end)

print("[Leaderboard] LeaderboardSync loaded successfully!")

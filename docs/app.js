/**
 * app.js
 * ─────────────────────────────────────────────────────────────
 * Fetches leaderboard data from Supabase and renders the table.
 * Requires: config.js, eternitynum.js
 */

'use strict';

// ─── STATE ────────────────────────────────────────────────────
let sortBy   = 'leaves';  // 'leaves' | 'level'
let allData  = [];
let refreshTimer = null;

// ─── SUPABASE FETCH ───────────────────────────────────────────
async function fetchLeaderboard() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, LIMIT } = CONFIG;

  if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE') {
    throw new Error('CONFIG not set — please edit config.js with your Supabase credentials.');
  }

  // We fetch enough rows sorted by the chosen column.
  // The table is "leaderboard" with columns: username, leaves, level, updated_at
  const col   = sortBy === 'level' ? 'level' : 'leaves';
  const url   = `${SUPABASE_URL}/rest/v1/leaderboard`
              + `?select=userid,username,avatar_url,leaves,level,updated_at`
              + `&order=${col}.desc`
              + `&limit=${LIMIT}`;

  const res = await fetch(url, {
    headers: {
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.map((row) => ({
    ...row,
    userid: row.userid != null ? Number(row.userid) : null,
    avatar_url: row.avatar_url || null,
  }));
}

// ─── RENDER ───────────────────────────────────────────────────
function renderSkeleton() {
  const body = document.getElementById('table-body');
  body.innerHTML = Array.from({length: 5}, () => `
    <div class="skeleton-row">
      <div class="skel" style="width:32px;height:32px;border-radius:8px"></div>
      <div class="skel" style="width:${100 + Math.random() * 80 | 0}px"></div>
      <div class="skel" style="margin-left:auto;width:80px"></div>
      <div class="skel" style="margin-left:auto;width:60px"></div>
    </div>
  `).join('');
}

function renderError(msg) {
  document.getElementById('table-body').innerHTML = `
    <div class="state-box">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>${msg}</p>
    </div>
  `;
}

function renderEmpty() {
  document.getElementById('table-body').innerHTML = `
    <div class="state-box">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      <p>No players yet. Play the game to appear here!</p>
    </div>
  `;
}

function rankClass(i) {
  if (i === 0) return 'rank-badge rank-1';
  if (i === 1) return 'rank-badge rank-2';
  if (i === 2) return 'rank-badge rank-3';
  return 'rank-badge rank-other';
}

function rowClass(i) {
  if (i === 0) return 'row row-1';
  if (i === 1) return 'row row-2';
  if (i === 2) return 'row row-3';
  return 'row';
}

function avatarCellForPlayer(player) {
  if (player.avatar_url) {
    return `<img class="avatar" src="${escapeHtml(player.avatar_url)}" alt="${escapeHtml(player.username)} avatar" loading="lazy" />`;
  }
  return `<div class="avatar-placeholder" aria-hidden="true"></div>`;
}

function renderRows(data) {
  if (!data || data.length === 0) { renderEmpty(); return; }

  const body = document.getElementById('table-body');
  body.innerHTML = data.map((p, i) => `
    <div class="${rowClass(i)}" style="animation-delay:${i * 30}ms">
      <div class="rank-cell">
        <div class="${rankClass(i)}">${i + 1}</div>
      </div>
      <div class="player-cell">
        ${avatarCellForPlayer(p)}
        <span class="username">${escapeHtml(p.username)}</span>
      </div>
      <div class="stat-cell leaves">${EN.format(p.leaves)}</div>
      <div class="stat-cell level">${Math.floor(Number(p.level) || 0)}</div>
    </div>
  `).join('');
}

function renderStats(data) {
  const topLeaves = data.reduce((max, p) => Math.max(max, Number(p.leaves) || 0), 0);
  document.getElementById('stat-top-leaves').textContent = EN.format(topLeaves);

  const topLevel = data.reduce((max, p) => Math.max(max, Number(p.level) || 0), 0);
  document.getElementById('stat-top-level').textContent = Math.floor(topLevel);

  const lastUpdated = data.reduce((latest, p) => {
    if (!p.updated_at) return latest;
    const d = new Date(p.updated_at);
    return (!latest || d > latest) ? d : latest;
  }, null);

  document.getElementById('stat-updated').textContent = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';
}

// ─── MAIN LOAD ────────────────────────────────────────────────
async function loadData() {
  const btn  = document.getElementById('refresh-btn');
  const icon = document.getElementById('refresh-icon');

  btn.classList.add('spinning');
  icon.classList.add('spinning');
  renderSkeleton();

  try {
    const data = await fetchLeaderboard();
    allData = data;
    renderRows(data);
    renderStats(data);
  } catch (err) {
    console.error(err);
    renderError(err.message);
  } finally {
    btn.classList.remove('spinning');
    icon.classList.remove('spinning');
  }
}

// ─── SORT ────────────────────────────────────────────────────
function setSort(col) {
  sortBy = col;
  document.getElementById('sort-leaves').classList.toggle('active', col === 'leaves');
  document.getElementById('sort-level').classList.toggle('active', col === 'level');
  loadData();
}

// ─── UTILS ───────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadData();

  // Auto-refresh
  if (CONFIG.AUTO_REFRESH_MS > 0) {
    setInterval(loadData, CONFIG.AUTO_REFRESH_MS);
  }
});

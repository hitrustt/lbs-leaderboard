import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import htm from "https://esm.sh/htm@3.1.1";

const html = htm.bind(React.createElement);
const avatarCache = new Map();

function rankClass(index) {
  if (index === 0) return "rank-badge rank-1";
  if (index === 1) return "rank-badge rank-2";
  if (index === 2) return "rank-badge rank-3";
  return "rank-badge rank-other";
}

function rowClass(index) {
  if (index === 0) return "row row-1";
  if (index === 1) return "row row-2";
  if (index === 2) return "row row-3";
  return "row";
}

async function fetchLeaderboard(sortBy) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, LIMIT } = window.CONFIG || {};

  if (!SUPABASE_URL || SUPABASE_URL === "YOUR_SUPABASE_URL_HERE") {
    throw new Error("CONFIG not set — please edit config.js with your Supabase credentials.");
  }

  const column = sortBy === "level" ? "level" : "leaves";
  const url = `${SUPABASE_URL}/rest/v1/leaderboard`
    + `?select=userid,username,avatar_url,leaves,level,updated_at`
    + `&order=${column}.desc`
    + `&limit=${LIMIT}`;

  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase error ${response.status}: ${await response.text()}`);
  }

  const rows = await response.json();
  return rows.map((row) => ({
    ...row,
    userid: row.userid != null ? Number(row.userid) : null,
    avatar_url: row.avatar_url || null,
  }));
}

async function populateAvatarUrls(rows) {
  const missingUserIds = rows
    .map((row) => row.userid)
    .filter((userId) => userId != null && !avatarCache.has(userId));

  if (missingUserIds.length > 0) {
    const uniqueUserIds = [...new Set(missingUserIds)];
    const url = "https://thumbnails.roproxy.com/v1/users/avatar-headshot"
      + `?userIds=${uniqueUserIds.join(",")}`
      + "&size=150x150&format=Png&isCircular=false";

    try {
      const response = await fetch(url);
      if (response.ok) {
        const payload = await response.json();
        for (const entry of payload.data || []) {
          if (entry.targetId && entry.imageUrl) {
            avatarCache.set(Number(entry.targetId), entry.imageUrl);
          }
        }
      }
    } catch (error) {
      console.error("Avatar fetch failed", error);
    }
  }

  return rows.map((row) => {
    const resolvedAvatarUrl = row.userid != null ? (avatarCache.get(row.userid) || null) : null;
    return {
      ...row,
      avatar_url: resolvedAvatarUrl || (row.avatar_url && !row.avatar_url.startsWith("rbxthumb://") ? row.avatar_url : null),
    };
  });
}

function Avatar({ player }) {
  if (player.avatar_url) {
    return html`<img className="avatar" src=${player.avatar_url} alt=${`${player.username} avatar`} loading="lazy" />`;
  }
  return html`<div className="avatar-placeholder" aria-hidden="true"></div>`;
}

function SkeletonRows() {
  const rows = Array.from({ length: 5 }, (_, index) => {
    const widths = [160, 124, 180, 136, 154];
    return html`
      <div key=${index} className="skeleton-row">
        <div className="skel" style=${{ width: "38px", height: "38px", borderRadius: "12px" }}></div>
        <div className="skel" style=${{ width: `${widths[index]}px` }}></div>
        <div className="skel" style=${{ marginLeft: "auto", width: "94px" }}></div>
        <div className="skel" style=${{ marginLeft: "auto", width: "72px" }}></div>
      </div>
    `;
  });

  return html`${rows}`;
}

function EmptyState() {
  return html`
    <div className="state-box">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
      <p>No players yet. Play the game to appear here!</p>
    </div>
  `;
}

function ErrorState({ message }) {
  return html`
    <div className="state-box">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <p>${message}</p>
    </div>
  `;
}

function LeaderboardRows({ data }) {
  if (!data.length) {
    return html`<${EmptyState} />`;
  }

  return html`
    ${data.map((player, index) => html`
      <div key=${`${player.username}-${index}`} className=${rowClass(index)} style=${{ animationDelay: `${index * 30}ms` }}>
        <div className="rank-cell">
          <div className=${rankClass(index)}>${index + 1}</div>
        </div>
        <div className="player-cell">
          <${Avatar} player=${player} />
          <span className="username">${player.username}</span>
        </div>
        <div className="stat-cell leaves">${window.EN.format(player.leaves)}</div>
        <div className="stat-cell level">${Math.floor(Number(player.level) || 0)}</div>
      </div>
    `)}
  `;
}

function App() {
  const [sortBy, setSortBy] = useState("leaves");
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const refreshTimerRef = useRef(null);

  async function loadData() {
    setStatus((current) => (current === "ready" ? "refreshing" : "loading"));
    setError("");

    try {
      const data = await populateAvatarUrls(await fetchLeaderboard(sortBy));
      setRows(data);
      setStatus("ready");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  useEffect(() => {
    loadData();
  }, [sortBy]);

  useEffect(() => {
    const intervalMs = window.CONFIG?.AUTO_REFRESH_MS || 0;
    if (intervalMs <= 0) {
      return undefined;
    }

    refreshTimerRef.current = window.setInterval(() => {
      loadData();
    }, intervalMs);

    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
      }
    };
  }, [sortBy]);

  const lastUpdated = useMemo(() => {
    const latest = rows.reduce((current, row) => {
      if (!row.updated_at) {
        return current;
      }
      const date = new Date(row.updated_at);
      return !current || date > current ? date : current;
    }, null);

    return latest
      ? latest.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "—";
  }, [rows]);

  const isLoading = status === "loading" || status === "refreshing";

  return html`
    <div>
      <div className="cloud cloud-a"></div>
      <div className="cloud cloud-b"></div>
      <div className="cloud cloud-c"></div>
      <div className="cloud cloud-d"></div>
      <div className="cloud cloud-e"></div>
      <div className="leaf-float leaf-a">🍃</div>
      <div className="leaf-float leaf-b">🍂</div>
      <div className="leaf-float leaf-c">🍃</div>
      <div className="leaf-float leaf-d">🍂</div>
      <div className="leaf-float leaf-e">🍃</div>
      <div className="leaf-float leaf-f">🍂</div>
      <div className="leaf-float leaf-g">🍃</div>

      <div className="wrapper">
        <header className="hero">
          <h1>Top Leaf Blowers</h1>
          <p className="subtitle">
            The best players in
            <a href="https://www.roblox.com/games/10587359941/Leaf-Blowing-Simulator" target="_blank" rel="noopener noreferrer"> LBS</a>,
            ranked by <span>Leaves</span> and <span>Level</span>.
          </p>
        </header>

        <div className="stats-row" id="stats-row">
          <div className="stat-card">
            <div className="stat-label">Last Refreshed</div>
            <div className="stat-value" style=${{ fontSize: "18px", paddingTop: "6px" }} id="stat-updated">${lastUpdated}</div>
          </div>
        </div>

        <div className="controls">
          <span className="sort-label">Sort By</span>
          <button className=${`sort-btn ${sortBy === "leaves" ? "active" : ""}`} onClick=${() => setSortBy("leaves")}>Leaves</button>
          <button className=${`sort-btn ${sortBy === "level" ? "active" : ""}`} onClick=${() => setSortBy("level")}>Level</button>
          <div className="spacer"></div>
          <button className="refresh-btn" onClick=${loadData} disabled=${isLoading}>
            <svg className=${isLoading ? "spinning" : ""} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6"></path>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
              <path d="M3 22v-6h6"></path>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
            </svg>
            Refresh Board
          </button>
        </div>

        <div className="table-wrap">
          <div className="table-head">
            <div className="th">#</div>
            <div className="th">Player</div>
            <div className="th right">Leaves</div>
            <div className="th right">Level</div>
          </div>
          <div id="table-body">
            ${status === "error"
              ? html`<${ErrorState} message=${error} />`
              : isLoading && rows.length === 0
                ? html`<${SkeletonRows} />`
                : html`<${LeaderboardRows} data=${rows} />`}
          </div>
        </div>
      </div>
    </div>
  `;
}

createRoot(document.getElementById("root")).render(html`<${App} />`);

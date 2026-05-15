import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../supabase";
import GameCard from "../GameCard";

const COLORS = {
  bg: "#fafafa",
  surface: "#ffffff",
  border: "#ececec",
  borderHover: "#d4d4d4",
  text: "#1a1a1a",
  sub: "#737373",
  subLight: "#a3a3a3",
  accent: "#ff6b35",
  accentLight: "#fff1ec",
  good: "#22c55e",
};

export default function Home({ session }) {
  const [games, setGames] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGenre, setFilterGenre] = useState("전체");
  const [sortOrder, setSortOrder] = useState("name");
  const [reviewSummary, setReviewSummary] = useState({});

  const refreshReviewSummary = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from("reviews")
      .select("game_id, total_score, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (!data) return;
    const map = {};
    data.forEach((r) => {
      if (!map[r.game_id]) {
        map[r.game_id] = { count: 0, latestScore: r.total_score ?? null };
      }
      map[r.game_id].count++;
    });
    setReviewSummary(map);
  }, [session]);

  useEffect(() => {
    (async () => {
      const [gamesRes, rankingsRes] = await Promise.all([
        supabase.from("games").select("*").eq("status", "approved").order("name_ko"),
        supabase.from("bgg_rankings").select("*").order("rank").limit(50),
      ]);
      if (gamesRes.data) setGames(gamesRes.data);
      if (rankingsRes.data) setRankings(rankingsRes.data);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (session) refreshReviewSummary();
    else setReviewSummary({});
  }, [session, refreshReviewSummary]);

  const rankingsMap = useMemo(() => {
    const map = {};
    rankings.forEach((r) => { map[r.rank] = r; });
    return map;
  }, [rankings]);

  const allGenres = useMemo(() => {
    const set = new Set();
    games.forEach((g) => g.genre?.forEach((x) => set.add(x)));
    return Array.from(set).sort();
  }, [games]);

  const filtered = useMemo(() => {
    let arr = games;
    if (filterGenre !== "전체") {
      arr = arr.filter((g) => g.genre?.includes(filterGenre));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      arr = arr.filter(
        (g) =>
          g.name_ko?.toLowerCase().includes(q) ||
          g.name_en?.toLowerCase().includes(q)
      );
    }
    arr = [...arr];
    if (sortOrder === "name") arr.sort((a, b) => a.name_ko.localeCompare(b.name_ko, "ko"));
    if (sortOrder === "players") arr.sort((a, b) => (b.max_players || 0) - (a.max_players || 0));
    if (sortOrder === "time") arr.sort((a, b) => (a.play_minutes || 0) - (b.play_minutes || 0));
    return arr;
  }, [games, filterGenre, searchQuery, sortOrder]);

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
      {/* BGG TOP 섹션 */}
      {rankings.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>
                🌍 글로벌 인기 보드게임
              </h2>
              <div style={{ fontSize: 12, color: COLORS.sub, marginTop: 4 }}>
                BoardGameGeek 기준 TOP {rankings.length}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              paddingBottom: 12,
              scrollbarWidth: "thin",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {rankings.map((r) => (
              <RankCard key={r.rank} ranking={r} />
            ))}
          </div>
        </section>
      )}

      {/* 라이브러리 섹션 */}
      <section>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>
            📚 보드게임 라이브러리
          </h2>
          <div style={{ fontSize: 12, color: COLORS.sub, marginTop: 4 }}>
            전체 {games.length}개 · 표시 중 {filtered.length}개
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 240px", position: "relative" }}>
            <span style={iconStyle}>🔍</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="게임 이름으로 검색 (한글/영문)"
              style={{ ...inputStyle, paddingLeft: 36 }}
            />
          </div>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{ ...inputStyle, width: 180 }}
          >
            <option value="name">이름 (가나다)</option>
            <option value="players">인원 (많은 순)</option>
            <option value="time">플레이타임 (짧은 순)</option>
          </select>
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          {["전체", ...allGenres].map((g) => {
            const active = filterGenre === g;
            return (
              <button
                key={g}
                onClick={() => setFilterGenre(g)}
                style={{
                  background: active ? COLORS.accent : COLORS.surface,
                  color: active ? "#fff" : COLORS.sub,
                  border: `1px solid ${active ? COLORS.accent : COLORS.border}`,
                  borderRadius: 20,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontFamily: "inherit",
                }}
              >
                {g}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: COLORS.sub }}>
            로딩 중...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80, color: COLORS.sub }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎲</div>
            검색 결과가 없어요
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 16,
            }}
          >
            {filtered.map((g) => (
              <GameCard
                key={g.id}
                game={g}
                session={session}
                reviewSummary={reviewSummary[g.id] || null}
                onReviewSaved={refreshReviewSummary}
                bggData={rankingsMap[g.bgg_rank] || null}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function RankCard({ ranking }) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: "0 0 160px",
        background: COLORS.surface,
        border: `1px solid ${hovered ? COLORS.borderHover : COLORS.border}`,
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.2s",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 8px 24px rgba(0,0,0,0.08)"
          : "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <div
        style={{
          aspectRatio: "1 / 1",
          background: "#f3f4f6",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {!imgError && ranking.thumbnail ? (
          <img
            src={ranking.thumbnail}
            alt={ranking.name_en}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              background: "linear-gradient(135deg, #f3f4f6, #d4d4d8)",
            }}
          >
            🎲
          </div>
        )}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            background: COLORS.accent,
            color: "#fff",
            fontSize: 13,
            fontWeight: 800,
            padding: "3px 9px",
            borderRadius: 14,
            boxShadow: "0 2px 6px rgba(255,107,53,0.4)",
          }}
        >
          #{ranking.rank}
        </div>
      </div>

      <div style={{ padding: "10px 12px" }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: COLORS.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: 4,
          }}
          title={ranking.name_en}
        >
          {ranking.name_en}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <span style={{ color: COLORS.accent, fontWeight: 700 }}>
            ★ {ranking.avg_rating?.toFixed(2)}
          </span>
          <span style={{ color: COLORS.subLight }}>· {ranking.year_published}</span>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  background: COLORS.surface,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  padding: "10px 14px",
  color: COLORS.text,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  width: "100%",
  fontFamily: "inherit",
};

const iconStyle = {
  position: "absolute",
  left: 12,
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: 14,
  pointerEvents: "none",
};

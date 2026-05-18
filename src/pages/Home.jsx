import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../supabase";
import GameCard from "../GameCard";
import GameFilter from "../components/GameFilter";

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

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

export default function Home({ session }) {
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;

  const [games, setGames] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewSummary, setReviewSummary] = useState({});

  // 검색
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // debounced

  // 필터
  const [filterGenres, setFilterGenres] = useState(new Set());
  const [filterPlayers, setFilterPlayers] = useState("");
  const [filterAge, setFilterAge] = useState(null);
  const [sortOrder, setSortOrder] = useState("name");
  const [filterOpen, setFilterOpen] = useState(false); // 모바일 토글

  // 검색 디바운스 300ms
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

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

  const hasFilter =
    searchInput.trim() !== "" ||
    filterGenres.size > 0 ||
    filterPlayers !== "" ||
    filterAge !== null;

  // 모바일 필터 버튼 뱃지 수 (검색어 제외)
  const activeFilterCount =
    filterGenres.size + (filterPlayers !== "" ? 1 : 0) + (filterAge !== null ? 1 : 0);

  const toggleGenre = (genre) => {
    setFilterGenres((prev) => {
      const next = new Set(prev);
      if (next.has(genre)) next.delete(genre);
      else next.add(genre);
      return next;
    });
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setFilterGenres(new Set());
    setFilterPlayers("");
    setFilterAge(null);
  };

  const filtered = useMemo(() => {
    let arr = games;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      arr = arr.filter(
        (g) =>
          g.name_ko?.toLowerCase().includes(q) ||
          g.name_en?.toLowerCase().includes(q)
      );
    }

    if (filterGenres.size > 0) {
      arr = arr.filter((g) => g.genre?.some((gen) => filterGenres.has(gen)));
    }

    if (filterPlayers !== "") {
      const n = parseInt(filterPlayers, 10);
      if (!isNaN(n) && n > 0) {
        arr = arr.filter(
          (g) => (g.min_players ?? 0) <= n && n <= (g.max_players ?? 99)
        );
      }
    }

    if (filterAge !== null) {
      arr = arr.filter((g) => g.min_age != null && g.min_age <= filterAge);
    }

    arr = [...arr];
    if (sortOrder === "name") arr.sort((a, b) => a.name_ko.localeCompare(b.name_ko, "ko"));
    if (sortOrder === "players") arr.sort((a, b) => (b.max_players || 0) - (a.max_players || 0));
    if (sortOrder === "time") arr.sort((a, b) => (a.play_minutes || 0) - (b.play_minutes || 0));

    return arr;
  }, [games, searchQuery, filterGenres, filterPlayers, filterAge, sortOrder]);

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
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>
              📚 보드게임 라이브러리
            </h2>
            <div style={{ fontSize: 12, color: COLORS.sub, marginTop: 4 }}>
              {hasFilter
                ? <><span style={{ color: COLORS.accent, fontWeight: 700 }}>{filtered.length}개</span> 검색됨 (전체 {games.length}개)</>
                : `전체 ${games.length}개`}
            </div>
          </div>
        </div>

        {/* 검색바 + 모바일 필터 토글 + 정렬 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "stretch" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <span style={iconStyle}>🔍</span>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="게임 이름으로 검색 (한글/영문)"
              style={{ ...inputStyle, paddingLeft: 36 }}
            />
          </div>

          {/* 모바일 필터 토글 버튼 */}
          {isMobile && (
            <button
              onClick={() => setFilterOpen((v) => !v)}
              style={{
                flexShrink: 0,
                border: `1px solid ${filterOpen || activeFilterCount > 0 ? COLORS.accent : COLORS.border}`,
                borderRadius: 8,
                padding: "0 14px",
                background: filterOpen || activeFilterCount > 0 ? COLORS.accentLight : COLORS.surface,
                color: filterOpen || activeFilterCount > 0 ? COLORS.accent : COLORS.sub,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              필터
              {activeFilterCount > 0 && (
                <span
                  style={{
                    background: COLORS.accent,
                    color: "#fff",
                    borderRadius: "50%",
                    width: 17,
                    height: 17,
                    fontSize: 10,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {activeFilterCount}
                </span>
              )}
              <span style={{ fontSize: 10 }}>{filterOpen ? "▲" : "▼"}</span>
            </button>
          )}

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{ ...inputStyle, width: isMobile ? 120 : 180, flexShrink: 0 }}
          >
            <option value="name">이름 (가나다)</option>
            <option value="players">인원 많은순</option>
            <option value="time">플레이타임 짧은순</option>
          </select>
        </div>

        {/* 필터 패널 - 데스크탑 항상 표시, 모바일 토글 */}
        {(!isMobile || filterOpen) && (
          <GameFilter
            allGenres={allGenres}
            filterGenres={filterGenres}
            onToggleGenre={toggleGenre}
            filterPlayers={filterPlayers}
            onPlayersChange={setFilterPlayers}
            filterAge={filterAge}
            onAgeChange={setFilterAge}
            hasFilter={hasFilter}
            onReset={resetFilters}
          />
        )}

        {/* 게임 격자 */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: COLORS.sub }}>
            로딩 중...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80, color: COLORS.sub }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎲</div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              {hasFilter ? "조건에 맞는 게임이 없어요" : "등록된 게임이 없어요"}
            </div>
            {hasFilter && (
              <button
                onClick={resetFilters}
                style={{
                  background: COLORS.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 20px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                필터 초기화
              </button>
            )}
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

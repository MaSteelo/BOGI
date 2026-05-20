import { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabase";
import GameCard from "../GameCard";
import GameFilter from "../components/GameFilter";
import { HalfStarDisplay } from "../components/StarDisplay";
import GameSubmissionModal from "../components/GameSubmissionModal";

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

const GENRE_STYLE = {
  전략: { grad: ["#dbeafe", "#93c5fd"], emoji: "♟️" },
  가족: { grad: ["#fee2e2", "#fca5a5"], emoji: "👨‍👩‍👧" },
  파티: { grad: ["#fce7f3", "#f9a8d4"], emoji: "🎉" },
  협력: { grad: ["#dcfce7", "#86efac"], emoji: "🤝" },
  카드: { grad: ["#ede9fe", "#c4b5fd"], emoji: "🃏" },
  추상: { grad: ["#dbeafe", "#7dd3fc"], emoji: "🔷" },
  경제: { grad: ["#ffedd5", "#fdba74"], emoji: "💰" },
  추리: { grad: ["#e5e7eb", "#9ca3af"], emoji: "🔍" },
  머더미스터리: { grad: ["#1f2937", "#374151"], emoji: "🔎" },
  방탈출: { grad: ["#fef3c7", "#fcd34d"], emoji: "🚪" },
  덱빌딩: { grad: ["#ede9fe", "#a78bfa"], emoji: "🎴" },
  엔진빌딩: { grad: ["#d1fae5", "#6ee7b7"], emoji: "⚙️" },
  워커플레이스먼트: { grad: ["#fef3c7", "#fcd34d"], emoji: "👷" },
  타일배치: { grad: ["#e0f2fe", "#7dd3fc"], emoji: "🧩" },
  다이스: { grad: ["#fee2e2", "#f87171"], emoji: "🎲" },
  순발력: { grad: ["#fef9c3", "#fde047"], emoji: "⚡" },
  단어: { grad: ["#ede9fe", "#c4b5fd"], emoji: "📝" },
  상상력: { grad: ["#fce7f3", "#f0abfc"], emoji: "💭" },
  정체은닉: { grad: ["#e5e7eb", "#6b7280"], emoji: "🎭" },
  레거시: { grad: ["#fef3c7", "#f59e0b"], emoji: "📜" },
  던전크롤러: { grad: ["#fee2e2", "#dc2626"], emoji: "⚔️" },
  트릭테이킹: { grad: ["#cffafe", "#67e8f9"], emoji: "🎯" },
  영역지배: { grad: ["#ffedd5", "#fb923c"], emoji: "🗺️" },
  경매: { grad: ["#fef3c7", "#eab308"], emoji: "💎" },
  프로그래밍: { grad: ["#ccfbf1", "#5eead4"], emoji: "🤖" },
  솔로: { grad: ["#f3f4f6", "#9ca3af"], emoji: "🧘" },
  "2인": { grad: ["#fce7f3", "#ec4899"], emoji: "👥" },
  "4X": { grad: ["#dbeafe", "#3b82f6"], emoji: "🌌" },
  워게임: { grad: ["#fee2e2", "#ef4444"], emoji: "⚔️" },
  어드벤처: { grad: ["#d1fae5", "#34d399"], emoji: "🗺️" },
  액션: { grad: ["#fee2e2", "#f87171"], emoji: "💥" },
  어린이: { grad: ["#fef3c7", "#fcd34d"], emoji: "🧸" },
  협상: { grad: ["#ede9fe", "#a78bfa"], emoji: "🤝" },
  확장: { grad: ["#f3f4f6", "#9ca3af"], emoji: "➕" },
};
const GENRE_FALLBACK = { grad: ["#f3f4f6", "#d4d4d8"], emoji: "🎲" };

function getGenreStyle(genres) {
  if (!genres?.length) return GENRE_FALLBACK;
  return GENRE_STYLE[genres[0]] || GENRE_FALLBACK;
}

// BOGI TOP 카드 순위 뱃지 색상
const RANK_COLORS = ["#f59e0b", "#9ca3af", "#cd7f32"];

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
  const [bogiTop, setBogiTop] = useState([]);   // BOGI 유저 평점 TOP
  const [loading, setLoading] = useState(true);
  const [reviewSummary, setReviewSummary] = useState({});

  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  // 검색
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // 필터
  const [filterGenres, setFilterGenres] = useState(new Set());
  const [filterPlayers, setFilterPlayers] = useState("");
  const [filterAge, setFilterAge] = useState(null);
  const [sortOrder, setSortOrder] = useState("name");
  const [filterOpen, setFilterOpen] = useState(false);

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
      if (!map[r.game_id]) map[r.game_id] = { count: 0, latestScore: r.total_score ?? null };
      map[r.game_id].count++;
    });
    setReviewSummary(map);
  }, [session]);

  useEffect(() => {
    (async () => {
      const [gamesRes, rankingsRes, reviewsRes] = await Promise.all([
        supabase.from("games").select("*").eq("status", "approved").order("name_ko"),
        supabase.from("bgg_rankings").select("*").order("rank").limit(50),
        supabase.from("reviews").select("game_id, total_score").not("total_score", "is", null),
      ]);

      if (gamesRes.data) {
        setGames(gamesRes.data);

        // BOGI TOP 집계 (클라이언트)
        if (reviewsRes.data?.length > 0) {
          const gamesById = {};
          gamesRes.data.forEach((g) => { gamesById[g.id] = g; });

          const agg = {};
          reviewsRes.data.forEach((r) => {
            if (!agg[r.game_id]) agg[r.game_id] = { sum: 0, count: 0 };
            agg[r.game_id].sum += r.total_score;
            agg[r.game_id].count += 1;
          });

          const top = Object.entries(agg)
            .filter(([id]) => gamesById[id])
            .map(([id, { sum, count }]) => ({
              game: gamesById[id],
              avg: sum / count,
              count,
            }))
            .sort((a, b) => b.avg - a.avg || b.count - a.count)
            .slice(0, 20);

          setBogiTop(top);
        }
      }

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
        (g) => g.name_ko?.toLowerCase().includes(q) || g.name_en?.toLowerCase().includes(q)
      );
    }
    if (filterGenres.size > 0) {
      arr = arr.filter((g) => g.genre?.some((gen) => filterGenres.has(gen)));
    }
    if (filterPlayers !== "") {
      const n = parseInt(filterPlayers, 10);
      if (!isNaN(n) && n > 0) {
        arr = arr.filter((g) => (g.min_players ?? 0) <= n && n <= (g.max_players ?? 99));
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
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "16px 12px" : "32px 24px" }}>

      {/* ── BGG 글로벌 TOP ── */}
      {rankings.length > 0 && (
        <section style={{ marginBottom: isMobile ? 32 : 48 }}>
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, margin: 0, letterSpacing: -0.3, color: COLORS.text }}>
              🌍 BGG 글로벌 TOP
            </h2>
            <div style={{ fontSize: 12, color: COLORS.sub, marginTop: 4 }}>
              BoardGameGeek 기준 TOP {rankings.length}
            </div>
          </div>
          <div style={scrollContainerStyle}>
            {rankings.map((r) => (
              <RankCard key={r.rank} ranking={r} isMobile={isMobile} />
            ))}
          </div>
        </section>
      )}

      {/* ── BOGI 유저 평점 TOP ── */}
      {!loading && (
        <section style={{ marginBottom: isMobile ? 32 : 48 }}>
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, margin: 0, letterSpacing: -0.3, color: COLORS.text }}>
              🏆 BOGI 유저 평점 TOP
            </h2>
            {bogiTop.length > 0 && (
              <div style={{ fontSize: 12, color: COLORS.sub, marginTop: 4 }}>
                멤버 평점 기준 TOP {bogiTop.length}
              </div>
            )}
          </div>
          {bogiTop.length > 0 ? (
            <div style={scrollContainerStyle}>
              {bogiTop.map((item, i) => (
                <BogiRankCard
                  key={item.game.id}
                  rank={i + 1}
                  game={item.game}
                  avg={item.avg}
                  count={item.count}
                  session={session}
                  reviewSummary={reviewSummary[item.game.id] || null}
                  onReviewSaved={refreshReviewSummary}
                  bggData={rankingsMap[item.game.bgg_rank] || null}
                  isMobile={isMobile}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: "28px 24px",
                textAlign: "center",
                color: COLORS.subLight,
                fontSize: 14,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>🎲</div>
              아직 평가가 충분하지 않아요. 첫 평가를 남겨보세요!
            </div>
          )}
        </section>
      )}

      {/* ── 전체 게임 라이브러리 ── */}
      <section>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
          <div>
            <h2 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, margin: 0, letterSpacing: -0.3, color: COLORS.text }}>
              📚 전체 게임
            </h2>
            <div style={{ fontSize: 12, color: COLORS.sub, marginTop: 4 }}>
              {hasFilter
                ? <><span style={{ color: COLORS.accent, fontWeight: 700 }}>{filtered.length}개</span> 검색됨 (전체 {games.length}개)</>
                : `전체 ${games.length}개`}
            </div>
          </div>
          {session && (
            <button
              onClick={() => setShowSubmissionModal(true)}
              style={{
                flexShrink: 0,
                border: `1px solid ${COLORS.accent}`,
                borderRadius: 8,
                padding: isMobile ? "6px 10px" : "7px 14px",
                background: COLORS.accentLight,
                color: COLORS.accent,
                fontSize: isMobile ? 11 : 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              + 게임 추가
            </button>
          )}
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
                fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              필터
              {activeFilterCount > 0 && (
                <span style={{
                  background: COLORS.accent, color: "#fff", borderRadius: "50%",
                  width: 17, height: 17, fontSize: 10, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
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

        {/* 필터 패널 */}
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
          <div style={{ textAlign: "center", padding: 80, color: COLORS.sub }}>로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80, color: COLORS.sub }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎲</div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              {hasFilter ? "조건에 맞는 게임이 없어요" : "등록된 게임이 없어요"}
            </div>
            {hasFilter && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <button
                  onClick={resetFilters}
                  style={{
                    background: COLORS.accent, color: "#fff", border: "none",
                    borderRadius: 8, padding: "8px 20px", fontSize: 13,
                    fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  필터 초기화
                </button>
                {session && (
                  <button
                    onClick={() => setShowSubmissionModal(true)}
                    style={{
                      background: "none", color: COLORS.accent, border: "none",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                      fontFamily: "inherit", textDecoration: "underline",
                      textUnderlineOffset: 3,
                    }}
                  >
                    찾는 게임이 없나요? 추가 신청하기
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(auto-fill, minmax(180px, 1fr))",
            gap: isMobile ? 8 : 16,
          }}>
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

      {showSubmissionModal && createPortal(
        <GameSubmissionModal
          session={session}
          onClose={() => setShowSubmissionModal(false)}
        />,
        document.body
      )}
    </main>
  );
}

// ── BOGI 유저 평점 TOP 카드 ──────────────────────────────────
function BogiRankCard({ rank, game, avg, count, session, reviewSummary, onReviewSaved, bggData, isMobile }) {
  const [showModal, setShowModal] = useState(false);
  const [hovered, setHovered] = useState(false);

  const badgeColor = rank <= 3 ? RANK_COLORS[rank - 1] : COLORS.accent;
  const genreStyle = getGenreStyle(game.genre);
  const cardW = isMobile ? 120 : 152;
  const imgH = isMobile ? 76 : 90;
  const emojiFz = isMobile ? 30 : 38;
  const hasMyScore = reviewSummary?.latestScore != null;

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setShowModal(true)}
        style={{
          flex: `0 0 ${cardW}px`,
          background: COLORS.surface,
          border: `1px solid ${hovered ? COLORS.borderHover : COLORS.border}`,
          borderRadius: 12,
          overflow: "hidden",
          cursor: "pointer",
          transition: "all 0.2s",
          transform: hovered ? "translateY(-2px)" : "none",
          boxShadow: hovered ? "0 8px 24px rgba(0,0,0,0.08)" : "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        {/* 장르 색상 블록 */}
        <div
          style={{
            height: imgH,
            background: `linear-gradient(135deg, ${genreStyle.grad[0]}, ${genreStyle.grad[1]})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", fontSize: emojiFz,
          }}
        >
          {genreStyle.emoji}
          {/* 순위 배지 */}
          <div
            style={{
              position: "absolute", top: 6, left: 6,
              background: badgeColor, color: "#fff",
              fontSize: isMobile ? 10 : 11, fontWeight: 800,
              padding: "2px 6px", borderRadius: 10,
              boxShadow: `0 2px 6px ${badgeColor}88`,
            }}
          >
            #{rank}
          </div>
          {/* 내 평점 배지 */}
          {hasMyScore && (
            <div
              style={{
                position: "absolute", top: 6, right: 6,
                background: "rgba(255,107,53,0.92)", color: "#fff",
                fontSize: 9, fontWeight: 800,
                padding: "2px 5px", borderRadius: 6,
                boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
              }}
            >
              내 평점
            </div>
          )}
        </div>

        {/* 게임 정보 */}
        <div style={{ padding: isMobile ? "8px 9px" : "10px 12px" }}>
          <div
            title={game.name_ko}
            style={{
              fontSize: isMobile ? 11 : 13, fontWeight: 700, color: COLORS.text,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              marginBottom: 5,
            }}
          >
            {game.name_ko}
          </div>
          {/* 커뮤니티 평균 */}
          <div style={{ display: "flex", alignItems: "center", gap: 3, overflow: "hidden" }}>
            <HalfStarDisplay value={avg} size={isMobile ? 11 : 12} />
            <span style={{ fontSize: isMobile ? 10 : 11, color: COLORS.accent, fontWeight: 700, flexShrink: 0 }}>
              {avg.toFixed(1)}
            </span>
            <span style={{ fontSize: isMobile ? 9 : 10, color: COLORS.subLight, flexShrink: 0 }}>
              · {count}개
            </span>
          </div>
          {/* 내 평점 — 구분선으로 명확히 분리 */}
          {hasMyScore && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 4, paddingTop: 4, borderTop: `1px solid ${COLORS.border}` }}>
              <HalfStarDisplay value={reviewSummary.latestScore} size={isMobile ? 10 : 11} />
              <span style={{ fontSize: isMobile ? 10 : 11, color: COLORS.accent, fontWeight: 700, flexShrink: 0 }}>
                나 {reviewSummary.latestScore.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 클릭 시 전체 GameCard 모달 — portal로 document.body에 마운트해야
          스크롤 컨테이너(overflow:auto)에 position:fixed가 갇히지 않음 */}
      {showModal && createPortal(
        <GameCard
          game={game}
          session={session}
          reviewSummary={reviewSummary}
          onReviewSaved={onReviewSaved}
          bggData={bggData}
          autoOpen
          onClose={() => setShowModal(false)}
        />,
        document.body
      )}
    </>
  );
}

// ── BGG 글로벌 TOP 카드 ──────────────────────────────────────
function RankCard({ ranking, isMobile }) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const cardW = isMobile ? 120 : 160;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: `0 0 ${cardW}px`,
        background: COLORS.surface,
        border: `1px solid ${hovered ? COLORS.borderHover : COLORS.border}`,
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.2s",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? "0 8px 24px rgba(0,0,0,0.08)" : "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <div style={{ aspectRatio: "1 / 1", background: "#f3f4f6", position: "relative", overflow: "hidden" }}>
        {!imgError && ranking.thumbnail ? (
          <img
            src={ranking.thumbnail}
            alt={ranking.name_en}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: isMobile ? 28 : 40, background: "linear-gradient(135deg, #f3f4f6, #d4d4d8)",
          }}>
            🎲
          </div>
        )}
        <div style={{
          position: "absolute", top: 6, left: 6,
          background: COLORS.accent, color: "#fff",
          fontSize: isMobile ? 11 : 13, fontWeight: 800,
          padding: isMobile ? "2px 6px" : "3px 9px", borderRadius: 14,
          boxShadow: "0 2px 6px rgba(255,107,53,0.4)",
        }}>
          #{ranking.rank}
        </div>
      </div>
      <div style={{ padding: isMobile ? "8px 9px" : "10px 12px" }}>
        <div
          style={{
            fontSize: isMobile ? 11 : 13, fontWeight: 700, color: COLORS.text,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4,
          }}
          title={ranking.name_en}
        >
          {ranking.name_en}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 4 : 6, fontSize: isMobile ? 10 : 11 }}>
          <span style={{ color: COLORS.accent, fontWeight: 700 }}>★ {ranking.avg_rating?.toFixed(2)}</span>
          <span style={{ color: COLORS.subLight }}>· {ranking.year_published}</span>
        </div>
      </div>
    </div>
  );
}

// ── 공통 스타일 ──────────────────────────────────────────────
const scrollContainerStyle = {
  display: "flex",
  gap: 12,
  overflowX: "auto",
  paddingBottom: 12,
  scrollbarWidth: "thin",
};

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
  left: 12, top: "50%",
  transform: "translateY(-50%)",
  fontSize: 14,
  pointerEvents: "none",
};

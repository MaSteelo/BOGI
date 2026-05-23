import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabase";
import GameCard from "../GameCard";
import { HalfStarDisplay } from "../components/StarDisplay";

const COLORS = {
  bg: "#fafafa",
  surface: "#ffffff",
  border: "#ececec",
  borderHover: "#d4d4d4",
  text: "#1a1a1a",
  sub: "#737373",
  subLight: "#a3a3a3",
  accent: "#ff6b35",
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
const FALLBACK = { grad: ["#f3f4f6", "#d4d4d8"], emoji: "🎲" };

function getNormalizedScore(review) {
  return review.total_score || null;
}

const RATING_BUCKETS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

function buildDist(scores) {
  const dist = {};
  RATING_BUCKETS.forEach((b) => { dist[b] = 0; });
  scores.forEach((score) => {
    const raw = Math.round(score * 2) / 2;
    const key = Math.max(0.5, Math.min(5.0, raw));
    dist[key]++;
  });
  return dist;
}

function getPersonalityComment(dist, total) {
  if (total < 3) return null;
  const highCount = (dist[4.0] || 0) + (dist[4.5] || 0) + (dist[5.0] || 0);
  const lowCount =
    (dist[0.5] || 0) + (dist[1.0] || 0) + (dist[1.5] || 0) +
    (dist[2.0] || 0) + (dist[2.5] || 0) + (dist[3.0] || 0);
  const maxCount = Math.max(...Object.values(dist));
  if (highCount / total >= 0.6) return "어떤 게임이든 즐거움을 찾아내는 열혈 보드게이머";
  if (lowCount / total >= 0.6) return "높은 기준으로 게임을 걸러내는 냉철한 감별사";
  if (maxCount / total <= 0.25) return "장르도 메카니즘도 가리지 않는 진정한 올라운더";
  return "취향이 뚜렷한 선택적 보드게이머";
}

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

function formatJoinDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 가입`;
}

function BackBtn({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "none", border: "none", cursor: "pointer",
        color: hovered ? COLORS.accent : COLORS.sub,
        fontSize: 14, fontWeight: 600, padding: "4px 0",
        marginBottom: 20, fontFamily: "inherit",
        display: "flex", alignItems: "center", gap: 4,
        transition: "color 0.15s",
      }}
    >
      ← 뒤로
    </button>
  );
}

function RatingChart({ dist, scores }) {
  const maxCount = Math.max(...Object.values(dist), 1);
  const total = scores.length;
  const comment = getPersonalityComment(dist, total);
  return (
    <>
      {comment && (
        <div style={{ fontSize: 12, color: COLORS.accent, fontWeight: 700, marginBottom: 12, padding: "6px 12px", background: "#fff1ec", borderRadius: 8, display: "inline-block" }}>
          {comment}
        </div>
      )}
      <div style={{ fontSize: 11, color: COLORS.subLight, marginBottom: 12 }}>평가한 게임 {total}개</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {RATING_BUCKETS.map((b) => {
          const count = dist[b] || 0;
          const widthPct = count > 0 ? Math.max((count / maxCount) * 100, 6) : 0;
          const isMax = count > 0 && count === maxCount;
          return (
            <div key={b} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, fontSize: 11, color: isMax ? COLORS.accent : COLORS.sub, fontWeight: isMax ? 700 : 400, flexShrink: 0, textAlign: "right" }}>{b}</div>
              <div style={{ flex: 1, background: "#f5f5f5", borderRadius: 6, height: 20, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${widthPct}%`, background: isMax ? COLORS.accent : "#ffb49a", borderRadius: 6, transition: "width 0.5s ease" }} />
              </div>
              <div style={{ width: 20, fontSize: 11, color: isMax ? COLORS.accent : COLORS.subLight, fontWeight: isMax ? 700 : 400, flexShrink: 0, textAlign: "right" }}>{count > 0 ? count : ""}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function CssBarChart({ title, data }) {
  const maxVal = Math.max(...data.map(([, v]) => v), 1);
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <div style={{ width: 3, height: 18, borderRadius: 2, background: COLORS.accent, marginRight: 8, flexShrink: 0 }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{title}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map(([label, count]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 72, fontSize: 12, color: COLORS.sub, flexShrink: 0, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
            <div style={{ flex: 1, background: "#f5f5f5", borderRadius: 6, height: 20, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(count / maxVal) * 100}%`, background: COLORS.accent, borderRadius: 6, transition: "width 0.5s ease" }} />
            </div>
            <div style={{ width: 20, fontSize: 11, color: COLORS.subLight, textAlign: "right", flexShrink: 0 }}>{count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyChart({ data }) {
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <div style={{ width: 3, height: 18, borderRadius: 2, background: COLORS.accent, marginRight: 8, flexShrink: 0 }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>월별 활동</div>
      </div>
      <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 80 }}>
        {data.map(({ month, count }) => {
          const heightPct = count > 0 ? Math.max((count / maxVal) * 100, 8) : 0;
          const isMax = count > 0 && count === maxVal;
          const label = month.slice(5).replace(/^0/, "");
          return (
            <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ fontSize: 9, color: isMax ? COLORS.accent : COLORS.subLight, fontWeight: isMax ? 700 : 400, minHeight: 12 }}>
                {count > 0 ? count : ""}
              </div>
              <div style={{ width: "100%", height: `${heightPct}%`, background: isMax ? COLORS.accent : "#e5e7eb", borderRadius: "3px 3px 0 0" }} />
              <div style={{ fontSize: 9, color: isMax ? COLORS.accent : COLORS.subLight, fontWeight: isMax ? 700 : 400 }}>{label}월</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GenreChips({ genreStats }) {
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <div style={{ width: 3, height: 18, borderRadius: 2, background: COLORS.accent, marginRight: 8, flexShrink: 0 }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>장르 분포</div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {genreStats.map(([genre, count]) => {
          const gs = GENRE_STYLE[genre] || FALLBACK;
          return (
            <div
              key={genre}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: `linear-gradient(135deg, ${gs.grad[0]}, ${gs.grad[1]})`,
                borderRadius: 20, padding: "5px 12px",
                fontSize: 12, fontWeight: 700, color: COLORS.text,
              }}
            >
              <span style={{ fontSize: 14 }}>{gs.emoji}</span>
              <span>{genre}</span>
              <span style={{ fontSize: 11, color: COLORS.sub, fontWeight: 500 }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const REVIEWS_QUERY = "*, games(id, name_ko, name_en, genre, min_players, max_players, play_minutes, bgg_rank, publisher, description, min_age, image_url)";

export default function MyPage({ session, profile, isOwnPage = true }) {
  const navigate = useNavigate();
  const { userId: paramUserId } = useParams();
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState("latest");
  const [filterRating, setFilterRating] = useState(null);
  const [filterGenre, setFilterGenre] = useState("전체");
  const [activeTab, setActiveTab] = useState("records");
  const [hoveredTab, setHoveredTab] = useState(null);

  const [targetProfile, setTargetProfile] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const reloadOwnReviews = async () => {
    if (!session?.user.id) return;
    const { data } = await supabase
      .from("reviews")
      .select(REVIEWS_QUERY)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    setReviews(data || []);
  };

  useEffect(() => {
    setNotFound(false);
    setTargetProfile(null);
    setReviews([]);
    setLoading(true);

    if (isOwnPage) {
      const uid = session?.user.id;
      if (!uid) { setLoading(false); return; }
      supabase
        .from("reviews")
        .select(REVIEWS_QUERY)
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .then(({ data }) => { setReviews(data || []); setLoading(false); });
    } else {
      if (!paramUserId) { setNotFound(true); setLoading(false); return; }
      (async () => {
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", paramUserId)
          .single();
        if (!prof) { setNotFound(true); setLoading(false); return; }
        setTargetProfile(prof);
        const { data } = await supabase
          .from("reviews")
          .select(REVIEWS_QUERY)
          .eq("user_id", paramUserId)
          .order("created_at", { ascending: false });
        setReviews(data || []);
        setLoading(false);
      })();
    }
  }, [isOwnPage, paramUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const gameMap = useMemo(() => {
    const map = {};
    reviews.forEach((r) => {
      if (!r.games) return;
      if (!map[r.game_id]) map[r.game_id] = { game: r.games, reviews: [] };
      map[r.game_id].reviews.push(r);
    });
    return map;
  }, [reviews]);

  const stats = useMemo(() => {
    const entries = Object.values(gameMap);
    if (entries.length === 0) return null;
    const allScores = reviews.map(getNormalizedScore).filter(Boolean);
    const avgScore = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null;
    const mostPlayed = entries.reduce((best, e) => e.reviews.length > best.reviews.length ? e : best);
    const dist = buildDist(allScores);
    return { totalRecords: reviews.length, uniqueGames: entries.length, avgScore, mostPlayed: { name: mostPlayed.game.name_ko, count: mostPlayed.reviews.length }, dist, allScores };
  }, [gameMap, reviews]);

  const gameEntries = useMemo(() => {
    return Object.values(gameMap).map(({ game, reviews: gr }) => {
      const latestReview = gr[0];
      const latestScore = getNormalizedScore(latestReview);
      const latestPlayedAt = latestReview.played_at || latestReview.created_at;
      return { game, reviews: gr, count: gr.length, latestScore, latestPlayedAt };
    });
  }, [gameMap]);

  const allGenres = useMemo(() => {
    const set = new Set();
    gameEntries.forEach((e) => e.game.genre?.forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [gameEntries]);

  const filteredEntries = useMemo(() => {
    let arr = [...gameEntries];
    if (filterGenre !== "전체") arr = arr.filter((e) => e.game.genre?.includes(filterGenre));
    if (filterRating !== null) arr = arr.filter((e) => e.latestScore !== null && Math.round(e.latestScore) === filterRating);
    if (sortOrder === "latest") arr.sort((a, b) => new Date(b.latestPlayedAt) - new Date(a.latestPlayedAt));
    if (sortOrder === "oldest") arr.sort((a, b) => new Date(a.latestPlayedAt) - new Date(b.latestPlayedAt));
    if (sortOrder === "score-high") arr.sort((a, b) => (b.latestScore ?? 0) - (a.latestScore ?? 0));
    if (sortOrder === "score-low") arr.sort((a, b) => (a.latestScore ?? 0) - (b.latestScore ?? 0));
    if (sortOrder === "name") arr.sort((a, b) => a.game.name_ko.localeCompare(b.game.name_ko, "ko"));
    return arr;
  }, [gameEntries, filterGenre, filterRating, sortOrder]);

  const genreStats = useMemo(() => {
    const counts = {};
    reviews.forEach((r) => { r.games?.genre?.forEach((g) => { counts[g] = (counts[g] || 0) + 1; }); });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [reviews]);

  const playerStats = useMemo(() => {
    const buckets = { "솔로(1인)": 0, "2인": 0, "3~4인": 0, "5인+": 0 };
    reviews.forEach((r) => {
      const max = r.games?.max_players;
      if (!max) return;
      if (max === 1) buckets["솔로(1인)"]++;
      else if (max === 2) buckets["2인"]++;
      else if (max <= 4) buckets["3~4인"]++;
      else buckets["5인+"]++;
    });
    return Object.entries(buckets).filter(([, v]) => v > 0);
  }, [reviews]);

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const counts = {};
    months.forEach((m) => { counts[m] = 0; });
    reviews.forEach((r) => {
      const date = r.played_at || r.created_at;
      if (!date) return;
      const ym = date.slice(0, 7);
      if (Object.prototype.hasOwnProperty.call(counts, ym)) counts[ym]++;
    });
    return months.map((m) => ({ month: m, count: counts[m] }));
  }, [reviews]);

  const displayNickname = isOwnPage ? (profile?.nickname ?? "") : (targetProfile?.nickname ?? "");
  const displayJoinDate = isOwnPage ? session?.user.created_at : targetProfile?.created_at;

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.subLight }}>
        불러오는 중...
      </div>
    );
  }

  if (!isOwnPage && notFound) {
    return (
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "20px 12px" : "40px 24px" }}>
        <BackBtn onClick={() => navigate(-1)} />
        <div style={{ textAlign: "center", padding: "80px 0", color: COLORS.subLight }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.sub }}>존재하지 않는 유저입니다</div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "20px 12px" : "40px 24px" }}>
      {!isOwnPage && <BackBtn onClick={() => navigate(-1)} />}

      {/* ── 프로필 헤더 ── */}
      <section style={{ marginBottom: 32 }}>
        <div style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 16,
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}>
          {/* 그라데이션 배너 */}
          <div style={{ height: 120, background: "linear-gradient(135deg, #fff1ec 0%, #fafafa 100%)" }} />
          {/* 프로필 콘텐츠 */}
          <div style={{ padding: "0 20px 24px", marginTop: -32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* 아바타 */}
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: COLORS.accent,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 24, fontWeight: 700,
                flexShrink: 0,
                border: "3px solid #fff",
                boxShadow: "0 2px 8px rgba(255,107,53,0.3)",
              }}>
                {(displayNickname || "?").charAt(0)}
              </div>
              {/* 닉네임 + 가입일 */}
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, lineHeight: 1.2 }}>
                  {displayNickname}
                </div>
                <div style={{ fontSize: 12, color: COLORS.subLight, marginTop: 4 }}>
                  🗓 {formatJoinDate(displayJoinDate)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        {stats ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <StatCard value={stats.totalRecords} label="총 기록" unit="회" icon="📝" isMobile={isMobile} />
            <StatCard value={stats.uniqueGames} label="플레이 게임" unit="종" icon="🎮" isMobile={isMobile} />
            <StatCard value={stats.mostPlayed.name} label="최다 플레이" sub={`${stats.mostPlayed.count}회`} truncate icon="🏆" isMobile={isMobile} />
          </div>
        ) : (
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "28px", textAlign: "center", color: COLORS.subLight, fontSize: 14 }}>
            {isOwnPage ? "아직 기록이 없어요. 메인에서 첫 기록을 남겨보세요!" : "아직 기록한 게임이 없어요."}
          </div>
        )}
      </section>

      {/* ── 탭 ── */}
      <div style={{ display: "flex", marginBottom: 24 }}>
        <div style={{ display: "inline-flex", background: "#f5f5f5", borderRadius: 24, padding: 4, gap: 2 }}>
          {[["records", "기록"], ["analytics", "취향분석"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              onMouseEnter={() => setHoveredTab(key)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                background: activeTab === key ? COLORS.accent : hoveredTab === key ? "#e8e8e8" : "transparent",
                color: activeTab === key ? "#fff" : COLORS.subLight,
                border: "none",
                borderRadius: 20,
                padding: "8px 20px",
                fontSize: 14,
                fontWeight: activeTab === key ? 700 : 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 기록 탭 ── */}
      {activeTab === "records" && (
        <section>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 12, color: COLORS.sub }}>{filteredEntries.length}개 게임</div>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={selectStyle}>
              <option value="latest">최신 기록순</option>
              <option value="oldest">오래된 기록순</option>
              <option value="score-high">별점 높은순</option>
              <option value="score-low">별점 낮은순</option>
              <option value="name">가나다순</option>
            </select>
          </div>

          {/* 별점 필터 */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {[1, 2, 3, 4, 5].map((n) => {
              const active = filterRating === n;
              return (
                <button
                  key={n}
                  onClick={() => setFilterRating(active ? null : n)}
                  style={{
                    background: active ? COLORS.accent : COLORS.surface,
                    color: active ? "#fff" : COLORS.sub,
                    border: `1px solid ${active ? COLORS.accent : COLORS.border}`,
                    borderRadius: 20, padding: "6px 14px",
                    fontSize: 12, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
                  }}
                >
                  {"★".repeat(n)}
                </button>
              );
            })}
          </div>

          {/* 장르 필터 */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${COLORS.border}` }}>
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
                    borderRadius: 20, padding: "5px 12px",
                    fontSize: 11, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>

          {/* 게임 격자 */}
          {filteredEntries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: COLORS.sub }}>
              {gameEntries.length === 0 ? (
                <>
                  <div style={{ fontSize: 56, marginBottom: 12 }}>🎲</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>아직 기록한 게임이 없어요</div>
                  <div style={{ fontSize: 13, color: COLORS.subLight }}>홈에서 게임을 찾아 기록해보세요</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>😅</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>해당 조건의 게임이 없어요</div>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              {filteredEntries.map(({ game, count, latestScore }) => (
                <GameCard
                  key={game.id}
                  game={game}
                  session={session}
                  reviewSummary={{ count, latestScore: latestScore != null ? Math.round(latestScore * 10) / 10 : null }}
                  onReviewSaved={isOwnPage ? reloadOwnReviews : undefined}
                  bggData={null}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── 취향분석 탭 ── */}
      {activeTab === "analytics" && (
        <div>
          {stats && stats.allScores.length > 0 ? (
            <>
              <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ width: 3, height: 18, borderRadius: 2, background: COLORS.accent, marginRight: 8, flexShrink: 0 }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>별점 분포</div>
                  {stats.avgScore && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                      <HalfStarDisplay value={stats.avgScore} size={12} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.accent }}>평균 {stats.avgScore.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <RatingChart dist={stats.dist} scores={stats.allScores} />
              </div>
              {genreStats.length > 0 && <GenreChips genreStats={genreStats} />}
              {playerStats.length > 0 && <CssBarChart title="선호 인원수" data={playerStats} />}
              <MonthlyChart data={monthlyStats} />
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "80px 0", color: COLORS.subLight }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
              기록이 쌓이면 취향 분석이 나타나요!
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function StatCard({ value, label, unit = "", sub, truncate, icon, isMobile }) {
  return (
    <div style={{
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 14,
      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      overflow: "hidden",
    }}>
      <div style={{ height: 3, background: COLORS.accent }} />
      <div style={{ padding: isMobile ? "12px 8px" : "16px 12px", textAlign: "center" }}>
        {icon && <div style={{ fontSize: isMobile ? 16 : 20, marginBottom: isMobile ? 3 : 4, lineHeight: 1 }}>{icon}</div>}
        <div style={{
          fontSize: truncate ? (isMobile ? 12 : 15) : (isMobile ? 20 : 24),
          fontWeight: 800,
          color: COLORS.accent,
          lineHeight: 1.1,
          overflow: truncate ? "hidden" : "visible",
          textOverflow: truncate ? "ellipsis" : "clip",
          whiteSpace: truncate ? "nowrap" : "normal",
          marginBottom: 2,
        }}>
          {value}
          {unit && !truncate && <span style={{ fontSize: isMobile ? 11 : 13, fontWeight: 600, color: COLORS.sub, marginLeft: 2 }}>{unit}</span>}
        </div>
        {sub && <div style={{ fontSize: isMobile ? 10 : 12, color: COLORS.sub, marginBottom: 2 }}>{sub}</div>}
        <div style={{ fontSize: isMobile ? 10 : 11, color: COLORS.sub, marginTop: 3, fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
}

const selectStyle = {
  background: COLORS.surface,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "8px 12px",
  color: COLORS.text,
  fontSize: 13,
  outline: "none",
  cursor: "pointer",
  fontFamily: "inherit",
};

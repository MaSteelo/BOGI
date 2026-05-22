import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import EditProposalModal from "./components/EditProposalModal";
import { HalfStarDisplay } from "./components/StarDisplay";

// BGG __thumb URL → __original URL 변환 (thumbnail은 핫링크 차단됨)
// __thumb/img/xxx/fit-in/200x150/filters:webp()/pic.jpg
// → __original/img/xxx/pic.jpg
function thumbToOriginal(url) {
  if (!url || !url.includes("__thumb")) return url;
  return url
    .replace("__thumb", "__original")
    .replace(/\/fit-in\/\d+x\d+\//g, "/")
    .replace(/filters:webp\(\)\//g, "")
    .replace(/filters:strip_icc\(\)\//g, "");
}

// BGG 이미지 URL 정규화 + __thumb → __original 변환
function safeImageUrl(url) {
  if (!url) return null;
  let u = url.trim();
  if (u.startsWith("http://")) u = "https://" + u.slice(7);
  if (u.startsWith("//")) u = "https:" + u;
  if (u.startsWith("cf.geekdo-images.com")) u = "https://" + u;
  if (/^pic\d+\.\w+$/i.test(u)) u = `https://cf.geekdo-images.com/${u}`;
  if (u.startsWith("/")) u = "https://cf.geekdo-images.com" + u;
  if (!u.startsWith("https://")) return null;
  return thumbToOriginal(u);
}

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
  error: "#ef4444",
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
const getGenreStyle = (genres) => {
  if (!genres || genres.length === 0) return FALLBACK;
  return GENRE_STYLE[genres[0]] || FALLBACK;
};

const displayScore = (review) => {
  if (review.total_score) return `★ ${Number(review.total_score).toFixed(1)}`;
  return "−";
};

const DETAIL_FIELDS = [
  { key: "story", label: "스토리" },
  { key: "difficulty", label: "난이도" },
  { key: "replayability", label: "리플레이" },
  { key: "quality", label: "품질" },
  { key: "convenience", label: "편의" },
];

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

// 정수 별점 (세부 별점용)
function StarRating({ value, onChange, size = 24 }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={() => onChange(n === value ? 0 : n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          style={{
            cursor: "pointer",
            fontSize: size,
            color: n <= (hovered ?? value) ? COLORS.accent : "#e5e7eb",
            transition: "color 0.1s",
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

// 0.5 단위 별점 입력 (총점용) — 마우스/터치 모두 지원
function HalfStarRating({ value, onChange, size = 30 }) {
  const [hovered, setHovered] = useState(null);
  const display = hovered ?? value;

  const pickValue = (e, n) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX ?? e.changedTouches?.[0]?.clientX ?? rect.left + rect.width / 2;
    const newVal = clientX - rect.left < rect.width / 2 ? n - 0.5 : n;
    onChange(value === newVal ? 0 : newVal);
  };

  const previewValue = (e, n) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeft = e.clientX - rect.left < rect.width / 2;
    setHovered(isLeft ? n - 0.5 : n);
  };

  // 모바일(큰 size)일 때 최소 터치 타깃 확보: 세로 패딩 추가
  const touchPad = size >= 40 ? Math.round((44 - size) / 2) : 0;

  return (
    <div style={{ display: "inline-flex", gap: size >= 40 ? 6 : 4, userSelect: "none" }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = display >= n ? "full" : display >= n - 0.5 ? "half" : "empty";
        return (
          <span
            key={n}
            onClick={(e) => pickValue(e, n)}
            onMouseMove={(e) => previewValue(e, n)}
            onMouseLeave={() => setHovered(null)}
            style={{
              position: "relative",
              display: "inline-block",
              fontSize: size,
              lineHeight: 1,
              cursor: "pointer",
              padding: touchPad > 0 ? `${touchPad}px 0` : 0,
            }}
          >
            <span style={{ color: "#e5e7eb" }}>★</span>
            {fill !== "empty" && (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: touchPad,
                  color: COLORS.accent,
                  overflow: "hidden",
                  width: fill === "full" ? "100%" : "50%",
                  pointerEvents: "none",
                  lineHeight: 1,
                }}
              >
                ★
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export default function GameCard({ game, session, reviewSummary, onReviewSaved, bggData, autoOpen = false, onClose }) {
  const imageUrl = safeImageUrl(game.image_url);
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;
  const formPanelRef = useRef(null);

  // 카드 상태
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [animating, setAnimating] = useState(false);

  // 폼 상태
  const [totalScore, setTotalScore] = useState(0);
  const [detailExpanded, setDetailExpanded] = useState(false);
  const [detailScores, setDetailScores] = useState({
    story: 0, difficulty: 0, replayability: 0, quality: 0, convenience: 0,
  });
  const [memo, setMemo] = useState("");
  const [playedAt, setPlayedAt] = useState("");
  const [participants, setParticipants] = useState("");
  const [participantsPrivate, setParticipantsPrivate] = useState(false);

  // 저장/수정/삭제 상태
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editingReviewId, setEditingReviewId] = useState(null); // null = 새 기록, id = 수정 모드
  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // 삭제 확인 중인 항목

  // 이전 기록 상태
  const [myGameReviews, setMyGameReviews] = useState(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [showOlderMyReviews, setShowOlderMyReviews] = useState(false);

  // 전체 리뷰 목록 상태
  const [allReviews, setAllReviews] = useState(null); // null=미로드
  const [allReviewsLoading, setAllReviewsLoading] = useState(false);
  const [reviewsShowCount, setReviewsShowCount] = useState(10);

  // 공감 상태: { [reviewId]: { count: number, likedByMe: boolean } }
  const [likesMap, setLikesMap] = useState({});

  // 토스트
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // 편집 제안 모달
  const [showProposalModal, setShowProposalModal] = useState(false);

  const genreStyle = getGenreStyle(game.genre);

  // BogiRankCard 등에서 즉시 열기 요청 시
  useEffect(() => {
    if (autoOpen) open();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // expanded → true 시 애니메이션 트리거
  // useEffect는 DOM 커밋 + 브라우저 페인트 후 실행이 보장되므로,
  // 클릭·autoOpen 모두 초기 rotateY(0deg) 상태를 반드시 페인트한 뒤 전환 시작
  useEffect(() => {
    if (!expanded) return;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimating(true));
    });
    return () => cancelAnimationFrame(raf);
  }, [expanded]);

  useEffect(() => {
    document.body.style.overflow = expanded ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const handler = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [expanded]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  // 폼 초기화 (모달 내 상태만, myGameReviews는 별도 관리)
  const resetForm = () => {
    setTotalScore(0);
    setDetailExpanded(false);
    setDetailScores({ story: 0, difficulty: 0, replayability: 0, quality: 0, convenience: 0 });
    setMemo("");
    setPlayedAt("");
    setParticipants("");
    setParticipantsPrivate(false);
    setEditingReviewId(null);
    setMessage("");
  };

  // 이전 기록을 폼에 로드 (수정 모드 진입)
  const loadReviewIntoForm = (review) => {
    setEditingReviewId(review.id);
    setTotalScore(review.total_score || 0);
    setDetailScores({
      story: review.score_story || 0,
      difficulty: review.score_difficulty || 0,
      replayability: review.score_replayability || 0,
      quality: review.score_quality || 0,
      convenience: review.score_convenience || 0,
    });
    setDetailExpanded(
      !!(review.score_story || review.score_difficulty || review.score_replayability ||
        review.score_quality || review.score_convenience)
    );
    setMemo(review.memo || "");
    setPlayedAt(review.played_at || "");
    setParticipants(review.participants || "");
    setParticipantsPrivate(review.participants_private || false);
    setMessage("");
    setConfirmDeleteId(null);
    setShowWriteForm(true);
    formPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadMyReviews = async () => {
    if (!session || myGameReviews !== null) return;
    setLoadingReviews(true);
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("game_id", game.id)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    const reviews = data || [];
    setMyGameReviews(reviews);
    setShowWriteForm(reviews.length === 0);
    setLoadingReviews(false);
  };

  const loadAllReviews = async () => {
    setAllReviewsLoading(true);
    const { data: reviewRows } = await supabase
      .from("reviews")
      .select("id, user_id, total_score, memo, played_at, created_at, participants, participants_private")
      .eq("game_id", game.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!reviewRows || reviewRows.length === 0) {
      setAllReviews([]);
      setAllReviewsLoading(false);
      return;
    }

    const reviewIds = reviewRows.map((r) => r.id);
    const userIds = [...new Set(reviewRows.map((r) => r.user_id))];

    const [{ data: profileRows }, { data: likesRows }] = await Promise.all([
      supabase.from("profiles").select("id, nickname").in("id", userIds),
      supabase.from("review_likes").select("review_id, user_id").in("review_id", reviewIds),
    ]);

    const nickMap = {};
    profileRows?.forEach((p) => { nickMap[p.id] = p.nickname || "익명"; });

    const lMap = {};
    reviewIds.forEach((id) => { lMap[id] = { count: 0, likedByMe: false }; });
    likesRows?.forEach((l) => {
      if (lMap[l.review_id]) {
        lMap[l.review_id].count++;
        if (session && l.user_id === session.user.id) lMap[l.review_id].likedByMe = true;
      }
    });

    setAllReviews(reviewRows.map((r) => ({ ...r, nickname: nickMap[r.user_id] || "익명" })));
    setLikesMap(lMap);
    setAllReviewsLoading(false);
  };

  const toggleLike = async (reviewId) => {
    if (!session) { showToast("로그인이 필요합니다"); return; }
    const current = likesMap[reviewId] || { count: 0, likedByMe: false };
    const wasLiked = current.likedByMe;
    // 낙관적 업데이트
    setLikesMap((prev) => ({
      ...prev,
      [reviewId]: { count: wasLiked ? Math.max(0, current.count - 1) : current.count + 1, likedByMe: !wasLiked },
    }));
    const { error } = wasLiked
      ? await supabase.from("review_likes").delete().eq("review_id", reviewId).eq("user_id", session.user.id)
      : await supabase.from("review_likes").insert({ review_id: reviewId, user_id: session.user.id });
    if (error) {
      console.error("공감 오류:", error.code, error.message, error);
      setLikesMap((prev) => ({ ...prev, [reviewId]: current }));
      showToast("공감 처리 중 오류가 발생했습니다");
    }
  };

  const open = () => {
    setExpanded(true);
    loadMyReviews();
    loadAllReviews();
  };

  const close = () => {
    setAnimating(false);
    resetForm();
    setMyGameReviews(null);
    setAllReviews(null);
    setLikesMap({});
    setReviewsShowCount(10);
    setConfirmDeleteId(null);
    setShowWriteForm(false);
    setShowOlderMyReviews(false);
    setTimeout(() => {
      setExpanded(false);
      onClose?.();
    }, 600);
  };

  // 저장 (신규 INSERT or 수정 UPDATE)
  const handleSave = async () => {
    if (!session || totalScore === 0) return;
    setSaving(true);
    setMessage("");

    const payload = {
      rating_mode: "total",
      total_score: totalScore,
      score_story: detailScores.story || null,
      score_difficulty: detailScores.difficulty || null,
      score_replayability: detailScores.replayability || null,
      score_quality: detailScores.quality || null,
      score_convenience: detailScores.convenience || null,
      memo: memo.trim() || null,
      played_at: playedAt || null,
      participants: participants.trim() || null,
      participants_private: participantsPrivate,
    };

    let error;
    if (editingReviewId) {
      ({ error } = await supabase
        .from("reviews")
        .update(payload)
        .eq("id", editingReviewId)
        .eq("user_id", session.user.id));
    } else {
      ({ error } = await supabase.from("reviews").insert({
        ...payload,
        game_id: game.id,
        user_id: session.user.id,
      }));
    }

    setSaving(false);
    if (error) {
      setMessage("❌ " + error.message);
    } else {
      const msg = editingReviewId ? "✅ 기록이 수정되었어요" : "✅ 기록했어요!";
      onReviewSaved?.();
      close();
      showToast(msg);
    }
  };

  // 삭제
  const handleDelete = async (reviewId) => {
    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId)
      .eq("user_id", session.user.id);

    if (error) {
      setMessage("❌ " + error.message);
      return;
    }

    setConfirmDeleteId(null);
    const newMyReviews = (myGameReviews || []).filter((r) => r.id !== reviewId);
    setMyGameReviews(newMyReviews);
    setAllReviews((prev) => prev ? prev.filter((r) => r.id !== reviewId) : prev);
    if (editingReviewId === reviewId) resetForm();
    if (newMyReviews.length === 0) setShowWriteForm(true);
    onReviewSaved?.();
    showToast("🗑️ 기록이 삭제되었어요");
  };

  return (
    <>
      {/* ── 그리드용 작은 카드 ── */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={open}
        style={{
          background: COLORS.surface,
          border: `1px solid ${hovered ? COLORS.borderHover : COLORS.border}`,
          borderRadius: 12,
          overflow: "hidden",
          cursor: "pointer",
          boxShadow: hovered ? "0 8px 24px rgba(0,0,0,0.08)" : "0 1px 2px rgba(0,0,0,0.03)",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      >
        <div
          style={{
            aspectRatio: "3 / 4",
            background: `linear-gradient(135deg, ${genreStyle.grad[0]}, ${genreStyle.grad[1]})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isMobile ? 28 : 56,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={game.name_ko}
              loading="lazy"
              onError={(e) => { console.warn("[이미지 로딩 실패]", e.currentTarget.src); e.currentTarget.style.display = "none"; }}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ opacity: 0.9 }}>{genreStyle.emoji}</span>
          )}
          {game.genre?.length > 0 && (
            <div style={badgeStyle("rgba(255,255,255,0.85)", COLORS.text, { top: 8, left: 8 })}>
              {isMobile && game.genre[0].length > 4
                ? game.genre[0].slice(0, 4) + "…"
                : game.genre[0]}
            </div>
          )}
          {reviewSummary && (
            <div style={badgeStyle("rgba(255,107,53,0.88)", "#fff", { top: 8, right: 8 })}>
              {reviewSummary.latestScore
                ? `⭐ ${reviewSummary.latestScore}`
                : `⭐ ${reviewSummary.count}회`}
            </div>
          )}
          {game.bgg_rank && (
            <div style={badgeStyle("rgba(29,78,216,0.82)", "#fff", { bottom: 8, left: 8 })}>
              BGG #{game.bgg_rank}
            </div>
          )}
        </div>
        <div style={{ padding: isMobile ? "5px 7px" : "12px 14px" }}>
          <div
            title={game.name_ko}
            style={{
              fontSize: isMobile ? 10 : 14, fontWeight: 700, color: COLORS.text,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              marginBottom: isMobile ? 1 : 3,
            }}
          >
            {game.name_ko}
          </div>
          {!isMobile && game.name_en && (
            <div
              style={{
                fontSize: 11, color: COLORS.subLight,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                marginBottom: 6,
              }}
            >
              {game.name_en}
            </div>
          )}
          {!isMobile && (
            <div style={{ display: "flex", gap: 10, fontSize: 11, color: COLORS.sub, flexWrap: "wrap" }}>
              {game.min_players && <span>👥 {game.min_players}~{game.max_players}</span>}
              {game.play_minutes && <span>⏱ {game.play_minutes}분</span>}
              {game.min_age && <span>🔞 {game.min_age}세+</span>}
            </div>
          )}
          {isMobile && (
            <div style={{ fontSize: 9, color: COLORS.sub }}>
              {game.min_players ? `👥${game.min_players}~${game.max_players}` : ""}
              {game.play_minutes ? ` ⏱${game.play_minutes}분` : ""}
            </div>
          )}
        </div>
      </div>

      {/* ── 오버레이 + 플립 모달 ── */}
      {expanded && (
        <>
          <div
            onClick={close}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.55)",
              zIndex: 200,
              opacity: animating ? 1 : 0,
              transition: "opacity 0.5s ease-out",
            }}
          />

          <div
            style={{
              position: "fixed", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 201, padding: "16px",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: isMobile ? "95%" : "90%",
                maxWidth: 800,
                height: isMobile ? "92vh" : "85vh",
                maxHeight: isMobile ? undefined : 680,
                perspective: "1400px",
                pointerEvents: "auto",
                transform: animating ? "scale(1)" : "scale(0.2)",
                opacity: animating ? 1 : 0,
                transition: "transform 0.6s ease-out, opacity 0.45s ease-out",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%", height: "100%",
                  transformStyle: "preserve-3d",
                  transition: "transform 0.6s ease-out",
                  transform: animating ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* 앞면 */}
                <div
                  style={{
                    position: "absolute", inset: 0,
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    background: `linear-gradient(135deg, ${genreStyle.grad[0]}, ${genreStyle.grad[1]})`,
                    borderRadius: 20,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 100,
                    overflow: "hidden",
                  }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={game.name_ko}
                      loading="lazy"
                      onError={(e) => { console.warn("[이미지 로딩 실패]", e.currentTarget.src); e.currentTarget.style.display = "none"; }}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: 20 }}
                    />
                  ) : (
                    genreStyle.emoji
                  )}
                </div>

                {/* 뒷면 */}
                <div
                  style={{
                    position: "absolute", inset: 0,
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    background: COLORS.surface,
                    borderRadius: 20,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                  }}
                >
                  {/* 왼쪽 / 상단: 게임 정보 */}
                  <div
                    style={{
                      ...(isMobile
                        ? { height: 120, flexShrink: 0, flexDirection: "row", alignItems: "center", gap: 14 }
                        : { width: 260, flexShrink: 0, flexDirection: "column" }),
                      background: `linear-gradient(160deg, ${genreStyle.grad[0]}, ${genreStyle.grad[1]})`,
                      padding: isMobile ? "14px 20px" : "24px 20px",
                      display: "flex",
                      overflowY: "auto",
                    }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        marginBottom: isMobile ? 0 : 12,
                        width: isMobile ? 64 : 72,
                        height: isMobile ? 64 : 72,
                        borderRadius: 10,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: isMobile ? 44 : 52,
                        background: imageUrl ? "transparent" : "rgba(255,255,255,0.3)",
                      }}
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={game.name_ko}
                          loading="lazy"
                          onError={(e) => { console.warn("[이미지 로딩 실패]", e.currentTarget.src); e.currentTarget.style.display = "none"; }}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        genreStyle.emoji
                      )}
                    </div>
                    <div style={{ minWidth: 0, ...(isMobile ? {} : { display: "flex", flexDirection: "column", flex: 1 }) }}>
                      <div
                        style={{
                          fontSize: isMobile ? 15 : 17, fontWeight: 800, color: COLORS.text,
                          lineHeight: 1.3, marginBottom: 2,
                          ...(isMobile ? { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } : {}),
                        }}
                      >
                        {game.name_ko}
                      </div>
                      {game.name_en && (
                        <div
                          style={{
                            fontSize: 11, color: COLORS.sub,
                            marginBottom: isMobile ? 0 : 10,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}
                        >
                          {game.name_en}
                        </div>
                      )}
                      {!isMobile && (
                        <>
                          {game.genre?.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                              {game.genre.map((g) => (
                                <span
                                  key={g}
                                  style={{
                                    background: "rgba(255,255,255,0.7)", color: COLORS.text,
                                    fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 10,
                                  }}
                                >
                                  {g}
                                </span>
                              ))}
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 8, fontSize: 12, color: COLORS.sub, marginBottom: 4, flexWrap: "wrap" }}>
                            {game.min_players && <span>👥 {game.min_players}~{game.max_players}인</span>}
                            {game.play_minutes && <span>⏱ {game.play_minutes}분</span>}
                            {game.min_age && <span>🔞 {game.min_age}세+</span>}
                          </div>
                          <div style={{ fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>
                            {game.publisher ? `🏢 ${game.publisher}` : ""}
                          </div>
                          {bggData && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, marginBottom: 10 }}>
                              <span style={{ background: "rgba(29,78,216,0.12)", color: "#1d4ed8", fontWeight: 700, padding: "2px 7px", borderRadius: 6 }}>
                                BGG #{bggData.rank}
                              </span>
                              <span style={{ color: COLORS.accent, fontWeight: 700 }}>★ {bggData.avg_rating?.toFixed(2)}</span>
                              {bggData.year_published && <span style={{ color: COLORS.subLight }}>{bggData.year_published}</span>}
                            </div>
                          )}
                          <div style={{ height: 1, background: "rgba(0,0,0,0.08)", marginBottom: 10 }} />
                          <div style={{ fontSize: 12, color: COLORS.sub, lineHeight: 1.6, flex: 1 }}>
                            {game.description || "설명이 아직 없습니다."}
                          </div>
                          {session && (
                            <button
                              onClick={() => setShowProposalModal(true)}
                              style={{
                                marginTop: 12, alignSelf: "flex-start",
                                background: "rgba(255,255,255,0.5)", border: "1px solid rgba(0,0,0,0.1)",
                                borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 600,
                                color: COLORS.sub, cursor: "pointer", display: "flex", alignItems: "center",
                                gap: 4, fontFamily: "inherit",
                              }}
                            >
                              ✏️ 편집 제안
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* 오른쪽 / 하단 */}
                  <div
                    ref={formPanelRef}
                    style={{
                      flex: 1, overflowY: "auto",
                      padding: isMobile ? "18px 20px 24px" : "28px 28px 24px",
                      display: "flex", flexDirection: "column", minHeight: 0,
                    }}
                  >
                    {/* 헤더 */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 8 }}>
                        {game.name_ko}
                      </div>
                      <button
                        onClick={close}
                        style={{
                          background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                          borderRadius: 8, cursor: "pointer", color: COLORS.sub, fontSize: 14,
                          width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, fontFamily: "inherit",
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* ── 내 기록 섹션 ── */}
                    {session && (
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.text, marginBottom: 10 }}>
                          내 기록
                        </div>

                        {loadingReviews ? (
                          <div style={{ textAlign: "center", fontSize: 12, color: COLORS.subLight, padding: "12px 0" }}>
                            불러오는 중...
                          </div>
                        ) : myGameReviews === null ? null
                        : myGameReviews.length === 0 ? (
                          <>
                            <div style={{ fontSize: 12, color: COLORS.subLight, textAlign: "center", padding: "4px 0 14px", lineHeight: 1.6 }}>
                              이 게임의 첫 기록을 남겨보세요!
                            </div>
                            <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px", marginBottom: 12, textAlign: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 12 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.sub }}>⭐ 총점</span>
                                <span style={{ fontSize: 10, color: COLORS.accent, fontWeight: 700, background: COLORS.accentLight, padding: "1px 6px", borderRadius: 4 }}>필수</span>
                              </div>
                              <HalfStarRating value={totalScore} onChange={setTotalScore} size={isMobile ? 44 : 30} />
                              <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: totalScore > 0 ? COLORS.accent : COLORS.subLight }}>
                                {totalScore > 0 ? `${Number(totalScore).toFixed(1)} / 5` : "별을 선택해주세요"}
                              </div>
                            </div>
                            <div style={{ marginBottom: 16 }}>
                              <button onClick={() => setDetailExpanded((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: COLORS.sub, fontSize: 12, fontWeight: 600, padding: "4px 0", fontFamily: "inherit" }}>
                                세부 별점 <span style={{ fontSize: 10, color: COLORS.subLight, fontWeight: 400 }}>선택</span>
                                <span style={{ fontSize: 10 }}>{detailExpanded ? "▲" : "▼"}</span>
                              </button>
                              {detailExpanded && (
                                <div style={{ marginTop: 10, padding: "12px 14px", background: COLORS.bg, borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
                                  <div style={{ fontSize: 11, color: COLORS.subLight, marginBottom: 12, lineHeight: 1.5 }}>세부 별점은 통계에 반영되지 않습니다.</div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {DETAIL_FIELDS.map(({ key, label }) => (
                                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{ fontSize: 12, color: COLORS.sub, fontWeight: 600, width: 52, flexShrink: 0 }}>{label}</span>
                                        <StarRating value={detailScores[key]} onChange={(v) => setDetailScores((prev) => ({ ...prev, [key]: v }))} size={20} />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div style={{ height: 1, background: COLORS.border, marginBottom: 16 }} />
                            <div style={{ display: "flex", gap: 12, marginBottom: 14, flexDirection: isMobile ? "column" : "row" }}>
                              <div style={{ flex: 1 }}>
                                <label style={sectionLabel}>📅 플레이 날짜</label>
                                <input type="date" value={playedAt} onChange={(e) => setPlayedAt(e.target.value)} style={inputStyle} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <label style={sectionLabel}>👥 참가자</label>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <input value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="예: 철수, 영희" style={{ ...inputStyle, flex: 1 }} />
                                  <button onClick={() => setParticipantsPrivate((v) => !v)} title={participantsPrivate ? "비공개 해제" : "비공개 설정"} style={{ flexShrink: 0, border: `1px solid ${participantsPrivate ? COLORS.sub : COLORS.border}`, borderRadius: 8, padding: "0 10px", background: participantsPrivate ? "#f0f0f0" : "transparent", cursor: "pointer", fontSize: 14, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3, color: participantsPrivate ? COLORS.sub : COLORS.subLight, fontWeight: 600, transition: "all 0.15s", whiteSpace: "nowrap" }}>
                                    🔒{participantsPrivate && <span style={{ fontSize: 10 }}>비공개</span>}
                                  </button>
                                </div>
                                {participantsPrivate && <div style={{ fontSize: 11, color: COLORS.subLight, marginTop: 4 }}>나만 볼 수 있어요</div>}
                              </div>
                            </div>
                            <div style={{ marginBottom: 16 }}>
                              <label style={sectionLabel}>📝 메모</label>
                              <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="후기, 최고 점수, 하우스룰, 다음 전략… 자유롭게 기록해요" rows={isMobile ? 3 : 4} style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }} />
                            </div>
                            {message && <div style={{ fontSize: 13, padding: "10px 12px", borderRadius: 8, marginBottom: 12, background: "#fee2e2", color: COLORS.error }}>{message}</div>}
                            <button onClick={handleSave} disabled={saving || totalScore === 0} style={{ width: "100%", background: COLORS.accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: saving || totalScore === 0 ? "not-allowed" : "pointer", opacity: saving || totalScore === 0 ? 0.45 : 1, transition: "opacity 0.15s", fontFamily: "inherit" }}>
                              {saving ? "저장 중..." : totalScore === 0 ? "총점을 입력해주세요" : "기록 저장하기"}
                            </button>
                          </>
                        ) : (
                          <>
                            {/* 최신 기록 카드 */}
                            {[myGameReviews[0]].map((review) => {
                              const isConfirming = confirmDeleteId === review.id;
                              const isCurrentEdit = editingReviewId === review.id;
                              if (isConfirming) {
                                return (
                                  <div key={review.id} style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px" }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#991b1b", marginBottom: 10 }}>이 기록을 정말 삭제할까요?<br /><span style={{ fontWeight: 400, fontSize: 11 }}>되돌릴 수 없어요.</span></div>
                                    <div style={{ display: "flex", gap: 8 }}>
                                      <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, border: "1px solid #fca5a5", borderRadius: 8, background: "#fff", color: COLORS.sub, cursor: "pointer", fontFamily: "inherit" }}>취소</button>
                                      <button onClick={() => handleDelete(review.id)} style={{ flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, border: "none", borderRadius: 8, background: COLORS.error, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>삭제</button>
                                    </div>
                                  </div>
                                );
                              }
                              return (
                                <div key={review.id} style={{ background: isCurrentEdit ? "#fff7f5" : COLORS.bg, border: `1px solid ${isCurrentEdit ? COLORS.accent : COLORS.border}`, borderRadius: 8, padding: "10px 12px" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                    <span style={{ fontSize: 11, color: COLORS.sub }}>{review.played_at || review.created_at?.slice(0, 10)}</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                      <span style={{ fontSize: 11, color: COLORS.accent, fontWeight: 700, marginRight: 4 }}>{displayScore(review)}</span>
                                      <button onClick={() => loadReviewIntoForm(review)} title="수정" style={iconBtnStyle}>✏️</button>
                                      <button onClick={() => setConfirmDeleteId(review.id)} title="삭제" style={iconBtnStyle}>🗑️</button>
                                    </div>
                                  </div>
                                  {review.participants && <div style={{ fontSize: 11, color: COLORS.subLight, marginBottom: review.memo ? 3 : 0 }}>👥 {review.participants_private ? "🔒 비공개" : review.participants}</div>}
                                  {review.memo && <div style={{ fontSize: 11, color: COLORS.sub, lineHeight: 1.5 }}>{review.memo}</div>}
                                </div>
                              );
                            })}

                            {/* 이전 기록 더보기 */}
                            {myGameReviews.length > 1 && (
                              <>
                                <button
                                  onClick={() => setShowOlderMyReviews((v) => !v)}
                                  style={{ width: "100%", marginTop: 6, padding: "6px 0", fontSize: 11, fontWeight: 600, background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.sub, cursor: "pointer", fontFamily: "inherit" }}
                                >
                                  {showOlderMyReviews ? "이전 기록 접기 ▲" : `이전 기록 더보기 (${myGameReviews.length - 1}개) ▼`}
                                </button>
                                {showOlderMyReviews && (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                                    {myGameReviews.slice(1).map((review) => {
                                      const isConfirming = confirmDeleteId === review.id;
                                      const isCurrentEdit = editingReviewId === review.id;
                                      if (isConfirming) {
                                        return (
                                          <div key={review.id} style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px" }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: "#991b1b", marginBottom: 10 }}>이 기록을 정말 삭제할까요?<br /><span style={{ fontWeight: 400, fontSize: 11 }}>되돌릴 수 없어요.</span></div>
                                            <div style={{ display: "flex", gap: 8 }}>
                                              <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, border: "1px solid #fca5a5", borderRadius: 8, background: "#fff", color: COLORS.sub, cursor: "pointer", fontFamily: "inherit" }}>취소</button>
                                              <button onClick={() => handleDelete(review.id)} style={{ flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, border: "none", borderRadius: 8, background: COLORS.error, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>삭제</button>
                                            </div>
                                          </div>
                                        );
                                      }
                                      return (
                                        <div key={review.id} style={{ background: isCurrentEdit ? "#fff7f5" : COLORS.bg, border: `1px solid ${isCurrentEdit ? COLORS.accent : COLORS.border}`, borderRadius: 8, padding: "10px 12px" }}>
                                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                            <span style={{ fontSize: 11, color: COLORS.sub }}>{review.played_at || review.created_at?.slice(0, 10)}</span>
                                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                              <span style={{ fontSize: 11, color: COLORS.accent, fontWeight: 700, marginRight: 4 }}>{displayScore(review)}</span>
                                              <button onClick={() => loadReviewIntoForm(review)} title="수정" style={iconBtnStyle}>✏️</button>
                                              <button onClick={() => setConfirmDeleteId(review.id)} title="삭제" style={iconBtnStyle}>🗑️</button>
                                            </div>
                                          </div>
                                          {review.participants && <div style={{ fontSize: 11, color: COLORS.subLight, marginBottom: review.memo ? 3 : 0 }}>👥 {review.participants_private ? "🔒 비공개" : review.participants}</div>}
                                          {review.memo && <div style={{ fontSize: 11, color: COLORS.sub, lineHeight: 1.5 }}>{review.memo}</div>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            )}

                            {/* 새 기록 추가 버튼 or 폼 */}
                            {!(showWriteForm || !!editingReviewId) ? (
                              <button
                                onClick={() => { resetForm(); setShowWriteForm(true); }}
                                style={{ width: "100%", marginTop: 8, padding: "8px 0", fontSize: 12, fontWeight: 700, background: COLORS.accentLight, border: `1px solid ${COLORS.accent}`, borderRadius: 8, color: COLORS.accent, cursor: "pointer", fontFamily: "inherit" }}
                              >
                                + 새 기록 추가
                              </button>
                            ) : (
                              <div style={{ marginTop: 12, padding: "16px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                                  <span style={{ fontSize: 13, fontWeight: 800, color: COLORS.text }}>
                                    {editingReviewId ? "기록 수정하기" : "새 기록 추가"}
                                  </span>
                                  <button onClick={() => { resetForm(); setShowWriteForm(false); }} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 8, cursor: "pointer", color: COLORS.sub, fontSize: 11, fontWeight: 600, padding: "4px 8px", fontFamily: "inherit" }}>
                                    취소
                                  </button>
                                </div>
                                <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px", marginBottom: 12, textAlign: "center" }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 12 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.sub }}>⭐ 총점</span>
                                    <span style={{ fontSize: 10, color: COLORS.accent, fontWeight: 700, background: COLORS.accentLight, padding: "1px 6px", borderRadius: 4 }}>필수</span>
                                  </div>
                                  <HalfStarRating value={totalScore} onChange={setTotalScore} size={isMobile ? 44 : 30} />
                                  <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: totalScore > 0 ? COLORS.accent : COLORS.subLight }}>
                                    {totalScore > 0 ? `${Number(totalScore).toFixed(1)} / 5` : "별을 선택해주세요"}
                                  </div>
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                  <button onClick={() => setDetailExpanded((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: COLORS.sub, fontSize: 12, fontWeight: 600, padding: "4px 0", fontFamily: "inherit" }}>
                                    세부 별점 <span style={{ fontSize: 10, color: COLORS.subLight, fontWeight: 400 }}>선택</span>
                                    <span style={{ fontSize: 10 }}>{detailExpanded ? "▲" : "▼"}</span>
                                  </button>
                                  {detailExpanded && (
                                    <div style={{ marginTop: 10, padding: "12px 14px", background: COLORS.surface, borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
                                      <div style={{ fontSize: 11, color: COLORS.subLight, marginBottom: 12, lineHeight: 1.5 }}>세부 별점은 통계에 반영되지 않습니다.</div>
                                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {DETAIL_FIELDS.map(({ key, label }) => (
                                          <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <span style={{ fontSize: 12, color: COLORS.sub, fontWeight: 600, width: 52, flexShrink: 0 }}>{label}</span>
                                            <StarRating value={detailScores[key]} onChange={(v) => setDetailScores((prev) => ({ ...prev, [key]: v }))} size={20} />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div style={{ height: 1, background: COLORS.border, marginBottom: 16 }} />
                                <div style={{ display: "flex", gap: 12, marginBottom: 14, flexDirection: isMobile ? "column" : "row" }}>
                                  <div style={{ flex: 1 }}>
                                    <label style={sectionLabel}>📅 플레이 날짜</label>
                                    <input type="date" value={playedAt} onChange={(e) => setPlayedAt(e.target.value)} style={inputStyle} />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <label style={sectionLabel}>👥 참가자</label>
                                    <div style={{ display: "flex", gap: 6 }}>
                                      <input value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="예: 철수, 영희" style={{ ...inputStyle, flex: 1 }} />
                                      <button onClick={() => setParticipantsPrivate((v) => !v)} title={participantsPrivate ? "비공개 해제" : "비공개 설정"} style={{ flexShrink: 0, border: `1px solid ${participantsPrivate ? COLORS.sub : COLORS.border}`, borderRadius: 8, padding: "0 10px", background: participantsPrivate ? "#f0f0f0" : "transparent", cursor: "pointer", fontSize: 14, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3, color: participantsPrivate ? COLORS.sub : COLORS.subLight, fontWeight: 600, transition: "all 0.15s", whiteSpace: "nowrap" }}>
                                        🔒{participantsPrivate && <span style={{ fontSize: 10 }}>비공개</span>}
                                      </button>
                                    </div>
                                    {participantsPrivate && <div style={{ fontSize: 11, color: COLORS.subLight, marginTop: 4 }}>나만 볼 수 있어요</div>}
                                  </div>
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                  <label style={sectionLabel}>📝 메모</label>
                                  <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="후기, 최고 점수, 하우스룰, 다음 전략… 자유롭게 기록해요" rows={isMobile ? 3 : 4} style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }} />
                                </div>
                                {message && <div style={{ fontSize: 13, padding: "10px 12px", borderRadius: 8, marginBottom: 12, background: "#fee2e2", color: COLORS.error }}>{message}</div>}
                                <button onClick={handleSave} disabled={saving || totalScore === 0} style={{ width: "100%", background: COLORS.accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: saving || totalScore === 0 ? "not-allowed" : "pointer", opacity: saving || totalScore === 0 ? 0.45 : 1, transition: "opacity 0.15s", fontFamily: "inherit" }}>
                                  {saving ? "저장 중..." : totalScore === 0 ? "총점을 입력해주세요" : editingReviewId ? "수정하기" : "기록 저장하기"}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* ── 게임 정보 (모바일) ── */}
                    {isMobile && (
                      <div style={{ marginBottom: 24, padding: "14px 16px", background: COLORS.bg, borderRadius: 12, border: `1px solid ${COLORS.border}` }}>
                        {game.genre?.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                            {game.genre.map((g) => (
                              <span key={g} style={{ background: "rgba(0,0,0,0.06)", color: COLORS.text, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{g}</span>
                            ))}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 12, fontSize: 12, color: COLORS.sub, marginBottom: 8, flexWrap: "wrap" }}>
                          {game.min_players && <span>👥 {game.min_players}~{game.max_players}인</span>}
                          {game.play_minutes && <span>⏱ {game.play_minutes}분</span>}
                          {game.min_age && <span>🔞 {game.min_age}세+</span>}
                          {game.publisher && <span>🏢 {game.publisher}</span>}
                        </div>
                        {bggData && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, marginBottom: 8 }}>
                            <span style={{ background: "rgba(29,78,216,0.12)", color: "#1d4ed8", fontWeight: 700, padding: "2px 7px", borderRadius: 6 }}>BGG #{bggData.rank}</span>
                            <span style={{ color: COLORS.accent, fontWeight: 700 }}>★ {bggData.avg_rating?.toFixed(2)}</span>
                            {bggData.year_published && <span style={{ color: COLORS.subLight }}>{bggData.year_published}</span>}
                          </div>
                        )}
                        {game.description && (
                          <div style={{ fontSize: 12, color: COLORS.sub, lineHeight: 1.6, marginBottom: session ? 10 : 0 }}>
                            {game.description}
                          </div>
                        )}
                        {session && (
                          <button onClick={() => setShowProposalModal(true)} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 600, color: COLORS.sub, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                            ✏️ 정보 수정 제안
                          </button>
                        )}
                      </div>
                    )}

                    {/* ── 다른 사람 리뷰 ── */}
                    {(() => {
                      if (allReviews === null) return null;
                      // 집계는 전체(본인 포함) 기준, 목록 노출만 본인 제외
                      const scores = allReviews.filter((r) => r.total_score > 0).map((r) => r.total_score);
                      const avg = scores.length > 0
                        ? scores.reduce((a, b) => a + b, 0) / scores.length
                        : null;
                      const othersReviews = session
                        ? allReviews.filter((r) => r.user_id !== session.user.id)
                        : allReviews;
                      const visible = othersReviews.slice(0, reviewsShowCount);
                      return (
                        <>
                          <div style={{ height: 1, background: COLORS.border, marginBottom: 16 }} />
                          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>
                              다른 사람 리뷰
                            </div>
                            {avg !== null && (
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <HalfStarDisplay value={avg} size={12} />
                                <span style={{ fontSize: 12, color: COLORS.accent, fontWeight: 700 }}>{avg.toFixed(1)}</span>
                                <span style={{ fontSize: 11, color: COLORS.subLight }}>· {allReviews.length}개</span>
                              </div>
                            )}
                          </div>
                          {allReviewsLoading ? (
                            <div style={{ textAlign: "center", fontSize: 12, color: COLORS.subLight, padding: "12px 0" }}>불러오는 중...</div>
                          ) : othersReviews.length === 0 ? (
                            <div style={{ textAlign: "center", fontSize: 12, color: COLORS.subLight, padding: "16px 0", lineHeight: 1.6 }}>
                              다른 사람의 리뷰가 아직 없어요.
                            </div>
                          ) : (
                            <>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {visible.map((review) => (
                                  <div key={review.id} style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 12px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 4 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>{review.nickname}</span>
                                        {review.total_score > 0 && (
                                          <>
                                            <HalfStarDisplay value={review.total_score} size={11} />
                                            <span style={{ fontSize: 11, color: COLORS.accent, fontWeight: 700 }}>{Number(review.total_score).toFixed(1)}</span>
                                          </>
                                        )}
                                      </div>
                                      <span style={{ fontSize: 10, color: COLORS.subLight }}>{review.played_at || review.created_at?.slice(0, 10)}</span>
                                    </div>
                                    {!review.participants_private && review.participants && (
                                      <div style={{ fontSize: 11, color: COLORS.subLight, marginBottom: review.memo ? 3 : 0 }}>👥 {review.participants}</div>
                                    )}
                                    {review.memo && <div style={{ fontSize: 11, color: COLORS.sub, lineHeight: 1.5, wordBreak: "break-word" }}>{review.memo}</div>}
                                    {review.user_id !== session?.user.id && (
                                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                                        <button
                                          onClick={() => toggleLike(review.id)}
                                          style={{
                                            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                                            background: likesMap[review.id]?.likedByMe ? COLORS.accentLight : "transparent",
                                            border: `1px solid ${likesMap[review.id]?.likedByMe ? COLORS.accent : COLORS.border}`,
                                            borderRadius: 20, padding: "0 12px",
                                            cursor: "pointer", fontFamily: "inherit",
                                            color: likesMap[review.id]?.likedByMe ? COLORS.accent : COLORS.subLight,
                                            fontSize: 12, fontWeight: 600,
                                            height: isMobile ? 44 : 28, minWidth: isMobile ? 44 : undefined,
                                            transition: "all 0.15s",
                                          }}
                                        >
                                          <span style={{ fontSize: 14, lineHeight: 1 }}>
                                            {likesMap[review.id]?.likedByMe ? "♥" : "♡"}
                                          </span>
                                          {(likesMap[review.id]?.count || 0) > 0 && (
                                            <span>{likesMap[review.id].count}</span>
                                          )}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {othersReviews.length > reviewsShowCount && (
                                <button onClick={() => setReviewsShowCount((n) => n + 10)} style={{ width: "100%", marginTop: 8, padding: "8px 0", fontSize: 12, fontWeight: 600, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.sub, cursor: "pointer", fontFamily: "inherit" }}>
                                  더 보기 (+{othersReviews.length - reviewsShowCount}개)
                                </button>
                              )}
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 편집 제안 모달 */}
      {showProposalModal && session && (
        <EditProposalModal
          game={game}
          session={session}
          onClose={() => setShowProposalModal(false)}
          onSubmitted={() => showToast("✅ 제안이 접수되었습니다")}
        />
      )}

      {/* 토스트 */}
      <div
        style={{
          position: "fixed",
          bottom: 84,
          right: 28,
          background: "#1a1a1a",
          color: "#fff",
          padding: "12px 18px",
          borderRadius: 12,
          fontSize: 14, fontWeight: 600,
          zIndex: 400,
          display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
          opacity: toastVisible ? 1 : 0,
          transform: toastVisible ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 0.35s ease, transform 0.35s ease",
          pointerEvents: "none",
        }}
      >
        {toastMessage}
      </div>
    </>
  );
}

// ── 공통 스타일 헬퍼 ──
const badgeStyle = (bg, color, pos) => ({
  position: "absolute",
  ...pos,
  background: bg,
  backdropFilter: "blur(4px)",
  color,
  fontSize: 10,
  fontWeight: 700,
  padding: "3px 8px",
  borderRadius: 10,
});

const iconBtnStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 13,
  padding: "2px 4px",
  borderRadius: 4,
  lineHeight: 1,
};

const sectionLabel = {
  display: "block",
  fontSize: 12,
  color: COLORS.sub,
  fontWeight: 600,
  marginBottom: 6,
};

const inputStyle = {
  width: "100%",
  background: COLORS.bg,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  padding: "9px 11px",
  color: COLORS.text,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import GameCard from "../GameCard";

const COLORS = {
  bg: "#fafafa",
  surface: "#ffffff",
  border: "#ececec",
  text: "#1a1a1a",
  sub: "#737373",
  subLight: "#a3a3a3",
  accent: "#1e643c",
  accentLight: "#e8f5ee",
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

export default function CollectionDetail({ session }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;

  const [collection, setCollection] = useState(null);
  const [items, setItems] = useState([]); // [{ game, note }]
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
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
      if (!map[r.game_id]) map[r.game_id] = { count: 0, latestScore: r.total_score ?? null };
      map[r.game_id].count++;
    });
    setReviewSummary(map);
  }, [session]);

  useEffect(() => {
    if (session) refreshReviewSummary();
    else setReviewSummary({});
  }, [session, refreshReviewSummary]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotFound(false);

      const { data: col, error: colErr } = await supabase
        .from("collections")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (colErr || !col) {
        setCollection(null);
        setItems([]);
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCollection(col);

      const { data: cgRows } = await supabase
        .from("collection_games")
        .select("sort_order, note, games(*)")
        .eq("collection_id", col.id)
        .order("sort_order");

      setItems((cgRows || []).filter((r) => r.games).map((r) => ({ game: r.games, note: r.note })));
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "20px 12px" : "40px 24px" }}>
        <div style={{ textAlign: "center", padding: 80, color: COLORS.sub }}>로딩 중...</div>
      </main>
    );
  }

  if (notFound || !collection) {
    return (
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "20px 12px" : "40px 24px" }}>
        <BackBtn onClick={() => navigate(-1)} />
        <div style={{ textAlign: "center", padding: 80, color: COLORS.sub }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          컬렉션을 찾을 수 없어요
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "20px 12px" : "40px 24px" }}>
      <BackBtn onClick={() => navigate(-1)} />

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: COLORS.text, margin: 0, letterSpacing: -0.3 }}>
          {collection.title}
        </h1>
        {collection.subtitle && (
          <div style={{ fontSize: 13, color: COLORS.sub, marginTop: 6 }}>
            {collection.subtitle}
          </div>
        )}
        {collection.description && (
          <p style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.7, marginTop: 14, marginBottom: 0 }}>
            {collection.description}
          </p>
        )}
        {collection.source_url && (
          <a
            href={collection.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 14,
              padding: "6px 14px",
              borderRadius: 999,
              background: COLORS.accentLight,
              color: COLORS.accent,
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            🔗 출처 보기
          </a>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80, color: COLORS.sub }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎲</div>
          아직 등록된 게임이 없어요
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {items.map(({ game, note }) => (
            <div key={game.id}>
              <GameCard
                game={game}
                session={session}
                reviewSummary={reviewSummary[game.id] || null}
                onReviewSaved={refreshReviewSummary}
              />
              {note && (
                <div style={{ fontSize: 11, color: COLORS.subLight, marginTop: 4, padding: "0 2px", lineHeight: 1.4 }}>
                  {note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

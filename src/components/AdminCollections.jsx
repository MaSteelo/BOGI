import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabase";
import CollectionEditor from "./CollectionEditor";

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

function Toggle({ on, onChange, disabled }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 40, height: 22, borderRadius: 11, border: "none",
        background: on ? COLORS.accent : COLORS.border,
        position: "relative", cursor: disabled ? "not-allowed" : "pointer",
        padding: 0, flexShrink: 0, transition: "background 0.15s",
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: on ? 20 : 2,
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        transition: "left 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

export default function AdminCollections() {
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;

  const [view, setView] = useState("list"); // "list" | "edit" | "new"
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("collections")
      .select("*, collection_games(count)")
      .order("sort_order");
    if (error) {
      alert("컬렉션 목록을 불러오지 못했습니다: " + error.message);
      setCollections([]);
      setLoading(false);
      return;
    }
    setCollections(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (view === "list") loadCollections();
  }, [view, loadCollections]);

  const togglePublish = async (col) => {
    setTogglingId(col.id);
    const { error } = await supabase
      .from("collections")
      .update({ is_published: !col.is_published })
      .eq("id", col.id);
    setTogglingId(null);
    if (error) {
      alert("변경에 실패했습니다: " + error.message);
      return;
    }
    setCollections((prev) =>
      prev.map((c) => (c.id === col.id ? { ...c, is_published: !c.is_published } : c))
    );
  };

  if (view === "new" || view === "edit") {
    return (
      <CollectionEditor
        mode={view}
        collectionId={editingId}
        isMobile={isMobile}
        onBack={() => { setEditingId(null); setView("list"); }}
        onDeleted={() => { setEditingId(null); setView("list"); }}
      />
    );
  }

  return (
    <>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>🗂 컬렉션</h2>
          <div style={{ fontSize: 12, color: COLORS.sub, marginTop: 4 }}>
            테마별 게임 모음을 만들고 관리합니다.
          </div>
        </div>
        <button
          onClick={() => setView("new")}
          style={{
            padding: "9px 16px", fontSize: 13, fontWeight: 700,
            border: "none", borderRadius: 8, background: COLORS.accent,
            color: "#fff", cursor: "pointer", fontFamily: "inherit",
          }}
        >
          + 새 컬렉션 만들기
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: COLORS.subLight }}>불러오는 중...</div>
      ) : collections.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: COLORS.subLight }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🗂</div>
          아직 컬렉션이 없습니다.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {collections.map((col) => (
            <div
              key={col.id}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                borderRadius: 12, padding: isMobile ? "12px 14px" : "14px 16px",
              }}
            >
              <div
                onClick={() => { setEditingId(col.id); setView("edit"); }}
                style={{ flex: 1, cursor: "pointer", minWidth: 0 }}
              >
                <div style={{ fontWeight: 800, fontSize: 15, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {col.title || <span style={{ color: COLORS.subLight }}>(제목 없음)</span>}
                </div>
                <div style={{ fontSize: 12, color: COLORS.sub, marginTop: 2 }}>
                  🎲 {col.collection_games?.[0]?.count ?? 0}개 · 순서 {col.sort_order}
                </div>
              </div>
              <Toggle on={col.is_published} onChange={() => togglePublish(col)} disabled={togglingId === col.id} />
              <span style={{ fontSize: 11, color: col.is_published ? COLORS.accent : COLORS.subLight, fontWeight: 700, minWidth: 32 }}>
                {col.is_published ? "공개" : "비공개"}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

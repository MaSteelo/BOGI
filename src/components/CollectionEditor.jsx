import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../supabase";

const COLORS = {
  bg: "#fafafa",
  surface: "#ffffff",
  border: "#ececec",
  text: "#1a1a1a",
  sub: "#737373",
  subLight: "#a3a3a3",
  accent: "#1e643c",
  accentLight: "#e8f5ee",
  error: "#ef4444",
  good: "#22c55e",
};

function safeImageUrl(url) {
  if (!url) return null;
  let u = url.trim();
  if (u.startsWith("http://")) u = "https://" + u.slice(7);
  if (u.startsWith("//")) u = "https:" + u;
  if (!u.startsWith("https://")) return null;
  return u;
}

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  background: COLORS.bg, border: `1px solid ${COLORS.border}`,
  borderRadius: 8, padding: "9px 12px",
  color: COLORS.text, fontSize: 13,
  outline: "none", fontFamily: "inherit",
};

const labelStyle = { fontSize: 12, fontWeight: 700, color: COLORS.sub, marginBottom: 6, display: "block" };

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export default function CollectionEditor({ mode, collectionId, isMobile, onBack, onDeleted }) {
  const isNew = mode === "new" && !collectionId;

  const [id, setId] = useState(collectionId);
  const [form, setForm] = useState({
    slug: "", title: "", subtitle: "", description: "", source_url: "", sort_order: 0,
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [games, setGames] = useState([]); // [{ game_id, sort_order, note, games: {...} }]
  const [gamesLoading, setGamesLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const loadCollection = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase.from("collections").select("*").eq("id", id).single();
    if (error) {
      alert("컬렉션을 불러오지 못했습니다: " + error.message);
      setLoading(false);
      return;
    }
    setForm({
      slug: data.slug ?? "",
      title: data.title ?? "",
      subtitle: data.subtitle ?? "",
      description: data.description ?? "",
      source_url: data.source_url ?? "",
      sort_order: data.sort_order ?? 0,
    });
    setLoading(false);
  }, [id]);

  const loadGames = useCallback(async () => {
    if (!id) return;
    setGamesLoading(true);
    const { data, error } = await supabase
      .from("collection_games")
      .select("game_id, sort_order, note, games(id, name_ko, name_en, image_url)")
      .eq("collection_id", id)
      .order("sort_order");
    if (error) {
      alert("게임 목록을 불러오지 못했습니다: " + error.message);
      setGamesLoading(false);
      return;
    }
    setGames(data || []);
    setGamesLoading(false);
  }, [id]);

  useEffect(() => { if (id) loadCollection(); }, [id, loadCollection]);
  useEffect(() => { if (id) loadGames(); }, [id, loadGames]);

  // ── 게임 검색 ──
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (!q) { setResults([]); setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id, name_ko, name_en, image_url")
        .or(`name_ko.ilike.%${q}%,name_en.ilike.%${q}%`)
        .limit(20);
      if (error) {
        console.error("게임 검색 실패:", error.message);
        setResults([]);
      } else {
        setResults(data || []);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  const addedGameIds = new Set(games.map((g) => g.game_id));

  const handleCreate = async () => {
    if (!form.slug.trim()) { alert("slug를 입력해주세요."); return; }
    if (!form.title.trim()) { alert("제목을 입력해주세요."); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from("collections")
      .insert({
        slug: form.slug.trim(),
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        description: form.description.trim() || null,
        source_url: form.source_url.trim() || null,
        sort_order: Number(form.sort_order) || 0,
        is_published: false,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      alert("컬렉션 생성에 실패했습니다: " + error.message);
      return;
    }
    setId(data.id);
    setSaveMsg("컬렉션이 생성되었습니다. 이제 게임을 추가할 수 있어요.");
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { alert("제목을 입력해주세요."); return; }
    setSaving(true);
    const { error } = await supabase
      .from("collections")
      .update({
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        description: form.description.trim() || null,
        source_url: form.source_url.trim() || null,
        sort_order: Number(form.sort_order) || 0,
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      alert("저장에 실패했습니다: " + error.message);
      return;
    }
    setSaveMsg("저장되었습니다.");
    setTimeout(() => setSaveMsg(""), 2000);
  };

  const handleDelete = async () => {
    if (!window.confirm(`"${form.title}" 컬렉션을 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return;
    setDeleting(true);
    const { error: cgErr } = await supabase.from("collection_games").delete().eq("collection_id", id);
    if (cgErr) {
      alert("삭제에 실패했습니다: " + cgErr.message);
      setDeleting(false);
      return;
    }
    const { error: colErr } = await supabase.from("collections").delete().eq("id", id);
    setDeleting(false);
    if (colErr) {
      alert("삭제에 실패했습니다: " + colErr.message);
      return;
    }
    onDeleted();
  };

  const persistOrder = async (ordered) => {
    const results = await Promise.all(
      ordered.map((g, idx) =>
        supabase.from("collection_games")
          .update({ sort_order: idx })
          .eq("collection_id", id)
          .eq("game_id", g.game_id)
      )
    );
    const failed = results.find((r) => r.error);
    if (failed) {
      alert("순서 변경에 실패했습니다: " + failed.error.message);
      loadGames();
      return;
    }
    setGames(ordered.map((g, idx) => ({ ...g, sort_order: idx })));
  };

  const moveGame = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= games.length) return;
    const next = [...games];
    [next[index], next[target]] = [next[target], next[index]];
    persistOrder(next);
  };

  const addGame = async (game) => {
    const nextOrder = games.length > 0 ? Math.max(...games.map((g) => g.sort_order)) + 1 : 0;
    const { error } = await supabase.from("collection_games").insert({
      collection_id: id,
      game_id: game.id,
      sort_order: nextOrder,
      note: null,
    });
    if (error) {
      alert("게임 추가에 실패했습니다: " + error.message);
      return;
    }
    setGames((prev) => [...prev, { game_id: game.id, sort_order: nextOrder, note: null, games: game }]);
  };

  const removeGame = async (gameId, name) => {
    if (!window.confirm(`"${name}" 게임을 컬렉션에서 빼시겠습니까?`)) return;
    const { error } = await supabase
      .from("collection_games")
      .delete()
      .eq("collection_id", id)
      .eq("game_id", gameId);
    if (error) {
      alert("삭제에 실패했습니다: " + error.message);
      return;
    }
    setGames((prev) => prev.filter((g) => g.game_id !== gameId));
  };

  const updateNote = async (gameId, note) => {
    setGames((prev) => prev.map((g) => (g.game_id === gameId ? { ...g, note } : g)));
    const { error } = await supabase
      .from("collection_games")
      .update({ note: note.trim() || null })
      .eq("collection_id", id)
      .eq("game_id", gameId);
    if (error) {
      alert("메모 저장에 실패했습니다: " + error.message);
      loadGames();
    }
  };

  const btnBase = {
    padding: "9px 16px", fontSize: 13, fontWeight: 700,
    borderRadius: 8, cursor: "pointer", fontFamily: "inherit", border: "none",
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 60, color: COLORS.subLight }}>불러오는 중...</div>;
  }

  return (
    <div style={{ paddingBottom: 60 }}>
      <button
        onClick={onBack}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: COLORS.sub, fontSize: 14, fontWeight: 600, padding: "4px 0",
          marginBottom: 20, fontFamily: "inherit",
        }}
      >
        ← 목록으로
      </button>

      <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 20px", letterSpacing: -0.3 }}>
        {id ? "컬렉션 편집" : "새 컬렉션 만들기"}
      </h2>

      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: isMobile ? 16 : 20, marginBottom: 20 }}>
        <Field label="slug (URL, 생성 후 수정 불가)">
          <input
            value={form.slug}
            onChange={(e) => setField("slug", e.target.value)}
            disabled={!!id}
            placeholder="예: winter-party-games"
            style={{ ...inputStyle, opacity: id ? 0.6 : 1, cursor: id ? "not-allowed" : "text" }}
          />
        </Field>
        <Field label="제목">
          <input value={form.title} onChange={(e) => setField("title", e.target.value)} style={inputStyle} />
        </Field>
        <Field label="부제목">
          <input value={form.subtitle} onChange={(e) => setField("subtitle", e.target.value)} style={inputStyle} />
        </Field>
        <Field label="설명">
          <textarea
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          />
        </Field>
        <Field label="출처 URL">
          <input value={form.source_url} onChange={(e) => setField("source_url", e.target.value)} style={inputStyle} />
        </Field>
        <Field label="정렬 순서">
          <input
            type="number"
            value={form.sort_order}
            onChange={(e) => setField("sort_order", e.target.value)}
            style={{ ...inputStyle, maxWidth: 120 }}
          />
        </Field>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
          <button
            onClick={isNew || !id ? handleCreate : handleSave}
            disabled={saving}
            style={{ ...btnBase, background: saving ? "#e5e7eb" : COLORS.accent, color: saving ? COLORS.sub : "#fff" }}
          >
            {saving ? "저장 중..." : id ? "저장" : "만들기"}
          </button>
          {saveMsg && <span style={{ fontSize: 12, color: COLORS.good, fontWeight: 700 }}>✓ {saveMsg}</span>}
        </div>
      </div>

      {id && (
        <>
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: isMobile ? 16 : 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 14px", color: COLORS.text }}>
              담긴 게임 ({games.length}개)
            </h3>

            {gamesLoading ? (
              <div style={{ textAlign: "center", padding: 30, color: COLORS.subLight }}>불러오는 중...</div>
            ) : games.length === 0 ? (
              <div style={{ textAlign: "center", padding: 30, color: COLORS.subLight, fontSize: 13 }}>
                아직 담긴 게임이 없어요. 아래에서 검색해 추가해주세요.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {games.map((g, idx) => {
                  const img = safeImageUrl(g.games?.image_url);
                  return (
                    <div
                      key={g.game_id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                        borderRadius: 10, padding: 10,
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <button
                          onClick={() => moveGame(idx, -1)}
                          disabled={idx === 0}
                          style={{ ...arrowBtnStyle, opacity: idx === 0 ? 0.3 : 1 }}
                        >▲</button>
                        <button
                          onClick={() => moveGame(idx, 1)}
                          disabled={idx === games.length - 1}
                          style={{ ...arrowBtnStyle, opacity: idx === games.length - 1 ? 0.3 : 1 }}
                        >▼</button>
                      </div>

                      {img ? (
                        <img src={img} alt={g.games?.name_ko} style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 6, background: COLORS.border, flexShrink: 0 }} />
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {g.games?.name_ko ?? "알 수 없는 게임"}
                        </div>
                        <input
                          defaultValue={g.note ?? ""}
                          placeholder="한 줄 메모 (선택)"
                          onBlur={(e) => {
                            if (e.target.value !== (g.note ?? "")) updateNote(g.game_id, e.target.value);
                          }}
                          style={{ ...inputStyle, marginTop: 4, padding: "5px 8px", fontSize: 12 }}
                        />
                      </div>

                      <button
                        onClick={() => removeGame(g.game_id, g.games?.name_ko ?? "게임")}
                        style={{ ...btnBase, padding: "6px 10px", fontSize: 12, background: "none", color: COLORS.error, border: `1px solid ${COLORS.error}` }}
                      >
                        삭제
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: isMobile ? 16 : 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 14px", color: COLORS.text }}>게임 추가</h3>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="게임 이름으로 검색..."
              style={inputStyle}
            />
            {searching && <div style={{ fontSize: 12, color: COLORS.subLight, marginTop: 10 }}>검색 중...</div>}
            {!searching && query.trim() && results.length === 0 && (
              <div style={{ fontSize: 12, color: COLORS.subLight, marginTop: 10 }}>검색 결과가 없습니다.</div>
            )}
            {results.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                {results.map((game) => {
                  const already = addedGameIds.has(game.id);
                  const img = safeImageUrl(game.image_url);
                  return (
                    <div
                      key={game.id}
                      onClick={() => !already && addGame(game)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 10px", borderRadius: 8,
                        background: already ? COLORS.bg : COLORS.surface,
                        border: `1px solid ${COLORS.border}`,
                        cursor: already ? "default" : "pointer",
                      }}
                    >
                      {img ? (
                        <img src={img} alt={game.name_ko} style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: COLORS.border, flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{game.name_ko}</div>
                        {game.name_en && <div style={{ fontSize: 11, color: COLORS.subLight }}>{game.name_en}</div>}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: already ? COLORS.subLight : COLORS.accent }}>
                        {already ? "추가됨" : "+ 추가"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{ ...btnBase, background: "none", color: COLORS.error, border: `1px solid ${COLORS.error}` }}
          >
            {deleting ? "삭제 중..." : "🗑 컬렉션 삭제"}
          </button>
        </>
      )}
    </div>
  );
}

const arrowBtnStyle = {
  width: 22, height: 18, fontSize: 9, lineHeight: "18px",
  border: `1px solid ${COLORS.border}`, borderRadius: 4,
  background: COLORS.surface, color: COLORS.sub, cursor: "pointer", padding: 0,
};

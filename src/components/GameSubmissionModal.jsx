import { useState, useEffect } from "react";
import { supabase } from "../supabase";

const COLORS = {
  bg: "#fafafa",
  surface: "#ffffff",
  border: "#ececec",
  text: "#1a1a1a",
  sub: "#737373",
  subLight: "#a3a3a3",
  accent: "#ff6b35",
  accentLight: "#fff1ec",
  error: "#ef4444",
};

const ALL_GENRES = [
  "전략","가족","파티","협력","카드","추상","경제","추리",
  "머더미스터리","방탈출","덱빌딩","엔진빌딩","워커플레이스먼트",
  "타일배치","다이스","순발력","단어","상상력","정체은닉","레거시",
  "던전크롤러","트릭테이킹","영역지배","경매","프로그래밍","솔로",
  "2인","4X","워게임","어드벤처","액션","어린이","협상","확장",
];

export default function GameSubmissionModal({ session, onClose }) {
  const [form, setForm] = useState({
    name_ko: "",
    name_en: "",
    publisher: "",
    min_players: "",
    max_players: "",
    play_minutes: "",
    min_age: "",
    description: "",
    reason: "",
  });
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // 중복 이름 체크 (non-blocking)
  useEffect(() => {
    if (!form.name_ko.trim()) { setDuplicateWarning(""); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("games")
        .select("name_ko")
        .ilike("name_ko", `%${form.name_ko.trim()}%`)
        .limit(3);
      if (data?.length > 0) {
        setDuplicateWarning(data.map((g) => g.name_ko).join(", "));
      } else {
        setDuplicateWarning("");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [form.name_ko]);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const toggleGenre = (g) =>
    setSelectedGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );

  const handleSubmit = async () => {
    if (!form.name_ko.trim()) { setError("게임 이름(한글)은 필수입니다."); return; }
    setSaving(true);
    setError("");

    const { error: err } = await supabase.from("game_submissions").insert({
      submitted_by: session.user.id,
      name_ko:      form.name_ko.trim(),
      name_en:      form.name_en.trim()      || null,
      publisher:    form.publisher.trim()    || null,
      min_players:  form.min_players  ? parseInt(form.min_players, 10)  : null,
      max_players:  form.max_players  ? parseInt(form.max_players, 10)  : null,
      play_minutes: form.play_minutes ? parseInt(form.play_minutes, 10) : null,
      min_age:      form.min_age      ? parseInt(form.min_age, 10)      : null,
      genre:        selectedGenres.length > 0 ? selectedGenres : null,
      description:  form.description.trim()  || null,
      reason:       form.reason.trim()        || null,
      status:       "pending",
    });

    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      setSubmitted(true);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 400,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: 16,
        overflowY: "auto",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: COLORS.surface,
          borderRadius: 16,
          width: "100%", maxWidth: 500,
          padding: "28px 24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
          margin: "auto",
        }}
      >
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.text }}>게임 추가 신청</div>
            <div style={{ fontSize: 12, color: COLORS.sub, marginTop: 3 }}>
              관리자 검토 후 승인되면 게임 목록에 추가됩니다.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: COLORS.bg, border: `1px solid ${COLORS.border}`,
              borderRadius: 8, width: 32, height: 32, cursor: "pointer",
              fontSize: 14, color: COLORS.sub, fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>✅</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: COLORS.text, marginBottom: 6 }}>
              신청이 접수됐습니다!
            </div>
            <div style={{ fontSize: 13, color: COLORS.sub, marginBottom: 24 }}>
              관리자 검토 후 게임 목록에 추가됩니다.
            </div>
            <button
              onClick={onClose}
              style={{
                padding: "10px 32px", fontSize: 13, fontWeight: 700,
                border: "none", borderRadius: 10,
                background: COLORS.accent, color: "#fff",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              닫기
            </button>
          </div>
        ) : (
          <>
            {/* 게임 이름(한글) */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                게임 이름 (한글) <span style={{ color: COLORS.accent }}>*</span>
              </label>
              <input
                type="text"
                value={form.name_ko}
                onChange={(e) => set("name_ko", e.target.value)}
                placeholder="예: 카탄"
                style={inputStyle}
              />
              {duplicateWarning && (
                <div style={{
                  fontSize: 11, color: "#b45309", marginTop: 5,
                  background: "#fffbeb", padding: "6px 10px", borderRadius: 6,
                }}>
                  ⚠️ 비슷한 이름이 이미 등록되어 있어요: {duplicateWarning}
                </div>
              )}
            </div>

            {/* 게임 이름(영문) */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                게임 이름 (영문)
                <span style={{ fontSize: 11, color: COLORS.subLight, fontWeight: 400, marginLeft: 6 }}>선택</span>
              </label>
              <input
                type="text"
                value={form.name_en}
                onChange={(e) => set("name_en", e.target.value)}
                placeholder="예: Catan"
                style={inputStyle}
              />
            </div>

            {/* 출판사 */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                출판사
                <span style={{ fontSize: 11, color: COLORS.subLight, fontWeight: 400, marginLeft: 6 }}>선택</span>
              </label>
              <input
                type="text"
                value={form.publisher}
                onChange={(e) => set("publisher", e.target.value)}
                placeholder="예: 코리아보드게임즈"
                style={inputStyle}
              />
            </div>

            {/* 인원 + 시간 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>최소 인원</label>
                <input
                  type="number" min={1}
                  value={form.min_players}
                  onChange={(e) => set("min_players", e.target.value)}
                  placeholder="1"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>최대 인원</label>
                <input
                  type="number" min={1}
                  value={form.max_players}
                  onChange={(e) => set("max_players", e.target.value)}
                  placeholder="6"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>플레이 시간 (분)</label>
                <input
                  type="number" min={1}
                  value={form.play_minutes}
                  onChange={(e) => set("play_minutes", e.target.value)}
                  placeholder="60"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* 권장 연령 */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                권장 연령 (세)
                <span style={{ fontSize: 11, color: COLORS.subLight, fontWeight: 400, marginLeft: 6 }}>선택</span>
              </label>
              <input
                type="number" min={0}
                value={form.min_age}
                onChange={(e) => set("min_age", e.target.value)}
                placeholder="10"
                style={{ ...inputStyle, width: 100 }}
              />
            </div>

            {/* 장르 */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                장르
                <span style={{ fontSize: 11, color: COLORS.subLight, fontWeight: 400, marginLeft: 6 }}>선택 · 복수 선택 가능</span>
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ALL_GENRES.map((g) => {
                  const sel = selectedGenres.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGenre(g)}
                      style={{
                        padding: "4px 10px", fontSize: 12, fontWeight: 600,
                        borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
                        border: `1px solid ${sel ? COLORS.accent : COLORS.border}`,
                        background: sel ? COLORS.accentLight : COLORS.bg,
                        color: sel ? COLORS.accent : COLORS.sub,
                        transition: "all 0.12s",
                      }}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 게임 설명 */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                게임 설명
                <span style={{ fontSize: 11, color: COLORS.subLight, fontWeight: 400, marginLeft: 6 }}>선택</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="게임의 특징이나 플레이 방식을 간단히 설명해주세요."
                style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }}
              />
            </div>

            {/* 신청 사유 */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>
                신청 사유
                <span style={{ fontSize: 11, color: COLORS.subLight, fontWeight: 400, marginLeft: 6 }}>선택</span>
              </label>
              <textarea
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
                rows={2}
                placeholder="왜 이 게임을 추가하고 싶은지 알려주세요."
                style={{ ...inputStyle, resize: "none" }}
              />
            </div>

            {error && (
              <div style={{
                fontSize: 12, color: COLORS.error, marginBottom: 12,
                padding: "8px 12px", background: "#fee2e2", borderRadius: 8,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: "11px 0", fontSize: 13, fontWeight: 700,
                  border: `1px solid ${COLORS.border}`, borderRadius: 10,
                  background: COLORS.bg, color: COLORS.sub,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                style={{
                  flex: 2, padding: "11px 0", fontSize: 13, fontWeight: 700,
                  border: "none", borderRadius: 10,
                  background: saving ? "#e5e7eb" : COLORS.accent,
                  color: saving ? COLORS.sub : "#fff",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.15s",
                }}
              >
                {saving ? "제출 중..." : "추가 신청하기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: 12, fontWeight: 700, color: COLORS.sub,
  marginBottom: 6,
};

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  background: COLORS.bg, border: `1px solid ${COLORS.border}`,
  borderRadius: 8, padding: "9px 12px",
  color: COLORS.text, fontSize: 13,
  outline: "none", fontFamily: "inherit",
};

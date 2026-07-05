import { useState } from "react";
import { supabase } from "../supabase";

const C = {
  bg: "#fafafa", surface: "#ffffff", border: "#ececec",
  text: "#1a1a1a", sub: "#737373", subLight: "#a3a3a3",
  accent: "#1e643c", accentLight: "#e8f5ee", error: "#ef4444",
};

const TYPE_OPTIONS = [
  { value: "bug",     label: "🐛 버그 신고" },
  { value: "feature", label: "💡 기능 제안" },
  { value: "other",   label: "💬 기타" },
];

export default function FeedbackModal({ session, onClose }) {
  const [type, setType] = useState("bug");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) { setError("제목을 입력해주세요."); return; }
    setSaving(true);
    setError("");
    const { error: err } = await supabase.from("feedback").insert({
      user_id: session.user.id,
      type,
      title: title.trim(),
      detail: detail.trim() || null,
      status: "pending",
    });
    setSaving(false);
    if (err) setError(err.message);
    else setSubmitted(true);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.6)", zIndex: 600,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: C.surface, borderRadius: 16,
        width: "100%", maxWidth: 440,
        padding: "28px 24px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>오류 신고 / 피드백</div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>✅</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 6 }}>피드백이 접수됐습니다!</div>
            <div style={{ fontSize: 13, color: C.sub, marginBottom: 24 }}>소중한 의견 감사합니다.</div>
            <button onClick={onClose} style={{ padding: "10px 32px", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 10, background: C.accent, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>닫기</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>유형</label>
              <div style={{ display: "flex", gap: 8 }}>
                {TYPE_OPTIONS.map(({ value, label }) => {
                  const sel = type === value;
                  return (
                    <button key={value} type="button" onClick={() => setType(value)}
                      style={{ flex: 1, padding: "9px 0", fontSize: 12, fontWeight: 700, borderRadius: 10, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${sel ? C.accent : C.border}`, background: sel ? C.accentLight : C.bg, color: sel ? C.accent : C.sub, transition: "all 0.12s" }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>제목 <span style={{ color: C.accent }}>*</span></label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="간략하게 제목을 입력해주세요" style={inputStyle} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>상세 내용 <span style={{ fontSize: 11, color: C.subLight, fontWeight: 400, marginLeft: 4 }}>선택</span></label>
              <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={4} placeholder="자세한 내용을 입력해주세요" style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }} />
            </div>

            {error && <div style={{ fontSize: 12, color: C.error, marginBottom: 12, padding: "8px 12px", background: "#fee2e2", borderRadius: 8 }}>{error}</div>}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "11px 0", fontSize: 13, fontWeight: 700, border: `1px solid ${C.border}`, borderRadius: 10, background: C.bg, color: C.sub, cursor: "pointer", fontFamily: "inherit" }}>취소</button>
              <button onClick={handleSubmit} disabled={saving} style={{ flex: 2, padding: "11px 0", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 10, background: saving ? "#e5e7eb" : C.accent, color: saving ? C.sub : "#fff", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 0.15s" }}>
                {saving ? "제출 중..." : "제출하기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const closeBtnStyle = {
  background: "#fafafa", border: "1px solid #ececec",
  borderRadius: 8, width: 32, height: 32, cursor: "pointer",
  fontSize: 14, color: "#737373", fontFamily: "inherit",
  display: "flex", alignItems: "center", justifyContent: "center",
};
const labelStyle = { display: "block", fontSize: 12, fontWeight: 700, color: "#737373", marginBottom: 6 };
const inputStyle = {
  width: "100%", boxSizing: "border-box",
  background: "#fafafa", border: "1px solid #ececec",
  borderRadius: 8, padding: "9px 12px",
  color: "#1a1a1a", fontSize: 13,
  outline: "none", fontFamily: "inherit",
};

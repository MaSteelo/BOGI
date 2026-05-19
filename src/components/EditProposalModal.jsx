import { useState } from "react";
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

export const EDITABLE_FIELDS = [
  { key: "publisher",    label: "출판사",           type: "text" },
  { key: "min_players",  label: "최소 인원",         type: "number" },
  { key: "max_players",  label: "최대 인원",         type: "number" },
  { key: "play_minutes", label: "플레이 시간 (분)",  type: "number" },
  { key: "min_age",      label: "권장 연령 (세)",    type: "number" },
  { key: "genre",        label: "장르",              type: "genre" },
  { key: "name_en",      label: "영문 이름",         type: "text" },
  { key: "description",  label: "게임 설명",         type: "textarea" },
];

function getCurrentDisplay(game, field) {
  const val = game[field.key];
  if (val == null) return "";
  if (field.type === "genre") return Array.isArray(val) ? val.join(", ") : String(val);
  return String(val);
}

function serializeValue(field, input) {
  if (field.type === "genre") {
    const arr = input.split(",").map((s) => s.trim()).filter(Boolean);
    return JSON.stringify(arr);
  }
  return input.trim();
}

function serializeOldValue(game, field) {
  const val = game[field.key];
  if (val == null) return null;
  if (field.type === "genre") return JSON.stringify(Array.isArray(val) ? val : []);
  return String(val);
}

export default function EditProposalModal({ game, session, onClose, onSubmitted }) {
  const [fieldKey, setFieldKey]     = useState(EDITABLE_FIELDS[0].key);
  const [newValue, setNewValue]     = useState("");
  const [reason, setReason]         = useState("");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  const field = EDITABLE_FIELDS.find((f) => f.key === fieldKey);
  const currentDisplay = getCurrentDisplay(game, field);

  const handleFieldChange = (key) => {
    setFieldKey(key);
    setNewValue("");
    setError("");
  };

  const handleSubmit = async () => {
    if (!newValue.trim()) {
      setError("새 값을 입력해주세요.");
      return;
    }
    setSaving(true);
    setError("");

    const { error: err } = await supabase.from("game_edits").insert({
      game_id:     game.id,
      proposed_by: session.user.id,
      field:       field.key,
      old_value:   serializeOldValue(game, field),
      new_value:   serializeValue(field, newValue),
      status:      "pending",
      reason:      reason.trim() || null,
    });

    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      onSubmitted?.();
      onClose();
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 400,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: COLORS.surface,
          borderRadius: 16,
          width: "100%", maxWidth: 460,
          padding: "28px 24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
        }}
      >
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.text }}>정보 수정 제안</div>
            <div style={{ fontSize: 12, color: COLORS.sub, marginTop: 3 }}>{game.name_ko}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: COLORS.bg, border: `1px solid ${COLORS.border}`,
              borderRadius: 8, width: 32, height: 32, cursor: "pointer",
              fontSize: 14, color: COLORS.sub, fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* 수정 항목 선택 */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>수정할 항목</label>
          <select
            value={fieldKey}
            onChange={(e) => handleFieldChange(e.target.value)}
            style={inputStyle}
          >
            {EDITABLE_FIELDS.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* 현재 값 */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>현재 값</label>
          <div
            style={{
              background: "#f3f4f6", border: `1px solid ${COLORS.border}`,
              borderRadius: 8, padding: "9px 12px",
              fontSize: 13, color: currentDisplay ? COLORS.text : COLORS.subLight,
              minHeight: 38,
            }}
          >
            {currentDisplay || "값 없음"}
          </div>
        </div>

        {/* 새 값 */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>
            새 값
            {field.type === "genre" && (
              <span style={{ fontSize: 11, color: COLORS.subLight, fontWeight: 400, marginLeft: 6 }}>
                쉼표로 구분 (예: 전략, 협력)
              </span>
            )}
          </label>
          {field.type === "textarea" ? (
            <textarea
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              rows={4}
              placeholder="새 값을 입력하세요"
              style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }}
            />
          ) : (
            <input
              type={field.type === "number" ? "number" : "text"}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={field.type === "genre" ? "예: 전략, 협력, 경제" : "새 값을 입력하세요"}
              style={inputStyle}
            />
          )}
        </div>

        {/* 수정 사유 (선택) */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>
            수정 사유
            <span style={{ fontSize: 11, color: COLORS.subLight, fontWeight: 400, marginLeft: 6 }}>선택</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="예: BGG 공식 데이터 기준, 출판사 홈페이지 확인 등"
            style={{ ...inputStyle, resize: "none" }}
          />
        </div>

        {error && (
          <div
            style={{
              fontSize: 12, color: COLORS.error, marginBottom: 12,
              padding: "8px 12px", background: "#fee2e2", borderRadius: 8,
            }}
          >
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
            {saving ? "제출 중..." : "제안 제출"}
          </button>
        </div>
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

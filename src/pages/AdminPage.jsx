import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabase";
import { EDITABLE_FIELDS } from "../components/EditProposalModal";

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
  good: "#22c55e",
};

const FIELD_LABEL = Object.fromEntries(EDITABLE_FIELDS.map((f) => [f.key, f.label]));
const NUMERIC_FIELDS = ["min_players", "max_players", "play_minutes", "min_age", "bgg_rank"];

function parseValue(field, raw) {
  if (NUMERIC_FIELDS.includes(field)) return parseInt(raw, 10);
  if (field === "genre") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return raw;
}

function displayValue(field, raw) {
  if (raw == null || raw === "") return <span style={{ color: "#a3a3a3" }}>없음</span>;
  if (field === "genre") {
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.join(", ") : raw;
    } catch {
      return raw;
    }
  }
  if (field === "play_minutes") return `${raw}분`;
  if (field === "min_age") return `${raw}세+`;
  if (field === "min_players" || field === "max_players") return `${raw}명`;
  return raw;
}

const TABS = [
  { key: "pending",  label: "대기 중" },
  { key: "approved", label: "승인됨" },
  { key: "rejected", label: "거절됨" },
];

export default function AdminPage({ session, profile }) {
  const [edits, setEdits]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState("pending");
  const [counts, setCounts]         = useState({});
  const [processing, setProcessing] = useState(null);

  // 비관리자 접근 차단
  if (!profile?.is_admin) {
    return (
      <main style={{ maxWidth: 600, margin: "0 auto", padding: "80px 24px", textAlign: "center", color: COLORS.sub }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>접근 권한이 없습니다.</div>
      </main>
    );
  }

  const loadEdits = useCallback(async () => {
    setLoading(true);

    // 탭별 목록 조회
    const { data: rows } = await supabase
      .from("game_edits")
      .select("*, games(id, name_ko)")
      .eq("status", activeTab)
      .order("created_at", { ascending: activeTab === "pending" });

    if (!rows) { setEdits([]); setLoading(false); return; }

    // 제안자 닉네임 일괄 조회
    const userIds = [...new Set(rows.map((r) => r.proposed_by))];
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, nickname")
      .in("id", userIds);

    const nickMap = {};
    profileRows?.forEach((p) => { nickMap[p.id] = p.nickname; });

    setEdits(rows.map((r) => ({ ...r, proposerNickname: nickMap[r.proposed_by] || "알 수 없음" })));
    setLoading(false);
  }, [activeTab]);

  const loadCounts = async () => {
    const statuses = ["pending", "approved", "rejected"];
    const results = await Promise.all(
      statuses.map((s) =>
        supabase.from("game_edits").select("id", { count: "exact", head: true }).eq("status", s)
      )
    );
    const map = {};
    statuses.forEach((s, i) => { map[s] = results[i].count ?? 0; });
    setCounts(map);
  };

  useEffect(() => { loadEdits(); }, [loadEdits]);
  useEffect(() => { loadCounts(); }, []);

  const handleApprove = async (edit) => {
    setProcessing(edit.id + "_approve");
    const newVal = parseValue(edit.field, edit.new_value);

    if (typeof newVal === "number" && isNaN(newVal)) {
      alert("숫자 변환 실패: " + edit.new_value);
      setProcessing(null);
      return;
    }

    const { error: gameErr } = await supabase
      .from("games")
      .update({ [edit.field]: newVal })
      .eq("id", edit.game_id);

    if (gameErr) {
      alert("games 업데이트 실패: " + gameErr.message);
      setProcessing(null);
      return;
    }

    await supabase
      .from("game_edits")
      .update({
        status:      "approved",
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", edit.id);

    setProcessing(null);
    loadEdits();
    loadCounts();
  };

  const handleReject = async (edit) => {
    setProcessing(edit.id + "_reject");
    await supabase
      .from("game_edits")
      .update({
        status:      "rejected",
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", edit.id);

    setProcessing(null);
    loadEdits();
    loadCounts();
  };

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>
          🛠 편집 검토
        </h2>
        <div style={{ fontSize: 12, color: COLORS.sub, marginTop: 4 }}>
          사용자가 제안한 게임 정보 수정을 검토하고 승인 또는 거절합니다.
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `1px solid ${COLORS.border}` }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "10px 20px", fontFamily: "inherit",
                fontSize: 14, fontWeight: active ? 700 : 500,
                color: active ? COLORS.accent : COLORS.sub,
                borderBottom: active ? `2px solid ${COLORS.accent}` : "2px solid transparent",
                marginBottom: -1,
                transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span
                  style={{
                    background: tab.key === "pending" ? COLORS.accent : COLORS.border,
                    color: tab.key === "pending" ? "#fff" : COLORS.sub,
                    borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700,
                  }}
                >
                  {counts[tab.key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 목록 */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: COLORS.subLight }}>불러오는 중...</div>
      ) : edits.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: COLORS.subLight }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
          {activeTab === "pending" ? "검토 대기 중인 제안이 없습니다." : "항목이 없습니다."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {edits.map((edit) => {
            const isApprovingThis = processing === edit.id + "_approve";
            const isRejectingThis = processing === edit.id + "_reject";
            return (
              <div
                key={edit.id}
                style={{
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: "18px 20px",
                }}
              >
                {/* 상단: 게임명 + 항목 + 상태 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: 15, color: COLORS.text }}>
                      {edit.games?.name_ko ?? "알 수 없는 게임"}
                    </span>
                    <span
                      style={{
                        marginLeft: 10, fontSize: 12, fontWeight: 700,
                        background: COLORS.accentLight, color: COLORS.accent,
                        padding: "2px 9px", borderRadius: 8,
                      }}
                    >
                      {FIELD_LABEL[edit.field] ?? edit.field}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.subLight }}>
                    {new Date(edit.created_at).toLocaleDateString("ko-KR")} · {edit.proposerNickname}
                  </div>
                </div>

                {/* 값 변경 내용 */}
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: COLORS.bg, borderRadius: 8, padding: "12px 14px",
                    marginBottom: edit.reason ? 10 : 14,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 80 }}>
                    <div style={{ fontSize: 10, color: COLORS.subLight, fontWeight: 700, marginBottom: 4 }}>현재 값</div>
                    <div style={{ fontSize: 13, color: COLORS.sub }}>
                      {displayValue(edit.field, edit.old_value)}
                    </div>
                  </div>
                  <span style={{ fontSize: 18, color: COLORS.subLight, flexShrink: 0 }}>→</span>
                  <div style={{ flex: 1, minWidth: 80 }}>
                    <div style={{ fontSize: 10, color: COLORS.accent, fontWeight: 700, marginBottom: 4 }}>제안 값</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>
                      {displayValue(edit.field, edit.new_value)}
                    </div>
                  </div>
                </div>

                {/* 사유 */}
                {edit.reason && (
                  <div
                    style={{
                      fontSize: 12, color: COLORS.sub, marginBottom: 14,
                      padding: "8px 12px", background: "#f9fafb",
                      borderLeft: `3px solid ${COLORS.border}`, borderRadius: "0 6px 6px 0",
                    }}
                  >
                    💬 {edit.reason}
                  </div>
                )}

                {/* 버튼 (pending만) */}
                {activeTab === "pending" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleReject(edit)}
                      disabled={!!processing}
                      style={{
                        flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 700,
                        border: `1px solid ${COLORS.border}`, borderRadius: 8,
                        background: COLORS.bg, color: COLORS.sub,
                        cursor: processing ? "not-allowed" : "pointer",
                        opacity: isRejectingThis ? 0.6 : 1,
                        fontFamily: "inherit",
                      }}
                    >
                      {isRejectingThis ? "처리 중..." : "거절"}
                    </button>
                    <button
                      onClick={() => handleApprove(edit)}
                      disabled={!!processing}
                      style={{
                        flex: 2, padding: "9px 0", fontSize: 13, fontWeight: 700,
                        border: "none", borderRadius: 8,
                        background: isApprovingThis ? "#e5e7eb" : COLORS.good,
                        color: isApprovingThis ? COLORS.sub : "#fff",
                        cursor: processing ? "not-allowed" : "pointer",
                        opacity: isApprovingThis ? 0.6 : 1,
                        fontFamily: "inherit",
                        transition: "background 0.15s",
                      }}
                    >
                      {isApprovingThis ? "처리 중..." : "✓ 승인 및 반영"}
                    </button>
                  </div>
                )}

                {/* 처리 완료 배지 (approved/rejected 탭) */}
                {activeTab !== "pending" && edit.reviewed_at && (
                  <div style={{ fontSize: 11, color: COLORS.subLight, marginTop: 4 }}>
                    {activeTab === "approved" ? "✅ 승인됨" : "❌ 거절됨"} ·{" "}
                    {new Date(edit.reviewed_at).toLocaleDateString("ko-KR")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

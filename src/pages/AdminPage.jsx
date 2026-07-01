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
  accent: "#1e643c",
  accentLight: "#e8f5ee",
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

// 거절 사유 인라인 폼
function RejectForm({ onConfirm, onCancel, disabled }) {
  const [reason, setReason] = useState("");
  return (
    <div style={{ marginTop: 4 }}>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="거절 사유를 입력하면 사용자에게 함께 전달됩니다"
        rows={2}
        autoFocus
        style={{
          width: "100%", boxSizing: "border-box",
          background: COLORS.bg, border: `1px solid ${COLORS.border}`,
          borderRadius: 8, padding: "9px 12px",
          color: COLORS.text, fontSize: 13,
          outline: "none", fontFamily: "inherit",
          resize: "none", lineHeight: 1.5,
          marginBottom: 8,
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onCancel}
          disabled={disabled}
          style={{
            flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 700,
            border: `1px solid ${COLORS.border}`, borderRadius: 8,
            background: COLORS.bg, color: COLORS.sub,
            cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
          }}
        >
          취소
        </button>
        <button
          onClick={() => onConfirm(reason.trim())}
          disabled={disabled}
          style={{
            flex: 2, padding: "9px 0", fontSize: 13, fontWeight: 700,
            border: "none", borderRadius: 8,
            background: disabled ? "#e5e7eb" : COLORS.error,
            color: disabled ? COLORS.sub : "#fff",
            cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
            transition: "background 0.15s",
          }}
        >
          {disabled ? "처리 중..." : "거절 확정"}
        </button>
      </div>
    </div>
  );
}

export default function AdminPage({ session, profile }) {
  // ── 섹션 (편집 검토 / 게임 추가) ──
  const [section, setSection] = useState("edits");

  // ── 편집 검토 상태 ──
  const [edits, setEdits]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState("pending");
  const [counts, setCounts]         = useState({});
  const [processing, setProcessing] = useState(null);

  // ── 게임 추가 상태 ──
  const [submissions, setSubmissions]     = useState([]);
  const [subLoading, setSubLoading]       = useState(true);
  const [subTab, setSubTab]               = useState("pending");
  const [subCounts, setSubCounts]         = useState({});
  const [subProcessing, setSubProcessing] = useState(null);

  // ── 거절 사유 입력 상태 ──
  // { kind: "edit" | "sub", id: uuid } | null
  const [rejectTarget, setRejectTarget] = useState(null);

  const clearRejectTarget = () => setRejectTarget(null);

  // ── 편집 검토 로드 ──
  const loadEdits = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("game_edits")
      .select("*, games(id, name_ko)")
      .eq("status", activeTab)
      .order("created_at", { ascending: activeTab === "pending" });

    if (!rows) { setEdits([]); setLoading(false); return; }

    const userIds = [...new Set(rows.map((r) => r.proposed_by))];
    const { data: profileRows } = await supabase
      .from("profiles").select("id, nickname").in("id", userIds);

    const nickMap = {};
    profileRows?.forEach((p) => { nickMap[p.id] = p.nickname; });

    setEdits(rows.map((r) => ({ ...r, proposerNickname: nickMap[r.proposed_by] || "알 수 없음" })));
    setLoading(false);
  }, [activeTab]);

  const loadCounts = useCallback(async () => {
    const statuses = ["pending", "approved", "rejected"];
    const results = await Promise.all(
      statuses.map((s) =>
        supabase.from("game_edits").select("id", { count: "exact", head: true }).eq("status", s)
      )
    );
    const map = {};
    statuses.forEach((s, i) => { map[s] = results[i].count ?? 0; });
    setCounts(map);
  }, []);

  // ── 게임 추가 로드 ──
  const loadSubmissions = useCallback(async () => {
    setSubLoading(true);
    const { data: rows } = await supabase
      .from("game_submissions")
      .select("*")
      .eq("status", subTab)
      .order("created_at", { ascending: subTab === "pending" });

    if (!rows) { setSubmissions([]); setSubLoading(false); return; }

    const userIds = [...new Set(rows.map((r) => r.submitted_by))];
    const { data: profileRows } = await supabase
      .from("profiles").select("id, nickname").in("id", userIds);

    const nickMap = {};
    profileRows?.forEach((p) => { nickMap[p.id] = p.nickname; });

    setSubmissions(rows.map((r) => ({ ...r, submitterNickname: nickMap[r.submitted_by] || "알 수 없음" })));
    setSubLoading(false);
  }, [subTab]);

  const loadSubCounts = useCallback(async () => {
    const statuses = ["pending", "approved", "rejected"];
    const results = await Promise.all(
      statuses.map((s) =>
        supabase.from("game_submissions").select("id", { count: "exact", head: true }).eq("status", s)
      )
    );
    const map = {};
    statuses.forEach((s, i) => { map[s] = results[i].count ?? 0; });
    setSubCounts(map);
  }, []);

  useEffect(() => { loadEdits(); },     [loadEdits]);
  useEffect(() => { loadCounts(); },    [loadCounts]);
  useEffect(() => { loadSubCounts(); }, [loadSubCounts]);
  useEffect(() => {
    if (section === "submissions") loadSubmissions();
  }, [loadSubmissions, section]);

  // 비관리자 접근 차단
  if (!profile?.is_admin) {
    return (
      <main style={{ maxWidth: 600, margin: "0 auto", padding: "80px 24px", textAlign: "center", color: COLORS.sub }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>접근 권한이 없습니다.</div>
      </main>
    );
  }

  // 알림 생성
  const insertNotification = (userId, type, title, body, relatedId) => {
    supabase.from("notifications").insert({
      user_id: userId, type, title,
      body: body ?? null,
      related_id: relatedId ?? null,
      is_read: false,
    }).then(({ error }) => {
      if (error) console.error("알림 생성 실패:", error.message, error);
    });
  };

  // ── 편집 검토 핸들러 ──
  const handleApprove = async (edit) => {
    setProcessing(edit.id + "_approve");
    const newVal = parseValue(edit.field, edit.new_value);

    if (typeof newVal === "number" && isNaN(newVal)) {
      alert("숫자 변환 실패: " + edit.new_value);
      setProcessing(null);
      return;
    }

    const { error: gameErr } = await supabase
      .from("games").update({ [edit.field]: newVal }).eq("id", edit.game_id);

    if (gameErr) {
      alert("games 업데이트 실패: " + gameErr.message);
      setProcessing(null);
      return;
    }

    await supabase.from("game_edits")
      .update({ status: "approved", reviewed_by: session.user.id, reviewed_at: new Date().toISOString() })
      .eq("id", edit.id);

    insertNotification(
      edit.proposed_by, "edit_approved", "편집 제안 승인",
      `'${edit.games?.name_ko ?? "게임"}' ${FIELD_LABEL[edit.field] ?? edit.field} 편집 제안이 반영되었습니다.`,
      edit.id,
    );

    setProcessing(null);
    loadEdits();
    loadCounts();
  };

  const handleReject = async (edit, reason) => {
    setProcessing(edit.id + "_reject");
    clearRejectTarget();

    await supabase.from("game_edits")
      .update({ status: "rejected", reviewed_by: session.user.id, reviewed_at: new Date().toISOString() })
      .eq("id", edit.id);

    const baseMsg = `'${edit.games?.name_ko ?? "게임"}' ${FIELD_LABEL[edit.field] ?? edit.field} 편집 제안이 반려되었습니다.`;
    insertNotification(
      edit.proposed_by, "edit_rejected", "편집 제안 반려",
      reason ? `${baseMsg} 사유: ${reason}` : baseMsg,
      edit.id,
    );

    setProcessing(null);
    loadEdits();
    loadCounts();
  };

  // ── 게임 추가 핸들러 ──
  const handleApproveSubmission = async (sub) => {
    setSubProcessing(sub.id + "_approve");

    const { error: gameErr } = await supabase.from("games").insert({
      name_ko: sub.name_ko, name_en: sub.name_en || null,
      publisher: sub.publisher || null,
      min_players: sub.min_players ?? null, max_players: sub.max_players ?? null,
      play_minutes: sub.play_minutes ?? null, min_age: sub.min_age ?? null,
      genre: sub.genre || null, description: sub.description || null,
      status: "approved",
    });

    if (gameErr) {
      alert("게임 등록 실패: " + gameErr.message);
      setSubProcessing(null);
      return;
    }

    await supabase.from("game_submissions")
      .update({ status: "approved", reviewed_by: session.user.id, reviewed_at: new Date().toISOString() })
      .eq("id", sub.id);

    insertNotification(
      sub.submitted_by, "submission_approved", "게임 추가 신청 승인",
      `'${sub.name_ko}' 추가 신청이 승인되어 게임 목록에 추가되었습니다.`,
      sub.id,
    );

    setSubProcessing(null);
    loadSubmissions();
    loadSubCounts();
  };

  const handleRejectSubmission = async (sub, reason) => {
    setSubProcessing(sub.id + "_reject");
    clearRejectTarget();

    await supabase.from("game_submissions")
      .update({ status: "rejected", reviewed_by: session.user.id, reviewed_at: new Date().toISOString() })
      .eq("id", sub.id);

    const baseMsg = `'${sub.name_ko}' 추가 신청이 반려되었습니다.`;
    insertNotification(
      sub.submitted_by, "submission_rejected", "게임 추가 신청 반려",
      reason ? `${baseMsg} 사유: ${reason}` : baseMsg,
      sub.id,
    );

    setSubProcessing(null);
    loadSubmissions();
    loadSubCounts();
  };

  const pendingSubCount = subCounts["pending"] ?? 0;

  // ── 신고 목록 상태 ──
  const [reports, setReports]           = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportStatusTab, setReportStatusTab] = useState("pending");

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    const { data: rows } = await supabase
      .from("reports")
      .select("id, review_id, reporter_id, reason, detail, status, created_at, reviews(game_id, memo, total_score, user_id)")
      .eq("status", reportStatusTab)
      .order("created_at", { ascending: reportStatusTab === "pending" });

    if (!rows) { setReports([]); setReportsLoading(false); return; }

    const reporterIds = [...new Set(rows.map((r) => r.reporter_id))];
    const { data: profileRows } = await supabase
      .from("profiles").select("id, nickname").in("id", reporterIds);
    const nickMap = {};
    profileRows?.forEach((p) => { nickMap[p.id] = p.nickname; });

    setReports(rows.map((r) => ({ ...r, reporterNickname: nickMap[r.reporter_id] || "알 수 없음" })));
    setReportsLoading(false);
  }, [reportStatusTab]);

  useEffect(() => {
    if (section === "reports") loadReports();
  }, [section, loadReports]);

  const handleReportAction = async (reportId, newStatus) => {
    await supabase.from("reports").update({ status: newStatus }).eq("id", reportId);
    loadReports();
  };

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>
      {/* 섹션 스위처 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        {[
          { key: "edits",       label: "🛠 편집 검토", badge: counts["pending"] },
          { key: "submissions", label: "➕ 게임 추가", badge: pendingSubCount },
          { key: "reports",     label: "🚨 신고 목록", badge: 0 },
        ].map(({ key, label, badge }) => {
          const active = section === key;
          return (
            <button
              key={key}
              onClick={() => { setSection(key); clearRejectTarget(); }}
              style={{
                padding: "9px 18px", fontSize: 14, fontWeight: active ? 800 : 600,
                border: `1px solid ${active ? COLORS.accent : COLORS.border}`,
                borderRadius: 10,
                background: active ? COLORS.accentLight : COLORS.surface,
                color: active ? COLORS.accent : COLORS.sub,
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.15s",
              }}
            >
              {label}
              {badge > 0 && (
                <span style={{
                  background: active ? COLORS.accent : COLORS.border,
                  color: active ? "#fff" : COLORS.sub,
                  borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700,
                }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── 편집 검토 섹션 ── */}
      {section === "edits" && (
        <>
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
                  onClick={() => { setActiveTab(tab.key); clearRejectTarget(); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: "10px 20px", fontFamily: "inherit",
                    fontSize: 14, fontWeight: active ? 700 : 500,
                    color: active ? COLORS.accent : COLORS.sub,
                    borderBottom: active ? `2px solid ${COLORS.accent}` : "2px solid transparent",
                    marginBottom: -1, transition: "all 0.15s",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  {tab.label}
                  {counts[tab.key] > 0 && (
                    <span style={{
                      background: tab.key === "pending" ? COLORS.accent : COLORS.border,
                      color: tab.key === "pending" ? "#fff" : COLORS.sub,
                      borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700,
                    }}>
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
                const isApprovingThis  = processing === edit.id + "_approve";
                const isProcessingThis = processing === edit.id + "_approve" || processing === edit.id + "_reject";
                const isRejectOpen     = rejectTarget?.kind === "edit" && rejectTarget?.id === edit.id;
                return (
                  <div
                    key={edit.id}
                    style={{
                      background: COLORS.surface,
                      border: `1px solid ${isRejectOpen ? COLORS.error : COLORS.border}`,
                      borderRadius: 12, padding: "18px 20px",
                      transition: "border-color 0.15s",
                    }}
                  >
                    {/* 상단 */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: 15, color: COLORS.text }}>
                          {edit.games?.name_ko ?? "알 수 없는 게임"}
                        </span>
                        <span style={{
                          marginLeft: 10, fontSize: 12, fontWeight: 700,
                          background: COLORS.accentLight, color: COLORS.accent,
                          padding: "2px 9px", borderRadius: 8,
                        }}>
                          {FIELD_LABEL[edit.field] ?? edit.field}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: COLORS.subLight }}>
                        {new Date(edit.created_at).toLocaleDateString("ko-KR")} · {edit.proposerNickname}
                      </div>
                    </div>

                    {/* 값 변경 */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 12,
                      background: COLORS.bg, borderRadius: 8, padding: "12px 14px",
                      marginBottom: edit.reason ? 10 : 14, flexWrap: "wrap",
                    }}>
                      <div style={{ flex: 1, minWidth: 80 }}>
                        <div style={{ fontSize: 10, color: COLORS.subLight, fontWeight: 700, marginBottom: 4 }}>현재 값</div>
                        <div style={{ fontSize: 13, color: COLORS.sub }}>{displayValue(edit.field, edit.old_value)}</div>
                      </div>
                      <span style={{ fontSize: 18, color: COLORS.subLight, flexShrink: 0 }}>→</span>
                      <div style={{ flex: 1, minWidth: 80 }}>
                        <div style={{ fontSize: 10, color: COLORS.accent, fontWeight: 700, marginBottom: 4 }}>제안 값</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{displayValue(edit.field, edit.new_value)}</div>
                      </div>
                    </div>

                    {edit.reason && (
                      <div style={{
                        fontSize: 12, color: COLORS.sub, marginBottom: 14,
                        padding: "8px 12px", background: "#f9fafb",
                        borderLeft: `3px solid ${COLORS.border}`, borderRadius: "0 6px 6px 0",
                      }}>
                        💬 {edit.reason}
                      </div>
                    )}

                    {/* 버튼 영역 (pending만) */}
                    {activeTab === "pending" && (
                      isRejectOpen ? (
                        <RejectForm
                          disabled={isProcessingThis}
                          onCancel={clearRejectTarget}
                          onConfirm={(reason) => handleReject(edit, reason)}
                        />
                      ) : (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => setRejectTarget({ kind: "edit", id: edit.id })}
                            disabled={!!processing}
                            style={{
                              flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 700,
                              border: `1px solid ${COLORS.border}`, borderRadius: 8,
                              background: COLORS.bg, color: COLORS.sub,
                              cursor: processing ? "not-allowed" : "pointer", fontFamily: "inherit",
                            }}
                          >
                            거절
                          </button>
                          <button
                            onClick={() => handleApprove(edit)}
                            disabled={!!processing}
                            style={{
                              flex: 2, padding: "9px 0", fontSize: 13, fontWeight: 700,
                              border: "none", borderRadius: 8,
                              background: isApprovingThis ? "#e5e7eb" : COLORS.good,
                              color: isApprovingThis ? COLORS.sub : "#fff",
                              cursor: processing ? "not-allowed" : "pointer", fontFamily: "inherit",
                              opacity: isApprovingThis ? 0.6 : 1,
                              transition: "background 0.15s",
                            }}
                          >
                            {isApprovingThis ? "처리 중..." : "✓ 승인 및 반영"}
                          </button>
                        </div>
                      )
                    )}

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
        </>
      )}

      {/* ── 게임 추가 섹션 ── */}
      {section === "submissions" && (
        <>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>
              ➕ 게임 추가
            </h2>
            <div style={{ fontSize: 12, color: COLORS.sub, marginTop: 4 }}>
              사용자가 신청한 신규 게임을 검토하고 승인 시 게임 목록에 추가됩니다.
            </div>
          </div>

          {/* 탭 */}
          <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `1px solid ${COLORS.border}` }}>
            {TABS.map((tab) => {
              const active = subTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setSubTab(tab.key); clearRejectTarget(); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: "10px 20px", fontFamily: "inherit",
                    fontSize: 14, fontWeight: active ? 700 : 500,
                    color: active ? COLORS.accent : COLORS.sub,
                    borderBottom: active ? `2px solid ${COLORS.accent}` : "2px solid transparent",
                    marginBottom: -1, transition: "all 0.15s",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  {tab.label}
                  {subCounts[tab.key] > 0 && (
                    <span style={{
                      background: tab.key === "pending" ? COLORS.accent : COLORS.border,
                      color: tab.key === "pending" ? "#fff" : COLORS.sub,
                      borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700,
                    }}>
                      {subCounts[tab.key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 목록 */}
          {subLoading ? (
            <div style={{ textAlign: "center", padding: 60, color: COLORS.subLight }}>불러오는 중...</div>
          ) : submissions.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: COLORS.subLight }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
              {subTab === "pending" ? "검토 대기 중인 신청이 없습니다." : "항목이 없습니다."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {submissions.map((sub) => {
                const isApprovingThis  = subProcessing === sub.id + "_approve";
                const isProcessingThis = subProcessing === sub.id + "_approve" || subProcessing === sub.id + "_reject";
                const isRejectOpen     = rejectTarget?.kind === "sub" && rejectTarget?.id === sub.id;
                return (
                  <div
                    key={sub.id}
                    style={{
                      background: COLORS.surface,
                      border: `1px solid ${isRejectOpen ? COLORS.error : COLORS.border}`,
                      borderRadius: 12, padding: "18px 20px",
                      transition: "border-color 0.15s",
                    }}
                  >
                    {/* 상단 */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: 16, color: COLORS.text }}>{sub.name_ko}</span>
                        {sub.name_en && (
                          <span style={{ marginLeft: 8, fontSize: 13, color: COLORS.sub }}>{sub.name_en}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: COLORS.subLight }}>
                        {new Date(sub.created_at).toLocaleDateString("ko-KR")} · {sub.submitterNickname}
                      </div>
                    </div>

                    {/* 게임 메타 */}
                    <div style={{
                      background: COLORS.bg, borderRadius: 8, padding: "12px 14px",
                      marginBottom: 10, display: "flex", flexWrap: "wrap", gap: "8px 20px",
                    }}>
                      {sub.publisher && (
                        <div style={{ fontSize: 12, color: COLORS.sub }}>
                          <span style={{ fontWeight: 700, color: COLORS.subLight }}>출판사 </span>{sub.publisher}
                        </div>
                      )}
                      {(sub.min_players || sub.max_players) && (
                        <div style={{ fontSize: 12, color: COLORS.sub }}>
                          <span style={{ fontWeight: 700, color: COLORS.subLight }}>인원 </span>
                          {sub.min_players ?? "?"}–{sub.max_players ?? "?"}명
                        </div>
                      )}
                      {sub.play_minutes && (
                        <div style={{ fontSize: 12, color: COLORS.sub }}>
                          <span style={{ fontWeight: 700, color: COLORS.subLight }}>시간 </span>{sub.play_minutes}분
                        </div>
                      )}
                      {sub.min_age && (
                        <div style={{ fontSize: 12, color: COLORS.sub }}>
                          <span style={{ fontWeight: 700, color: COLORS.subLight }}>연령 </span>{sub.min_age}세+
                        </div>
                      )}
                    </div>

                    {sub.genre?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                        {sub.genre.map((g) => (
                          <span key={g} style={{
                            fontSize: 11, fontWeight: 600,
                            background: COLORS.accentLight, color: COLORS.accent,
                            padding: "2px 8px", borderRadius: 12,
                          }}>
                            {g}
                          </span>
                        ))}
                      </div>
                    )}

                    {sub.description && (
                      <div style={{ fontSize: 12, color: COLORS.sub, marginBottom: 10, lineHeight: 1.6 }}>
                        {sub.description}
                      </div>
                    )}

                    {sub.reason && (
                      <div style={{
                        fontSize: 12, color: COLORS.sub, marginBottom: 14,
                        padding: "8px 12px", background: "#f9fafb",
                        borderLeft: `3px solid ${COLORS.border}`, borderRadius: "0 6px 6px 0",
                      }}>
                        💬 {sub.reason}
                      </div>
                    )}

                    {/* 버튼 영역 (pending만) */}
                    {subTab === "pending" && (
                      isRejectOpen ? (
                        <RejectForm
                          disabled={isProcessingThis}
                          onCancel={clearRejectTarget}
                          onConfirm={(reason) => handleRejectSubmission(sub, reason)}
                        />
                      ) : (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => setRejectTarget({ kind: "sub", id: sub.id })}
                            disabled={!!subProcessing}
                            style={{
                              flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 700,
                              border: `1px solid ${COLORS.border}`, borderRadius: 8,
                              background: COLORS.bg, color: COLORS.sub,
                              cursor: subProcessing ? "not-allowed" : "pointer", fontFamily: "inherit",
                            }}
                          >
                            거절
                          </button>
                          <button
                            onClick={() => handleApproveSubmission(sub)}
                            disabled={!!subProcessing}
                            style={{
                              flex: 2, padding: "9px 0", fontSize: 13, fontWeight: 700,
                              border: "none", borderRadius: 8,
                              background: isApprovingThis ? "#e5e7eb" : COLORS.good,
                              color: isApprovingThis ? COLORS.sub : "#fff",
                              cursor: subProcessing ? "not-allowed" : "pointer", fontFamily: "inherit",
                              opacity: isApprovingThis ? 0.6 : 1,
                              transition: "background 0.15s",
                            }}
                          >
                            {isApprovingThis ? "처리 중..." : "✓ 승인 및 게임 추가"}
                          </button>
                        </div>
                      )
                    )}

                    {subTab !== "pending" && sub.reviewed_at && (
                      <div style={{ fontSize: 11, color: COLORS.subLight, marginTop: 4 }}>
                        {subTab === "approved" ? "✅ 승인됨 · 게임 목록에 추가됨" : "❌ 거절됨"} ·{" "}
                        {new Date(sub.reviewed_at).toLocaleDateString("ko-KR")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── 신고 목록 섹션 ── */}
      {section === "reports" && (
        <>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>🚨 신고 목록</h2>
            <div style={{ fontSize: 12, color: COLORS.sub, marginTop: 4 }}>사용자가 신고한 리뷰를 검토합니다.</div>
          </div>
          <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `1px solid ${COLORS.border}` }}>
            {[{ key: "pending", label: "대기" }, { key: "resolved", label: "처리됨" }, { key: "dismissed", label: "기각됨" }].map((tab) => {
              const active = reportStatusTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setReportStatusTab(tab.key)} style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 20px", fontFamily: "inherit", fontSize: 14, fontWeight: active ? 700 : 500, color: active ? COLORS.accent : COLORS.sub, borderBottom: active ? `2px solid ${COLORS.accent}` : "2px solid transparent", marginBottom: -1, transition: "all 0.15s" }}>
                  {tab.label}
                </button>
              );
            })}
          </div>
          {reportsLoading ? (
            <div style={{ textAlign: "center", padding: 60, color: COLORS.subLight }}>불러오는 중...</div>
          ) : reports.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: COLORS.subLight }}><div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>신고 없음</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {reports.map((r) => (
                <div key={r.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 4 }}>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: 14, color: COLORS.text }}>{r.reason}</span>
                      {r.detail && <span style={{ fontSize: 12, color: COLORS.sub, marginLeft: 8 }}>— {r.detail}</span>}
                    </div>
                    <span style={{ fontSize: 11, color: COLORS.subLight }}>{new Date(r.created_at).toLocaleDateString("ko-KR")} · {r.reporterNickname}</span>
                  </div>
                  {r.reviews?.memo && (
                    <div style={{ fontSize: 12, color: COLORS.sub, background: COLORS.bg, borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
                      신고된 리뷰: {r.reviews.memo.slice(0, 100)}{r.reviews.memo.length > 100 ? "..." : ""}
                    </div>
                  )}
                  {r.status === "pending" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleReportAction(r.id, "dismissed")} style={{ flex: 1, padding: "8px 0", fontSize: 12, fontWeight: 700, border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.bg, color: COLORS.sub, cursor: "pointer", fontFamily: "inherit" }}>기각</button>
                      <button onClick={() => handleReportAction(r.id, "resolved")} style={{ flex: 2, padding: "8px 0", fontSize: 12, fontWeight: 700, border: "none", borderRadius: 8, background: COLORS.error, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>처리 완료</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

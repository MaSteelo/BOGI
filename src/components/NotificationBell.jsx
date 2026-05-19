import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabase";

const COLORS = {
  surface: "#ffffff",
  border: "#ececec",
  text: "#1a1a1a",
  sub: "#737373",
  subLight: "#a3a3a3",
  accent: "#ff6b35",
  accentLight: "#fff1ec",
};

const TYPE_ICON = {
  edit_approved:        "✅",
  edit_rejected:        "❌",
  submission_approved:  "✅",
  submission_rejected:  "❌",
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

export default function NotificationBell({ session }) {
  const [open, setOpen]                   = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(false);
  const containerRef = useRef(null);

  // 미읽음 개수 조회 (30초 폴링)
  const loadUnreadCount = useCallback(async () => {
    if (!session) return;
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false);
    setUnreadCount(count ?? 0);
  }, [session]);

  useEffect(() => {
    loadUnreadCount();
    const t = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(t);
  }, [loadUnreadCount]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);

  const handleToggle = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    const all = data ?? [];
    setNotifications(all);
    setLoading(false);

    // 열면 전체 읽음 처리 (fire-and-forget)
    const unreadIds = all.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length > 0) {
      supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
      setUnreadCount(0);
      setNotifications(all.map((n) => ({ ...n, is_read: true })));
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative", flexShrink: 0 }}>
      {/* 종 버튼 */}
      <button
        onClick={handleToggle}
        aria-label="알림"
        style={{
          position: "relative",
          background: open ? COLORS.accentLight : "transparent",
          border: `1px solid ${open ? COLORS.accent : COLORS.border}`,
          borderRadius: 8,
          width: 36,
          height: 36,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          transition: "all 0.15s",
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -5,
              right: -5,
              background: "#ef4444",
              color: "#fff",
              borderRadius: "50%",
              minWidth: 17,
              height: 17,
              fontSize: 9,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
              boxSizing: "border-box",
              lineHeight: 1,
              border: "1.5px solid #fff",
              pointerEvents: "none",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 */}
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: 320,
            maxWidth: "calc(100vw - 24px)",
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          {/* 드롭다운 헤더 */}
          <div
            style={{
              padding: "14px 16px 12px",
              borderBottom: `1px solid ${COLORS.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 800, color: COLORS.text }}>
              알림
            </span>
            <span style={{ fontSize: 11, color: COLORS.subLight }}>
              최근 30개
            </span>
          </div>

          {/* 알림 목록 */}
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "28px 0", textAlign: "center", color: COLORS.subLight, fontSize: 13 }}>
                불러오는 중...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: "36px 0", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔕</div>
                <div style={{ fontSize: 13, color: COLORS.subLight }}>새 알림이 없습니다</div>
              </div>
            ) : (
              notifications.map((n, i) => (
                <div
                  key={n.id}
                  style={{
                    padding: "12px 16px",
                    borderBottom: i < notifications.length - 1 ? `1px solid ${COLORS.border}` : "none",
                    background: n.is_read ? COLORS.surface : COLORS.accentLight,
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>
                    {TYPE_ICON[n.type] ?? "📢"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13, fontWeight: 700, color: COLORS.text,
                        marginBottom: n.body ? 3 : 0,
                      }}
                    >
                      {n.title}
                    </div>
                    {n.body && (
                      <div style={{
                        fontSize: 12, color: COLORS.sub, lineHeight: 1.5,
                        wordBreak: "break-word", whiteSpace: "pre-wrap",
                      }}>
                        {n.body}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: COLORS.subLight, marginTop: 4 }}>
                      {timeAgo(n.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

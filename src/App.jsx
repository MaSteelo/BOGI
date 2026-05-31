import { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "./supabase";
import Auth from "./Auth";
import Home from "./pages/Home";
import MyPage from "./pages/MyPage";
import AdminPage from "./pages/AdminPage";
import NotificationBell from "./components/NotificationBell";

const COLORS = {
  bg: "#fafafa",
  surface: "#ffffff",
  border: "#ececec",
  text: "#1a1a1a",
  sub: "#737373",
  subLight: "#a3a3a3",
  accent: "#1e643c",
};

const TAB_H = 68;

function Header({ profile, session }) {
  const navigate = useNavigate();
  const [logoutHovered, setLogoutHovered] = useState(false);
  const [loginHovered, setLoginHovered] = useState(false);

  return (
    <header
      style={{
        background: COLORS.surface,
        borderBottom: `1px solid ${COLORS.border}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        padding: "14px 24px",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1 }} />
          <div
            onClick={() => navigate("/")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              userSelect: "none",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>🎲</span>
            <span
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: COLORS.accent,
                letterSpacing: 6,
              }}
            >
              BOGI
            </span>
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 12,
            }}
          >
            {profile && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: COLORS.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 100,
                }}
              >
                {profile.nickname}
              </span>
            )}
            {session && <NotificationBell session={session} />}
            {session ? (
              <button
                onClick={() => supabase.auth.signOut()}
                onMouseEnter={() => setLogoutHovered(true)}
                onMouseLeave={() => setLogoutHovered(false)}
                style={{
                  background: logoutHovered ? "#f5f5f5" : "transparent",
                  color: COLORS.sub,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
              >
                로그아웃
              </button>
            ) : (
              <button
                onClick={() => navigate("/")}
                onMouseEnter={() => setLoginHovered(true)}
                onMouseLeave={() => setLoginHovered(false)}
                style={{
                  background: loginHovered ? "#e55a2b" : COLORS.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function TabBtn({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        background: "none",
        border: "none",
        cursor: "pointer",
        color: active ? COLORS.accent : COLORS.subLight,
        fontFamily: "inherit",
        padding: "8px 0",
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
      <div
        style={{
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: active ? COLORS.accent : "transparent",
          marginTop: 2,
        }}
      />
    </button>
  );
}

function BottomTabBar({ isAdmin }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleSearchTab = () => {
    navigate("/");
    setTimeout(() => {
      document.getElementById("search-input")?.focus();
    }, 100);
  };

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: TAB_H,
        background: COLORS.surface,
        borderTop: `1px solid ${COLORS.border}`,
        display: "flex",
        alignItems: "center",
        zIndex: 100,
        boxShadow: "0 -2px 12px rgba(0,0,0,0.06)",
      }}
    >
      <TabBtn
        icon="🏠"
        label="홈"
        active={pathname === "/"}
        onClick={() => navigate("/")}
      />
      <TabBtn
        icon="🔍"
        label="검색"
        active={false}
        onClick={handleSearchTab}
      />

      {/* 중앙 기록 버튼 */}
      <button
        onClick={() => navigate("/")}
        style={{
          flex: 1,
          border: "none",
          background: "none",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          fontFamily: "inherit",
          padding: 0,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: COLORS.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            color: "#fff",
            fontWeight: 300,
            boxShadow: "0 6px 20px rgba(30,100,60,0.5)",
            lineHeight: 1,
          }}
        >
          +
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent }}>
          기록
        </span>
      </button>

      <TabBtn
        icon="👤"
        label="마이"
        active={pathname === "/mypage"}
        onClick={() => navigate("/mypage")}
      />

      {/* 관리자에게만 보이는 편집 검토 탭 */}
      {isAdmin && (
        <TabBtn
          icon="🛠"
          label="검토"
          active={pathname === "/admin"}
          onClick={() => navigate("/admin")}
        />
      )}
    </nav>
  );
}

export default function App() {
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [session]);

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: COLORS.bg,
          color: COLORS.sub,
          fontFamily: "'Pretendard', 'Apple SD Gothic Neo', -apple-system, sans-serif",
        }}
      >
        로딩 중...
      </div>
    );
  }

  const isPublicRoute = location.pathname.startsWith("/user/");
  if (!session && !isPublicRoute) return <Auth />;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: "'Pretendard', 'Apple SD Gothic Neo', -apple-system, sans-serif",
      }}
    >
      <Header profile={profile} session={session} />
      <div style={{ paddingBottom: session ? TAB_H : 0 }}>
        <Routes>
          <Route path="/" element={<Home session={session} />} />
          <Route path="/mypage" element={<MyPage session={session} profile={profile} isOwnPage={true} />} />
          <Route path="/user/:userId" element={<MyPage session={session} profile={profile} isOwnPage={false} />} />
          <Route path="/admin" element={<AdminPage session={session} profile={profile} />} />
        </Routes>
      </div>
      {session && <BottomTabBar isAdmin={profile?.is_admin ?? false} />}
    </div>
  );
}

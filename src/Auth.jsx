import { useState } from "react";
import { supabase } from "./supabase";

const COLORS = {
  bg: "#fafafa",
  surface: "#ffffff",
  border: "#ececec",
  text: "#1a1a1a",
  sub: "#737373",
  subLight: "#a3a3a3",
  accent: "#1e643c",
  error: "#ef4444",
};

export default function Auth() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "reset"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [focusedField, setFocusedField] = useState(null);
  const [submitHovered, setSubmitHovered] = useState(false);
  const [googleHovered, setGoogleHovered] = useState(false);
  const [kakaoHovered, setKakaoHovered] = useState(false);
  const [forgotHovered, setForgotHovered] = useState(false);
  const [backHovered, setBackHovered] = useState(false);

  // 로그인 / 회원가입
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        if (!nickname.trim()) {
          setMessage("닉네임을 입력해주세요");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nickname: nickname.trim() } },
        });
        if (error) throw error;
        setMessage("✅ 가입 성공! 로그인됩니다...");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // 로그인 상태 유지 미체크 시 탭/브라우저 닫을 때 세션 종료
        if (!keepSignedIn) {
          window.addEventListener("beforeunload", () => {
            supabase.auth.signOut();
          });
        }
      }
    } catch (err) {
      setMessage("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 비밀번호 재설정 메일 발송
  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setMessage("✅ 이메일을 확인해주세요! 재설정 링크를 보냈어요");
    } catch (err) {
      setMessage("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setMessage("");
  };

  const fieldInputStyle = (field) => ({
    width: "100%",
    background: COLORS.surface,
    border: `1px solid ${focusedField === field ? COLORS.accent : COLORS.border}`,
    borderRadius: 10,
    padding: "11px 14px",
    color: COLORS.text,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    transition: "border-color 0.15s",
  });

  const headerTitle =
    mode === "signin" ? "로그인" :
    mode === "signup" ? "회원가입" :
    "비밀번호 재설정";

  const headerSub =
    mode === "reset"
      ? "가입한 이메일을 입력하면 재설정 링크를 보내드려요"
      : "보드게임을 기록하고, 취향을 발견하세요";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 20,
          padding: 36,
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        }}
      >
        {/* ── 브랜드 ── */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div
            style={{
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: 8,
              color: COLORS.accent,
              marginBottom: 8,
            }}
          >
            BOGI
          </div>
          <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 14 }}>🎲</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px", color: COLORS.text }}>
            {headerTitle}
          </h1>
          <div style={{ fontSize: 13, color: COLORS.sub }}>{headerSub}</div>
        </div>

        {/* ── 비밀번호 재설정 폼 ── */}
        {mode === "reset" ? (
          <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                placeholder="가입 시 사용한 이메일"
                required
                style={fieldInputStyle("email")}
              />
            </div>

            {message && (
              <div
                style={{
                  fontSize: 13,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: message.startsWith("✅") ? "#dcfce7" : "#fee2e2",
                  color: message.startsWith("✅") ? "#166534" : COLORS.error,
                }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              onMouseEnter={() => setSubmitHovered(true)}
              onMouseLeave={() => setSubmitHovered(false)}
              style={{
                background: submitHovered && !loading ? "#e85e28" : COLORS.accent,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "14px",
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.6 : 1,
                marginTop: 4,
                transition: "background 0.15s",
                fontFamily: "inherit",
              }}
            >
              {loading ? "발송 중..." : "재설정 메일 보내기"}
            </button>
          </form>
        ) : (
          /* ── 로그인 / 회원가입 폼 ── */
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "signup" && (
              <div>
                <label style={labelStyle}>닉네임</label>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onFocus={() => setFocusedField("nickname")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="다른 사용자에게 표시될 이름"
                  required
                  style={fieldInputStyle("nickname")}
                />
              </div>
            )}

            <div>
              <label style={labelStyle}>이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                placeholder="you@example.com"
                required
                style={fieldInputStyle("email")}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>비밀번호</label>
                {mode === "signin" && (
                  <span
                    onClick={() => switchMode("reset")}
                    onMouseEnter={() => setForgotHovered(true)}
                    onMouseLeave={() => setForgotHovered(false)}
                    style={{
                      fontSize: 12,
                      color: forgotHovered ? COLORS.accent : COLORS.subLight,
                      cursor: "pointer",
                      transition: "color 0.15s",
                      userSelect: "none",
                    }}
                  >
                    비밀번호를 잊으셨나요?
                  </span>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                placeholder="최소 6자"
                required
                minLength={6}
                style={fieldInputStyle("password")}
              />
            </div>

            {/* 로그인 상태 유지 (signin 모드에서만) */}
            {mode === "signin" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  id="keepSignedIn"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  style={{ width: 14, height: 14, cursor: "pointer", accentColor: COLORS.accent }}
                />
                <label
                  htmlFor="keepSignedIn"
                  style={{ fontSize: 12, color: COLORS.sub, cursor: "pointer", userSelect: "none" }}
                >
                  로그인 상태 유지
                </label>
              </div>
            )}

            {message && (
              <div
                style={{
                  fontSize: 13,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: message.startsWith("✅") ? "#dcfce7" : "#fee2e2",
                  color: message.startsWith("✅") ? "#166534" : COLORS.error,
                }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              onMouseEnter={() => setSubmitHovered(true)}
              onMouseLeave={() => setSubmitHovered(false)}
              style={{
                background: submitHovered && !loading ? "#e85e28" : COLORS.accent,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "14px",
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.6 : 1,
                marginTop: 4,
                transition: "background 0.15s",
                fontFamily: "inherit",
              }}
            >
              {loading ? "처리 중..." : mode === "signin" ? "로그인" : "가입하기"}
            </button>
          </form>
        )}

        {/* ── 또는 구분선 + 소셜 (signin/signup 전용) ── */}
        {mode !== "reset" && (
          <>
            <div style={{ margin: "20px 0", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: COLORS.border }} />
              <span style={{ fontSize: 12, color: COLORS.subLight, flexShrink: 0 }}>또는</span>
              <div style={{ flex: 1, height: 1, background: COLORS.border }} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => alert("준비 중입니다")}
                onMouseEnter={() => setGoogleHovered(true)}
                onMouseLeave={() => setGoogleHovered(false)}
                style={{
                  flex: 1,
                  background: googleHovered ? "#f5f5f5" : "#fff",
                  border: "1px solid #d1d5db",
                  borderRadius: 10,
                  padding: "11px 0",
                  fontSize: 14,
                  fontWeight: 600,
                  color: COLORS.text,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  transition: "background 0.15s",
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 900, color: "#4285F4" }}>G</span>
                Google
              </button>

              <button
                onClick={() => alert("준비 중입니다")}
                onMouseEnter={() => setKakaoHovered(true)}
                onMouseLeave={() => setKakaoHovered(false)}
                style={{
                  flex: 1,
                  background: kakaoHovered ? "#f0d900" : "#FEE500",
                  border: "none",
                  borderRadius: 10,
                  padding: "11px 0",
                  fontSize: 14,
                  fontWeight: 600,
                  color: COLORS.text,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  transition: "background 0.15s",
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 900 }}>K</span>
                Kakao
              </button>
            </div>
          </>
        )}

        {/* ── 모드 전환 ── */}
        <div
          style={{
            marginTop: 20,
            paddingTop: 20,
            borderTop: `1px solid ${COLORS.border}`,
            textAlign: "center",
            fontSize: 13,
            color: COLORS.sub,
          }}
        >
          {mode === "reset" ? (
            <span
              onClick={() => switchMode("signin")}
              onMouseEnter={() => setBackHovered(true)}
              onMouseLeave={() => setBackHovered(false)}
              style={{
                color: backHovered ? COLORS.accent : COLORS.sub,
                cursor: "pointer",
                fontWeight: 600,
                transition: "color 0.15s",
                userSelect: "none",
              }}
            >
              ← 로그인으로 돌아가기
            </span>
          ) : (
            <>
              {mode === "signin" ? "계정이 없으신가요? " : "이미 가입했나요? "}
              <button
                onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
                style={{
                  background: "none",
                  border: "none",
                  color: COLORS.accent,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              >
                {mode === "signin" ? "회원가입" : "로그인"}
              </button>
            </>
          )}
        </div>

        {/* ── 푸터 ── */}
        <div style={{ marginTop: 24, textAlign: "center", fontSize: 11, color: COLORS.subLight }}>
          © 2025 BOGI
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: 12,
  color: COLORS.sub,
  marginBottom: 6,
  fontWeight: 600,
};

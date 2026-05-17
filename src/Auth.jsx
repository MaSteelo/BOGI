import { useState } from "react";
import { supabase } from "./supabase";

const COLORS = {
  bg: "#fafafa",
  surface: "#ffffff",
  border: "#ececec",
  text: "#1a1a1a",
  sub: "#737373",
  accent: "#ff6b35",
  error: "#ef4444",
};

export default function Auth() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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
      }
    } catch (err) {
      setMessage("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        display: "flex",
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
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 4,
              color: COLORS.accent,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            BOARDLOG
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: COLORS.text }}>
            {mode === "signin" ? "로그인" : "회원가입"}
          </h1>
          <div style={{ fontSize: 13, color: COLORS.sub, marginTop: 6 }}>
            플레이한 보드게임을 기록하세요
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "signup" && (
            <div>
              <label style={labelStyle}>닉네임</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="다른 사용자에게 표시될 이름"
                required
                style={inputStyle}
              />
            </div>
          )}

          <div>
            <label style={labelStyle}>이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="최소 6자"
              required
              minLength={6}
              style={inputStyle}
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
            style={{
              background: COLORS.accent,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "12px",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.6 : 1,
              marginTop: 4,
            }}
          >
            {loading ? "처리 중..." : mode === "signin" ? "로그인" : "가입하기"}
          </button>
        </form>

        <div
          style={{
            marginTop: 20,
            textAlign: "center",
            fontSize: 13,
            color: COLORS.sub,
          }}
        >
          {mode === "signin" ? "계정이 없으신가요? " : "이미 가입했나요? "}
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setMessage("");
            }}
            style={{
              background: "none",
              border: "none",
              color: COLORS.accent,
              fontWeight: 700,
              cursor: "pointer",
              padding: 0,
              fontSize: 13,
            }}
          >
            {mode === "signin" ? "회원가입" : "로그인"}
          </button>
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

const inputStyle = {
  width: "100%",
  background: COLORS.surface,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  padding: "10px 12px",
  color: COLORS.text,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
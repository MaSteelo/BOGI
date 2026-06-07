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
  errorLight: "#fee2e2",
};

const Section = ({ title, children }) => (
  <section style={{ marginBottom: 36 }}>
    <h2
      style={{
        fontSize: 16,
        fontWeight: 800,
        color: COLORS.accent,
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: `2px solid ${COLORS.accentLight}`,
      }}
    >
      {title}
    </h2>
    <div style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.8 }}>
      {children}
    </div>
  </section>
);

const Step = ({ num, children }) => (
  <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: COLORS.accent,
        color: "#fff",
        fontSize: 13,
        fontWeight: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 1,
      }}
    >
      {num}
    </div>
    <p style={{ margin: 0, fontSize: 14, color: COLORS.text, lineHeight: 1.7 }}>
      {children}
    </p>
  </div>
);

export default function DeleteAccount() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        fontFamily: "'Pretendard', 'Apple SD Gothic Neo', -apple-system, sans-serif",
      }}
    >
      {/* 헤더 배너 */}
      <div
        style={{
          background: COLORS.error,
          padding: "40px 24px 32px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>🗑️</div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: "#fff",
            letterSpacing: 2,
            margin: 0,
          }}
        >
          BOGI 계정 삭제
        </h1>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 8 }}>
          계정 삭제 요청 절차 안내
        </p>
      </div>

      {/* 본문 */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* 안내 박스 */}
        <div
          style={{
            background: COLORS.errorLight,
            border: `1px solid ${COLORS.error}`,
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 36,
            fontSize: 14,
            color: COLORS.error,
            fontWeight: 600,
            lineHeight: 1.7,
          }}
        >
          BOGI 계정 삭제를 원하시면 아래 절차를 따라주세요. 삭제된 데이터는
          복구할 수 없으니 신중하게 결정해주세요.
        </div>

        <Section title="계정 삭제 절차">
          <Step num="1">BOGI 앱 또는 웹사이트에 로그인합니다.</Step>
          <Step num="2">마이페이지로 이동합니다.</Step>
          <Step num="3">
            아래 이메일로 계정 삭제를 요청합니다. 이메일 제목을{" "}
            <strong>"BOGI 계정 삭제 요청"</strong>으로 작성하고, 가입 시 사용한
            이메일 주소를 함께 기재해주세요.
          </Step>
        </Section>

        <Section title="삭제되는 데이터">
          <div
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: "16px 20px",
            }}
          >
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              {[
                "계정 정보 (이메일, 닉네임)",
                "작성한 보드게임 리뷰 및 별점",
                "플레이 기록",
                "기타 서비스 이용 중 생성된 모든 데이터",
              ].map((item) => (
                <li key={item} style={{ marginBottom: 8, color: COLORS.text, fontSize: 14 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section title="보관되는 데이터">
          <div
            style={{
              background: COLORS.accentLight,
              border: `1px solid ${COLORS.accent}`,
              borderRadius: 10,
              padding: "14px 20px",
              fontSize: 14,
              color: COLORS.accent,
              fontWeight: 700,
            }}
          >
            없음 — 요청 처리 후 모든 개인정보가 완전히 삭제됩니다.
          </div>
        </Section>

        <Section title="처리 기간">
          <p>
            계정 삭제 요청은 <strong>요청 후 7일 이내</strong>에 처리됩니다.
            처리 완료 시 이메일로 안내드립니다.
          </p>
        </Section>

        <Section title="문의">
          <div
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: "16px 20px",
              fontSize: 14,
              lineHeight: 2,
            }}
          >
            <div><strong>서비스명:</strong> BOGI</div>
            <div><strong>담당자:</strong> 전준기</div>
            <div>
              <strong>이메일:</strong>{" "}
              <a
                href="mailto:talljoongi@gmail.com?subject=BOGI 계정 삭제 요청"
                style={{ color: COLORS.accent, textDecoration: "none", fontWeight: 600 }}
              >
                talljoongi@gmail.com
              </a>
            </div>
          </div>

          {/* 이메일 바로가기 버튼 */}
          <a
            href="mailto:talljoongi@gmail.com?subject=BOGI 계정 삭제 요청"
            style={{
              display: "block",
              marginTop: 16,
              textAlign: "center",
              background: COLORS.error,
              color: "#fff",
              borderRadius: 10,
              padding: "14px 0",
              fontSize: 14,
              fontWeight: 800,
              textDecoration: "none",
              letterSpacing: 0.5,
            }}
          >
            계정 삭제 요청 이메일 보내기
          </a>
        </Section>

        <div
          style={{
            textAlign: "center",
            marginTop: 48,
            paddingTop: 24,
            borderTop: `1px solid ${COLORS.border}`,
            fontSize: 12,
            color: COLORS.subLight,
          }}
        >
          © 2026 BOGI. All rights reserved.
        </div>
      </div>
    </div>
  );
}

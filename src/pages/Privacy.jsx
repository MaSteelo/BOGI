const COLORS = {
  bg: "#fafafa",
  surface: "#ffffff",
  border: "#ececec",
  text: "#1a1a1a",
  sub: "#737373",
  subLight: "#a3a3a3",
  accent: "#1e643c",
  accentLight: "#e8f5ee",
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

const Li = ({ children }) => (
  <li style={{ marginBottom: 6, paddingLeft: 4 }}>{children}</li>
);

export default function Privacy() {
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
          background: COLORS.accent,
          padding: "40px 24px 32px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>🎲</div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: "#fff",
            letterSpacing: 2,
            margin: 0,
          }}
        >
          BOGI 개인정보 처리방침
        </h1>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 8 }}>
          최종 업데이트: 2026년 6월
        </p>
      </div>

      {/* 본문 */}
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "40px 24px 80px",
        }}
      >
        {/* 안내 박스 */}
        <div
          style={{
            background: COLORS.accentLight,
            border: `1px solid ${COLORS.accent}`,
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 36,
            fontSize: 14,
            color: COLORS.accent,
            fontWeight: 600,
            lineHeight: 1.7,
          }}
        >
          BOGI(이하 "서비스")는 이용자의 개인정보를 소중히 여깁니다. 본 방침은
          서비스 이용 중 수집되는 개인정보의 처리 방법을 설명합니다.
        </div>

        <Section title="1. 수집하는 개인정보 항목">
          <p style={{ marginBottom: 10 }}>서비스 이용 시 아래 정보를 수집합니다.</p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <Li>
              <strong>계정 정보:</strong> 이메일 주소, 닉네임
            </Li>
            <Li>
              <strong>활동 정보:</strong> 보드게임 리뷰, 별점, 플레이 기록
            </Li>
            <Li>
              <strong>자동 수집 정보:</strong> 서비스 이용 기록 (Supabase 인증을 통해 처리)
            </Li>
          </ul>
        </Section>

        <Section title="2. 개인정보 수집 및 이용 목적">
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <Li>회원 식별 및 서비스 제공</Li>
            <Li>보드게임 리뷰·별점 기능 운영</Li>
            <Li>서비스 품질 개선 및 통계 분석</Li>
            <Li>공지사항 및 알림 발송</Li>
          </ul>
        </Section>

        <Section title="3. 개인정보 보관 기간">
          <p>
            수집된 개인정보는 <strong>회원 탈퇴 시까지</strong> 보관하며, 탈퇴
            요청 즉시 지체 없이 삭제합니다. 단, 관련 법령에 의해 보존이 필요한
            경우 해당 기간 동안 보관합니다.
          </p>
        </Section>

        <Section title="4. 개인정보의 제3자 제공">
          <p>
            BOGI는 이용자의 개인정보를 <strong>제3자에게 제공하지 않습니다.</strong>{" "}
            다만, 아래의 경우는 예외입니다.
          </p>
          <ul style={{ paddingLeft: 20, margin: "10px 0 0" }}>
            <Li>이용자가 사전에 동의한 경우</Li>
            <Li>법령의 규정에 따라 수사기관 요청이 있는 경우</Li>
          </ul>
        </Section>

        <Section title="5. 개인정보 처리 위탁">
          <p>
            서비스는 인증 및 데이터 저장을 위해{" "}
            <strong>Supabase Inc.</strong>에 개인정보 처리를 위탁합니다.
            Supabase는 서비스 제공 목적 외로 개인정보를 활용하지 않습니다.
          </p>
        </Section>

        <Section title="6. 이용자의 권리">
          <p style={{ marginBottom: 10 }}>
            이용자는 언제든지 아래 권리를 행사할 수 있습니다.
          </p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <Li>개인정보 열람 및 수정 요청</Li>
            <Li>개인정보 삭제 및 회원 탈퇴 요청</Li>
            <Li>개인정보 처리 정지 요청</Li>
          </ul>
          <p style={{ marginTop: 10 }}>
            권리 행사는 아래 문의처로 연락하시면 지체 없이 처리합니다.
          </p>
        </Section>

        <Section title="7. 개인정보 보호책임자 및 문의">
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
            <div>
              <strong>서비스명:</strong> BOGI
            </div>
            <div>
              <strong>이메일:</strong>{" "}
              <a
                href="mailto:talljoongi@gmail.com"
                style={{ color: COLORS.accent, textDecoration: "none", fontWeight: 600 }}
              >
                talljoongi@gmail.com
              </a>
            </div>
          </div>
        </Section>

        <Section title="8. 방침 변경 안내">
          <p>
            본 개인정보 처리방침이 변경될 경우, 변경 사항을 서비스 내 공지사항을
            통해 최소 7일 전에 안내합니다.
          </p>
        </Section>

        {/* 하단 */}
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

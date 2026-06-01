const COLORS = {
  bg: "#fafafa",
  surface: "#ffffff",
  border: "#ececec",
  text: "#1a1a1a",
  sub: "#737373",
  subLight: "#a3a3a3",
  accent: "#1e643c",
};

const FILTER_GENRES = [
  "전략", "가족", "파티", "추상", "테마", "카드",
  "협력", "경제", "추리", "어드벤처", "퍼즐", "덱빌딩",
  "다이스", "정체은닉", "워게임", "솔로", "2인",
];

const PLAYER_OPTIONS = [
  { label: "1인", value: 1 },
  { label: "2인", value: 2 },
  { label: "3인", value: 3 },
  { label: "4인", value: 4 },
  { label: "5인", value: 5 },
  { label: "6인+", value: 6 },
];

const TIME_OPTIONS = [
  { label: "~15분", value: 15 },
  { label: "~30분", value: 30 },
  { label: "~60분", value: 60 },
  { label: "~120분", value: 120 },
  { label: "120분+", value: 9999 },
];

const SORT_OPTIONS = [
  { key: "name", label: "이름순" },
  { key: "rating", label: "평점높은순" },
  { key: "bgg", label: "BGG랭킹순" },
  { key: "year", label: "최신순" },
];

const chip = (active) => ({
  background: active ? COLORS.accent : COLORS.surface,
  color: active ? "#fff" : COLORS.sub,
  border: `1px solid ${active ? COLORS.accent : COLORS.border}`,
  borderRadius: 20,
  padding: "5px 13px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
});

const sectionLabel = {
  fontSize: 11,
  fontWeight: 700,
  color: COLORS.subLight,
  letterSpacing: 0.3,
  marginBottom: 8,
  textTransform: "uppercase",
};

export default function GameFilter({
  filterGenres,
  onToggleGenre,
  filterPlayers,
  onPlayersChange,
  filterTime,
  onTimeChange,
  sortOrder,
  onSortChange,
  hasFilter,
  onReset,
}) {
  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: "16px 18px",
        marginBottom: 16,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>필터</span>
        {hasFilter && (
          <button
            onClick={onReset}
            style={{
              background: "none",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding: "4px 12px",
              fontSize: 12,
              fontWeight: 600,
              color: COLORS.sub,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            초기화 ✕
          </button>
        )}
      </div>

      {/* 장르 */}
      <div>
        <div style={sectionLabel}>장르</div>
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            scrollbarWidth: "none",
            paddingBottom: 2,
          }}
        >
          {FILTER_GENRES.map((g) => (
            <button key={g} onClick={() => onToggleGenre(g)} style={chip(filterGenres.has(g))}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* 인원 */}
      <div>
        <div style={sectionLabel}>인원</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PLAYER_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => onPlayersChange(filterPlayers === value ? null : value)}
              style={chip(filterPlayers === value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 시간 */}
      <div>
        <div style={sectionLabel}>플레이 시간</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TIME_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => onTimeChange(filterTime === value ? null : value)}
              style={chip(filterTime === value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 정렬 */}
      <div>
        <div style={sectionLabel}>정렬</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onSortChange(key)}
              style={chip(sortOrder === key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

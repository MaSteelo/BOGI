const COLORS = {
  bg: "#fafafa",
  surface: "#ffffff",
  border: "#ececec",
  text: "#1a1a1a",
  sub: "#737373",
  subLight: "#a3a3a3",
  accent: "#ff6b35",
  accentLight: "#fff1ec",
};

const AGE_OPTIONS = [
  { label: "8세부터 가능", value: 8 },
  { label: "10세부터 가능", value: 10 },
  { label: "12세부터 가능", value: 12 },
  { label: "15세부터 가능", value: 15 },
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
  allGenres,
  filterGenres,
  onToggleGenre,
  filterPlayers,
  onPlayersChange,
  filterAge,
  onAgeChange,
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
      {/* 장르 */}
      <div>
        <div style={sectionLabel}>장르</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {allGenres.map((g) => (
            <button key={g} onClick={() => onToggleGenre(g)} style={chip(filterGenres.has(g))}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* 인원 + 연령 */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <div style={sectionLabel}>인원</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="number"
              min={1}
              max={20}
              value={filterPlayers}
              onChange={(e) => onPlayersChange(e.target.value)}
              placeholder="명"
              style={{
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                padding: "7px 10px",
                color: COLORS.text,
                fontSize: 13,
                outline: "none",
                width: 64,
                textAlign: "center",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
            <span style={{ fontSize: 12, color: COLORS.sub }}>명 가능한 게임</span>
          </div>
        </div>

        <div>
          <div style={sectionLabel}>권장 연령</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {AGE_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => onAgeChange(filterAge === value ? null : value)}
                style={chip(filterAge === value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 초기화 */}
      {hasFilter && (
        <div>
          <button
            onClick={onReset}
            style={{
              background: "none",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              color: COLORS.sub,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            필터 초기화 ✕
          </button>
        </div>
      )}
    </div>
  );
}

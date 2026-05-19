const ACCENT = "#ff6b35";

// 반개 채움 별점 표시 컴포넌트 (0.5 단위 시각화)
export function HalfStarDisplay({ value, size = 13 }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = value >= n ? "full" : value >= n - 0.5 ? "half" : "empty";
        return (
          <span
            key={n}
            style={{ position: "relative", display: "inline-block", fontSize: size, lineHeight: 1 }}
          >
            <span style={{ color: "#e5e7eb" }}>★</span>
            {fill !== "empty" && (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  color: ACCENT,
                  overflow: "hidden",
                  width: fill === "full" ? "100%" : "50%",
                }}
              >
                ★
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

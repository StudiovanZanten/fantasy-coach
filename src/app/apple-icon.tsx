import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Eigen, merkvrij app-icoon. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b1220", borderRadius: 0 }}>
        <div style={{ fontSize: 100, fontWeight: 900, color: "#34d399", letterSpacing: -6 }}>FC</div>
      </div>
    ),
    size,
  );
}

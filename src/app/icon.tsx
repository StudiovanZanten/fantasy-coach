import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** Eigen, merkvrij app-icoon. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b1220", borderRadius: 96 }}>
        <div style={{ fontSize: 300, fontWeight: 900, color: "#34d399", letterSpacing: -20 }}>FC</div>
      </div>
    ),
    size,
  );
}

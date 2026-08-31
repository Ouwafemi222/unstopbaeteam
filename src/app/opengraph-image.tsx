import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "UNSTOPPABLE TEAM";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #14532d 0%, #16a34a 40%, #f59e0b 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: 28,
            background: "rgba(255,255,255,0.15)",
            fontSize: 72,
            fontWeight: 800,
            marginBottom: 32,
          }}
        >
          U
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: 2 }}>UNSTOPPABLE TEAM</div>
        <div style={{ fontSize: 28, marginTop: 16, opacity: 0.9 }}>
          Fiverr accounts · messages · performance
        </div>
      </div>
    ),
    { ...size }
  );
}

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)",
          display: "flex",
          flexDirection: "column",
          padding: 80,
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 100, marginBottom: 8 }}>☀</div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#1f2937",
            marginBottom: 16,
            lineHeight: 1.1,
          }}
        >
          Solar Decision Hub
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#525252",
            maxWidth: 1000,
            marginBottom: 8,
          }}
        >
          4 scenarios · benchmarking · portfolio risk
        </div>
        <div style={{ fontSize: 22, color: "#737373" }}>
          RPS sunset 2027 · Korea PV market simulator
        </div>
      </div>
    ),
    size,
  );
}

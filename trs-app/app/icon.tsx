import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          background: "#ffffff",
          color: "#C8102E",
          fontSize: 24,
          fontWeight: 900,
          letterSpacing: "-1px",
          border: "4px solid #C8102E",
        }}
      >
        TRS
      </div>
    ),
    size,
  );
}

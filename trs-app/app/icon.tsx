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
          background: "#ffffff",
        }}
      >
        <img
          src="https://therollingstove.vercel.app/images/trs-logo.png"
          width="64"
          height="64"
          alt="The Rolling Stove"
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    size,
  );
}

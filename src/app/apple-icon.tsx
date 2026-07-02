import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4F46E5",
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            border: "17px solid white",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 34,
            height: 17,
            background: "#22D3EE",
            borderRadius: 9,
            transform: "rotate(45deg)",
            right: 38,
            bottom: 38,
          }}
        />
      </div>
    ),
    { ...size },
  );
}

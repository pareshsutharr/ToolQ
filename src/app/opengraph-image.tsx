import { ImageResponse } from "next/og";

export const alt = "toolq.online — Every online tool you need, one account";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
          backgroundColor: "#0B0F19",
          backgroundImage: "linear-gradient(135deg, #4F46E5 0%, #0B0F19 60%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 28,
              background: "#4F46E5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                border: "11px solid white",
              }}
            />
          </div>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 700, color: "white" }}>
            tool<span style={{ color: "#22D3EE" }}>Q</span>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 32, fontSize: 32, color: "#F5F6FA" }}>
          Every online tool you need. One account.
        </div>
      </div>
    ),
    { ...size },
  );
}

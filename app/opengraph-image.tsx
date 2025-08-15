import React from "react";
import { ImageResponse } from "next/og";
import Image from "next/image";

export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <Image src="/logo/gumboard.svg" alt="Gumboard" width={72} height={72} />
            <span
              style={{
                fontSize: "72px",
                fontWeight: "bold",
                color: "#1e293b",
              }}
            >
              Gumboard
            </span>
          </div>
          <p
            style={{
              fontSize: "36px",
              color: "#64748b",
              margin: 0,
              maxWidth: "800px",
            }}
          >
            Keep on top of your team&apos;s to-dos
          </p>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

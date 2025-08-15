import React from "react";
import { ImageResponse } from "next/og";

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
            <svg
              width="72"
              height="72"
              viewBox="0 0 86 87"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="4"
                y="5"
                width="81"
                height="81"
                fill="black"
                stroke="black"
                strokeWidth="2"
              />
              <rect
                x="1"
                y="1"
                width="81"
                height="81"
                fill="#FF90E8"
                stroke="black"
                strokeWidth="2"
              />
              <path
                d="M38.23 60.901C27.381 60.901 21 52.2 21 41.375C21 30.126 28.02 21 41.421 21C55.249 21 59.929 30.339 60.141 35.645H50.143C49.93 32.673 47.378 28.216 41.208 28.216C34.614 28.216 30.359 33.946 30.359 40.951C30.359 47.956 34.614 53.685 41.209 53.685C47.165 53.685 49.718 49.015 50.781 44.347H41.208V40.527H61.295V60.052H52.483V47.742C51.845 52.2 49.079 60.901 38.23 60.901Z"
                fill="black"
              />
            </svg>
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

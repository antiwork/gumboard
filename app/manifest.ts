import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gumboard",
    short_name: "Gumboard",
    description: "Keep on top of your team's to-dos",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/logo/gumboard_icon_192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo/gumboard_icon_256x256.png",
        sizes: "256x256",
        type: "image/png",
      },
    ],
    orientation: "portrait",
    scope: "/",
  };
}

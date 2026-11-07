import type { MetadataRoute } from "next";

// Lets phones add Vouchly to the home screen with its own icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vouchly",
    short_name: "Vouchly",
    description: "Buy from people your ward can vouch for.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: "#14213d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

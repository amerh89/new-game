import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "OpeningsPro",
    short_name: "OpeningsPro",
    description:
      "Learn chess openings, traps and checkmates with spaced repetition. Works offline.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#090d13",
    theme_color: "#090d13",
    categories: ["education", "games"],
    lang: "en",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Review due cards", short_name: "Review", url: "/train/session?mode=review" },
      { name: "Mate puzzles", short_name: "Puzzles", url: "/mates/puzzles" },
    ],
  };
}

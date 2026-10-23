/**
 * PWA manifest — devpost/spec.md > The POC Boundary ("Mobile-first responsive web
 * app (PWA)"). Next.js serves this at /manifest.webmanifest automatically from this
 * file. start_url points straight at /app (the tool), not the marketing landing
 * page at /, so installing CivicFix to a home screen opens directly into the
 * capture flow rather than the pitch.
 */
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CivicFix",
    short_name: "CivicFix",
    description: "Photograph a civic problem anywhere in India and get it routed to the right authority.",
    start_url: "/app",
    display: "standalone",
    background_color: "#fff8ec",
    theme_color: "#f2a900",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

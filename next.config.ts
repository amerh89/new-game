import { execSync } from "node:child_process";
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

/** Changes on every build so the service worker refreshes the cached pages. */
function buildRevision(): string {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return String(Date.now());
  }
}

const revision = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? `${buildRevision()}-${Date.now().toString(36)}`;

/** Every screen of the app. They are all static, so they can all be cached for offline use. */
const APP_ROUTES = [
  "/",
  "/library",
  "/explore",
  "/repertoire",
  "/train",
  "/train/session",
  "/quiz",
  "/quiz/play",
  "/mates",
  "/mates/trap",
  "/mates/pattern",
  "/mates/puzzles",
  "/progress",
  "/settings",
  "/offline",
];

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // The service worker is only useful (and only safe to cache with) in production builds.
  disable: process.env.NODE_ENV !== "production",
  register: true,
  reloadOnOnline: false,
  cacheOnNavigation: true,
  additionalPrecacheEntries: APP_ROUTES.map((url) => ({ url, revision })),
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

export default withSerwist(nextConfig);

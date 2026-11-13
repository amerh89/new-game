/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const NETWORK_TIMEOUT_MS = 4000;

/**
 * Page loads: try the network first (so updates arrive), and fall back to the
 * copy of the page that was saved when the app was installed. Query strings
 * such as /explore?id=italian-game are ignored when looking up the saved page,
 * because every page of this app is a single static file.
 */
const offlinePages: RuntimeCaching = {
  matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
  handler: async ({ request, url }) => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
      const response = await fetch(request, { signal: controller.signal });
      clearTimeout(timer);
      if (response.ok) return response;
      throw new Error(`HTTP ${response.status}`);
    } catch {
      const path = url.pathname !== "/" && url.pathname.endsWith("/") ? url.pathname.slice(0, -1) : url.pathname;
      return (
        (await serwist.matchPrecache(path)) ??
        (await serwist.matchPrecache("/offline")) ??
        (await serwist.matchPrecache("/")) ??
        Response.error()
      );
    }
  },
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [offlinePages, ...defaultCache],
});

serwist.addEventListeners();

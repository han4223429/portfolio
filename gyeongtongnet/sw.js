/* 경통넷 서비스 워커 — 공개 앱 셸만 캐시한다. 네트워크 우선, 실패 시 캐시. */
"use strict";
importScripts("js/mascots.js");
const CACHE_PREFIX = "gyeongtongnet-";
const CACHE = CACHE_PREFIX + "v3";
const SHELL = [
  "./", "index.html", "app.html", "characters.html", "manifest.webmanifest",
  "css/style.css", "css/app.css",
  "js/data.js", "js/search.js", "js/store.js", "js/mascots.js", "js/demo-steps.js", "js/ui.js", "js/splash.js", "js/app.js", "js/hub.js",
  "assets/original/logo-img.svg", "assets/icons/icon.svg", "assets/icons/icon-192.png", "assets/icons/icon-512.png", "assets/icons/icon-maskable-512.png", "assets/icons/apple-touch-icon.png",
  ...self.GT.MASCOTS.flatMap((m) => [m.static, m.animated]),
];
const SHELL_URLS = new Set(SHELL.map((p) => new URL(p, self.location.href).href));

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 필요한 파일을 모두 받은 경우에만 새 버전으로 전환한다.
    await cache.addAll(SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k.startsWith(CACHE_PREFIX) && k !== CACHE) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  url.search = ""; url.hash = "";
  // 미등록 경로와 API 응답은 가로채거나 캐시하지 않는다.
  if (!SHELL_URLS.has(url.href)) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE).catch(() => null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const request = req.mode === "navigate" ? new Request(req.url, { credentials: "same-origin" }) : req;
      const res = await fetch(request, { signal: controller.signal });
      if (res.status >= 500) throw new Error("Server unavailable");
      if (res.ok && cache) await cache.put(url.href, res.clone()).catch(() => {});
      return res;
    } catch {
      const hit = cache && await cache.match(url.href).catch(() => null);
      if (hit) return hit;
      return new Response("오프라인이에요. 연결 후 화면을 다시 열어 주세요.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    } finally {
      clearTimeout(timer);
    }
  })());
});

// StudyBoost service worker — offline-first for the cached static shell + JS
// chunks + content JSON. The site is supposed to work fully offline once the
// user has visited it online; bugs in either the precache list or the fetch
// strategy break that promise.
//
// CACHE_NAME is rewritten by `scripts/inject-static-hero.mjs` on every build
// to a `studyboost-{buildHash}` string, so users automatically get a fresh
// cache on every deploy without needing manual bumps.
const CACHE_NAME = 'topictree-mojb2xgm'; // <-- REPLACED AT BUILD TIME -->
const RUNTIME_CACHE = CACHE_NAME + '-runtime'; // for SWR JS / fonts / images
const BASE = self.registration.scope; // ends with `/studyboost-app/`

// Pages to precache for offline access. ALL with trailing slash to match
// trailingSlash: true Next config — without the slash, GitHub Pages 404s
// on /assessment but serves /assessment/, and the cache lookup misses too.
const PRECACHE_PAGES = [
  '',
  'assessment/', 'assessment/lessons/', 'smart-review/', 'smart-practice/',
  'flashcard-mode/', 'flashcards/', 'flashcard-review/',
  'cornell-notes/', 'notes/', 'mind-map/', 'color-notes/',
  'quiz/', 'practice-test/', 'pomodoro/',
  'progress-report/', 'progress-dashboard/', 'parent-view/', 'parent-dashboard/',
  'streaks/', 'spaced-repetition/', 'daily-challenge/', 'daily-practice/',
  'study-timer/', 'study-music/', 'review-session/',
  'code-editor/', 'interactive-diagrams/', 'classroom/', 'mastery-challenge/',
  'achievements/', 'worked-examples/', 'listen/', 'mastery/',
  'score-tracker/', 'study-plan/', 'mistake-analysis/', 'mistake-patterns/',
  'mistakes/', 'college-calculator/', 'homework/', 'settings/', 'warmup/',
  'share-progress/', 'deep-dives/', 'proofs/', 'lesson-theater/', 'methodology/',
  'cost/', 'about/', 'accessibility/', 'content-audit/', 'provenance/',
  'zero-cost/', 'report/', 'languages/', 'videos/', 'math/', 'chat/',
  'essay/', 'summarizer/', 'planner/', 'goals/', 'habits/', 'journal/',
  'focus-log/', 'reading-list/', 'paraphrase/', 'translate/', 'feedback/',
  'gpa/', 'graph/', 'graphing-calc/', 'matrix/', 'probability/',
  'speed-math/', 'typing/', 'crossword/', 'vocab/', 'vocab-drill/',
  'spelling/', 'spelling-practice/', 'pronunciation/', 'conjugation/',
  'idioms/', 'grammar/', 'argument/', 'cause-effect/', 'fallacies/', 'bias/',
  'debate/', 'rhetoric/', 'feynman/', 'eli5/', 'eliminator/',
  'card-match/', 'crafted-practice/', 'sat-prep/',
  'free-sat-practice/', 'free-act-practice/', 'free-gre-prep/',
  'free-lsat-prep/', 'free-ap-practice/', 'exam-tracks/', 'exam-countdown/',
  'exam-simulator/', 'offline/',
];

// Content JSON files served from /content/. Without these, every tool that
// reads a course or lesson via dataLoaders.ts will throw offline. There are
// ~113 files; precache the most-load-bearing ones (curriculum, deepDives,
// videoLessons, handCraftedQuestions, course-index). The rest are cached on
// first fetch via stale-while-revalidate.
const PRECACHE_CONTENT = [
  'content/curriculum.json',
  'content/course-index.json',
  'content/deepDives.json',
  'content/videoLessons.json',
  'content/handCraftedQuestions.json',
];

const PRECACHE_OTHER = [
  'favicon.svg',
  'manifest.json',
];

// Cap the runtime cache so a heavy user doesn't hit the storage quota and
// blow up the whole app. Trims oldest-first when over.
const RUNTIME_CACHE_LIMIT = 200;
async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  for (let i = 0; i < keys.length - max; i++) {
    await cache.delete(keys[i]);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled([
        ...PRECACHE_PAGES.map((url) => cache.add(BASE + url).catch(() => {})),
        ...PRECACHE_CONTENT.map((url) => cache.add(BASE + url).catch(() => {})),
        ...PRECACHE_OTHER.map((url) => cache.add(BASE + url).catch(() => {})),
      ]);
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      // Drop caches that don't match either the current static or runtime name.
      // Old static caches (studyboost-v7, etc.) and their -runtime siblings
      // both get cleared this way.
      const keep = new Set([CACHE_NAME, RUNTIME_CACHE]);
      return Promise.all(
        keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)),
      );
    }),
  );
  self.clients.claim();
});

// Allow the app to ask the SW to skipWaiting from the update toast — when the
// user clicks "Reload to update", we send {type:'SKIP_WAITING'} to the SW
// from the page, the SW activates immediately, and the page reloads.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch strategy:
//   - Skip non-GET, chrome-extension, Gemini API
//   - /_next/static/  → cache-first (immutable hashed assets, long-lived)
//   - Fonts (woff/woff2/ttf) → cache-first (rarely change)
//   - Images (png/jpg/svg) → cache-first then network fallback
//   - /content/*.json → stale-while-revalidate (data updates with deploys)
//   - HTML navigation → network-first, fall back to cached page, fall back to /offline/
//   - Anything else (JS not in /_next/static/) → stale-while-revalidate
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;
  if (url.startsWith('chrome-extension://')) return;
  if (url.includes('generativelanguage.googleapis.com')) return;

  // Cache-first for hashed static assets (Next emits content hashes, so the
  // file at a given URL never changes — perfectly cacheable).
  if (url.includes('/_next/static/')) {
    event.respondWith(cacheFirst(event.request, RUNTIME_CACHE));
    return;
  }

  // Cache-first for fonts (rarely change, large)
  if (/\.(woff2?|ttf|otf|eot)$/i.test(url)) {
    event.respondWith(cacheFirst(event.request, RUNTIME_CACHE));
    return;
  }

  // Cache-first for images (icons, favicons, share cards)
  if (/\.(png|jpe?g|gif|svg|webp|avif|ico)$/i.test(url)) {
    event.respondWith(cacheFirst(event.request, RUNTIME_CACHE));
    return;
  }

  // Stale-while-revalidate for content JSON
  if (url.includes('/content/') && url.endsWith('.json')) {
    event.respondWith(staleWhileRevalidate(event.request, CACHE_NAME, () =>
      // Friendly empty payload if both cache miss and network fail
      new Response(JSON.stringify({ COURSES: [], PATHWAYS: [], DEEP_DIVES: [], VIDEO_LESSONS: [], HAND_CRAFTED: [] }),
        { headers: { 'Content-Type': 'application/json' } })
    ));
    return;
  }

  // Stale-while-revalidate for non-immutable JS
  if (url.endsWith('.js') || url.endsWith('.mjs')) {
    event.respondWith(staleWhileRevalidate(event.request, RUNTIME_CACHE));
    return;
  }

  // Network-first for HTML and everything else
  if (event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirstHtml(event.request));
    return;
  }

  // Default: network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => {
            c.put(event.request, clone);
            trimCache(RUNTIME_CACHE, RUNTIME_CACHE_LIMIT);
          });
        }
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || new Response('', { status: 408 }))),
  );
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) {
      const clone = res.clone();
      const cache = await caches.open(cacheName);
      await cache.put(request, clone);
      trimCache(cacheName, RUNTIME_CACHE_LIMIT);
    }
    return res;
  } catch {
    return new Response('', { status: 408 });
  }
}

async function staleWhileRevalidate(request, cacheName, fallback) {
  const cached = await caches.match(request);
  const networkPromise = fetch(request).then((res) => {
    if (res.ok) {
      const clone = res.clone();
      caches.open(cacheName).then((c) => {
        c.put(request, clone);
        if (cacheName === RUNTIME_CACHE) trimCache(cacheName, RUNTIME_CACHE_LIMIT);
      });
    }
    return res;
  }).catch(() => null);
  if (cached) return cached;
  const fresh = await networkPromise;
  if (fresh) return fresh;
  return fallback ? fallback() : new Response('', { status: 408 });
}

async function networkFirstHtml(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const clone = res.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, clone);
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Try /offline/ first (real route with a friendly tool list).
    const offline = await caches.match(BASE + 'offline/');
    if (offline) return offline;
    // Try home as last resort.
    const home = await caches.match(BASE);
    if (home) return home;
    return new Response(
      '<!doctype html><html><head><meta charset="utf-8"><title>Offline</title></head><body style="font-family:system-ui;text-align:center;padding:4rem;background:#fafafa"><h1 style="margin:0;font-size:2rem;color:#101828">You\'re offline</h1><p style="margin:1rem 0;color:#6a7282">This page wasn\'t cached for offline use.</p><p style="margin:1rem 0;color:#6a7282">Pages you\'ve visited online before should still work.</p><button onclick="location.reload()" style="margin-top:1rem;padding:0.75rem 1.5rem;background:linear-gradient(135deg,#9333ea,#6366f1);color:white;border:none;border-radius:0.5rem;cursor:pointer;font-size:1rem">Try Again</button></body></html>',
      { headers: { 'Content-Type': 'text/html' } },
    );
  }
}

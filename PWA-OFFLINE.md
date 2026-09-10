# Pharma Pro — PWA / Offline mode

This build includes a native browser PWA setup without adding new npm dependencies.

## What was added
- `public/manifest.webmanifest`
- `public/sw.js` service worker
- 192x192 and 512x512 install icons
- PWA metadata in `index.html`
- Service-worker registration in `src/main.tsx`
- Install button support in `src/components/Header.tsx` when the browser exposes the install prompt

## Behavior
1. Deploy over HTTPS (Vercel is fine).
2. Open the app online once so the service worker can cache the application shell.
3. Install it from the browser install prompt/icon, or the in-app install icon when available.
4. After the first successful load/install, the app shell can open without internet.
5. Current application data is stored in browser `localStorage`, so the existing records remain available offline on that device/browser.

## Important data note
Offline PWA does not sync localStorage between different devices or browsers. If shared multi-device data is required later, add a backend/database + synchronization layer.

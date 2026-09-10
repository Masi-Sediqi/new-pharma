# Pharma Pro - Vercel deployment

## Build
```bash
npm ci
npm run build
```

## Deploy with Vercel Dashboard
1. Push this folder to a GitHub repository.
2. In Vercel choose **Add New > Project** and import the repository.
3. Framework preset: **Vite**.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Deploy.

The included `vercel.json` provides SPA fallback routing.

## Important production note
This build currently stores business data in the browser's `localStorage`. That means each browser/device has its own separate data, clearing browser storage can erase data, and data is not centrally synchronized between staff/devices. For real multi-user customer use, move business data/authentication to a persistent backend/database before relying on it as the production system of record.

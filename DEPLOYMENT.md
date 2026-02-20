# Asset Manager Deployment Guide

## 1) Local full stack (frontend + backend + Postgres) with Docker

1. Build and start everything:
```bash
docker compose up --build
```
2. Open the app:
`http://localhost:5000`

This starts:
- `app` (Express API + Vite-built frontend)
- `db` (PostgreSQL 16)

The app container runs:
`npm run db:push && npm start`
so schema is applied automatically at startup.

## 2) Local run without Docker

1. Copy env template:
```bash
cp .env.example .env
```
2. Start Postgres locally and update `DATABASE_URL` in `.env`.
3. Install deps:
```bash
npm ci
```
4. Apply schema:
```bash
npm run db:push
```
5. Run app:
```bash
npm run dev
```

## 3) Render one-click deploy (app + managed Postgres)

This repo includes `render.yaml` for Blueprint deploy.

1. Push this repo to GitHub.
2. In Render, choose `New +` -> `Blueprint`.
3. Select your repo.
4. Render provisions:
- `asset-manager-db` (Postgres)
- `asset-manager-web` (Node web service)
5. App startup command runs migrations automatically:
`npm run db:push && npm start`

## Notes

- Default seeded users are created at app startup (see `server/routes.ts`).
- For production, keep `SESSION_SECRET` strong and private.
- If your DB password includes special characters (like `@`), URL-encode it in `DATABASE_URL`.

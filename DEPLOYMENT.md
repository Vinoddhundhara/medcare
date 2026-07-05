# MedCare Deployment Guide

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

The app container runs `npm run db:push && npm start` automatically so the schema is applied at startup.

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
2. In Render, choose `New +` → `Blueprint`.
3. Select your repo.
4. Render provisions:
   - `medcare-db` (Postgres free tier)
   - `medcare-web` (Node web service)
5. App startup command runs migrations automatically:
   `npm run db:push && npm start`
6. *(Optional)* Add email env vars in Render dashboard:
   - `EMAIL_USER` — your Gmail address
   - `EMAIL_PASS` — Gmail App Password (16 chars, no spaces)
   - `EMAIL_FROM` — e.g. `MedCare <you@gmail.com>`

## Default seeded accounts

Once the app starts, the database is seeded automatically. Use these to log in:

| Role    | Username  | Password    |
|---------|-----------|-------------|
| Admin   | admin     | password123 |
| Doctor  | doctor1   | password123 |
| Doctor  | doctor2   | password123 |
| Patient | patient1  | password123 |

## Notes

- For production, keep `SESSION_SECRET` strong and private (Render auto-generates one).
- If your DB password includes special characters (like `@`), URL-encode it in `DATABASE_URL`.
- Email is optional — the app works fully without it; email sends are silently skipped.

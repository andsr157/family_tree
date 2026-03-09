# 🌳 Family Tree

Monorepo project for a family tree application.

## Stack

- **Frontend**: Vue 3 + TypeScript + Vite + Tailwind CSS 4
- **Backend**: NestJS + TypeScript
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **File Storage**: S3-compatible (MinIO lokal, Cloudflare R2 / AWS S3 production)
- **Hosting**: [Zeabur](https://zeabur.com)

## Local Development

```bash
# Install dependencies
pnpm install

# Start local infrastructure (PostgreSQL, Redis, MinIO)
pnpm infra:up

# Copy env
cp infra/.env.example apps/api/.env

# Run all apps
pnpm dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000/api/v1

## Deploy ke Zeabur

1. Push repo ke GitHub
2. Buka [Zeabur Dashboard](https://dash.zeabur.com) → New Project
3. Import repo → Zeabur akan auto-detect 2 services: **web** dan **api**
4. Tambahkan managed services di project:
   - **PostgreSQL** → `DATABASE_URL` otomatis ter-link
   - **Redis** → `REDIS_URL` otomatis ter-link
5. Set environment variables di service **api**:
   - `BETTER_AUTH_SECRET`, `FRONTEND_URL`, `S3_*`, `SMTP_*`
6. Set custom domain untuk **web** dan **api**

Konfigurasi deployment ada di `zeabur.yaml`.

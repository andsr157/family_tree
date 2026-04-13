# 🌳 Family Tree

Monorepo project for a family tree application.

## Stack

- **Frontend**: Vue 3 + TypeScript + Vite + Tailwind CSS 4
- **Backend**: NestJS + TypeScript
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Hosting**: [Zeabur](https://zeabur.com)

---

## 🚀 Development Guide

### 1. Prerequisites

- Node.js >= 22
- pnpm >= 9
- PostgreSQL 16+ (local, atau gunakan Docker)
- Redis 7+ (local, atau gunakan Docker)

### 2. Clone & Install

```bash
pnpm install
```

### 3. Setup Environment Variables

Buat file `.env` di `apps/api/` dan `apps/web/` jika perlu.

Contoh `.env` untuk backend (`apps/api/.env`):

```
DATABASE_URL=postgresql://user:password@localhost:5432/family_tree
REDIS_URL=redis://localhost:6379
```

Contoh `.env` untuk frontend (`apps/web/.env`):

```
VITE_API_URL=http://localhost:3000
```

### 4. Jalankan Service Lokal

```bash
pnpm dev
```

Ini akan menjalankan frontend & backend secara paralel.

### 5. Database Migration & Seed

- Push schema: `pnpm db:push`
- Migrasi: `pnpm db:migrate`
- Seed: `pnpm db:seed`

---

## 🛰️ Deployment (Staging/Production)

Deploy dilakukan otomatis via GitHub Actions ke [Zeabur](https://zeabur.com). File `zeabur.yaml` hanya berlaku untuk Zeabur dan tidak digunakan saat development lokal.

Jika ingin deploy manual di server sendiri, pastikan semua service (PostgreSQL, Redis, dsb) sudah tersedia dan environment variable sudah di-setup sesuai kebutuhan.

---

## 📦 Struktur Monorepo

- `apps/web` — Frontend (Vue 3)
- `apps/api` — Backend (NestJS)
- `packages/schemas` — Shared Zod schemas
- `packages/types` — Shared TypeScript types

---

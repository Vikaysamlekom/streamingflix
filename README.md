# StreamFlix

StreamFlix adalah website streaming film full-stack yang dibangun menggunakan React, Node.js, Express, dan MySQL. Pengunjung dapat menonton film tanpa login, menyimpan Daftar Saya dan melanjutkan tontonan yang tersimpan di browser. Dashboard admin terpisah untuk mengelola film, kategori, dan pengaturan.

## Fitur Utama

### Website Publik
- Beranda dengan hero carousel dan baris film
- Katalog film, pencarian berdasarkan judul, filter genre
- Detail film dan pemutar video MP4
- Film Unggulan, Terbaru, Trending, dan Top 10
- Daftar Saya (disimpan di localStorage browser)
- Lanjutkan Menonton (progres disimpan di localStorage browser)
- Responsif untuk desktop, tablet, dan mobile

### Dashboard Admin
- Login terpisah di `/admin/login`
- CRUD film dan kategori
- Publish/Unpublish film
- Atur film unggulan
- Pengaturan situs
- Statistik katalog

## Teknologi Stack

### Frontend
- React + Vite + TypeScript
- Tailwind CSS
- React Router DOM
- TanStack Query
- React Hook Form + Zod
- Lucide React
- Carousel kustom dengan CSS scroll-snap (tanpa pustaka carousel eksternal)

### Backend
- Node.js + Express + TypeScript
- MySQL dengan mysql2/promise
- bcryptjs untuk hashing password (lihat `docs/ARCHITECTURE.md` §3.5)
- express-session + express-mysql-session
- Helmet, express-rate-limit, CSRF protection
- Zod untuk validasi
- Pino untuk logging

### Database
- MySQL 8.x (InnoDB, utf8mb4)

### Testing
- Vitest (unit & integrasi backend, unit frontend)
- Supertest (integrasi HTTP)
- Playwright (E2E)

## Struktur Proyek

```
streamflix/
├── frontend/  # Aplikasi React
├── backend/   # REST API Express
├── database/  # Migrasi SQL & seed
└── docs/      # Dokumentasi
```

## Prasyarat

- Node.js >= 20.0.0
- npm >= 10.0.0
- MySQL 8.x (XAMPP sudah cukup)

## Instalasi

1. Clone atau buat proyek di `E:\streamflix\`
2. Install dependencies
```bash
npm install
```

3. Setup environment variables
- Copy `backend/.env.example` ke `backend/.env` dan isi sesuai konfigurasi
- Copy `frontend/.env.example` ke `frontend/.env`

4. Setup database (XAMPP)
- Buka phpMyAdmin (http://localhost/phpmyadmin)
- Import file `database/schema.sql` ke MySQL
- Atau jalankan migrasi jika ingin: `npm run db:migrate`

5. Buat admin pertama
```bash
npm run admin:create
```

## Menjalankan Aplikasi

### Development
```bash
# Jalankan frontend & backend bersamaan
npm run dev

# Atau terpisah
npm run dev:frontend  # http://localhost:5173
npm run dev:backend   # http://localhost:3000
```

### Production Build
```bash
npm run build
npm run start
```

## Skrip Tersedia

| Script | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan frontend dan backend dalam mode development |
| `npm run build` | Build frontend dan backend untuk production |
| `npm run lint` | Menjalankan ESLint |
| `npm run typecheck` | Cek TypeScript types |
| `npm run test` | Menjalankan semua test backend |
| `npm run db:migrate` | Menjalankan migrasi database |
| `npm run admin:create` | Membuat akun admin pertama |

## Dokumentasi

Lihat folder `docs/` untuk dokumentasi lengkap:
- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [API](docs/API.md)
- [Design System](docs/DESIGN-SYSTEM.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Testing](docs/TESTING.md)

## Catatan

- Database utama wajib MySQL (tidak menggunakan Supabase/Firebase)
- Pengunjung tidak perlu login
- Data Daftar Saya & Lanjutkan Menonton disimpan di localStorage browser
- Video player memutar URL MP4 langsung (validasi URL diterapkan)
- Hanya satu sumber migrasi di `database/migrations/`

## Lisensi

[MIT License](LICENSE)

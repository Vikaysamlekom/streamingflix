# Design System — StreamFlix

Design system StreamFlix didefinisikan sebagai **design token** pada direktif **`@theme`**
Tailwind CSS v4 di `frontend/src/index.css`. Seluruh komponen memakai token ini agar
konsisten dan mudah diubah dari satu tempat.

- **Tema**: dark cinematic modern dengan aksen hijau.
- **Font**: 'Plus Jakarta Sans', diikuti 'Inter' dan fallback sistem.
- **Sumber token**: `frontend/src/index.css` (`@theme`).

## 1. Token Warna

| Token CSS | Utility Tailwind | Hex | Penggunaan |
|---|---|---|---|
| `--color-background` | `bg-background` | `#0B0E10` | Latar halaman |
| `--color-surface` | `bg-surface` | `#14181B` | Permukaan kartu/panel |
| `--color-surface-elevated` | `bg-surface-elevated` | `#1C2125` | Permukaan lebih tinggi (modal, hover) |
| `--color-border` | `border-border` | `#262C31` | Garis batas |
| `--color-text-primary` | `text-text-primary` | `#F2F5F7` | Teks utama |
| `--color-text-muted` | `text-text-muted` | `#9AA4AC` | Teks sekunder |
| `--color-accent` | `text-accent` / `bg-accent` | `#2EE88A` | Aksen utama (CTA, fokus) |
| `--color-accent-hover` | `bg-accent-hover` | `#23C974` | Aksen saat hover/aktif |
| `--color-accent-contrast` | `text-accent-contrast` | `#06210F` | Teks di atas aksen |
| `--color-rating` | `text-rating` | `#F5C518` | Bintang/rating |
| `--color-danger` | `text-danger` / `bg-danger` | `#FF5C5C` | Error/destruktif |
| `--color-danger-hover` | `bg-danger-hover` | `#E64545` | Danger saat hover |
| `--color-warning` | `text-warning` | `#F5A623` | Peringatan |
| `--color-success` | `text-success` | `#2EE88A` | Sukses (sama dengan aksen) |

> Semua warna di atas dapat dipakai langsung sebagai utility Tailwind v4 karena terdaftar
> di `@theme`.

## 2. Radius

| Token | Nilai | Utility | Penggunaan |
|---|---|---|---|
| `--radius-card` | `14px` | `rounded-[var(--radius-card)]` | Kartu, panel, modal |
| `--radius-button` | `9px` | `rounded-[var(--radius-button)]` | Tombol, input |
| `--radius-pill` | `9999px` | `rounded-full` | Badge, ikon bulat |

## 3. Tipografi

| Aspek | Nilai |
|---|---|
| Font family | `'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` |
| Token | `--font-sans` (utility `font-sans`) |
| Rendering | `-webkit-font-smoothing: antialiased` |

Skala teks memakai utility Tailwind standar:

| Peran | Kelas | Contoh penggunaan |
|---|---|---|
| Judul halaman | `text-2xl sm:text-3xl font-bold` | Judul halaman |
| Judul bagian/baris | `text-lg sm:text-xl font-bold tracking-tight` | `MovieRow`, section title |
| Judul kartu/panel | `text-base font-semibold` | Modal, `EmptyState` |
| Body | `text-sm` | Deskripsi, paragraf |
| Meta/caption | `text-xs text-text-muted` | Hint, timestamp, badge |

## 4. Spacing

StreamFlix memakai skala spacing Tailwind default (kelipatan 0.25rem/4px):

| Nilai | Ukuran | Contoh |
|---|---|---|
| `1` | 4px | Jarak ikon–teks kecil |
| `2` | 8px | Gap dalam badge |
| `3` | 12px | Gap kartu mobile |
| `4` | 16px | Gap kartu desktop, padding panel kecil |
| `5` | 20px | Padding modal |
| `6` | 24px | Jarak antar section |
| `8` | 32px | Padding halaman |
| `12` | 48px | Padding empty state |

Lebar konten halaman publik dibatasi dengan `max-w-*` (mis. `max-w-[1400px]`) dan
padding horizontal responsif (`px-4 sm:px-6 lg:px-8`).

## 5. Shadow

| Token | Nilai | Utility |
|---|---|---|
| `--shadow-card` | `0 8px 24px rgba(0, 0, 0, 0.45)` | `shadow-[var(--shadow-card)]` |
| `--shadow-elevated` | `0 16px 48px rgba(0, 0, 0, 0.6)` | `shadow-[var(--shadow-elevated)]` |

## 6. Animasi

| Token | Nilai | Kegunaan |
|---|---|---|
| `--animate-fade-in` | `fade-in 0.35s ease-out both` | Muncul lembut (overlay, konten) |
| `--animate-slide-up` | `slide-up 0.4s ease-out both` | Panel modal naik |
| `--animate-marquee` | `marquee 30s linear infinite` | Teks berjalan |

Utilitas tambahan:

- `.no-scrollbar` — menyembunyikan scrollbar pada baris carousel (tetap dapat digeser).
- `.text-shadow-hero` — bayangan teks agar terbaca di atas gambar hero.
- `.line-clamp-2-custom` — batasi 2 baris (fallback browser lama).

## 7. Utilitas Fokus & Scrollbar

- **Focus ring**: `:focus-visible` → `outline: 2px solid var(--color-accent)` dengan
  `outline-offset: 2px` dan `border-radius: 4px`. Komponen tombol juga memakai
  `focus-visible:outline-accent`.
- **Scrollbar gelap**: lebar 10px, track `background`, thumb `border`, hover `#3A4249`.

## 8. Inventaris Komponen

Komponen berada di `frontend/src/components/` (folder `ui/`, `movies/`, `feedback/`).

### 8.1 `ui/Button.tsx` — Button

Props: `variant`, `size`, `loading`, `leftIcon`, `rightIcon`, serta atribut `<button>`.

| Variant | Gaya |
|---|---|
| `primary` | `bg-accent text-accent-contrast hover:bg-accent-hover font-semibold` |
| `secondary` | `bg-surface-elevated text-text-primary border border-border` |
| `ghost` | transparan, hover `bg-surface-elevated` |
| `danger` | `bg-danger text-white hover:bg-danger-hover font-semibold` |
| `outline` | transparan dengan border, hover border/teks aksen |

| Size | Tinggi & padding |
|---|---|
| `sm` | `h-8 px-3 text-sm` |
| `md` | `h-10 px-4 text-sm` |
| `lg` | `h-12 px-6 text-base` |
| `icon` | `h-10 w-10 justify-center` |

Saat `loading`, tombol menampilkan spinner (`Loader2`) dan `disabled`.

### 8.2 `ui/Badge.tsx` — Badge

Variant: `default`, `accent`, `draft`, `published`, `rating`, `outline`, `danger`.
Bentuk pill (`rounded-full px-2.5 py-0.5 text-xs`).

### 8.3 `ui/Input.tsx` — Input, PasswordInput, Textarea, Select, FieldWrapper

- `FieldWrapper`: label + error/hint + tanda `*` untuk wajib.
- `Input`, `Textarea`, `Select`: gaya field seragam (`bg-background border-border`,
  fokus `border-accent`), `aria-invalid` saat error.
- `PasswordInput`: tombol show/hide dengan `aria-label` yang sesuai.

### 8.4 `ui/Switch.tsx` — Switch

Sakelar on/off (`role="switch"`, `aria-checked`). Aktif → `bg-accent`. Mendukung `label`,
`description`, `disabled`.

### 8.5 `ui/Modal.tsx` — Modal

Dialog berbasis portal. Menutup dengan `Escape` atau klik overlay (`bg-black/70 backdrop-blur`).
Panel `rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-elevated)]`. Fokus
dipindahkan ke panel saat terbuka; scroll body dikunci.

### 8.6 `ui/ConfirmDialog.tsx` — ConfirmDialog

Dialog konfirmasi (mis. hapus film/kategori). Biasanya memakai `Modal` + `Button`
(`danger` untuk aksi destruktif).

### 8.7 `ui/Toast.tsx` — Toast

Notifikasi sementara (sukses/error/info) via `ToastProvider` pada root provider.
Kontainer di atas konten dengan animasi masuk.

### 8.8 `ui/Skeleton.tsx` — Skeleton

Placeholder shimmer saat memuat daftar/kartu.

### 8.9 `ui/Spinner.tsx` — Spinner

Indikator memuat berputar (Lucide `Loader2`, `animate-spin`).

### 8.10 `feedback/States.tsx` — EmptyState, ErrorState

- `EmptyState`: kotak bergaris putus-putus + ikon + judul + deskripsi + aksi opsional.
- `ErrorState`: `role="alert"`, aksen `danger`, tombol "Coba Lagi" (`onRetry`).

### 8.11 `movies/Poster.tsx` — Poster

Menampilkan poster dengan fallback placeholder gradient bila `posterUrl` NULL.

### 8.12 `movies/PosterCard.tsx` — PosterCard

Kartu poster (rasio 2:3) dengan judul/rating; tautan ke detail.

### 8.13 `movies/WideCard.tsx` — WideCard

Kartu lebar (landscape) untuk baris "Lanjutkan Menonton"/highlight.

### 8.14 `movies/Top10Card.tsx` — Top10Card

Kartu dengan angka peringkat besar (`rank`) untuk baris Top 10.

### 8.15 `movies/MovieRow.tsx` — MovieRow

Baris konten horizontal dengan tombol panah kiri/kanan (muncul di desktop; mobile
mengandalkan swipe). Scrollbar disembunyikan (`.no-scrollbar`), `snap-x snap-mandatory`.

### 8.16 `movies/RatingBadge.tsx` — RatingBadge

Badge rating dengan ikon bintang dan warna `rating` (`#F5C518`).

### 8.17 HeroCarousel

Carousel hero di Beranda (jumlah slide dibatasi `hero_slide_limit`). Menampilkan banner/poster
unggulan dengan judul, sinopsis singkat, dan CTA Tonton/Daftar Saya.

## 9. Aksesibilitas

1. **Focus ring hijau**: semua elemen interaktif memakai `:focus-visible` dengan outline
   aksen (`#2EE88A`) + offset 2px. Jangan menonaktifkan outline tanpa pengganti yang jelas.
2. **Kontras WCAG AA**:
   - Teks utama `#F2F5F7` di atas `#0B0E10`/`#14181B` → kontras sangat tinggi (aman).
   - Teks sekunder `#9AA4AC` hanya untuk teks non-esensial; hindari untuk teks penting kecil.
   - Teks di atas aksen memakai `accent-contrast` `#06210F` (bukan putih) agar kontras
     tombol primary aman.
   - `danger` `#FF5C5C` di atas latar gelap memenuhi kontras untuk teks besar/ikon.
3. **`prefers-reduced-motion`**: diblok `@media (prefers-reduced-motion: reduce)` yang
   memangkas durasi animasi/transisi menjadi ~0.01ms dan menonaktifkan `scroll-behavior: smooth`.
4. **Semantik & ARIA**: modal `role="dialog" aria-modal="true"`, tombol `aria-label` yang
   deskriptif (mis. panah `MovieRow`, show/hide password), `role="alert"` untuk error,
   `role="switch" aria-checked` untuk Switch.
5. **Navigasi keyboard**: seluruh kontrol dapat difokus dan diaktifkan dengan keyboard.

## 10. Contoh Pemakaian

```tsx
// Tombol utama
<Button variant="primary" size="lg" leftIcon={<Play className="size-4" />}>
  Tonton
</Button>

// Badge status
<Badge variant="published">Published</Badge>
<Badge variant="draft">Draft</Badge>

// Field dengan error
<Input
  label="Judul"
  name="title"
  required
  error={errors.title?.message}
  hint="Judul akan dipakai untuk membuat slug"
/>

// Baris film
<MovieRow title="Trending Sekarang">
  {movies.map((m) => <PosterCard key={m.id} movie={m} />)}
</MovieRow>
```

Dokumen terkait: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`USE-CASES.md`](./USE-CASES.md).

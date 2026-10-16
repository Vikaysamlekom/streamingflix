# Flowchart — StreamFlix

Dokumen ini memuat tiga diagram alur (Mermaid flowchart):

1. **Alur Pengunjung** — dari membuka situs hingga menonton dan menyimpan progres.
2. **Alur Admin** — dari login hingga mengelola konten.
3. **Akses Admin tanpa Sesi** — logika keputusan backend saat request admin masuk
   (sesi valid? admin aktif? role admin? method mengubah data? CSRF valid?).

---

## 1. Alur Pengunjung (Visitor Flow)

```mermaid
flowchart TD
    Start([Pengunjung membuka situs]) --> Home["Buka / (HomePage)"]
    Home --> FetchHome["GET /api/home"]
    FetchHome --> HomeOk{Berhasil?}
    HomeOk -- Tidak --> HomeErr["Tampilkan ErrorState + Coba Lagi"]
    HomeErr --> FetchHome
    HomeOk -- Ya --> Render["Render hero, trending, terbaru, top10, genre"]
    Render --> HasProgress{Ada progres di localStorage?}
    HasProgress -- Ya --> ContinueRow["Tampilkan baris 'Lanjutkan Menonton'"]
    HasProgress -- Tidak --> Browse
    ContinueRow --> Browse["Jelajahi katalog / cari / pilih film"]
    Browse --> Detail["Buka /movies/:slug"]
    Detail --> FetchDetail["GET /api/movies/:slug"]
    FetchDetail --> Found{Ada & published?}
    Found -- Tidak --> NotFound["404 NotFoundPage"]
    Found -- Ya --> ShowDetail["Tampilkan detail + tombol Tonton / Daftar Saya"]
    ShowDetail --> Choice{Aksi pengunjung}

    Choice -- "Tonton" --> Watch["Buka /watch/:slug"]
    Watch --> Play["Putar MP4 dari videoUrl"]
    Play --> RecView["POST /api/movies/:slug/view"]
    RecView --> RateLimit{Dibatasi rate limit?}
    RateLimit -- Ya --> Ignore["429 diabaikan (pemutaran lanjut)"]
    RateLimit -- Tidak --> CountOk["view_count bertambah"]
    Ignore --> SaveProgress
    CountOk --> SaveProgress["Simpan progres tiap ~5s ke localStorage"]
    SaveProgress --> Complete{"posisi/durasi >= 95%?"}
    Complete -- Ya --> RemoveProgress["Hapus entri dari Lanjutkan Menonton"]
    Complete -- Tidak --> KeepProgress["Pertahankan entri progres"]
    RemoveProgress --> End([Selesai])
    KeepProgress --> End

    Choice -- "Daftar Saya" --> Toggle["Toggle slug di localStorage 'streamflix:my-list'"]
    Toggle --> MaxCheck{"Mencapai 200 slug?"}
    MaxCheck -- Ya --> Trim["Buang slug terlama"]
    MaxCheck -- Tidak --> SaveList["Simpan daftar"]
    Trim --> SaveList
    SaveList --> End

    Choice -- "Cari" --> Search["/search?q=..."]
    Search --> FetchSearch["GET /api/movies?q=..."]
    FetchSearch --> ShowResults["Tampilkan hasil"] --> End
```

### Catatan alur pengunjung

- **Tanpa login.** Tidak ada langkah autentikasi bagi pengunjung.
- **Daftar Saya** disimpan pada kunci `streamflix:my-list` (array slug, maks 200, divalidasi Zod).
- **Progres** disimpan pada kunci `streamflix:watch-progress` (map slug → `{positionSec, durationSec, updatedAt}`),
  disimpan setiap ±5 detik; entri dihapus bila mencapai ambang **≥ 95%**.
- Kegagalan `POST /view` (mis. 429) **tidak** menghentikan pemutaran video.

---

## 2. Alur Admin (Admin Flow)

```mermaid
flowchart TD
    Start([Admin membuka /admin/login]) --> Form["Isi email & password"]
    Form --> Login["POST /api/auth/login"]
    Login --> RateQ{Rate limit terlampaui?}
    RateQ -- Ya --> R429["429 RATE_LIMITED: tampilkan pesan, tunggu"]
    R429 --> Form
    RateQ -- Tidak --> CredQ{Kredensial valid?}
    CredQ -- Tidak --> E401["401 INVALID_CREDENTIALS (pesan generik)"]
    E401 --> Form
    CredQ -- Ya --> ActiveQ{Akun aktif?}
    ActiveQ -- Tidak --> E403["403 ACCOUNT_INACTIVE"]
    E403 --> Form
    ActiveQ -- Ya --> Session["Regenerasi sesi + simpan adminId + buat csrfToken"]
    Session --> Dash["Arahkan ke /admin/dashboard"]
    Dash --> Stats["GET /api/admin/dashboard/stats"]
    Stats --> Menu{Pilih menu}

    Menu -- "Film" --> Movies["/admin/movies"]
    Movies --> ListM["GET /api/admin/movies"]
    ListM --> MovieAction{Aksi}
    MovieAction -- "Buat" --> New["POST /api/admin/movies + CSRF"]
    MovieAction -- "Ubah" --> Edit["PUT /api/admin/movies/:id + CSRF"]
    MovieAction -- "Status" --> Patch["PATCH /api/admin/movies/:id/status + CSRF"]
    MovieAction -- "Hapus" --> Del["DELETE /api/admin/movies/:id + CSRF"]

    Menu -- "Kategori" --> Cats["/admin/categories"]
    Cats --> CatAction{Aksi}
    CatAction -- "Buat/Ubah" --> CatWrite["POST/PUT /api/admin/categories + CSRF"]
    CatAction -- "Hapus" --> CatDel["DELETE /api/admin/categories/:id + CSRF"]
    CatDel --> CatInUse{Masih dipakai film?}
    CatInUse -- Ya --> E409["409 CATEGORY_IN_USE"]
    CatInUse -- Tidak --> CatOk["Kategori terhapus (204)"]

    Menu -- "Pengaturan" --> Settings["/admin/settings"]
    Settings --> SetAction{Aksi}
    SetAction -- "Ubah situs" --> SetPut["PUT /api/admin/settings + CSRF"]
    SetAction -- "Ganti password" --> PwdPut["PUT /api/admin/account/password + CSRF"]

    New --> Result{Respons}
    Edit --> Result
    Patch --> Result
    Del --> Result
    CatWrite --> Result
    CatOk --> Result
    SetPut --> Result
    PwdPut --> Result

    Result -- "Sukses 2xx" --> Invalidate["Invalidasi cache + Toast sukses"]
    Result -- "422/409/404" --> ShowErr["Tampilkan pesan error + detail field"]
    Result -- "401 SESSION_EXPIRED" --> Logout["Arahkan ke /admin/login"]
    Invalidate --> Menu
    ShowErr --> Menu

    Menu -- "Logout" --> Out["POST /api/auth/logout + CSRF"]
    Out --> Logout
    Logout --> End([Selesai])
```

### Catatan alur admin

- Setiap request yang **mengubah data** (POST/PUT/PATCH/DELETE) menyertakan header
  `x-csrf-token`. Bila belum ada, klien mengambilnya dari `GET /api/auth/csrf-token`.
- `401 SESSION_EXPIRED` selalu mengarahkan admin kembali ke `/admin/login`.
- Menghapus kategori yang masih dipakai film menghasilkan `409 CATEGORY_IN_USE`.

---

## 3. Akses Admin tanpa Sesi — Logika Keputusan Middleware

Diagram ini menggambarkan logika sebenarnya di backend saat sebuah request menuju endpoint admin
(`requireAdmin()` lalu `csrfProtect()`), sesuai `backend/src/middlewares/require-admin.ts`
dan `backend/src/middlewares/csrf.ts`.

```mermaid
flowchart TD
    Start([Request masuk ke endpoint admin]) --> HasSession{"req.session.adminId ada?"}

    HasSession -- Tidak --> U401["401 UNAUTHORIZED / SESSION_EXPIRED"]
    HasSession -- Ya --> Lookup["SELECT id, email, display_name, role, is_active FROM admins WHERE id = ?"]

    Lookup --> Exists{"Admin ditemukan?"}
    Exists -- Tidak --> Destroy1["Hancurkan sesi"] --> U401b["401 SESSION_EXPIRED"]
    Exists -- Ya --> Active{"is_active = 1?"}
    Active -- Tidak --> Destroy2["Hancurkan sesi"] --> F403a["403 ACCOUNT_INACTIVE"]
    Active -- Ya --> Role{"role = 'admin'?"}
    Role -- Tidak --> F403b["403 FORBIDDEN"]
    Role -- Ya --> Attach["Set req.admin = { id, email, displayName, role }"]

    Attach --> Method{"Method mengubah data? POST/PUT/PATCH/DELETE"}
    Method -- Tidak GET --> Allow["Lanjut ke handler"]
    Method -- Ya --> CsrfHeader{"Header x-csrf-token ada?"}
    CsrfHeader -- Tidak --> C403["403 CSRF_INVALID"]
    CsrfHeader -- Ya --> CsrfMatch{"Header == token sesi? (timingSafeEqual)"}
    CsrfMatch -- Tidak --> C403
    CsrfMatch -- Ya --> Allow

    Allow --> Handler["Jalankan handler/service/repository"]
    Handler --> Resp203["200/201/204 + amplop sukses"]

    U401 --> End([Respons error dikirim])
    U401b --> End
    F403a --> End
    F403b --> End
    C403 --> End
    Resp203 --> End
```

### Rangkuman keputusan

| Urutan | Pertanyaan | Jika gagal | Status & kode |
|---|---|---|---|
| 1 | Sesi memiliki `adminId`? | Sesi tidak ada / kedaluwarsa | `401 SESSION_EXPIRED` |
| 2 | Admin ditemukan di database? | Tidak ada (sesi usang) | `401 SESSION_EXPIRED` (sesi dihancurkan) |
| 3 | `is_active = 1`? | Akun dinonaktifkan | `403 ACCOUNT_INACTIVE` (sesi dihancurkan) |
| 4 | `role = 'admin'`? | Peran bukan admin | `403 FORBIDDEN` |
| 5 | Method mengubah data? | Jika tidak (GET) → langsung lanjut | — |
| 6 | Header `x-csrf-token` cocok dengan token sesi? | Tidak ada / tidak cocok | `403 CSRF_INVALID` |
| 7 | Semua lolos | — | Lanjut ke handler |

> Catatan implementasi:
> - Pemeriksaan sesi, status aktif, dan peran **selalu di backend** (bukan hanya di frontend).
> - Perbandingan token CSRF memakai `crypto.timingSafeEqual`.
> - Bila admin sudah tidak ada / nonaktif, sesi dihancurkan agar klien tidak terus mencoba.

Dokumen terkait: [`USE-CASES.md`](./USE-CASES.md) · [`API.md`](./API.md) ·
[`ERROR-MAP.md`](./ERROR-MAP.md).

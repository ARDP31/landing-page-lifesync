# 📁 Struktur Folder & File LifeSync Website

Berikut adalah penjelasan struktur file agar mudah dipahami dan dipelihara.

## 📂 Root Folder

| File/Folder | Fungsi |
|-------------|--------|
| `index.html` | Halaman utama (entry point). Memuat semua section secara dinamis via `app.js`. |
| `style.css` | CSS kustom tambahan (navigasi, animasi reveal, layer dekoratif, aksesibilitas). |
| `app.js` | JavaScript utama: loader section, navbar, scroll spy, smooth scroll, reveal on scroll, dan interaksi kartu fitur. |
| `STRUKTUR.md` | Dokumentasi ini. |
| `package.json` / `package-lock.json` | Konfigurasi proyek (jika diperlukan). |
| `.gitignore` | File yang diabaikan Git. |

## 📂 `sections/` — Komponen Halaman Utama

Semua file di sini adalah **HTML partial** yang dimuat ke dalam `index.html` melalui `fetch()` di `app.js`.

| File | Section | Deskripsi |
|------|---------|-----------|
| `header.html` | `#navbar` | Navbar utama (logo, navigasi desktop/mobile, announcement bar). |
| `hero.html` | `#top` | Hero section dengan headline, CTA, dan showcase ponsel. |
| `fitur.html` | `#fitur` | Grid 6 kartu fitur unggulan dengan link ke halaman detail. |
| `offline.html` | `#offline` | Penjelasan arsitektur offline-first dan tech stack. |
| `ai.html` | `#ai` | AI Assistance dengan 3 benefit cards dan showcase chat. |
| `pricing.html` | `#pricing` | Tipe akun (Gratis dan Premium). |
| `footer.html` | Footer | Footer dengan logo, navigasi cepat, dan CTA unduh. |

## 📂 `pages/` — Halaman Detail Setiap Fitur

Setiap file adalah **halaman lengkap** (sendirian, tidak dimuat via fetch) yang menampilkan detail satu fitur.

| File | Fitur |
|------|-------|
| `fitur-todo.html` | Todo & Task Planner |
| `kalender.html` | Kalender Event Visual |
| `keuangan.html` | Pencatatan Keuangan |
| `nutrisi.html` | NutriScan & Nutrisi |
| `memento.html` | Memento Journaling |
| `fitur-notes.html` | Notes & Catatan |

Setiap halaman detail memiliki:
- Tombol "Kembali ke Fitur Utama" (kembali ke `index.html#fitur`)
- Header dengan ikon dan judul fitur
- 2 kolom penjelasan fitur (manfaat + cara kerja)
- Kotak "Manfaat bagi Pengguna"

## 📂 `assets/` — Aset Statis

| File | Fungsi |
|------|--------|
| `lifesync-logo.png` | Logo utama LifeSync (digunakan di hero section). |
| `lifesync-symbol.png` | Simbol LifeSync (digunakan di navbar, footer, dan favicon). |
| `lifesync-banner.png` | Banner besar (digunakan di Open Graph / social preview). |

## ⚙️ Alur Kerja `app.js`

1. **DOMContentLoaded** → memuat semua section secara paralel via `fetch()`.
2. Setelah semua section siap → inisialisasi interaksi:
   - `initNavbar()` — menu mobile, sticky navbar, scroll spy.
   - `initReveal()` — animasi elemen `.reveal` saat discroll.
   - `initFeatureCards()` — klik kartu fitur → buka halaman detail di `pages/`.
   - `initDownloadLinks()` — tombol unduh (arahkan ke `#pricing` jika `STORE_URL` kosong).
   - `initSmoothScroll()` — scroll halus ke anchor dengan offset navbar.

## 🎨 Konvensi Warna LifeSync

| Token / Variabel | Kode Hex | Deskripsi / Penggunaan |
|------------------|----------|------------------------|
| `primary-500` / `brand-500` | `#16A34A` | Hijau utama untuk tombol aksi, navigasi aktif, progres, dan identitas LifeSync. |
| `secondary` / `accent` | `#84CC16` | Lime untuk aksen visual, target, pencapaian, dan bagian grafik. |
| `tertiary` / `accent-blue` | `#0EA5E9` | Sky blue untuk informasi, statistik sekunder, tautan, dan Assistance. |
| `neutral-50` / `--bg-page` | `#F7FAF7` | Latar halaman, area konten, dan ruang kerja. |
| `neutral-900` / `ink-DEFAULT` | `#24352B` | Warna judul, isi teks, dan label penting. |
| `border-soft` | `#DEE6DF` | Garis pembatas kartu dan navbar. |

## 🛠️ Cara Menambah Fitur Baru

1. Buat file halaman detail di `pages/`, misal `pages/fitur-baru.html`.
2. Tambahkan kartu fitur di `sections/fitur.html` dengan `href` ke halaman baru dan `data-feature="namafitur"`.
3. Tambahkan entri mapping di `app.js` di dalam `FEATURE_PAGE`.
4. Jika perlu section baru di halaman utama, buat file di `sections/` dan daftarkan di `SECTIONS` di `app.js`.

## 🚀 Deploy

Website ini adalah **static site** (HTML/CSS/JS murni, tidak butuh backend). Cocok untuk di-hosting di:
- **GitHub Pages** (disarankan)
- **Netlify**
- **Vercel**

Cukup upload seluruh isi folder ke salah satu platform tersebut.

---

© 2026 LifeSync Application
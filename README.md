# LifeSync — Product Profile Website

Website product profile statis untuk aplikasi **LifeSync** (Daily Habit Tracker & AI Assistance).
Dibangun dengan HTML + Tailwind CSS (CDN) + CSS custom + vanilla JavaScript. Tanpa build step.

## Struktur

```
index.html            # Halaman utama (shell), section dimuat via fetch()
app.js                # Loader section + interaksi (navbar, scroll spy, smooth scroll, reveal)
style.css             # Custom CSS (reveal animation, scrollbar, utility)
sections/             # Partial HTML yang di-inject ke <div id="section-*">
  header.html         # Navbar fixed + drawer mobile
  hero.html           # Hero + mockup aplikasi + CTA
  fitur.html          # 4 pilar kehidupan
  offline.html        # Arsitektur offline-first
  ai.html             # AI Assistance
  pricing.html        # Tipe akun
  footer.html         # Footer
pages/                # Halaman standalone per modul
  nutrisi.html  keuangan.html  kalender.html  memento.html
assets/               # Gambar, ikon, banner OG
tools/                # Skrip development & testing (Node, tanpa dependensi)
```

## Menjalankan

```bash
npm run serve          # server statis di http://127.0.0.1:8765
```

> Website memakai `fetch()` untuk memuat partial, jadi **wajib** served lewat HTTP
> (membuka `index.html` langsung lewat `file://` akan gagal karena CORS).

## Testing

```bash
npm run validate       # cek struktur, path, dan referensi internal
npm run test:browser   # smoke test Chrome headless (CDP, tanpa dependensi)
npm test               # validate + browser test
```

`tools/browser-test.js` memverifikasi:

- Tidak ada exception JS / console error / request gagal
- Seluruh section ter-inject, 4 pilar ter-render, H1 & CTA download ada
- Smooth scroll + offset navbar fixed, scroll spy menandai link aktif, hash URL ikut berubah
- Drawer mobile: toggle, `aria-expanded`, tutup via `Escape` (fokus kembali ke tombol), tutup via click-outside
- Tidak ada overflow horizontal pada viewport mobile & desktop
- Screenshot otomatis di `tools/screenshots/` (mobile-390, tablet-768, desktop-1440)
- Empat halaman modul standalone ter-render & punya link kembali

### Tool lain

- `tools/validate.js` — memvalidasi struktur file & path relatif (partial `sections/*.html` dihitung
  relatif terhadap root situs, sedangkan halaman standalone `pages/*.html` relatif terhadap folder `pages/`)
- `tools/depth.js` — memeriksa kedalaman struktur DOM sebuah partial
  (`node tools/depth.js sections/hero.html`)
- `tools/serve.js` — server statis untuk development

## Arsitektur interaksi (`app.js`)

1. **Load section** — semua partial dimuat paralel lewat `Promise.all()`, lalu di-inject ke
   `<div id="section-*">`.
2. **Init setelah semua section siap** — `initNavbar()`, `initReveal()`, `initDownloadLinks()`,
   `initSmoothScroll()` dipanggil setelah `Promise.all` selesai. Ini wajib karena scroll spy
   membutuhkan seluruh target section sudah ada di DOM.
3. **Scroll spy dinamis** — rebuilt via `MutationObserver` sehingga tetap benar walaupun section
   berganti atau ditambahkan.
4. **Smooth scroll** — kompensasi tinggi navbar fixed (`scroll-margin-top` + offset manual) dan
   mendukung navigasi keyboard.

## Placeholder yang masih perlu diisi

| Item | Lokasi | Status |
|------|--------|--------|
| URL toko resmi (Google Play / App Store) | `app.js` → `const STORE_URL = ''` | **Placeholder.** Selama kosong, CTA "Download App" diarahkan ke `#pricing`. Isi konstanta ini untuk otomatis memakai `target="_blank"` + `rel="noopener noreferrer"`. |
| Social proof "4,9 dari 1.200+ pengguna" | `sections/hero.html` | **Belum terverifikasi.** Perlu dikonfirmasi dari data store resmi sebelum website dipublikasikan. |
| Banner Open Graph | `assets/lifesync-banner.png` | Referensi sudah ada di `index.html`; pastikan file gambarnya tersedia. |
| Favicon | `assets/lifesync-symbol.png` | Referensi sudah ditambahkan; pastikan file gambarnya tersedia. |

## Catatan

- `STORE_URL` di `app.js` adalah satu-satunya titik yang perlu diubah untuk mengaktifkan
  tautan unduhan asli.
- Tidak ada dependensi npm. `tools/browser-test.js` memakai Chrome DevTools Protocol lewat
  `WebSocket` bawaan Node 18+ dan `fetch` bawaan.

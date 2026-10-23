/**
 * LifeSync - Product Profile Website
 * Loader section + interaksi navbar (mobile menu, scroll spy, smooth scroll)
 *
 * Catatan arsitektur:
 * - Semua section dimuat paralel via fetch() lalu di-inject ke <div id="section-*">.
 * - Karena section baru tersedia SETELAH fetch selesai, seluruh interaksi
 *   (navbar, scroll spy, reveal) WAJIB diinisialisasi setelah SEMUA section
 *   selesai dimuat. Jika tidak, scroll spy akan mencari target yang belum ada.
 */

/* ==========================================================
   0. Konfigurasi situs
   ========================================================== */
/**
 * URL toko resmi (Google Play / App Store / website).
 * TODO: ganti dengan URL resmi saat sudah tersedia.
 * Selama kosong, tombol "Download App" diarahkan ke section #pricing.
 */
const STORE_URL = '';

/**
 * Dipakai untuk menandai elemen CTA unduhan.
 * app.js akan mengganti href-nya otomatis bila STORE_URL terisi.
 */
const DOWNLOAD_SELECTOR = '[data-download]';

const SECTIONS = [
    { id: 'section-header', file: 'sections/header.html' },
    { id: 'section-hero',   file: 'sections/hero.html' },
    { id: 'section-fitur',  file: 'sections/fitur.html' },
    { id: 'section-offline',file: 'sections/offline.html' },
    { id: 'section-ai',     file: 'sections/ai.html' },
    { id: 'section-pricing',file: 'sections/pricing.html' },
    { id: 'section-footer', file: 'sections/footer.html' },
];

/* ==========================================================
   1. Loader Section
   ========================================================== */
async function loadSection({ id, file }) {
    try {
        const response = await fetch(file);
        if (!response.ok) {
            console.error(`Gagal memuat ${file} (HTTP ${response.status})`);
            return false;
        }
        const html = await response.text();
        const container = document.getElementById(id);
        if (!container) {
            console.error(`Container #${id} tidak ditemukan`);
            return false;
        }
        container.innerHTML = html;
        return true;
    } catch (error) {
        console.error(`Error loading ${file}:`, error);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    // 1) Muat semua section secara paralel
    const results = await Promise.all(SECTIONS.map(loadSection));

    const failed = SECTIONS.filter((_, i) => !results[i]);
    if (failed.length) {
        console.warn('Section gagal dimuat:', failed.map((s) => s.file).join(', '));
    }

    // 2) Baru setelah SEMUA section siap, inisialisasi interaksi.
    //    Ini memastikan scroll spy menemukan seluruh target section.
    initNavbar();
    initReveal();
    initPhoneInteractions();
    initDownloadLinks();
    initSmoothScroll();
});

/* ==========================================================
   2. Navbar: mobile menu, sticky state, scroll spy
   ========================================================== */
function initNavbar() {
    const navbar    = document.getElementById('navbar');
    const bar       = document.getElementById('navbar-bar');
    const toggle    = document.getElementById('nav-toggle');
    const icon      = document.getElementById('nav-toggle-icon');
    const menu      = document.getElementById('nav-mobile-menu');
    if (!navbar || !toggle || !menu) return;

    /* --- 2a. Buka / tutup menu mobile --- */
    const setMenu = (open) => {
        menu.classList.toggle('hidden', !open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Tutup menu navigasi' : 'Buka menu navigasi');
        if (icon) {
            icon.classList.toggle('fa-bars', !open);
            icon.classList.toggle('fa-xmark', open);
        }
    };

    toggle.addEventListener('click', () => {
        setMenu(menu.classList.contains('hidden'));
    });

    // Tutup menu ketika salah satu tautan diklik
    menu.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener('click', () => setMenu(false));
    });

    // Tutup menu saat klik di luar area header
    document.addEventListener('click', (event) => {
        if (!menu.classList.contains('hidden') && !navbar.contains(event.target)) {
            setMenu(false);
        }
    });

    // Tutup menu saat menekan tombol Escape
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !menu.classList.contains('hidden')) {
            setMenu(false);
            toggle.focus();
        }
    });

    /* --- 2b. State sticky saat di-scroll --- */
    const onScroll = () => {
        navbar.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    /* --- 2c. Scroll spy: tandai link section yang sedang aktif ---
       Target section dimuat dinamis lewat fetch(), sehingga target
       di-resolve ulang setiap kali daftar link berubah.              */
    const navLinks = Array.from(document.querySelectorAll('.nav-link[href^="#"]'));
    let spy = null;

    const setActive = (id) => {
        navLinks.forEach((link) => {
            const active = link.getAttribute('href') === '#' + id;
            link.classList.toggle('is-active', active);
            if (active) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    };

    const resolveTargets = () => {
        return navLinks
            .map((link) => document.getElementById(link.getAttribute('href').slice(1)))
            .filter(Boolean);
    };

    const buildSpy = () => {
        if (spy) {
            spy.disconnect();
            spy = null;
        }

        const targets = resolveTargets();
        if (targets.length === 0) return;

        spy = new IntersectionObserver((entries) => {
            // Pilih entry yang paling atas viewport agar penandaan stabil
            const visible = entries
                .filter((entry) => entry.isIntersecting)
                .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
            if (visible.length) {
                setActive(visible[0].target.id);
            }
        }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

        targets.forEach((target) => spy.observe(target));
    };

    buildSpy();

    // Bangun ulang spy bila section baru ditambahkan / berubah.
    const observer = new MutationObserver(() => buildSpy());
    observer.observe(document.body, { childList: true, subtree: true });
}

/* ==========================================================
   3. Tautan unduhan aplikasi
   ========================================================== */
function initDownloadLinks() {
    const links = document.querySelectorAll(DOWNLOAD_SELECTOR);
    if (!links.length) return;

    links.forEach((link) => {
        if (!STORE_URL) {
            // Fallback: arahkan ke section harga/pricing
            link.setAttribute('href', '#pricing');
            link.setAttribute('data-store-placeholder', 'true');
            link.title = 'Link toko resmi belum tersedia - menampilkan pilihan paket';
            return;
        }
        link.setAttribute('href', STORE_URL);
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
    });
}

/* ==========================================================
   4. Smooth scroll dengan offset navbar fixed
   ========================================================== */
function initSmoothScroll() {
    document.addEventListener('click', (event) => {
        const link = event.target.closest('a[href^="#"]');
        if (!link) return;

        const hash = link.getAttribute('href');
        if (!hash || hash === '#') return;

        const target = document.getElementById(hash.slice(1));
        if (!target) return;

        event.preventDefault();

        const navbar = document.getElementById('navbar');
        const offset = navbar ? navbar.offsetHeight : 0;

        const top = target.getBoundingClientRect().top + window.pageYOffset - offset - 8;
        window.scrollTo({ top, behavior: 'smooth' });

        // Perbarui hash tanpa memicu lompatan tambahan
        if (history.replaceState) {
            history.replaceState(null, '', hash);
        }

        // Fokuskan target agar navigasi keyboard tetap konsisten
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
    });
}

/* ==========================================================
   5. Reveal on scroll (elemen .reveal)
   ========================================================== */
function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (items.length === 0) return;

    if (!('IntersectionObserver' in window)) {
        items.forEach((el) => el.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    items.forEach((el) => observer.observe(el));
}


/* ==========================================================
   6. Interaksi layar ponsel (fitur diklik -> layar berganti dengan efek menarik)
   ========================================================== */

/** Konten layar ponsel untuk setiap fitur (status bar + isi aplikasi) */
const PHONE_SCREENS = {
    home: `
        <div class="relative z-10 flex items-center justify-between px-5 pt-3 text-[10px] font-semibold text-ink-soft">
            <span>09:41</span>
            <span class="flex items-center gap-1">
                <i class="fa-solid fa-signal text-[9px]"></i>
                <i class="fa-solid fa-wifi text-[9px]"></i>
                <i class="fa-solid fa-battery-three-quarters text-[11px]"></i>
            </span>
        </div>
        <div class="px-4 pb-24 pt-4">
            <div class="flex items-center gap-3">
                <img src="assets/lifesync-symbol.png" alt="" class="h-9 w-9 object-contain">
                <div class="leading-tight">
                    <p class="text-[13px] font-extrabold text-ink">Halo, Raka &#128075;</p>
                    <p class="text-[10px] text-brand-600">&#9679; 3 dari 5 habit selesai</p>
                </div>
            </div>
            <div class="mt-4 rounded-2xl border border-brand-100 bg-white p-3.5 shadow-sm">
                <div class="flex items-center justify-between">
                    <p class="text-[11px] font-bold text-ink">Progres Hari Ini</p>
                    <span class="rounded-full bg-brand-100 px-2 py-0.5 text-[9px] font-bold text-brand-700">60%</span>
                </div>
                <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-brand-100">
                    <div class="h-full w-3/5 rounded-full bg-gradient-to-r from-brand-400 to-brand-600"></div>
                </div>
                <div class="mt-2.5 flex items-center justify-between text-[9px] font-semibold text-ink-muted">
                    <span>3 selesai</span>
                    <span>2 tersisa</span>
                </div>
            </div>
            <div class="mt-3 rounded-2xl border border-accent-purple/20 bg-accent-purple/5 p-3">
                <div class="flex items-start gap-2">
                    <span class="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent-purple/15 text-[11px] text-accent-purple"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
                    <div class="leading-tight">
                        <p class="text-[10px] font-bold text-ink">AI Insight</p>
                        <p class="mt-0.5 text-[9px] leading-snug text-ink-soft">Aktivitasmu minggu ini lebih padat dari biasanya. Coba sisihkan 20 menit untuk istirahat.</p>
                    </div>
                </div>
            </div>
            <p class="mb-2 mt-4 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Akses Cepat</p>
            <div class="space-y-2">
                <a href="pages/kalender.html" class="flex items-center gap-2.5 rounded-xl border border-brand-200 bg-brand-50/70 p-2.5 transition hover:border-brand-300 hover:bg-brand-50">
                    <span class="grid h-7 w-7 place-items-center rounded-lg bg-brand-100 text-[11px] text-brand-600"><i class="fa-solid fa-list-check"></i></span>
                    <span class="flex-1 text-[10px] font-bold text-ink">Jadwal &amp; Task</span>
                </a>
                <a href="pages/keuangan.html" class="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-2.5 transition hover:border-accent-orange/30 hover:bg-accent-orange/5">
                    <span class="grid h-7 w-7 place-items-center rounded-lg bg-accent-orange/15 text-[11px] text-accent-orange"><i class="fa-solid fa-wallet"></i></span>
                    <span class="flex-1 text-[10px] font-bold text-ink">Keuangan</span>
                </a>
                <a href="pages/nutrisi.html" class="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-2.5 transition hover:border-accent-blue/30 hover:bg-accent-blue/5">
                    <span class="grid h-7 w-7 place-items-center rounded-lg bg-accent-blue/15 text-[11px] text-accent-blue"><i class="fa-solid fa-restaurant"></i></span>
                    <span class="flex-1 text-[10px] font-bold text-ink">Nutrisi</span>
                </a>
                <a href="pages/memento.html" class="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-2.5 transition hover:border-accent-purple/30 hover:bg-accent-purple/5">
                    <span class="grid h-7 w-7 place-items-center rounded-lg bg-accent-purple/15 text-[11px] text-accent-purple"><i class="fa-solid fa-camera-retro"></i></span>
                    <span class="flex-1 text-[10px] font-bold text-ink">Memento</span>
                </a>
            </div>
        </div>
    `,
    todo: `
        <div class="relative z-10 flex items-center justify-between px-5 pt-3 text-[10px] font-semibold text-ink-soft">
            <span>09:41</span>
            <span class="flex items-center gap-1">
                <i class="fa-solid fa-signal text-[9px]"></i>
                <i class="fa-solid fa-wifi text-[9px]"></i>
                <i class="fa-solid fa-battery-three-quarters text-[11px]"></i>
            </span>
        </div>
        <div class="px-4 pb-24 pt-4">
            <div class="flex items-center gap-3 mb-6">
                <div class="grid h-9 w-9 place-items-center rounded-2xl bg-brand-600 text-white"><i class="fa-solid fa-list-check text-[14px]"></i></div>
                <div class="leading-tight">
                    <p class="text-[13px] font-extrabold text-ink">Todo &amp; Task Planner</p>
                    <p class="text-[10px] text-brand-600">8 tugas hari ini &#183; 3 selesai</p>
                </div>
            </div>
            <div class="space-y-3">
                <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div class="flex items-center gap-3">
                        <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <div>
                            <p class="text-[11px] font-bold text-ink">Rapat tim proyek</p>
                            <p class="text-[9px] text-ink-soft">10:00 &#183; Ruang meeting</p>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-right text-[10px] text-ink-muted"></i>
                </div>
                <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div class="flex items-center gap-3">
                        <div class="w-2 h-2 rounded-full bg-brand-500"></div>
                        <div>
                            <p class="text-[11px] font-bold text-ink">Olahraga pagi</p>
                            <p class="text-[9px] text-ink-soft">06:30 &#183; Taman</p>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-right text-[10px] text-ink-muted"></i>
                </div>
                <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div class="flex items-center gap-3">
                        <div class="w-2 h-2 rounded-full bg-accent-orange"></div>
                        <div>
                            <p class="text-[11px] font-bold text-ink">Belanja mingguan</p>
                            <p class="text-[9px] text-ink-soft">16:00 &#183; Supermarket</p>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-right text-[10px] text-ink-muted"></i>
                </div>
            </div>
            <div class="mt-6 rounded-2xl border border-brand-100 bg-brand-50 p-4">
                <p class="text-[10px] font-bold uppercase tracking-wider text-brand-700 mb-1">Tips</p>
                <p class="text-[10px] text-brand-600">Gunakan pemicu local notifikasi agar tidak ketinggalan jadwal penting.</p>
            </div>
        </div>
    `,


    calendar: `
        <div class="relative z-10 flex items-center justify-between px-5 pt-3 text-[10px] font-semibold text-ink-soft">
            <span>09:41</span>
            <span class="flex items-center gap-1">
                <i class="fa-solid fa-signal text-[9px]"></i>
                <i class="fa-solid fa-wifi text-[9px]"></i>
                <i class="fa-solid fa-battery-three-quarters text-[11px]"></i>
            </span>
        </div>
        <div class="px-4 pb-24 pt-4">
            <div class="flex items-center gap-3 mb-6">
                <div class="grid h-9 w-9 place-items-center rounded-2xl bg-accent-purple text-white"><i class="fa-solid fa-calendar-days text-[14px]"></i></div>
                <div class="leading-tight">
                    <p class="text-[13px] font-extrabold text-ink">Kalender Event</p>
                    <p class="text-[10px] text-brand-600">Rabu, 23 Oktober 2026</p>
                </div>
            </div>
            <div class="space-y-3">
                <div class="p-4 rounded-2xl border border-accent-purple/20 bg-accent-purple/5">
                    <div class="flex items-center gap-3 mb-3">
                        <span class="w-8 h-8 rounded-xl bg-accent-purple/20 text-accent-purple flex items-center justify-center text-[10px] font-bold">09</span>
                        <span class="text-[11px] font-bold text-ink">09:00</span>
                    </div>
                    <p class="text-[11px] font-bold text-ink">Stand-up tim</p>
                    <p class="text-[9px] text-ink-soft mt-1">Ruang A &#183; 30 menit</p>
                </div>
                <div class="p-4 rounded-2xl border border-accent-blue/20 bg-accent-blue/5">
                    <div class="flex items-center gap-3 mb-3">
                        <span class="w-8 h-8 rounded-xl bg-accent-blue/20 text-accent-blue flex items-center justify-center text-[10px] font-bold">11</span>
                        <span class="text-[11px] font-bold text-ink">11:00</span>
                    </div>
                    <p class="text-[11px] font-bold text-ink">Review desain</p>
                    <p class="text-[9px] text-ink-soft mt-1">Video call &#183; 60 menit</p>
                </div>
                <div class="p-4 rounded-2xl border border-slate-100 bg-white">
                    <div class="flex items-center gap-3 mb-3">
                        <span class="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">14</span>
                        <span class="text-[11px] font-bold text-ink">14:00</span>
                    </div>
                    <p class="text-[11px] font-bold text-ink">Olahraga</p>
                    <p class="text-[9px] text-ink-soft mt-1">Gym &#183; 45 menit</p>
                </div>
            </div>
            <div class="mt-6 text-center">
                <p class="text-[10px] font-bold text-ink-muted uppercase tracking-wider">5 event minggu ini</p>
                <p class="text-[10px] text-brand-600 font-semibold">Semua tersinkronkan offline</p>
            </div>
        </div>
    `,
    keuangan: `
        <div class="relative z-10 flex items-center justify-between px-5 pt-3 text-[10px] font-semibold text-ink-soft">
            <span>09:41</span>
            <span class="flex items-center gap-1">
                <i class="fa-solid fa-signal text-[9px]"></i>
                <i class="fa-solid fa-wifi text-[9px]"></i>
                <i class="fa-solid fa-battery-three-quarters text-[11px]"></i>
            </span>
        </div>
        <div class="px-4 pb-24 pt-4">
            <div class="flex items-center gap-3 mb-6">
                <div class="grid h-9 w-9 place-items-center rounded-2xl bg-accent-orange text-white"><i class="fa-solid fa-wallet text-[14px]"></i></div>
                <div class="leading-tight">
                    <p class="text-[13px] font-extrabold text-ink">Pencatatan Keuangan</p>
                    <p class="text-[10px] text-brand-600">Saldo: Rp 4,2 jt</p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-6">
                <div class="p-4 rounded-2xl border border-emerald-100 bg-emerald-50">
                    <p class="text-[10px] font-bold text-emerald-700 mb-1">Pemasukan</p>
                    <p class="text-[12px] font-bold text-ink">Rp 6,5 jt</p>
                </div>
                <div class="p-4 rounded-2xl border border-rose-100 bg-rose-50">
                    <p class="text-[10px] font-bold text-rose-700 mb-1">Pengeluaran</p>
                    <p class="text-[12px] font-bold text-ink">Rp 2,3 jt</p>
                </div>
            </div>
            <div class="space-y-3">
                <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div class="flex items-center gap-3">
                        <div class="w-2 h-2 rounded-full bg-rose-500"></div>
                        <div class="flex-1">
                            <p class="text-[11px] font-bold text-ink">Makan siang</p>
                            <p class="text-[9px] text-ink-soft">Hari ini &#183; Rp 45.000</p>
                        </div>
                    </div>
                    <span class="text-[10px] font-bold text-rose-600">-Rp 45.000</span>
                </div>
                <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div class="flex items-center gap-3">
                        <div class="w-2 h-2 rounded-full bg-rose-500"></div>
                        <div class="flex-1">
                            <p class="text-[11px] font-bold text-ink">Transportasi</p>
                            <p class="text-[9px] text-ink-soft">Kemarin &#183; Rp 15.000</p>
                        </div>
                    </div>
                    <span class="text-[10px] font-bold text-rose-600">-Rp 15.000</span>
                </div>
                <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div class="flex items-center gap-3">
                        <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <div class="flex-1">
                            <p class="text-[11px] font-bold text-ink">Gaji bulanan</p>
                            <p class="text-[9px] text-ink-soft">01 Okt &#183; Rp 5,0 jt</p>
                        </div>
                    </div>
                    <span class="text-[10px] font-bold text-emerald-600">+Rp 5,0 jt</span>
                </div>
            </div>
        </div>
    `,


    nutrisi: `
        <div class="relative z-10 flex items-center justify-between px-5 pt-3 text-[10px] font-semibold text-ink-soft">
            <span>09:41</span>
            <span class="flex items-center gap-1">
                <i class="fa-solid fa-signal text-[9px]"></i>
                <i class="fa-solid fa-wifi text-[9px]"></i>
                <i class="fa-solid fa-battery-three-quarters text-[11px]"></i>
            </span>
        </div>
        <div class="px-4 pb-24 pt-4">
            <div class="flex items-center gap-3 mb-6">
                <div class="grid h-9 w-9 place-items-center rounded-2xl bg-emerald-600 text-white"><i class="fa-solid fa-camera-retro text-[14px]"></i></div>
                <div class="leading-tight">
                    <p class="text-[13px] font-extrabold text-ink">NutriScan &amp; Nutrisi</p>
                    <p class="text-[10px] text-brand-600">Asupan hari ini</p>
                </div>
            </div>
            <div class="p-4 rounded-2xl border border-emerald-100 bg-white shadow-sm mb-6">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-[11px] font-bold text-emerald-700">Kalori</span>
                    <span class="text-[11px] font-bold text-ink">1.240 / 2.000 kkal</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div class="h-full bg-emerald-500 rounded-full" style="width: 62%"></div>
                </div>
            </div>
            <div class="space-y-3">
                <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div class="flex items-center gap-3">
                        <div class="grid h-8 w-8 place-items-center rounded-xl bg-accent-orange/15 text-accent-orange text-[10px]"><i class="fa-solid fa-bread-slice"></i></div>
                        <div class="flex-1">
                            <p class="text-[11px] font-bold text-ink">Nasi goreng</p>
                            <p class="text-[9px] text-ink-soft">450 kkal &#183; Sarapan</p>
                        </div>
                    </div>
                    <span class="text-[10px] font-bold text-ink-muted">450 kkal</span>
                </div>
                <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div class="flex items-center gap-3">
                        <div class="grid h-8 w-8 place-items-center rounded-xl bg-accent-blue/15 text-accent-blue text-[10px]"><i class="fa-solid fa-carrot"></i></div>
                        <div class="flex-1">
                            <p class="text-[11px] font-bold text-ink">Salad sayuran</p>
                            <p class="text-[9px] text-ink-soft">320 kkal &#183; Makan siang</p>
                        </div>
                    </div>
                    <span class="text-[10px] font-bold text-ink-muted">320 kkal</span>
                </div>
                <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div class="flex items-center gap-3">
                        <div class="grid h-8 w-8 place-items-center rounded-xl bg-accent-purple/15 text-accent-purple text-[10px]"><i class="fa-solid fa-apple-whole"></i></div>
                        <div class="flex-1">
                            <p class="text-[11px] font-bold text-ink">Buah campuran</p>
                            <p class="text-[9px] text-ink-soft">180 kkal &#183; Sore hari</p>
                        </div>
                    </div>
                    <span class="text-[10px] font-bold text-ink-muted">180 kkal</span>
                </div>
            </div>
            <div class="mt-6 text-center">
                <button class="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-[10px] font-bold text-brand-600 hover:bg-brand-100 transition">
                    <i class="fa-solid fa-camera text-[10px]"></i>
                    Scan Makanan
                </button>
            </div>
        </div>
    `,
    memento: `
        <div class="relative z-10 flex items-center justify-between px-5 pt-3 text-[10px] font-semibold text-ink-soft">
            <span>09:41</span>
            <span class="flex items-center gap-1">
                <i class="fa-solid fa-signal text-[9px]"></i>
                <i class="fa-solid fa-wifi text-[9px]"></i>
                <i class="fa-solid fa-battery-three-quarters text-[11px]"></i>
            </span>
        </div>
        <div class="px-4 pb-24 pt-4">
            <div class="flex items-center gap-3 mb-6">
                <div class="grid h-9 w-9 place-items-center rounded-2xl bg-accent-purple text-white"><i class="fa-solid fa-map-location-dot text-[14px]"></i></div>
                <div class="leading-tight">
                    <p class="text-[13px] font-extrabold text-ink">Memento Journaling</p>
                    <p class="text-[10px] text-brand-600">12 momen tersimpan</p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-6">
                <div class="aspect-[3/4] rounded-2xl border border-slate-100 bg-slate-100 relative overflow-hidden">
                    <div class="absolute inset-0 flex items-center justify-center">
                        <i class="fa-solid fa-camera-retro text-[20px] text-slate-400"></i>
                        <span class="absolute bottom-2 right-2 bg-black/60 text-white text-[8px] px-2 py-0.5 rounded">Jkt</span>
                    </div>
                </div>
                <div class="aspect-[3/4] rounded-2xl border border-slate-100 bg-slate-100 relative overflow-hidden">
                    <div class="absolute inset-0 flex items-center justify-center">
                        <i class="fa-solid fa-camera-retro text-[20px] text-slate-400"></i>
                        <span class="absolute bottom-2 right-2 bg-black/60 text-white text-[8px] px-2 py-0.5 rounded">Bali</span>
                    </div>
                </div>
                <div class="aspect-[3/4] rounded-2xl border border-slate-100 bg-slate-100 relative overflow-hidden">
                    <div class="absolute inset-0 flex items-center justify-center">
                        <i class="fa-solid fa-camera-retro text-[20px] text-slate-400"></i>
                        <span class="absolute bottom-2 right-2 bg-black/60 text-white text-[8px] px-2 py-0.5 rounded">Jogja</span>
                    </div>
                </div>
                <div class="aspect-[3/4] rounded-2xl border border-slate-100 bg-slate-100 relative overflow-hidden">
                    <div class="absolute inset-0 flex items-center justify-center">
                        <i class="fa-solid fa-camera-retro text-[20px] text-slate-400"></i>
                        <span class="absolute bottom-2 right-2 bg-black/60 text-white text-[8px] px-2 py-0.5 rounded">Bdg</span>
                    </div>
                </div>
            </div>
            <div class="p-4 rounded-2xl border border-accent-purple/20 bg-accent-purple/5">
                <p class="text-[11px] font-bold text-ink">Terbaru</p>
                <p class="text-[10px] text-ink-soft mt-1">Menikmati sunset di pantai &#183; 2 hari lalu</p>
            </div>
        </div>
    `,

    notes: `
        <div class="relative z-10 flex items-center justify-between px-5 pt-3 text-[10px] font-semibold text-ink-soft">
            <span>09:41</span>
            <span class="flex items-center gap-1">
                <i class="fa-solid fa-signal text-[9px]"></i>
                <i class="fa-solid fa-wifi text-[9px]"></i>
                <i class="fa-solid fa-battery-three-quarters text-[11px]"></i>
            </span>
        </div>
        <div class="px-4 pb-24 pt-4">
            <div class="flex items-center gap-3 mb-6">
                <div class="grid h-9 w-9 place-items-center rounded-2xl bg-blue-600 text-white"><i class="fa-solid fa-note-sticky text-[14px]"></i></div>
                <div class="leading-tight">
                    <p class="text-[13px] font-extrabold text-ink">Notes &amp; Catatan</p>
                    <p class="text-[10px] text-brand-600">7 catatan aktif</p>
                </div>
            </div>
            <div class="grid md:grid-cols-2 gap-3">
                <div class="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-bold text-slate-500">Ide</span>
                        <span class="text-[10px] text-slate-400">2 hari lalu</span>
                    </div>
                    <p class="text-[11px] font-bold text-ink">Rencana liburan akhir tahun</p>
                </div>
                <div class="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-bold text-slate-500">Penting</span>
                        <span class="text-[10px] text-slate-400">Kemarin</span>
                    </div>
                    <p class="text-[11px] font-bold text-ink">Belanja bulanan &amp; tagihan</p>
                </div>
                <div class="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-bold text-slate-500">Ide</span>
                        <span class="text-[10px] text-slate-400">3 hari lalu</span>
                    </div>
                    <p class="text-[11px] font-bold text-ink">Daftar buku yang ingin dibaca</p>
                </div>
                <div class="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-bold text-slate-500">Penting</span>
                        <span class="text-[10px] text-slate-400">1 minggu lalu</span>
                    </div>
                    <p class="text-[11px] font-bold text-ink">Resep masakan favorit</p>
                </div>
            </div>
        </div>
    `,
};

function initPhoneInteractions() {
    const phoneScreen = document.getElementById('phone-screen');
    const phoneFrame = document.getElementById('phone-frame');
    const phoneTilt = document.getElementById('phone-tilt');
    const cards = document.querySelectorAll('.feature-card');
    if (!phoneScreen || !cards.length) return;

    function showScreen(key, animate = true) {
        if (!PHONE_SCREENS[key]) return;
        if (animate) {
            phoneScreen.style.opacity = '0';
            setTimeout(() => {
                phoneScreen.innerHTML = PHONE_SCREENS[key];
                phoneScreen.style.opacity = '1';
            }, 300);
        } else {
            phoneScreen.innerHTML = PHONE_SCREENS[key];
        }
        cards.forEach((c) => c.classList.remove('is-active'));
        const active = document.querySelector(`.feature-card[data-feature="${key}"]`);
        if (active) active.classList.add('is-active');
    }

    // Tampilkan layar default (home) saat pertama kali dimuat
    showScreen('home', false);

    cards.forEach((card) => {
        card.addEventListener('click', () => {
            const key = card.getAttribute('data-feature');
            showScreen(key, true);
            // Geser layar ke section hero agar ponsel terlihat jelas
            const target = document.getElementById('top') || document.getElementById('section-hero');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    });

    // Efek tilt 3D pada ponsel saat kursor bergerak di atas frame
    if (phoneTilt && phoneFrame) {
        phoneTilt.addEventListener('mousemove', (e) => {
            const rect = phoneTilt.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -7;
            const rotateY = ((x - centerX) / centerX) * 7;
            phoneFrame.classList.add('phone-tilting');
            phoneFrame.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.025)`;
        });
        phoneTilt.addEventListener('mouseleave', () => {
            phoneFrame.style.transform = '';
            phoneFrame.classList.remove('phone-tilting');
        });
    }
}

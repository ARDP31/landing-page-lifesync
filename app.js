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


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
 * URL toko resmi khusus Android (Google Play).
 */
const ANDROID_STORE_URL = '';

/**
 * URL toko resmi khusus iOS (App Store).
 */
const IOS_STORE_URL = '';

/**
 * Dipakai untuk menandai elemen CTA unduhan.
 * app.js akan mengganti href-nya otomatis bila STORE_URL terisi.
 */
const DOWNLOAD_SELECTOR = '[data-download]';

/**
 * Selector untuk tombol unduh Android dan iOS terpisah.
 */
const DOWNLOAD_ANDROID_SELECTOR = '[data-download-android]';
const DOWNLOAD_IOS_SELECTOR = '[data-download-ios]';

/**
 * Endpoint Formspree untuk formulir kontak.
 * Ganti YOUR_FORM_ID dengan Form ID dari dashboard Formspree:
 * https://formspree.io -> buat form baru -> salin endpoint-nya.
 */
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/YOUR_FORM_ID_HERE';

const SECTIONS = [
    { id: 'section-header',  file: 'sections/header.html' },
    { id: 'section-hero',    file: 'sections/hero.html' },
    { id: 'section-fitur',   file: 'sections/fitur.html' },
    { id: 'section-offline', file: 'sections/offline.html' },
    { id: 'section-ai',      file: 'sections/ai.html' },
    { id: 'section-pricing', file: 'sections/pricing.html' },
    { id: 'section-kontak',  file: 'sections/kontak.html' },
    { id: 'section-footer',  file: 'sections/footer.html' },
];

/* ==========================================================
   1. Loader Section
   ========================================================== */
async function loadSection({ id, file }) {
    try {
        // Cache-buster query param agar browser tidak menyajikan cache lama yang rusak
        const response = await fetch(file + '?v=' + Date.now());
        if (!response.ok) {
            console.error('Gagal memuat ' + file + ' (HTTP ' + response.status + ')');
            const container = document.getElementById(id);
            if (container) {
                container.innerHTML = '<div class="max-w-xl mx-auto my-12 p-6 bg-red-50 border border-red-200 rounded-2xl text-center text-red-700 text-sm font-medium">Gagal memuat section ' + file + ' (Status: ' + response.status + '). Pastikan file tersedia.</div>';
            }
            return false;
        }
        const html = await response.text();
        const container = document.getElementById(id);
        if (!container) {
            console.error('Container #' + id + ' tidak ditemukan');
            return false;
        }
        container.innerHTML = html;
        return true;
    } catch (error) {
        console.error('Error loading ' + file + ':', error);
        const container = document.getElementById(id);
        if (container) {
            container.innerHTML = '<div class="max-w-xl mx-auto my-12 p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center text-amber-800 text-sm font-medium"><p class="font-bold mb-1">Gagal memuat ' + file + '</p><p class="text-xs text-amber-700">Pastikan website dijalankan melalui local web server (seperti VS Code Live Server di port 5500/5501) dan bukan dibuka langsung via double-click file://.</p></div>';
        }
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    // 1) Muat semua section secara paralel
    const results = await Promise.all(SECTIONS.map(loadSection));

    const failed = SECTIONS.filter(function (_, i) { return !results[i]; });
    if (failed.length) {
        console.warn('Section gagal dimuat:', failed.map(function (s) { return s.file; }).join(', '));
    }

    // 2) Inisialisasi setiap interaksi dengan defensive programming (try-catch mandiri)
    var modules = [
        { name: 'Navbar', fn: initNavbar },
        { name: 'Reveal Animations', fn: initReveal },
        { name: 'Feature Cards', fn: initFeatureCards },
        { name: 'Showcase Navigation', fn: initShowcaseNavigation },
        { name: 'Download Links', fn: initDownloadLinks },
        { name: 'Kontak Form', fn: initKontakForm },
        { name: 'Smooth Scroll', fn: initSmoothScroll }
    ];

    modules.forEach(function (mod) {
        try {
            mod.fn();
        } catch (err) {
            console.error('Gagal menginisialisasi modul ' + mod.name + ':', err);
        }
    });

    // 3) Jika URL memiliki hash (#kontak, #pricing, dll.), scroll ulang dengan offset navbar setelah section ter-render
    if (window.location.hash) {
        setTimeout(function () {
            try {
                var target = document.querySelector(window.location.hash);
                if (target) {
                    var navbar = document.getElementById('navbar');
                    var offset = navbar ? navbar.offsetHeight : 80;
                    var top = target.getBoundingClientRect().top + window.scrollY - offset - 10;
                    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
                }
            } catch (e) {
                // Ignore invalid selector
            }
        }, 150);
    }
});

/* ==========================================================
   2. Navbar: mobile menu, sticky state, scroll spy
   ========================================================== */
function initNavbar() {
    var navbar  = document.getElementById('navbar');
    var bar     = document.getElementById('navbar-bar');
    var toggle  = document.getElementById('nav-toggle');
    var icon    = document.getElementById('nav-toggle-icon');
    var menu    = document.getElementById('nav-mobile-menu');

    if (!navbar || !toggle || !menu) return;

    /* --- 2a. Buka / tutup menu mobile --- */
    function setMenu(open) {
        menu.classList.toggle('hidden', !open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Tutup menu navigasi' : 'Buka menu navigasi');
        if (icon) {
            icon.classList.toggle('fa-bars', !open);
            icon.classList.toggle('fa-xmark', open);
        }
    }

    toggle.addEventListener('click', function () {
        setMenu(menu.classList.contains('hidden'));
    });

    // Tutup menu ketika salah satu tautan diklik
    menu.querySelectorAll('a[href^="#"]').forEach(function (link) {
        link.addEventListener('click', function () { setMenu(false); });
    });

    // Tutup menu ketika klik di luar navbar
    document.addEventListener('click', function (e) {
        if (!navbar.contains(e.target)) setMenu(false);
    });

    /* --- 2b. Sticky navbar + background scroll --- */
    var lastScroll = 0;

    function onScroll() {
        var y = window.scrollY;
        var scrolled = y > 10;

        if (scrolled) {
            navbar.classList.add('bg-white/95', 'backdrop-blur-xl', 'shadow-sm');
            navbar.classList.remove('bg-transparent');
            if (bar) {
                bar.classList.add('border-slate-100');
                bar.classList.remove('border-transparent');
            }
        } else {
            navbar.classList.remove('bg-white/95', 'backdrop-blur-xl', 'shadow-sm');
            navbar.classList.add('bg-transparent');
            if (bar) {
                bar.classList.remove('border-slate-100');
                bar.classList.add('border-transparent');
            }
        }

        lastScroll = y;
        updateScrollSpy();
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // jalankan sekali saat mount

    /* --- 2c. Scroll spy --- */
    var navLinks = document.querySelectorAll('.nav-link');

    function updateScrollSpy() {
        var sections = document.querySelectorAll('section[id], header[id]');
        var scrollY = window.scrollY;
        var current = '';

        sections.forEach(function (sec) {
            var top = sec.offsetTop - 120;
            if (scrollY >= top) current = sec.id;
        });

        navLinks.forEach(function (link) {
            var href = link.getAttribute('href');
            var active = href === '#' + current;
            link.classList.toggle('text-brand-600', active);
            link.classList.toggle('font-bold', active);
        });
    }
}

/* ==========================================================
   3. Smooth Scroll
   ========================================================== */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            var hash = anchor.getAttribute('href');
            if (hash === '#') return;

            var target = document.querySelector(hash);
            if (!target) return;

            e.preventDefault();

            var navbar = document.getElementById('navbar');
            var offset = navbar ? navbar.offsetHeight : 72;

            var top = target.getBoundingClientRect().top + window.scrollY - offset - 8;
            window.scrollTo({ top: top, behavior: 'smooth' });
        });
    });
}

/* ==========================================================
   4. Download Links
   ========================================================== */
function initDownloadLinks() {
    var links = document.querySelectorAll(DOWNLOAD_SELECTOR);
    links.forEach(function (link) {
        if (STORE_URL) {
            link.setAttribute('href', STORE_URL);
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        } else {
            link.setAttribute('href', '#pricing');
        }
    });

    document.querySelectorAll(DOWNLOAD_ANDROID_SELECTOR).forEach(function (link) {
        if (ANDROID_STORE_URL) {
            link.setAttribute('href', ANDROID_STORE_URL);
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        } else {
            link.setAttribute('href', '#pricing');
        }
    });

    document.querySelectorAll(DOWNLOAD_IOS_SELECTOR).forEach(function (link) {
        if (IOS_STORE_URL) {
            link.setAttribute('href', IOS_STORE_URL);
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        } else {
            link.setAttribute('href', '#pricing');
        }
    });
}

/* ==========================================================
   5. Reveal on Scroll
   ========================================================== */
function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (items.length === 0) return;

    // Langsung buat elemen yang sudah berada di viewport atau saat dimuat menjadi terlihat
    items.forEach(function (el) {
        el.classList.add('is-visible');
    });

    if (!('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05 });

    items.forEach(function (el) { observer.observe(el); });
}

/* ==========================================================
   6. Interaksi kartu fitur (klik -> buka halaman detail)
   ========================================================== */
var FEATURE_PAGE = {
    todo:     'pages/fitur-todo.html',
    calendar: 'pages/kalender.html',
    keuangan: 'pages/keuangan.html',
    nutrisi:  'pages/nutrisi.html',
    memento:  'pages/memento.html',
    notes:    'pages/fitur-notes.html',
};

function initFeatureCards() {
    var cards = document.querySelectorAll('.feature-card');
    if (!cards.length) return;

    cards.forEach(function (card) {
        card.addEventListener('click', function () {
            var key  = card.getAttribute('data-feature');
            var page = FEATURE_PAGE[key];
            if (page) window.location.href = page;
        });
    });
}

/* ==========================================================
   7. Showcase app navigation
   ========================================================== */
function initShowcaseNavigation() {
    var tabs = document.querySelectorAll('[data-showcase-tab]');
    var views = document.querySelectorAll('[data-showcase-view]');
    if (!tabs.length || !views.length) return;

    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            var selectedView = tab.getAttribute('data-showcase-tab');
            var viewExists = false;

            views.forEach(function (view) {
                var isSelected = view.getAttribute('data-showcase-view') === selectedView;
                view.classList.toggle('hidden', !isSelected);
                view.hidden = !isSelected;
                if (isSelected) viewExists = true;
            });

            if (!viewExists) {
                console.error('Showcase view "' + selectedView + '" tidak ditemukan');
                return;
            }

            tabs.forEach(function (item) {
                var isSelected = item === tab;
                item.classList.toggle('is-active', isSelected);
                item.setAttribute('aria-pressed', String(isSelected));
            });
        });
    });
}

/* ==========================================================
   8. Kontak Form: validasi & Formspree submit
   ========================================================== */
function initKontakForm() {
    var form = document.getElementById('kontak-form');
    if (!form) return;

    var successBox = document.getElementById('kontak-success');

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        var nama   = document.getElementById('nama').value.trim();
        var email  = document.getElementById('email').value.trim();
        var subjek = document.getElementById('subjek').value;
        var pesan  = document.getElementById('pesan').value.trim();

        var valid = true;

        // Reset semua pesan error
        ['nama', 'email', 'subjek', 'pesan'].forEach(function (id) {
            var el = document.getElementById('error-' + id);
            if (el) el.classList.add('hidden');
        });

        if (!nama) {
            var el = document.getElementById('error-nama');
            if (el) el.classList.remove('hidden');
            valid = false;
        }

        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            var el = document.getElementById('error-email');
            if (el) el.classList.remove('hidden');
            valid = false;
        }

        if (!subjek) {
            var el = document.getElementById('error-subjek');
            if (el) el.classList.remove('hidden');
            valid = false;
        }

        if (!pesan) {
            var el = document.getElementById('error-pesan');
            if (el) el.classList.remove('hidden');
            valid = false;
        }

        if (!valid) return;

        // State: loading
        var btn     = document.getElementById('btn-kirim');
        var btnText = document.getElementById('btn-text');
        var btnIcon = document.getElementById('btn-icon');

        if (btn) btn.disabled = true;
        if (btnText) btnText.textContent = 'Mengirim...';
        if (btnIcon) btnIcon.className = 'fa-solid fa-circle-notch fa-spin';

        var formData = new FormData(form);

        fetch(FORMSPREE_ENDPOINT, {
            method: 'POST',
            body: formData,
            headers: { Accept: 'application/json' }
        })
        .then(function (response) {
            if (response.ok) {
                form.reset();
                // Sembunyikan form, tampilkan pesan sukses
                var wrapper = document.getElementById('kontak-form-wrapper');
                if (wrapper) wrapper.classList.add('hidden');
                if (successBox) successBox.classList.remove('hidden');
            } else {
                throw new Error('Gagal mengirim pesan');
            }
        })
        .catch(function () {
            alert('Gagal mengirim pesan. Coba lagi nanti atau hubungi kami melalui email langsung:\npbl507.bisnis@gmail.com');
        })
        .finally(function () {
            if (btn) btn.disabled = false;
            if (btnText) btnText.textContent = 'Kirim Pesan';
            if (btnIcon) btnIcon.className = 'fa-solid fa-paper-plane';
        });
    });
}

/* Fungsi reset form kontak (dipanggil dari tombol "Kirim Pesan Lagi") */
window.resetKontakForm = function resetKontakForm() {
    var form       = document.getElementById('kontak-form');
    var wrapper    = document.getElementById('kontak-form-wrapper');
    var successBox = document.getElementById('kontak-success');

    if (form) form.reset();
    if (wrapper) wrapper.classList.remove('hidden');
    if (successBox) successBox.classList.add('hidden');

    ['nama', 'email', 'subjek', 'pesan'].forEach(function (id) {
        var el = document.getElementById('error-' + id);
        if (el) el.classList.add('hidden');
    });
};

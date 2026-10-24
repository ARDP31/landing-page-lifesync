/**
 * Smoke test browser (Chrome headless) tanpa dependensi eksternal.
 * Menggunakan Chrome DevTools Protocol (CDP) lewat WebSocket bawaan Node 18+.
 *
 * Menguji: injeksi section, error console, 404, scroll spy, smooth scroll,
 * drawer mobile (toggle / Escape / click-outside), overflow horizontal,
 * screenshot multi-viewport, dan halaman modul.
 *
 * Jalankan: node tools/browser-test.js
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');

const ROOT = path.resolve(__dirname, '..');
const SHOT_DIR = path.join(ROOT, 'tools', 'screenshots');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL_BASE = process.env.SITE_URL || 'http://127.0.0.1:8765';
const PAGE = URL_BASE + '/index.html';

const results = [];
function log(...args) {
    const line = args.join(' ');
    results.push(line);
    console.log(line);
}

function check(name, ok, detail) {
    log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' -> ' + detail : ''}`);
    if (!ok) process.exitCode = 1;
    return ok;
}

function getFreePort() {
    return new Promise((resolve, reject) => {
        const srv = net.createServer();
        srv.listen(0, '127.0.0.1', () => {
            const p = srv.address().port;
            srv.close(() => resolve(p));
        });
        srv.on('error', reject);
    });
}

function httpGetJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- CDP client ---------------- */
class CDP {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.id = 0;
        this.pending = new Map();
        this.events = [];
    }
    connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.addEventListener('open', () => resolve());
            this.ws.addEventListener('error', (e) => reject(new Error('ws error')));
            this.ws.addEventListener('message', (ev) => {
                let msg;
                try { msg = JSON.parse(ev.data); } catch (e) { return; }
                if (msg.id && this.pending.has(msg.id)) {
                    const { resolve: res, reject: rej } = this.pending.get(msg.id);
                    this.pending.delete(msg.id);
                    if (msg.error) rej(new Error(JSON.stringify(msg.error)));
                    else res(msg.result);
                } else if (msg.method) {
                    this.events.push(msg);
                }
            });
        });
    }
    send(method, params = {}) {
        const id = ++this.id;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
            setTimeout(() => {
                if (this.pending.has(id)) {
                    this.pending.delete(id);
                    reject(new Error('timeout: ' + method));
                }
            }, 30000);
        });
    }
    close() { try { this.ws.close(); } catch (e) {} }
}

/* ---------------- Main ---------------- */
(async () => {
    if (!fs.existsSync(CHROME)) {
        log('SKIP  Chrome tidak ditemukan di ' + CHROME);
        process.exit(0);
    }
    if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });

    const port = await getFreePort();
    const userDir = path.join(ROOT, 'tools', '.chrome-profile');
    const chrome = spawn(CHROME, [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--no-first-run',
        '--disable-extensions',
        '--hide-scrollbars',
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${userDir}`,
        'about:blank',
    ], { stdio: 'ignore' });

    let cdp = null;
    try {
        let version = null;
        for (let i = 0; i < 40; i++) {
            try { version = await httpGetJson(`http://127.0.0.1:${port}/json/version`); break; }
            catch (e) { await sleep(250); }
        }
        if (!version) throw new Error('DevTools tidak merespons');

        const targets = await httpGetJson(`http://127.0.0.1:${port}/json/list`);
        const page = targets.find((t) => t.type === 'page');
        cdp = new CDP(page.webSocketDebuggerUrl);
        await cdp.connect();

        await cdp.send('Page.enable');
        await cdp.send('Runtime.enable');
        await cdp.send('Log.enable');
        await cdp.send('Network.enable');
        await cdp.send('Emulation.setDeviceMetricsOverride', {
            width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
        });

        /* ---------- Navigasi ---------- */
        await cdp.send('Page.navigate', { url: PAGE });
        await sleep(4500);

        const consoleErrors = cdp.events
            .filter((e) => e.method === 'Runtime.exceptionThrown')
            .map((e) => (e.params.exceptionDetails.exception || {}).description
                || e.params.exceptionDetails.text);
        const logErrors = cdp.events
            .filter((e) => e.method === 'Log.entryAdded' && e.params.entry.level === 'error')
            .map((e) => e.params.entry.text + ' @ ' + (e.params.entry.url || ''));
        const failedRequests = cdp.events
            .filter((e) => e.method === 'Network.loadingFailed')
            .map((e) => e.params.errorText + ' ' + (e.params.type || ''));

        log('--- Console/Network ---');
        log('console errors: ' + (consoleErrors.length ? consoleErrors.join(' | ') : 'none'));
        log('log errors: ' + (logErrors.length ? logErrors.join(' | ') : 'none'));
        log('failed requests: ' + (failedRequests.length ? failedRequests.join(' | ') : 'none'));

        check('Tidak ada exception JS', consoleErrors.length === 0, consoleErrors.join(' | '));
        check('Tidak ada request gagal', failedRequests.length === 0, failedRequests.join(' | '));
        check('Tidak ada console error', logErrors.length === 0, logErrors.join(' | '));

        const evalJs = async (expr) => {
            const r = await cdp.send('Runtime.evaluate', {
                expression: expr, returnByValue: true, awaitPromise: true,
            });
            if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
            return r.result.value;
        };



        /* ---------- Struktur DOM ---------- */
        const structure = await evalJs(`(() => {
            const ids = ['top','pillars','fitur','offline','ai','pricing'];
            const missing = ids.filter(id => !document.getElementById(id));
            const pillars = document.getElementById('pillars');
            return {
                title: document.title,
                missing,
                sectionCount: document.querySelectorAll('section[id]').length,
                navLinks: document.querySelectorAll('.nav-link').length,
                mobileLinks: document.querySelectorAll('.mobile-link').length,
                revealTotal: document.querySelectorAll('.reveal').length,
                revealVisible: document.querySelectorAll('.reveal.is-visible').length,
                pillarsChildren: pillars ? pillars.querySelectorAll(':scope > div > div').length : 0,
                heroH1: (document.querySelector('h1') || {}).textContent
                    ? document.querySelector('h1').textContent.replace(/\\s+/g,' ').trim() : null,
                docHeight: document.documentElement.scrollHeight,
                scrollWidth: document.documentElement.scrollWidth,
                innerWidth: window.innerWidth,
                downloadLinks: document.querySelectorAll('[data-download]').length,
            };
        })()`);

        log('--- Struktur DOM ---');
        log(JSON.stringify(structure, null, 2));

        check('Semua ID section ada', structure.missing.length === 0, structure.missing.join(','));
        check('Section ter-render', structure.sectionCount === 5, 'jumlah=' + structure.sectionCount);
        check('Nav link desktop ada', structure.navLinks === 5, 'jumlah=' + structure.navLinks);
        check('Nav link mobile ada', structure.mobileLinks === 5, 'jumlah=' + structure.mobileLinks);
        check('Elemen .reveal terdaftar', structure.revealTotal > 0, 'jumlah=' + structure.revealTotal);
        check('Reveal aktif di viewport awal', structure.revealVisible > 0,
            'visible=' + structure.revealVisible + '/' + structure.revealTotal);
        check('4 pilar ter-render', structure.pillarsChildren === 4, 'jumlah=' + structure.pillarsChildren);
        check('H1 ter-render', !!structure.heroH1, structure.heroH1);
        check('CTA download ditandai', structure.downloadLinks >= 2, 'jumlah=' + structure.downloadLinks);
        check('Tidak ada overflow horizontal (desktop)',
            structure.scrollWidth <= structure.innerWidth + 2,
            `scrollWidth=${structure.scrollWidth} innerWidth=${structure.innerWidth}`);


        /* ---------- Smooth scroll + scroll spy ---------- */
        await evalJs(`document.querySelector('.nav-link[href="#pricing"]').click()`);
        await sleep(1800);
        const afterScroll = await evalJs(`(() => {
            const pricing = document.getElementById('pricing');
            const navbar = document.getElementById('navbar');
            const r = pricing.getBoundingClientRect();
            const active = document.querySelector('.nav-link.is-active');
            return {
                pricingTop: Math.round(r.top),
                navbarH: navbar ? navbar.offsetHeight : 0,
                activeLink: active ? active.textContent.trim() : null,
                isScrolled: navbar.classList.contains('is-scrolled'),
                hash: location.hash,
            };
        })()`);
        log('--- Setelah klik nav #pricing ---');
        log(JSON.stringify(afterScroll, null, 2));

        check('Scroll menuju section pricing',
            Math.abs(afterScroll.pricingTop - afterScroll.navbarH) < 90,
            `top=${afterScroll.pricingTop} navbar=${afterScroll.navbarH}`);
        check('Scroll spy menandai link aktif', afterScroll.activeLink === 'Harga',
            'active=' + afterScroll.activeLink);
        check('Navbar state is-scrolled', afterScroll.isScrolled === true);
        check('Hash URL diperbarui', afterScroll.hash === '#pricing', 'hash=' + afterScroll.hash);

        /* ---------- Drawer mobile ---------- */
        await cdp.send('Emulation.setDeviceMetricsOverride', {
            width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
        });
        await sleep(900);

        const drawer = await evalJs(`(() => {
            const menu = document.getElementById('nav-mobile-menu');
            const toggle = document.getElementById('nav-toggle');
            const hiddenBefore = menu.classList.contains('hidden');
            toggle.click();
            const hiddenAfter = menu.classList.contains('hidden');
            return {
                hiddenBefore,
                hiddenAfterClick: hiddenAfter,
                ariaExpanded: toggle.getAttribute('aria-expanded'),
                display: getComputedStyle(menu).display,
                menuWidth: Math.round(menu.getBoundingClientRect().width),
            };
        })()`);
        log('--- Drawer mobile ---');
        log(JSON.stringify(drawer, null, 2));
        check('Drawer tertutup saat awal', drawer.hiddenBefore === true);
        check('Drawer terbuka saat toggle diklik', drawer.hiddenAfterClick === false);
        check('aria-expanded = true', drawer.ariaExpanded === 'true');
        check('Drawer terlihat (display bukan none)', drawer.display !== 'none', 'display=' + drawer.display);

        /* ---------- Escape menutup drawer ---------- */
        const esc = await evalJs(`(() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            const menu = document.getElementById('nav-mobile-menu');
            return {
                hidden: menu.classList.contains('hidden'),
                focusOnToggle: document.activeElement === document.getElementById('nav-toggle'),
            };
        })()`);
        check('Escape menutup drawer', esc.hidden === true);
        check('Fokus kembali ke tombol toggle', esc.focusOnToggle === true);

        /* ---------- Click outside menutup drawer ---------- */
        const outside = await evalJs(`(() => {
            const toggle = document.getElementById('nav-toggle');
            const menu = document.getElementById('nav-mobile-menu');
            toggle.click();
            const opened = !menu.classList.contains('hidden');
            const hero = document.getElementById('top') || document.body;
            hero.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            return { opened, closedAfterOutside: menu.classList.contains('hidden') };
        })()`);
        check('Drawer dapat dibuka kembali', outside.opened === true);
        check('Click di luar menutup drawer', outside.closedAfterOutside === true);

        /* ---------- Overflow horizontal (mobile) ---------- */
        const mobOverflow = await evalJs(`(() => {
            const wide = [];
            document.querySelectorAll('body *').forEach(el => {
                const r = el.getBoundingClientRect();
                const cs = getComputedStyle(el);
                if (r.width > window.innerWidth + 2 && r.height > 0
                    && cs.position !== 'absolute' && cs.overflowX !== 'auto'
                    && cs.overflowX !== 'scroll' && cs.overflowX !== 'hidden') {
                    wide.push(el.tagName + '.' + String(el.className).slice(0, 50));
                }
            });
            return {
                scrollWidth: document.documentElement.scrollWidth,
                innerWidth: window.innerWidth,
                offenders: wide.slice(0, 8),
            };
        })()`);
        log('--- Overflow mobile ---');
        log(JSON.stringify(mobOverflow, null, 2));
        check('Tidak ada overflow horizontal (mobile)',
            mobOverflow.scrollWidth <= mobOverflow.innerWidth + 2,
            `scrollWidth=${mobOverflow.scrollWidth} innerWidth=${mobOverflow.innerWidth} offenders=${mobOverflow.offenders.join(' | ')}`);

        /* ---------- Screenshot multi viewport ---------- */
        const viewports = [
            { name: 'mobile-390', width: 390, height: 844, mobile: true },
            { name: 'tablet-768', width: 768, height: 1024, mobile: true },
            { name: 'desktop-1440', width: 1440, height: 900, mobile: false },
        ];
        for (const vp of viewports) {
            await cdp.send('Emulation.setDeviceMetricsOverride', {
                width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile,
            });
            await evalJs('window.scrollTo(0,0)');
            await sleep(1400);
            const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
            const file = path.join(SHOT_DIR, `${vp.name}.png`);
            fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
            log('screenshot -> ' + file);
        }

        /* ---------- Halaman modul ---------- */
        for (const p of ['nutrisi', 'keuangan', 'kalender', 'memento']) {
            await cdp.send('Page.navigate', { url: `${URL_BASE}/pages/${p}.html` });
            await sleep(1600);
            const info = await evalJs(`(() => ({
                title: document.title,
                textLen: document.body.innerText.trim().length,
                backLink: !!document.querySelector('a[href="../index.html"]'),
                overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
            }))()`);
            check(`Halaman ${p} ter-render`,
                info.textLen > 50 && info.backLink && !info.overflow,
                JSON.stringify(info));
        }

    } catch (err) {
        log('ERROR: ' + err.message + '\n' + (err.stack || ''));
        process.exitCode = 1;
    } finally {
        if (cdp) cdp.close();
        chrome.kill();
    }

    fs.writeFileSync(path.join(ROOT, 'tools', 'browser-test-result.txt'), results.join('\n'), 'utf8');
    log('\n=== BROWSER TEST SELESAI ===');
})();

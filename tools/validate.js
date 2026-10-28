/**
 * Validator HTML tag-balance + asset/link checker
 * Jalankan: node tools/validate.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr']);

const FILES = [
    'index.html',
    'sections/header.html',
    'sections/hero.html',
    'sections/fitur.html',
    'sections/offline.html',
    'sections/ai.html',
    'sections/pricing.html',
    'sections/kontak.html',
    'sections/footer.html',
    'pages/nutrisi.html',
    'pages/keuangan.html',
    'pages/kalender.html',
    'pages/memento.html',
    'pages/fitur-todo.html',
    'pages/fitur-notes.html',
];

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;

let failures = 0;

/* ---------- 1. Tag balance ---------- */
console.log('=== 1. Validasi tag HTML ===');
for (const rel of FILES) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) {
        console.log(`MISS ${rel}`);
        failures++;
        continue;
    }
    const html = fs.readFileSync(full, 'utf8');
    const stack = [];
    let err = null;
    let m;
    TAG_RE.lastIndex = 0;
    while ((m = TAG_RE.exec(html))) {
        const closing = m[1] === '/';
        const tag = m[2].toLowerCase();
        const selfClose = m[4] === '/';
        if (VOID.has(tag) || selfClose) continue;
        if (!closing) {
            stack.push({ tag, i: m.index });
        } else {
            if (!stack.length) {
                err = `extra </${tag}> di offset ${m.index}`;
                break;
            }
            const top = stack.pop();
            if (top.tag !== tag) {
                err = `mismatch: <${top.tag}> dibuka @${top.i}, ditutup </${tag}> @${m.index}`;
                break;
            }
        }
    }
    if (!err && stack.length) {
        err = 'tidak ditutup: ' + stack.map((s) => `<${s.tag}>@${s.i}`).join(', ');
    }
    if (err) {
        failures++;
        console.log(`FAIL ${rel} -> ${err}`);
    } else {
        console.log(`OK   ${rel}`);
    }
}

/* ---------- 2. Link & asset internal ----------
   Catatan: file di sections/ di-inject ke index.html, sehingga path
   relatifnya di-resolve relatif terhadap root situs, bukan folder
   file-nya sendiri. Page di pages/ bersifat mandiri.                  */
console.log('\n=== 2. Validasi href/src internal ===');
for (const rel of FILES) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const html = fs.readFileSync(full, 'utf8');
    // Section partial -> relatif terhadap root; page -> relatif terhadap dirname
    const baseDir = rel.startsWith('sections/') ? ROOT : path.dirname(full);
    const re = /(?:href|src)="([^"#][^"]*?)"/g;
    let m;
    while ((m = re.exec(html))) {
        let target = m[1].trim();
        if (!target || /^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(target)) continue;
        target = target.split('?')[0].split('#')[0];
        if (!target) continue;
        const resolved = path.resolve(baseDir, target);
        if (!fs.existsSync(resolved)) {
            failures++;
            console.log(`FAIL ${rel} -> ${m[1]} (file tidak ada)`);
        } else {
            console.log(`OK   ${rel} -> ${m[1]}`);
        }
    }
}

/* ---------- 3. Anchor target harus ada ---------- */
console.log('\n=== 3. Validasi anchor (#id) ===');
const allIds = new Set();
for (const rel of FILES) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const html = fs.readFileSync(full, 'utf8');
    for (const mm of html.matchAll(/id="([^"]+)"/g)) allIds.add(mm[1]);
}
for (const rel of FILES) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const html = fs.readFileSync(full, 'utf8');
    for (const mm of html.matchAll(/href="#([^"]+)"/g)) {
        if (!allIds.has(mm[1])) {
            failures++;
            console.log(`FAIL ${rel} -> #${mm[1]} (id tidak ditemukan)`);
        } else {
            console.log(`OK   ${rel} -> #${mm[1]}`);
        }
    }
}

console.log(`\n=== HASIL: ${failures === 0 ? 'SEMUA LULUS' : failures + ' MASALAH'} ===`);
process.exit(failures === 0 ? 0 : 1);

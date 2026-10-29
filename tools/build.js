/**
 * Skrip build untuk menyiapkan aset publik ke folder dist/
 * Jalankan: npm run build atau node tools/build.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// Bersihkan folder dist jika sudah ada sebelumnya
if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true, force: true });
}
fs.mkdirSync(DIST, { recursive: true });

// Daftar file dan folder yang menjadi bagian dari website publik
const ITEMS = [
    'index.html',
    'app.js',
    'style.css',
    'tailwind-config.js',
    '.nojekyll',
    'sections',
    'pages',
    'assets',
    'roots',
];

for (const item of ITEMS) {
    const src = path.join(ROOT, item);
    const dest = path.join(DIST, item);
    if (fs.existsSync(src)) {
        fs.cpSync(src, dest, { recursive: true });
        console.log(`Copied ${item} -> dist/${item}`);
    }
}

console.log('Build complete! Output siap di folder dist/');

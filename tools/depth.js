/**
 * Melacak kedalaman tag per baris untuk mencari div yang tidak seimbang.
 * Jalankan: node tools/depth.js <file>
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const target = process.argv[2] || 'sections/hero.html';
const full = path.resolve(ROOT, target);
const html = fs.readFileSync(full, 'utf8');

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr']);
const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;

let depth = 0;
let line = 1;
let m;
const stack = [];

function lineOf(idx) {
    return html.slice(0, idx).split('\n').length;
}

TAG_RE.lastIndex = 0;
while ((m = TAG_RE.exec(html))) {
    const tag = m[2].toLowerCase();
    const closing = m[1] === '/';
    const selfClose = m[4] === '/';
    if (VOID.has(tag) || selfClose) continue;
    if (!closing) {
        stack.push({ tag, line: lineOf(m.index) });
        depth++;
    } else {
        const top = stack.pop();
        depth--;
        if (!top) {
            console.log(`Line ${lineOf(m.index)}: </${tag}> tanpa pembuka`);
        } else if (top.tag !== tag) {
            console.log(`Line ${lineOf(m.index)}: </${tag}> tapi yang dibuka <${top.tag}> (line ${top.line})`);
        }
    }
    line = lineOf(m.index);
}

console.log(`\nSisa tag tidak ditutup (depth ${stack.length}):`);
for (const s of stack) {
    console.log(`  <${s.tag}> dibuka di line ${s.line}`);
}

/* ---------- Trace kedalaman per baris (untuk div) ---------- */
console.log('\n=== Trace kedalaman (hanya baris dengan perubahan) ===');
const lines = html.split('\n');
TAG_RE.lastIndex = 0;
let d = 0;
const perLine = new Array(lines.length + 1).fill(0);
const events = [];
while ((m = TAG_RE.exec(html))) {
    const tag = m[2].toLowerCase();
    const closing = m[1] === '/';
    const selfClose = m[4] === '/';
    if (VOID.has(tag) || selfClose) continue;
    const ln = lineOf(m.index);
    if (closing) {
        d--;
        events.push({ ln, txt: `close </${tag}> -> depth ${d}` });
    } else {
        d++;
        events.push({ ln, txt: `open  <${tag}> -> depth ${d}` });
    }
}
for (const e of events) {
    console.log(`L${String(e.ln).padStart(4)}  ${e.txt}`);
}

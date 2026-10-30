const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

let failed = 0;
let checks = 0;
function check(label, condition) {
    checks++;
    if (condition) console.log(`PASS: ${label}`);
    else { failed++; console.error(`FAIL: ${label}`); }
}

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const bootstrap = fs.readFileSync(path.join(ROOT, 'src', 'bootstrap.js'), 'utf8');

check('PWA start_url remains GitHub Pages project root', manifest.start_url === '/etymancers-quest/');
check('PWA display remains standalone', manifest.display === 'standalone');

for (const icon of manifest.icons || []) {
    const clean = String(icon.src || '').replace(/^\.\//, '');
    check(`manifest icon exists: ${clean}`, clean && fs.existsSync(path.join(ROOT, clean)));
}

const directAssets = [
    ['favicon', /<link[^>]+rel="icon"[^>]+href="([^"]+)"/],
    ['apple touch icon', /<link[^>]+rel="apple-touch-icon"[^>]+href="([^"]+)"/],
    ['manifest', /<link[^>]+rel="manifest"[^>]+href="([^"]+)"/],
    ['stylesheet', /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/]
];
for (const [label, pattern] of directAssets) {
    const match = html.match(pattern);
    const target = match?.[1]?.split('?')[0];
    check(`${label} link resolves`, !!target && fs.existsSync(path.join(ROOT, target)));
}

for (const target of ['src/data/roots.js', 'src/data/roots-list-11.js', 'src/data/words.js', 'src/data/equipment.js', 'src/bootstrap.js']) {
    check(`index script exists: ${target}`, html.includes(`src="${target}"`) && fs.existsSync(path.join(ROOT, target)));
}

const scriptRefs = [...bootstrap.matchAll(/'((?:src\/)[^']+\.js)'/g)].map(match => match[1]);
check('extension bootstrap declares source paths', scriptRefs.length >= 10);
for (const script of scriptRefs) {
    check(`extension exists: ${script}`, fs.existsSync(path.join(ROOT, script)));
}

check('maskable icon is declared', (manifest.icons || []).some(icon => icon.purpose === 'maskable'));

console.log(`\nRESULT: ${checks - failed} checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

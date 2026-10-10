const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'equipment.js'), 'utf8');

let domReady = null;
const appended = [];
const document = {
    createElement(tag) {
        if (tag !== 'script') throw new Error(`Unexpected element: ${tag}`);
        return {src: '', onload: null};
    },
    body: {
        appendChild(node) {
            appended.push(node);
        }
    }
};
const window = {
    addEventListener(name, callback) {
        if (name === 'DOMContentLoaded') domReady = callback;
    }
};

new Function('window', 'document', source)(window, document);

let failed = 0;
let checks = 0;
function check(label, condition) {
    checks++;
    if (condition) console.log(`PASS: ${label}`);
    else { failed++; console.error(`FAIL: ${label}`); }
}

check('extension loader registers for DOMContentLoaded', typeof domReady === 'function');
domReady();

const expected = [
    'mastery.js',
    'mastery-spacing.js',
    'ui.js',
    'grimoire-status.js',
    'grimoire-sort.js',
    'boss-flow.js',
    'cast-copy.js',
    'flow-state.js',
    'ui-navigation.js',
    'inventory.js',
    'debug.js'
];
for (let i = 0; i < expected.length; i++) {
    const script = appended[i];
    check(`${expected[i]} is loaded`, !!script && script.src.startsWith(`${expected[i]}?v=`));
    if (script && typeof script.onload === 'function') script.onload();
}

const versions = appended.map(script => script.src.split('?v=')[1]);
check('all extensions share one page-load cache token', versions.length === expected.length && versions.every(v => v && v === versions[0]));
check('loader creates no unversioned extension requests', appended.every(script => /\?v=\d+$/.test(script.src)));

console.log(`\nRESULT: ${checks - failed} checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

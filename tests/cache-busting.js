const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'bootstrap.js'), 'utf8');

let domReady = null;
const appended = [];
const gameArea = {innerHTML: '<div>legacy start</div>'};
const document = {
    getElementById(id) {
        return id === 'game-area' ? gameArea : null;
    },
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

let menuRenders = 0;
let startRenders = 0;
class Game {
    showMainMenu() { menuRenders++; }
    showStart() {
        startRenders++;
        this.showMainMenu();
    }
}
const game = new Game();

new Function('window', 'document', 'game', source)(window, document, game);

let failed = 0;
let checks = 0;
function check(label, condition) {
    checks++;
    if (condition) console.log(`PASS: ${label}`);
    else { failed++; console.error(`FAIL: ${label}`); }
}

check('bootstrap restores neutral loading shell before DOM ready', gameArea.innerHTML.includes('Loading your spellbook'));
check('extension loader registers for DOMContentLoaded', typeof domReady === 'function');
domReady();
check('startup render is suppressed while extensions install', startRenders === 0 && menuRenders === 0);

const expected = [
    'src/core/mastery.js',
    'src/core/mastery-spacing.js',
    'src/ui/ui.js',
    'src/ui/grimoire-status.js',
    'src/ui/grimoire-sort.js',
    'src/features/boss-flow.js',
    'src/ui/cast-copy.js',
    'src/core/flow-state.js',
    'src/ui/duel-copy.js',
    'src/ui/ui-navigation.js',
    'src/data/bosses.js',
    'src/features/boss-campaign.js',
    'src/features/level-hold.js',
    'src/features/inventory.js',
    'src/dev/debug.js'
];
for (let i = 0; i < expected.length; i++) {
    const script = appended[i];
    check(`${expected[i]} is loaded`, !!script && script.src.startsWith(`${expected[i]}?v=`));
    if (i < expected.length - 1) {
        if (script && typeof script.onload === 'function') script.onload();
        check(`no startup render before extension ${i + 2}`, startRenders === 0 && menuRenders === 0);
    }
}

const finalScript = appended[expected.length - 1];
if (finalScript && typeof finalScript.onload === 'function') finalScript.onload();
check('bootstrap renders startup exactly once after final extension', startRenders === 1 && menuRenders === 1);
check('temporary menu guard is removed before startup render', !Object.prototype.hasOwnProperty.call(game, 'showMainMenu'));

const versions = appended.map(script => script.src.split('?v=')[1]);
check('all extensions share one page-load cache token', versions.length === expected.length && versions.every(v => v && v === versions[0]));
check('loader creates no unversioned extension requests', appended.every(script => /\?v=\d+$/.test(script.src)));

console.log(`\nRESULT: ${checks - failed} checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

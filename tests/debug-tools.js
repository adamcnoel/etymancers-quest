// Regression checks for the opt-in ?debug=1 developer shortcuts.
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '..', 'debug.js'), 'utf8');

let failed = 0;
let checks = 0;
function check(label, condition) {
    checks++;
    if (condition) console.log(`PASS: ${label}`);
    else { failed++; console.error(`FAIL: ${label}`); }
}

function run(search) {
    const nodes = {};
    const host = {children: [], appendChild(node) { this.children.push(node); if (node.id) nodes[node.id] = node; }};
    const body = {children: [], appendChild(node) { this.children.push(node); if (node.id) nodes[node.id] = node; }};
    const document = {
        body,
        getElementById(id) { return nodes[id] || null; },
        querySelector(selector) { return selector === '.game-container' ? host : null; },
        createElement() {
            return {
                id: '', className: '', innerHTML: '', removed: false,
                remove() { this.removed = true; if (this.id) delete nodes[this.id]; }
            };
        }
    };
    const window = {location: {search}};

    class EtymancerGame {
        constructor() {
            this.wordSet = {id: 'roots'};
            this.player = {mana: 3, maxMana: 30, gold: 25};
            this.questionsAnswered = 4;
            this.duel = null;
            this.startedBoss = null;
            this.askCalls = 0;
        }
        showSpellbookSetup() {}
        startDuel(name) { this.startedBoss = name; }
        askQuestion() { this.askCalls++; this.questionsAnswered++; }
        updateStats() {}
        saveGame() {}
    }
    const game = new EtymancerGame();
    new Function('EtymancerGame', 'game', 'window', 'document', 'URLSearchParams', source)(
        EtymancerGame, game, window, document, URLSearchParams
    );
    return {game, host, nodes};
}

const normal = run('');
check('debug panel is absent by default', normal.host.children.length === 0);
check('debug methods are absent by default', typeof normal.game.debugStartDuel === 'undefined');

const debug = run('?debug=1');
check('debug panel appears only with debug flag', debug.host.children.some(node => node.id === 'debug-tools'));
check('debug start duel shortcut is installed', typeof debug.game.debugStartDuel === 'function');

debug.game.debugStartDuel();
check('start duel shortcut uses normal duel flow', debug.game.startedBoss === 'Debugging Wyrm');

debug.game.debugPrimeBossThreshold();
check('boss threshold shortcut advances into spell 10', debug.game.questionsAnswered === 10);
check('boss threshold shortcut starts one normal spell', debug.game.askCalls === 1);

debug.game.debugFillMana();
check('fill mana shortcut refills to max', debug.game.player.mana === 30);

debug.game.debugAddGold();
check('gold shortcut adds 1000', debug.game.player.gold === 1025);

console.log(`\nRESULT: ${checks - failed} checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

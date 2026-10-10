const fs = require('fs');
const path = require('path');

class EtymancerGame {
    constructor() {
        this.terms = {
            zebra: {definitions:['z']},
            Alpha: {definitions:['a']},
            beta: {definitions:['b']}
        };
    }
    renderGrimoireRows() {
        return Object.keys(this.terms).join('|');
    }
}

global.EtymancerGame = EtymancerGame;

const source = fs.readFileSync(path.join(__dirname, '..', 'grimoire-sort.js'), 'utf8');
new Function(source)();

let failed = 0;
let checks = 0;
function check(label, condition, detail='') {
    checks++;
    if (condition) console.log(`PASS: ${label}`);
    else {
        failed++;
        console.error(`FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    }
}

const game = new EtymancerGame();
const originalTerms = game.terms;
const rendered = game.renderGrimoireRows();

check('Grimoire rows render alphabetically', rendered === 'Alpha|beta|zebra', rendered);
check('authoritative terms object is restored after rendering', game.terms === originalTerms);
check('underlying term insertion order is unchanged', Object.keys(game.terms).join('|') === 'zebra|Alpha|beta');

console.log(`\nRESULT: ${checks - failed} checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

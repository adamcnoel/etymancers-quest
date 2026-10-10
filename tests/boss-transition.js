const fs = require('fs');
const path = require('path');

const gameArea = {innerHTML: ''};
global.document = {
    getElementById(id) {
        return id === 'game-area' ? gameArea : null;
    }
};

class EtymancerGame {
    constructor() {
        this.questionsAnswered = 10;
        this.currentQuestion = 'Question?';
        this.saved = 0;
        this.updated = 0;
        this.bossOffers = 0;
        this.askCalls = 0;
        this.screen = null;
    }
    updateStats() { this.updated++; }
    saveGame() { this.saved++; }
    escapeHtml(value) { return String(value); }
    setScreen(name) { this.screen = name; }
    offerBossFight() { this.bossOffers++; }
    askQuestion() { this.askCalls++; }
}

const game = new EtymancerGame();
const source = fs.readFileSync(path.join(__dirname, '..', 'boss-flow.js'), 'utf8');
new Function('EtymancerGame', 'game', 'document', source)(EtymancerGame, game, global.document);

let failed = 0;
let checks = 0;
function check(label, condition) {
    checks++;
    if (condition) console.log(`PASS: ${label}`);
    else { failed++; console.error(`FAIL: ${label}`); }
}

game.showCastResult('<div>Success</div>', 'answer');
check('spell 10 result remains visible', gameArea.innerHTML.includes('Success'));
check('spell 10 result shows Continue', gameArea.innerHTML.includes('game.nextQuestion()'));
check('boss does not auto-open from result renderer', game.bossOffers === 0);
check('result save still runs', game.saved === 1);
check('result stats update still runs', game.updated === 1);
check('result remains gameplay screen', game.screen === 'gameplay');

game.nextQuestion();
check('Continue on spell 10 opens boss encounter', game.bossOffers === 1);
check('Continue on spell 10 does not start spell 11 first', game.askCalls === 0);

game.questionsAnswered = 9;
game.nextQuestion();
check('Continue on normal spell asks next question', game.askCalls === 1);
check('normal Continue does not add another boss offer', game.bossOffers === 1);

console.log(`\nRESULT: ${checks - failed} checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

// Regression tests for final menu policy layered over explicit flow-state.js.
const fs = require('fs');
const path = require('path');

const gameArea = {innerHTML: '<div>Welcome back, Etymancer.</div>'};
const container = {dataset: {screen: 'menu'}};

global.document = {
    getElementById(id) {
        if (id === 'game-area') return gameArea;
        return null;
    },
    querySelector(selector) {
        if (selector === '.game-container') return container;
        return null;
    }
};

class EtymancerGame {
    constructor() {
        this.wordSet = {id: 'roots', name: 'Roots & Affixes'};
        this.player = {level: 1};
        this.currentQuestion = null;
        this.currentAnswer = null;
        this.questionsAnswered = 0;
        this.duel = null;
        this.newGameCalls = 0;
        this.flow = {screen: 'menu', gameplayState: null, payload: null, returnTo: null};
    }
    escapeHtml(value) { return String(value); }
    setScreen(name) { this.flow.screen = name; container.dataset.screen = name; }
    discardGameplayReturn() {
        this.flow.returnTo = null;
        this.flow.gameplayState = null;
        this.flow.payload = null;
    }
    ensureFlowState() { return this.flow; }
    newGame() { this.newGameCalls++; this.questionsAnswered = 0; }
    showMainMenu() {
        this.setScreen('menu');
        gameArea.innerHTML = '<div>Welcome back, Etymancer.</div><button onclick="game.askQuestion()">Continue Casting</button><button>Etymancer</button><button>Arcane Emporium</button>';
    }
    showSpellbookSetup() { this.setScreen('spellbook'); }
    showHelp() { this.setScreen('support'); }
    selectSpellbookForSetup(setId) { this.wordSet = {id: setId, name: setId}; }
}

const game = new EtymancerGame();
const source = fs.readFileSync(path.join(__dirname, '..', 'ui-navigation.js'), 'utf8');
new Function('EtymancerGame', 'game', 'document', source)(EtymancerGame, game, global.document);

let failed = 0;
let checks = 0;
function check(label, condition) {
    checks++;
    if (condition) console.log(`PASS: ${label}`);
    else { failed++; console.error(`FAIL: ${label}`); }
}

check('cold startup uses fresh-game menu', gameArea.innerHTML.includes('Your adventure is ready to begin.'));
check('cold startup offers Begin Casting', gameArea.innerHTML.includes('Begin Casting'));
check('cold startup hides Welcome back', !gameArea.innerHTML.includes('Welcome back'));
check('cold startup hides Continue Casting', !gameArea.innerHTML.includes('Continue Casting'));

// A gameplay return target means this is not a fresh start even if the current
// question is temporarily null while the player is browsing a side screen.
game.flow.returnTo = {screen: 'gameplay', gameplayState: 'boss-offer'};
game.questionsAnswered = 10;
game.showMainMenu();
check('returning gameplay keeps normal main menu', gameArea.innerHTML.includes('Continue Casting'));
check('returning gameplay is not replaced by fresh menu', !gameArea.innerHTML.includes('Your adventure is ready to begin.'));

game.flow.returnTo = null;
game.questionsAnswered = 0;
game.currentQuestion = null;
game.showResetConfirm();
check('reset confirmation uses explicit reset action', gameArea.innerHTML.includes('game.startNewGameFromUi()'));
game.startNewGameFromUi();
check('new game resets state once', game.newGameCalls === 1);
check('new game returns to menu', container.dataset.screen === 'menu');
check('new game shows fresh menu', gameArea.innerHTML.includes('Your adventure is ready to begin.'));

const navSource = fs.readFileSync(path.join(__dirname, '..', 'ui-navigation.js'), 'utf8');
check('navigation policy no longer snapshots innerHTML', !navSource.includes('snapshot.html') && !navSource.includes('suspendedEncounter'));
check('navigation policy no longer rewrites casting buttons', !navSource.includes('wireResumeButtons'));

console.log(`\nRESULT: ${checks - failed} checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

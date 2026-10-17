// Regression tests for final menu/onboarding policy layered over flow-state.js.
const fs = require('fs');
const path = require('path');

const gameArea = {innerHTML: ''};
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
        this.wordSet = null;
        this.player = null;
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
        gameArea.innerHTML = '<div>legacy menu</div>';
    }
    showSpellbookSetup() {
        this.setScreen('spellbook');
        gameArea.innerHTML = '<div>Choose your study material.</div>';
    }
    showHelp() { this.setScreen('support'); }
    showCharacterSheet() { this.setScreen('character'); }
    showShop() { this.setScreen('shop'); }
    selectSpellbookForSetup(setId) { this.wordSet = {id: setId, name: setId}; }
}

const game = new EtymancerGame();
const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'ui-navigation.js'), 'utf8');
new Function('EtymancerGame', 'game', 'document', source)(EtymancerGame, game, global.document);

let failed = 0;
let checks = 0;
function check(label, condition) {
    checks++;
    if (condition) console.log(`PASS: ${label}`);
    else { failed++; console.error(`FAIL: ${label}`); }
}

// Fresh device: no redundant main menu before Grimoire selection.
game.showMainMenu();
check('fresh device goes directly to Grimoire chooser', container.dataset.screen === 'spellbook');
check('fresh device shows study-material chooser', gameArea.innerHTML.includes('Choose your study material'));
check('fresh device does not render redundant begin menu', !gameArea.innerHTML.includes('Choose a Grimoire to begin'));

// Once selected, Main Menu is the stable home screen.
game.wordSet = {id: 'roots', name: 'Roots & Affixes'};
game.player = {level: 1};
game.flow = {screen: 'menu', gameplayState: null, payload: null, returnTo: null};
game.showMainMenu();
check('cold selected-Grimoire menu is stable home', container.dataset.screen === 'menu');
check('cold selected-Grimoire menu shows ready state', gameArea.innerHTML.includes('Your adventure is ready to begin.'));
check('cold selected-Grimoire menu offers Begin Casting', gameArea.innerHTML.includes('Begin Casting'));
check('stable menu exposes Reset Grimoire', gameArea.innerHTML.includes('Reset Grimoire'));
check('stable menu exposes character and shop', gameArea.innerHTML.includes('Etymancer') && gameArea.innerHTML.includes('Arcane Emporium'));

// A same-session gameplay detour changes only the primary action semantics.
game.flow.returnTo = {screen: 'gameplay', gameplayState: 'casting-question'};
game.flow.gameplayState = 'casting-question';
game.showMainMenu();
check('resumable session offers Continue Casting', gameArea.innerHTML.includes('Continue Casting'));
check('resumable session uses in-progress status', gameArea.innerHTML.includes('Your adventure is in progress.'));

// Reset keeps the active Grimoire selected but discards encounter state.
game.currentQuestion = 'What does ped mean?';
game.currentAnswer = {term: 'ped'};
game.duel = {bossName: 'Lexivore'};
game.questionsAnswered = 12;
game.showResetConfirm();
check('reset confirmation is Grimoire-scoped', gameArea.innerHTML.includes('RESET GRIMOIRE'));
check('reset confirmation names active Grimoire', gameArea.innerHTML.includes('Reset Roots & Affixes?'));
check('reset confirmation says other Grimoire is untouched', gameArea.innerHTML.includes('other Grimoire is untouched'));
check('reset confirmation uses Reset Grimoire action', gameArea.innerHTML.includes('game.resetGrimoireFromUi()'));

game.resetGrimoireFromUi();
check('reset invokes game reset once', game.newGameCalls === 1);
check('reset keeps active Grimoire selected', game.wordSet.id === 'roots');
check('reset clears current question', game.currentQuestion === null && game.currentAnswer === null);
check('reset clears active duel', game.duel === null);
check('reset clears session return target', game.flow.returnTo === null && game.flow.gameplayState === null);
check('reset returns to stable main menu', container.dataset.screen === 'menu');
check('reset main menu offers Begin Casting', gameArea.innerHTML.includes('Begin Casting') && !gameArea.innerHTML.includes('Continue Casting'));

const navSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'ui-navigation.js'), 'utf8');
const flowSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', 'flow-state.js'), 'utf8');
check('navigation policy no longer snapshots innerHTML', !navSource.includes('snapshot.html') && !navSource.includes('suspendedEncounter'));
check('navigation policy no longer rewrites casting buttons', !navSource.includes('wireResumeButtons'));
check('flow layer uses explicit gameplay states', flowSource.includes("'duel-result'") && flowSource.includes('renderCurrentGameplay'));

console.log(`\nRESULT: ${checks - failed} checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

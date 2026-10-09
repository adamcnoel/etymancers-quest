// Regression tests for suspending/resuming an unanswered cast across UI detours.
const fs = require('fs');
const path = require('path');

let answerVisible = true;
const input = {value: 'typed answer', focus() { this.focused = true; }, focused: false};
const gameArea = {
    _html: '<div>Original spell</div><input id="answer-input">',
    get innerHTML() { return this._html; },
    set innerHTML(value) {
        this._html = value;
        answerVisible = value.includes('id="answer-input"');
    }
};
const container = {dataset: {screen: 'gameplay'}};

global.document = {
    getElementById(id) {
        if (id === 'game-area') return gameArea;
        if (id === 'answer-input') return answerVisible ? input : null;
        return null;
    },
    querySelector(selector) {
        if (selector === '.game-container') return container;
        return null;
    }
};

class EtymancerGame {
    constructor() {
        this.wordSet = {id: 'roots'};
        this.currentQuestion = 'What does arc mean?';
        this.currentAnswer = {type: 'definition', term: 'arc'};
        this.questionsAnswered = 7;
        this.duel = null;
        this.newGameCalls = 0;
    }
    setScreen(name) { container.dataset.screen = name; }
    askQuestion() { this.questionsAnswered++; this.currentQuestion = 'NEW QUESTION'; }
    newGame() { this.newGameCalls++; this.questionsAnswered = 0; }
    showMainMenu() { this.setScreen('menu'); gameArea.innerHTML = '<button onclick="game.askQuestion()">Continue Casting</button>'; }
    showSpellbookSetup() { this.setScreen('spellbook'); gameArea.innerHTML = '<button onclick="game.askQuestion()">Continue Casting</button>'; }
    showCharacterSheet() { this.setScreen('character'); gameArea.innerHTML = '<button onclick="game.askQuestion()">Back to Casting</button>'; }
    showShop() { this.setScreen('shop'); gameArea.innerHTML = '<button onclick="game.askQuestion()">Back to Casting</button>'; }
    showPurchaseResult() { gameArea.innerHTML = '<button onclick="game.askQuestion()">Back to Casting</button>'; }
    showPurchaseFailure() { gameArea.innerHTML = '<button>Back</button>'; }
    showHelp() { this.setScreen('support'); gameArea.innerHTML = '<button onclick="game.askQuestion()">Back to Casting</button>'; }
    showResetConfirm() { gameArea.innerHTML = '<button onclick="newGame(); game.showMainMenu()">Reset Progress</button>'; }
    selectSpellbookForSetup(setId) { this.wordSet = {id: setId}; }
}

const game = new EtymancerGame();
const source = fs.readFileSync(path.join(__dirname, '..', 'ui-navigation.js'), 'utf8');
new Function('EtymancerGame', 'game', 'document', source)(EtymancerGame, game, global.document);

let failed = 0;
function check(label, condition) {
    if (condition) console.log(`PASS: ${label}`);
    else { failed++; console.error(`FAIL: ${label}`); }
}

const originalHtml = gameArea.innerHTML;
const originalQuestion = game.currentQuestion;
const originalAnswer = game.currentAnswer;
const originalCount = game.questionsAnswered;

game.showSpellbookSetup();
check('detour does not advance spell counter', game.questionsAnswered === originalCount);
check('detour does not change current question', game.currentQuestion === originalQuestion);
check('detour return button resumes instead of asking new question', gameArea.innerHTML.includes('game.resumeCasting()'));

game.resumeCasting();
check('resume restores exact casting markup', gameArea.innerHTML === originalHtml);
check('resume restores current answer object', game.currentAnswer === originalAnswer);
check('resume preserves spell counter', game.questionsAnswered === originalCount);
check('resume preserves typed answer', input.value === 'typed answer');
check('resume returns to gameplay screen', container.dataset.screen === 'gameplay');

// New Game should clear any suspended cast and land in the Grimoire flow.
container.dataset.screen = 'menu';
answerVisible = false;
game.showResetConfirm();
check('reset confirmation uses UI reset workflow', gameArea.innerHTML.includes('game.startNewGameFromUi()'));
game.startNewGameFromUi();
check('new game resets game state once', game.newGameCalls === 1);
check('new game lands in Grimoire flow', container.dataset.screen === 'spellbook');

console.log(`\nRESULT: ${11 - failed} checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

// Regression tests for suspending/resuming unresolved casts and boss duels across UI detours.
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
        this.wordSet = {id: 'roots', name: 'Roots & Affixes'};
        this.player = {level: 1};
        this.currentQuestion = 'What does arc mean?';
        this.currentAnswer = {type: 'definition', term: 'arc'};
        this.questionsAnswered = 7;
        this.duel = null;
        this.newGameCalls = 0;
    }
    escapeHtml(value) { return String(value); }
    setScreen(name) { container.dataset.screen = name; }
    askQuestion() { this.questionsAnswered++; this.currentQuestion = 'NEW QUESTION'; }
    newGame() { this.newGameCalls++; this.questionsAnswered = 0; }
    showMainMenu() { this.setScreen('menu'); gameArea.innerHTML = '<button onclick="game.askQuestion()">Continue Casting</button><button>Etymancer</button><button>Arcane Emporium</button>'; }
    showSpellbookSetup() { this.setScreen('spellbook'); gameArea.innerHTML = '<button onclick="game.askQuestion()">Continue Casting</button>'; }
    showCharacterSheet() { this.setScreen('character'); gameArea.innerHTML = '<button onclick="game.askQuestion()">Back to Casting</button>'; }
    showShop() { this.setScreen('shop'); gameArea.innerHTML = '<button onclick="game.askQuestion()">Back to Casting</button>'; }
    showPurchaseResult() { gameArea.innerHTML = '<button onclick="game.askQuestion()">Back to Casting</button>'; }
    showPurchaseFailure() { gameArea.innerHTML = '<button>Back</button>'; }
    showHelp() { this.setScreen('support'); gameArea.innerHTML = '<button onclick="game.askQuestion()">Back to Casting</button>'; }
    showResetConfirm() { gameArea.innerHTML = '<button onclick="newGame(); game.showMainMenu()">Reset Progress</button>'; }
    selectSpellbookForSetup(setId) { this.wordSet = {id: setId, name: 'Roots & Affixes'}; }
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

// Normal unanswered cast survives a detour.
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

// An in-progress boss duel must survive the same detour instead of falling
// through to askQuestion() and advancing to the next normal spell.
container.dataset.screen = 'gameplay';
answerVisible = true;
input.value = 'duel answer';
game.questionsAnswered = 10;
game.currentQuestion = "What root means 'old'?";
game.currentAnswer = {type: 'term', term: 'paleo', definition: 'old'};
game.duel = {
    bossName: 'Lexivore', bossMaxHp: 95, bossHp: 61,
    bossHit: 18, playerMaxHp: 90, playerHp: 72,
    duelStreak: 2, channelArmed: true
};
gameArea.innerHTML = '<div>=== SPELL DUEL: Lexivore ===</div><input id="answer-input">';
const duelHtml = gameArea.innerHTML;
const duelState = {...game.duel};
const duelQuestion = game.currentQuestion;

game.showMainMenu();
check('duel detour does not advance to spell 11', game.questionsAnswered === 10);
check('duel detour return button resumes encounter', gameArea.innerHTML.includes('game.resumeCasting()'));

game.resumeCasting();
check('duel resume restores exact duel markup', gameArea.innerHTML === duelHtml);
check('duel resume restores duel question', game.currentQuestion === duelQuestion);
check('duel resume restores boss HP', game.duel?.bossHp === duelState.bossHp);
check('duel resume restores player HP', game.duel?.playerHp === duelState.playerHp);
check('duel resume restores duel streak', game.duel?.duelStreak === duelState.duelStreak);
check('duel resume restores channel armed state', game.duel?.channelArmed === true);
check('duel resume preserves typed duel answer', input.value === 'duel answer');
check('duel resume keeps spell counter at 10', game.questionsAnswered === 10);

// New Game should clear any suspended encounter and land on a fresh-game main menu.
container.dataset.screen = 'menu';
answerVisible = false;
game.showResetConfirm();
check('reset confirmation uses UI reset workflow', gameArea.innerHTML.includes('game.startNewGameFromUi()'));
game.startNewGameFromUi();
check('new game resets game state once', game.newGameCalls === 1);
check('new game lands on main menu', container.dataset.screen === 'menu');
check('fresh main menu offers Begin Casting', gameArea.innerHTML.includes('Begin Casting'));
check('fresh main menu offers Grimoire', gameArea.innerHTML.includes('Grimoire'));
check('fresh main menu hides Etymancer link', !gameArea.innerHTML.includes('>Etymancer<'));
check('fresh main menu hides Emporium link', !gameArea.innerHTML.includes('Emporium'));
check('fresh main menu does not say Continue Casting', !gameArea.innerHTML.includes('Continue Casting'));

console.log(`\nRESULT: ${checks - failed} checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

// Regression tests for startup navigation plus suspending/resuming unresolved casts and boss duels.
const fs = require('fs');
const path = require('path');

let answerVisible = false;
const input = {value: 'typed answer', focus() { this.focused = true; }, focused: false};
const gameArea = {
    _html: '<div>Welcome back, Etymancer.</div>',
    get innerHTML() { return this._html; },
    set innerHTML(value) {
        this._html = value;
        answerVisible = value.includes('id="answer-input"');
    }
};
const container = {dataset: {screen: 'menu'}};

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
        this.currentQuestion = null;
        this.currentAnswer = null;
        this.questionsAnswered = 0;
        this.duel = null;
        this.newGameCalls = 0;
    }
    escapeHtml(value) { return String(value); }
    setScreen(name) { container.dataset.screen = name; }
    askQuestion() { this.questionsAnswered++; this.currentQuestion = 'NEW QUESTION'; }
    newGame() { this.newGameCalls++; this.questionsAnswered = 0; }
    showMainMenu() { this.setScreen('menu'); gameArea.innerHTML = '<div>Welcome back, Etymancer.</div><button onclick="game.askQuestion()">Continue Casting</button><button>Etymancer</button><button>Arcane Emporium</button>'; }
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

// ui.js renders its generic returning-player menu before ui-navigation.js loads.
// Installing this layer must immediately replace that with the fresh-game menu.
check('cold startup re-renders the menu through final navigation rules', gameArea.innerHTML.includes('Your adventure is ready to begin.'));
check('cold startup offers Begin Casting', gameArea.innerHTML.includes('Begin Casting'));
check('cold startup does not show Welcome back', !gameArea.innerHTML.includes('Welcome back'));
check('cold startup does not show Continue Casting', !gameArea.innerHTML.includes('Continue Casting'));

// Normal unanswered cast survives a detour.
container.dataset.screen = 'gameplay';
answerVisible = true;
input.value = 'typed answer';
game.questionsAnswered = 7;
game.currentQuestion = 'What does arc mean?';
game.currentAnswer = {type: 'definition', term: 'arc'};
game.duel = null;
gameArea.innerHTML = '<div>Original spell</div><input id="answer-input">';
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

// Reproduce the debug-start path: a duel is authoritative even if a UI layer
// has left the screen marker stale. This mirrors Cast Spell 1 -> Debug Start
// Boss Duel -> Grimoire -> Back to Casting.
container.dataset.screen = 'menu';
answerVisible = true;
input.value = 'debug duel answer';
game.questionsAnswered = 1;
game.currentQuestion = "What root means 'old'?";
game.currentAnswer = {type: 'term', term: 'paleo', definition: 'old'};
game.duel = {
    bossName: 'Debugging Wyrm', bossMaxHp: 95, bossHp: 95,
    bossHit: 18, playerMaxHp: 90, playerHp: 90,
    duelStreak: 0, channelArmed: false
};
gameArea.innerHTML = '<div>=== SPELL DUEL: Debugging Wyrm ===</div><input id="answer-input">';
const debugDuelHtml = gameArea.innerHTML;

game.showSpellbookSetup();
check('debug-started duel detour rewires Back to Casting', gameArea.innerHTML.includes('game.resumeCasting()'));
check('debug-started duel detour keeps spell count at 1', game.questionsAnswered === 1);
game.resumeCasting();
check('debug-started duel resumes exact duel markup', gameArea.innerHTML === debugDuelHtml);
check('debug-started duel remains active', game.duel?.bossName === 'Debugging Wyrm');
check('debug-started duel does not advance to spell 2', game.questionsAnswered === 1);
check('debug-started duel restores typed answer', input.value === 'debug duel answer');

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

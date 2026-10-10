const fs = require('fs');
const path = require('path');

let answerVisible = false;
const input = {value: '', focus() { this.focused = true; }, focused: false};
const gameArea = {
    _html: '',
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
        this.askCalls = 0;
    }
    escapeHtml(value) { return String(value); }
    setScreen(name) { container.dataset.screen = name; }
    askQuestion() { this.askCalls++; this.questionsAnswered++; }
    newGame() { this.questionsAnswered = 0; }
    showMainMenu() { this.setScreen('menu'); gameArea.innerHTML = '<button onclick="game.askQuestion()">Continue Casting</button>'; }
    showSpellbookSetup() { this.setScreen('spellbook'); gameArea.innerHTML = '<button onclick="game.askQuestion()">Continue Casting</button><button onclick="game.showMainMenu()">Main Menu</button>'; }
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

const states = [
    {
        name: 'unanswered spell',
        count: 7,
        html: '<div>--- Spell 7 ---</div><input id="answer-input">',
        question: 'What does arc mean?',
        answer: {type: 'definition', term: 'arc'},
        duel: null,
        typed: 'typed spell answer'
    },
    {
        name: 'resolved spell result',
        count: 8,
        html: '<div>--- Spell 8 ---</div><div class="correct">Spell cast!</div><button onclick="game.nextQuestion()">Continue</button>',
        question: 'What does bene mean?',
        answer: {type: 'definition', term: 'bene'},
        duel: null,
        typed: ''
    },
    {
        name: 'boss offer',
        count: 10,
        html: '<div>The air crackles with arcane pressure...</div><button>Begin Duel</button><button onclick="game.askQuestion()">Flee</button>',
        question: 'Spell 10 question',
        answer: {type: 'definition', term: 'chron'},
        duel: null,
        typed: ''
    },
    {
        name: 'active duel',
        count: 10,
        html: '<div>=== SPELL DUEL: Lexivore ===</div><input id="answer-input">',
        question: "What root means 'old'?",
        answer: {type: 'term', term: 'paleo', definition: 'old'},
        duel: {bossName: 'Lexivore', bossHp: 61, playerHp: 72, duelStreak: 2, channelArmed: true},
        typed: 'duel answer'
    },
    {
        name: 'post-duel victory',
        count: 10,
        html: '<div>VICTORY!</div><button onclick="game.askQuestion()">Continue Casting</button>',
        question: "What root means 'old'?",
        answer: {type: 'term', term: 'paleo', definition: 'old'},
        duel: null,
        typed: ''
    }
];

const detours = [
    ['Menu', () => game.showMainMenu()],
    ['Grimoire', () => game.showSpellbookSetup()],
    ['Etymancer', () => game.showCharacterSheet()],
    ['Emporium', () => game.showShop()],
    ['Help', () => game.showHelp()],
    ['Inventory contract', () => { game.suspendGameplayState(); game.setScreen('inventory'); gameArea.innerHTML = '<button onclick="game.resumeCasting()">Back to Casting</button>'; }]
];

function loadState(state) {
    container.dataset.screen = 'gameplay';
    game.questionsAnswered = state.count;
    game.currentQuestion = state.question;
    game.currentAnswer = state.answer;
    game.duel = state.duel ? {...state.duel} : null;
    game.askCalls = 0;
    gameArea.innerHTML = state.html;
    if (answerVisible) input.value = state.typed;
}

for (const state of states) {
    for (const [detourName, detour] of detours) {
        loadState(state);
        const expectedHtml = gameArea.innerHTML;
        const expectedCount = game.questionsAnswered;
        const expectedQuestion = game.currentQuestion;
        const expectedDuel = game.duel ? {...game.duel} : null;

        detour();
        check(`${state.name} -> ${detourName}: does not advance`, game.questionsAnswered === expectedCount && game.askCalls === 0);
        game.resumeCasting();
        check(`${state.name} -> ${detourName}: restores exact markup`, gameArea.innerHTML === expectedHtml);
        check(`${state.name} -> ${detourName}: restores question/count`, game.currentQuestion === expectedQuestion && game.questionsAnswered === expectedCount);
        check(`${state.name} -> ${detourName}: restores duel state`, expectedDuel ? game.duel?.bossHp === expectedDuel.bossHp && game.duel?.playerHp === expectedDuel.playerHp : game.duel === null);
        if (state.typed) check(`${state.name} -> ${detourName}: restores typed answer`, input.value === state.typed);
    }
}

// Exact reported chain: boss offer -> Grimoire -> Main Menu -> Continue Casting.
const bossOffer = states.find(state => state.name === 'boss offer');
loadState(bossOffer);
const bossOfferHtml = gameArea.innerHTML;
game.showSpellbookSetup();
game.showMainMenu();
check('boss offer chained detour keeps spell count at 10', game.questionsAnswered === 10 && game.askCalls === 0);
check('boss offer chained detour Main Menu uses resume action', gameArea.innerHTML.includes('game.resumeCasting()'));
game.resumeCasting();
check('boss offer chained detour restores boss offer', gameArea.innerHTML === bossOfferHtml);
check('boss offer chained detour does not advance to spell 11', game.questionsAnswered === 10 && game.askCalls === 0);

console.log(`\nRESULT: ${checks - failed} checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

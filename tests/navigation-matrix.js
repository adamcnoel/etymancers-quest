// State-machine regression matrix for gameplay <-> side-screen navigation.
const fs = require('fs');
const path = require('path');

let answerVisible = false;
const input = {value: '', focus() { this.focused = true; }, focused: false};
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
        this.wordSet = {id: 'roots', name: 'Roots & Affixes', termLabel: 'root'};
        this.player = {
            level: 1, gold: 0, mana: 30, maxMana: 30, streak: 0,
            strength: 20, intelligence: 20
        };
        this.currentQuestion = null;
        this.currentAnswer = null;
        this.questionsAnswered = 0;
        this.duel = null;
        this.askCalls = 0;
    }
    escapeHtml(value) { return String(value); }
    setScreen(name) { container.dataset.screen = name; }
    getComboMultiplier() { return 1; }
    baseSpellDamage() { return 20; }
    renderBar() { return '████'; }
    armChannel(on) { if (this.duel) this.duel.channelArmed = on; }
    evaluateAnswer() { return true; }
    revealAnswer() { return {headline: 'The root was: demo', examples: []}; }

    askQuestion() {
        this.askCalls++;
        this.questionsAnswered++;
        this.currentQuestion = 'NEW QUESTION';
        this.currentAnswer = {type: 'definition', term: 'new'};
        gameArea.innerHTML = '<input id="answer-input">';
        this.setScreen('gameplay');
    }
    showCastResult() { this.setScreen('gameplay'); }
    offerBossFight() { this.setScreen('gameplay'); }
    duelTurn() { this.setScreen('gameplay'); }
    duelCast() {}
    winDuel() { this.duel = null; this.setScreen('gameplay'); }
    loseDuel() { this.duel = null; this.setScreen('gameplay'); }
    submitAnswer() {}
    skipQuestion() {}
    newGame() { this.questionsAnswered = 0; }

    showMainMenu() {
        this.setScreen('menu');
        gameArea.innerHTML = '<button onclick="game.askQuestion()">Continue Casting</button>';
    }
    showSpellbookSetup() {
        this.setScreen('spellbook');
        gameArea.innerHTML = '<button onclick="game.askQuestion()">Continue Casting</button>';
    }
    showCharacterSheet() {
        this.setScreen('character');
        gameArea.innerHTML = '<button onclick="game.askQuestion()">Back to Casting</button>';
    }
    showShop() {
        this.setScreen('shop');
        gameArea.innerHTML = '<button onclick="game.askQuestion()">Back to Casting</button>';
    }
    showHelp() {
        this.setScreen('support');
        gameArea.innerHTML = '<button onclick="game.askQuestion()">Back to Casting</button>';
    }
    showResetConfirm() {}
    selectSpellbookForSetup(setId) {
        this.wordSet = {id: setId, name: setId, termLabel: 'root'};
    }
}

const game = new EtymancerGame();
const flowSource = fs.readFileSync(path.join(__dirname, '..', 'flow-state.js'), 'utf8');
new Function('EtymancerGame', 'game', 'document', flowSource)(EtymancerGame, game, global.document);
const navSource = fs.readFileSync(path.join(__dirname, '..', 'ui-navigation.js'), 'utf8');
new Function('EtymancerGame', 'game', 'document', navSource)(EtymancerGame, game, global.document);

game.showInventory = function () {
    this.setScreen('inventory');
    gameArea.innerHTML = '<button onclick="game.resumeCasting()">Back to Casting</button>';
};

let failed = 0;
let checks = 0;
function check(label, condition) {
    checks++;
    if (condition) console.log(`PASS: ${label}`);
    else { failed++; console.error(`FAIL: ${label}`); }
}

const duel = () => ({
    bossName: 'Lexivore', bossMaxHp: 95, bossHp: 61, bossHit: 18,
    playerMaxHp: 100, playerHp: 72, duelStreak: 2, channelArmed: true
});

const states = [
    {
        name: 'casting question', kind: 'casting-question', count: 7,
        question: 'What does arc mean?', answer: {type: 'definition', term: 'arc'},
        payload: null, duel: null, marker: 'Spell 7'
    },
    {
        name: 'casting result', kind: 'casting-result', count: 8,
        question: 'What does bene mean?', answer: {type: 'definition', term: 'bene'},
        payload: {resultText: '<div>RESULT-MARKER</div>', userAnswer: 'good'},
        duel: null, marker: 'RESULT-MARKER'
    },
    {
        name: 'boss offer', kind: 'boss-offer', count: 10,
        question: 'Spell 10 question', answer: {type: 'definition', term: 'chron'},
        payload: {bossName: 'Lexivore'}, duel: null, marker: 'air crackles'
    },
    {
        name: 'duel question', kind: 'duel-question', count: 10,
        question: "What root means 'old'?", answer: {type: 'term', term: 'paleo', definition: 'old'},
        payload: null, duel: duel(), marker: 'SPELL DUEL: Lexivore'
    },
    {
        name: 'duel result', kind: 'duel-result', count: 10,
        question: "What root means 'old'?", answer: {type: 'term', term: 'paleo', definition: 'old'},
        payload: {correct: true, damage: 15, channelUsed: false, fallback: false},
        duel: duel(), marker: 'strikes for 15'
    },
    {
        name: 'duel victory', kind: 'duel-victory', count: 10,
        question: "What root means 'old'?", answer: {type: 'term', term: 'paleo', definition: 'old'},
        payload: {outcomeHtml: '<div>LAST-HIT</div>', bossName: 'Lexivore', level: 2, goldReward: 70},
        duel: null, marker: 'VICTORY!'
    },
    {
        name: 'duel defeat', kind: 'duel-defeat', count: 10,
        question: "What root means 'old'?", answer: {type: 'term', term: 'paleo', definition: 'old'},
        payload: {outcomeHtml: '<div>LAST-MISS</div>', bossName: 'Lexivore'},
        duel: null, marker: 'DEFEATED!'
    }
];

const detours = [
    ['Menu', () => game.showMainMenu(), () => game.askQuestion()],
    ['Grimoire', () => game.showSpellbookSetup(), () => game.askQuestion()],
    ['Etymancer', () => game.showCharacterSheet(), () => game.askQuestion()],
    ['Emporium', () => game.showShop(), () => game.askQuestion()],
    ['Help', () => game.showHelp(), () => game.askQuestion()],
    ['Inventory', () => game.showInventory(), () => game.resumeCasting()]
];

function loadState(state) {
    game.questionsAnswered = state.count;
    game.currentQuestion = state.question;
    game.currentAnswer = state.answer;
    game.duel = state.duel ? {...state.duel} : null;
    game.askCalls = 0;
    game.flow.screen = 'gameplay';
    game.flow.returnTo = null;
    game.recordGameplayState(state.kind, state.payload ? {...state.payload} : null);
    container.dataset.screen = 'gameplay';
}

for (const state of states) {
    for (const [detourName, detour, returnAction] of detours) {
        loadState(state);
        const expectedKind = game.flow.gameplayState;
        const expectedCount = game.questionsAnswered;
        const expectedQuestion = game.currentQuestion;
        const expectedBossHp = game.duel?.bossHp;
        const expectedPlayerHp = game.duel?.playerHp;

        detour();
        check(`${state.name} -> ${detourName}: records return target`, game.flow.returnTo?.gameplayState === expectedKind);
        check(`${state.name} -> ${detourName}: does not advance`, game.questionsAnswered === expectedCount && game.askCalls === 0);

        returnAction();
        check(`${state.name} -> ${detourName}: returns to gameplay`, game.flow.screen === 'gameplay' && container.dataset.screen === 'gameplay');
        check(`${state.name} -> ${detourName}: preserves logical state`, game.flow.gameplayState === expectedKind);
        check(`${state.name} -> ${detourName}: preserves question/count`, game.currentQuestion === expectedQuestion && game.questionsAnswered === expectedCount && game.askCalls === 0);
        check(`${state.name} -> ${detourName}: redraws expected state`, gameArea.innerHTML.includes(state.marker));
        if (state.duel) {
            check(`${state.name} -> ${detourName}: preserves duel HP`, game.duel?.bossHp === expectedBossHp && game.duel?.playerHp === expectedPlayerHp);
        }
    }
}

// Exact reported path: boss offer -> Grimoire -> Main Menu -> Continue Casting.
const bossOffer = states.find(state => state.kind === 'boss-offer');
loadState(bossOffer);
game.showSpellbookSetup();
game.showMainMenu();
check('boss-offer chained detour preserves return target', game.flow.returnTo?.gameplayState === 'boss-offer');
check('boss-offer chained detour stays on spell 10', game.questionsAnswered === 10 && game.askCalls === 0);
game.askQuestion();
check('boss-offer chained detour resumes offer', game.flow.gameplayState === 'boss-offer' && gameArea.innerHTML.includes('air crackles'));
check('boss-offer chained detour never creates spell 11', game.questionsAnswered === 10 && game.askCalls === 0);

// Deliberately changing Grimoire abandons the old gameplay return target.
loadState(states[0]);
game.showSpellbookSetup();
game.selectSpellbookForSetup('words');
check('changing Grimoire discards old gameplay return', game.flow.returnTo === null && game.flow.gameplayState === null);
const beforeNewBookCast = game.questionsAnswered;
game.askQuestion();
check('casting after Grimoire change starts a new question', game.askCalls === 1 && game.questionsAnswered === beforeNewBookCast + 1);

console.log(`\nRESULT: ${checks - failed} checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

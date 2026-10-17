const fs = require('fs');
const path = require('path');

const bossSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'bosses.js'), 'utf8');
const mechanicsSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'features', 'boss-mechanics.js'), 'utf8');

const gameArea = {innerHTML: ''};
const answerInput = {value: ''};
const hpLine = {textContent: ''};
const document = {
    hidden: false,
    getElementById(id) {
        if (id === 'game-area') return gameArea;
        if (id === 'answer-input') return answerInput;
        if (id === 'duel-player-hp') return hpLine;
        return null;
    }
};

class EtymancerGame {
    constructor() {
        this.wordSet = {termLabel: 'root', definePrompt: term => `What does '${term}' mean?`};
        this.terms = {
            alpha: {definitions: ['one']},
            beta: {definitions: ['two']},
            gamma: {definitions: ['three']}
        };
        this.mastery = {
            alpha: {stage: 'Mastered', misses: 0, correctStreak: 3, lastSeen: 9},
            beta: {stage: 'Learning', misses: 1, correctStreak: 0, lastSeen: 8},
            gamma: {stage: 'New', misses: 0, correctStreak: 0, lastSeen: 0}
        };
        this.questionPool = [];
        this.currentQuestion = null;
        this.currentAnswer = null;
        this.duel = null;
        this.flow = {screen: 'gameplay', gameplayState: 'duel-question'};
        this.lastChannel = null;
        this.losses = 0;
    }
    escapeHtml(value) { return String(value); }
    getDefinitionsForTerm(term) { return this.terms[term]?.definitions || []; }
    ensureMastery() {}
    refillQuestionPool() { this.questionPool = [{term: 'alpha', type: 'definition'}]; }
    evaluateAnswer(answer) {
        if (!this.currentAnswer) return false;
        if (this.currentAnswer.type === 'definition') {
            return this.getDefinitionsForTerm(this.currentAnswer.term).includes(answer);
        }
        return answer === this.currentAnswer.term;
    }
    generateQuestion() {
        this.currentQuestion = "What does 'gamma' mean?";
        this.currentAnswer = {type: 'definition', term: 'gamma'};
    }
    duelTurn() {
        this.generateQuestion();
        this.flow = {screen: 'gameplay', gameplayState: 'duel-question'};
        gameArea.innerHTML = `<div>=== SPELL DUEL ===</div><div class="correct">Your HP ${this.duel.playerHp}/${this.duel.playerMaxHp}</div><br><label><input type="checkbox" onchange="game.armChannel(this.checked)"> Channel when I press Enter</label><button onclick="game.duelCast(true)">🔥 Channel</button>`;
    }
    renderDuelQuestionState() { this.duelTurn(); }
    duelCast(channel) {
        this.lastChannel = channel;
        const correct = this.evaluateAnswer(answerInput.value.trim().toLowerCase());
        if (correct) this.duel.bossHp -= 10;
        else this.duel.playerHp -= this.duel.bossHit;
        gameArea.innerHTML = correct ? '<div>hit</div>' : '<div>miss</div>';
        return correct;
    }
    armChannel(on) { if (this.duel) this.duel.channelArmed = !!on; }
    setScreen(name) { this.flow.screen = name; }
    ensureFlowState() { return this.flow; }
    renderBar(current, max) { return `${current}/${max}`; }
    loseDuel() { this.losses++; }
}

const game = new EtymancerGame();
const BOSSES = new Function(
    'EtymancerGame', 'game', 'document', 'setInterval', 'clearInterval',
    `${bossSource}\n${mechanicsSource}\nreturn BOSSES;`
)(EtymancerGame, game, document, () => 1, () => {});

let passed = 0;
let failed = 0;
function check(label, condition) {
    if (condition) { passed++; console.log(`PASS: ${label}`); }
    else { failed++; console.error(`FAIL: ${label}`); }
}

const order = BOSSES.map(boss => boss.id);
check('campaign order matches approved difficulty curve', JSON.stringify(order) === JSON.stringify([
    'gorgon-garbled-roots',
    'warden-lost-meanings',
    'babbling-wyrm',
    'etymophage',
    'null-scribe',
    'lexivore'
]));
check('every boss declares one mechanic and personality copy', BOSSES.every(boss => boss.mechanic && boss.mechanicText && boss.intro && boss.correctLines?.length && boss.missLines?.length));
const lexivore = BOSSES.find(boss => boss.id === 'lexivore');
check('Lexivore is the brute-force final boss', lexivore.threat === 6 && lexivore.hp === Math.max(...BOSSES.map(b => b.hp)) && lexivore.hit === Math.max(...BOSSES.map(b => b.hit)));

// Gorgon repeats a missed question exactly on the next exchange.
game.duel = {campaignBossId: 'gorgon-garbled-roots', bossHp: 95, bossMaxHp: 95, bossHit: 14, playerHp: 100, playerMaxHp: 100};
game.currentQuestion = "What does 'alpha' mean?";
game.currentAnswer = {type: 'definition', term: 'alpha'};
answerInput.value = 'wrong';
game.duelCast(false);
check('Gorgon stores a missed term for repetition', game.duel.repeatQuestion?.answer?.term === 'alpha');
game.duelTurn();
check('Gorgon repeats the missed term next exchange', game.currentQuestion === "What does 'alpha' mean?" && game.currentAnswer.term === 'alpha');
answerInput.value = 'one';
game.duelCast(false);
check('correcting the Gorgon term releases the repetition', !game.duel.repeatQuestion);

// Warden selects weak/recently missed mastery material ahead of mastered material.
game.duel = {campaignBossId: 'warden-lost-meanings', bossHp: 135, bossMaxHp: 135, bossHit: 18, playerHp: 100, playerMaxHp: 100};
game.questionPool = [{term: 'alpha', type: 'definition'}];
game.duelTurn();
check('Warden targets weak material', game.currentAnswer.term === 'beta');

// Etymophage heals before the ordinary miss counterattack resolves.
game.duel = {campaignBossId: 'etymophage', bossHp: 100, bossMaxHp: 235, bossHit: 29, playerHp: 100, playerMaxHp: 100};
game.currentQuestion = "What does 'alpha' mean?";
game.currentAnswer = {type: 'definition', term: 'alpha'};
answerInput.value = 'wrong';
game.duelCast(false);
check('Etymophage heals 18 HP on a miss', game.duel.bossHp === 118);

// Null Scribe cannot be channeled even if callers request it directly.
game.duel = {campaignBossId: 'null-scribe', bossHp: 290, bossMaxHp: 290, bossHit: 36, playerHp: 100, playerMaxHp: 100, channelArmed: false};
game.currentAnswer = {type: 'definition', term: 'alpha'};
answerInput.value = 'one';
game.armChannel(true);
check('Null Scribe refuses to arm Channel', game.duel.channelArmed === false);
game.duelCast(true);
check('Null Scribe forces direct Channel calls back to ordinary casts', game.lastChannel === false);

// Wyrm pressure can be tested deterministically without waiting for a timer.
game.duel = {campaignBossId: 'babbling-wyrm', bossHp: 180, bossMaxHp: 180, bossHit: 23, playerHp: 3, playerMaxHp: 100};
game.flow = {screen: 'gameplay', gameplayState: 'duel-question'};
game.applyBossPressureTick();
check('Babbling Wyrm pressure drains one HP per tick', game.duel.playerHp === 2);
game.applyBossPressureTick();
game.applyBossPressureTick();
check('Babbling Wyrm pressure can end the duel', game.duel.playerHp === 0 && game.losses === 1);

console.log(`\nRESULT: ${passed} checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

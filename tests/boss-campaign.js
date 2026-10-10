const fs = require('fs');
const path = require('path');

const bossSource = fs.readFileSync(path.join(__dirname, '..', 'bosses.js'), 'utf8');
const campaignSource = fs.readFileSync(path.join(__dirname, '..', 'boss-campaign.js'), 'utf8');

let html = '';
const gameArea = { get innerHTML() { return html; }, set innerHTML(value) { html = value; } };
const headChildren = [];
const document = {
    head: {appendChild(node) { headChildren.push(node); }},
    getElementById(id) {
        if (id === 'game-area') return gameArea;
        if (id === 'boss-campaign-styles') return headChildren.find(node => node.id === id) || null;
        return null;
    },
    querySelector() { return null; },
    createElement(tag) {
        return {tagName: tag, id: '', type: '', textContent: '', dataset: {}, onclick: null, appendChild() {}, querySelector() { return null; }};
    }
};

const storage = new Map();
const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
};

class EtymancerGame {
    constructor() {
        this.wordSet = {id: 'roots', name: 'Roots & Affixes'};
        this.player = {level: 1, strength: 12, intelligence: 12, gold: 0, mana: 30, maxMana: 30};
        this.questionsAnswered = 10;
        this.currentQuestion = null;
        this.currentAnswer = null;
        this.duel = null;
        this.askCalls = 0;
        this.duelTurnCalls = 0;
        this.flow = {screen: 'menu', gameplayState: null, payload: null, returnTo: null};
    }
    escapeHtml(text) { return String(text); }
    ensureUiShell() {}
    showMainMenu() {}
    showSpellbookSetup() {}
    showHelp() {}
    setScreen(name) { this.flow.screen = name; }
    ensureFlowState() { return this.flow; }
    discardGameplayReturn() { this.flow.returnTo = null; this.flow.gameplayState = null; this.flow.payload = null; }
    askQuestion() { this.askCalls++; }
    duelTurn() { this.duelTurnCalls++; }
    newGame() { this.questionsAnswered = 0; }
    renderDuelVictoryState() {}
    renderDuelDefeatState() {}
    winDuel(outcomeHtml) {
        const bossName = this.duel.bossName;
        this.player.level++;
        const goldReward = 50 + this.player.level * 10;
        this.duel = null;
        this.flow.screen = 'gameplay';
        this.flow.gameplayState = 'duel-victory';
        this.flow.payload = {outcomeHtml, bossName, level: this.player.level, goldReward};
    }
    loseDuel(outcomeHtml) {
        const bossName = this.duel.bossName;
        this.duel = null;
        this.flow.screen = 'gameplay';
        this.flow.gameplayState = 'duel-defeat';
        this.flow.payload = {outcomeHtml, bossName};
    }
}

const game = new EtymancerGame();
new Function('EtymancerGame', 'game', 'document', 'localStorage', `${bossSource}\n${campaignSource}`)(EtymancerGame, game, document, localStorage);

let failed = 0;
let checks = 0;
function check(label, condition) {
    checks++;
    if (condition) console.log(`PASS: ${label}`);
    else { failed++; console.error(`FAIL: ${label}`); }
}

const bossIds = ['gorgon-garbled-roots', 'lexivore', 'babbling-wyrm', 'warden-lost-meanings', 'etymophage', 'null-scribe'];

game.showBossCampaign();
check('campaign screen shows 0/6 progress', /0\/6 bosses defeated/.test(html));
check('campaign screen renders all six bosses', bossIds.every(id => bossSource.includes(id)) && (html.match(/class="boss-card /g) || []).length === 6);
check('campaign screen uses player-selected Challenge actions', (html.match(/>Challenge<\/button>/g) || []).length === 6);
check('desktop campaign layout is three columns', /grid-template-columns:\s*repeat\(3/.test(campaignSource));
check('phone campaign layout is two columns', /max-width:\s*600px[\s\S]*repeat\(2/.test(campaignSource));

game.challengeBoss('gorgon-garbled-roots');
check('chosen boss starts a duel', game.duelTurnCalls === 1 && game.duel && game.duel.campaignBossId === 'gorgon-garbled-roots');
check('chosen boss uses roster HP and hit values', game.duel.bossMaxHp === 95 && game.duel.bossHit === 14);

game.winDuel('<div>hit</div>');
let rootsState = JSON.parse(localStorage.getItem('etymancerCampaign:roots'));
check('victory persists boss completion for active Grimoire', rootsState.defeatedBossIds.includes('gorgon-garbled-roots'));
check('victory screen reports campaign progress', /Campaign: 1\/6 bosses defeated/.test(html));

game.showBossCampaign();
check('defeated boss is marked and cannot be challenged again', /Defeated ✓/.test(html) && /button disabled[^>]*>Defeated<\/button>/.test(html));
const turnsBefore = game.duelTurnCalls;
game.challengeBoss('gorgon-garbled-roots');
check('defeated boss cannot be farmed for another duel', game.duelTurnCalls === turnsBefore);

game.wordSet = {id: 'words', name: 'Vocabulary Words'};
check('campaign completion is independent per Grimoire', game.campaignProgress().defeated === 0);

game.wordSet = {id: 'roots', name: 'Roots & Affixes'};
localStorage.setItem('etymancerCampaign:roots', JSON.stringify({defeatedBossIds: bossIds.slice(0, 5)}));
game.challengeBoss('null-scribe');
game.winDuel('<div>final hit</div>');
check('sixth victory completes campaign', game.campaignProgress().complete === true);
check('campaign completion gets a clear victory treatment', /CAMPAIGN COMPLETE/.test(html));

game.askCalls = 0;
game.questionsAnswered = 20;
game.nextQuestion();
check('spell 20 continues casting instead of auto-offering a boss', game.askCalls === 1);

game.newGame();
check('New Game clears campaign state for current Grimoire', localStorage.getItem('etymancerCampaign:roots') === null);
check('help copy patch removes every-10-spells campaign rule', campaignSource.includes('challenge any undefeated boss when you feel ready'));

console.log(`\nRESULT: ${checks - failed} checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

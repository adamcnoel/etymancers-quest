// Browser-session integration journey for the player-chosen boss campaign.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

let store = {};
const els = {};
const created = {};
const container = {dataset: {screen: 'menu'}};
const ID_LIST = ['word-set','level','gold','mana','max-mana','streak','intelligence',
    'strength','armor','weapon','game-area','answer-input','new-game-btn'];

function makeElement(tag = 'div') {
    return {
        tagName: tag,
        id: '', type: '', textContent: '', innerHTML: '', className: '', dataset: {}, onclick: null,
        children: [], parentNode: null, focused: false, value: '',
        focus() { this.focused = true; },
        setAttribute() {},
        remove() {},
        appendChild(node) {
            node.parentNode = this;
            this.children.push(node);
            if (node.id) created[node.id] = node;
        },
        insertBefore(node) {
            node.parentNode = this;
            this.children.unshift(node);
            if (node.id) created[node.id] = node;
        },
        querySelector(selector) {
            if (selector === '[data-campaign-nav]') return this.children.find(c => c.dataset?.campaignNav) || null;
            if (selector === '[data-campaign-menu]') return this.children.find(c => c.dataset?.campaignMenu) || null;
            return null;
        }
    };
}

const mainPanel = makeElement('main');

function resetDom() {
    container.dataset.screen = 'menu';
    Object.keys(created).forEach(key => delete created[key]);
    mainPanel.children = [];
    ID_LIST.forEach(id => {
        const el = makeElement();
        el.id = id;
        els[id] = el;
    });
}
resetDom();
const headChildren = [];
global.document = {
    head: {appendChild(node) { headChildren.push(node); if (node.id) created[node.id] = node; }},
    getElementById: id => created[id] || els[id] || null,
    querySelector: selector => {
        if (selector === '.game-container') return container;
        if (selector === '.main-panel') return mainPanel;
        return null;
    },
    createElement: tag => makeElement(tag)
};
global.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k,v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
};
global.setTimeout = fn => fn();

function loadGame() {
    const htmlSource = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const inline = htmlSource.match(/<script>([\s\S]*?)<\/script>/g).pop()
        .replace(/^<script>/, '').replace(/<\/script>$/, '');
    const extensions = [
        'mastery.js',
        'mastery-spacing.js',
        'ui.js',
        'grimoire-status.js',
        'grimoire-sort.js',
        'boss-flow.js',
        'cast-copy.js',
        'flow-state.js',
        'duel-copy.js',
        'ui-navigation.js',
        'bosses.js',
        'boss-campaign.js',
        'level-hold.js',
        'inventory.js'
    ];
    const src = ['roots.js','words.js','equipment.js']
        .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n')
        + '\n' + inline
        + '\n' + extensions.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n')
        + '\nmodule.exports = {game, EtymancerGame, WORD_SETS};';
    const mod = {exports:{}};
    new Function('module','document','localStorage','setTimeout', src)
        (mod, global.document, global.localStorage, global.setTimeout);
    return mod.exports;
}

let passed = 0;
let failed = 0;
function check(label, condition) {
    if (condition) { passed++; console.log(`PASS: ${label}`); }
    else { failed++; console.error(`FAIL: ${label}`); }
}
function eq(label, actual, expected) {
    check(`${label} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`, actual === expected);
}
const html = () => els['game-area'].innerHTML;
function correctAnswerFor(game) {
    const {type, term} = game.currentAnswer;
    return type === 'definition' ? game.getDefinitionsForTerm(term)[0] : term;
}
function hasGameplayNav() {
    const nav = document.getElementById('gameplay-nav');
    return !!nav && !!nav.querySelector('[data-campaign-nav]') && container.dataset.screen === 'gameplay';
}

store = {};
resetDom();
const {game} = loadGame();
game.chooseWordSet('roots');
game.newGame();

check('deferred Etymancer Level is hidden from HUD', !/Lv\s+\d+/.test(document.getElementById('compact-hud')?.innerHTML || ''));
game.showCharacterSheet();
check('deferred Etymancer Level is hidden from character sheet', !/Level\s+\d+/.test(html()));

// Crossing a former modulo-10 boundary should now stay in casting.
game.questionsAnswered = 9;
game.askQuestion();
eq('spell 10 starts normally', game.questionsAnswered, 10);
els['answer-input'].value = correctAnswerFor(game);
game.submitAnswer();
check('spell 10 result remains until Continue', html().includes('Continue'));
game.nextQuestion();
eq('Continue advances directly to spell 11', game.questionsAnswered, 11);
eq('spell 11 is a casting question', game.flow.gameplayState, 'casting-question');
check('no automatic boss offer appears', !html().includes('air crackles'));
check('casting shows complete gameplay navigation', hasGameplayNav());

// Bosses behaves like a first-class side screen and remembers the casting return target.
const castingQuestion = game.currentQuestion;
game.showBossCampaign();
check('Bosses screen renders six selectable cards', (html().match(/>Challenge<\/button>/g) || []).length === 6);
eq('Bosses screen is its own screen', game.flow.screen, 'bosses');
check('opening Bosses preserves casting return target', game.flow.returnTo?.gameplayState === 'casting-question');

// Choosing a boss intentionally replaces the suspended normal-casting encounter.
game.challengeBoss('lexivore');
eq('selected boss id enters duel', game.duel.campaignBossId, 'lexivore');
eq('selected boss uses fixed roster HP', game.duel.bossMaxHp, 130);
check('old casting return target was discarded', !game.flow.returnTo);
eq('duel question flow recorded', game.flow.gameplayState, 'duel-question');
check('duel question replaced old casting question', game.currentQuestion !== castingQuestion);

// Existing explicit flow-state navigation preserves an active campaign duel.
const duelQuestion = game.currentQuestion;
game.duel.bossHp -= 17;
game.duel.playerHp -= 9;
const bossHp = game.duel.bossHp;
const playerHp = game.duel.playerHp;
game.showBossCampaign();
check('active boss is shown as resumable', html().includes('Resume Battle') && html().includes(`Battle in progress · ${bossHp}/130 HP`));
check('only active boss is labeled battle in progress', (html().match(/Battle in progress/g) || []).length === 1);
check('other bosses are locked during active duel', (html().match(/>Unavailable<\/button>/g) || []).length === 5 && (html().match(/Finish your current battle first/g) || []).length === 5);
const duelObject = game.duel;
game.challengeBoss('gorgon-garbled-roots');
check('selecting another boss cannot reset active duel', game.duel === duelObject && game.duel.bossHp === bossHp && game.flow.screen === 'bosses');
game.challengeBoss('lexivore');
check('same boss resumes existing duel object', game.duel === duelObject);
eq('resume preserves selected boss HP', game.duel.bossHp, bossHp);
eq('resume preserves player HP', game.duel.playerHp, playerHp);
eq('resume preserves duel question', game.currentQuestion, duelQuestion);
eq('resume returns to duel state', game.flow.gameplayState, 'duel-question');
check('resumed duel restores gameplay navigation', hasGameplayNav());

// A normal spell -> Grimoire -> Continue Casting path must also restore all nav.
game.duel.bossHp = 1;
const levelBeforeVictory = game.player.level;
els['answer-input'].value = correctAnswerFor(game);
game.duelCast(false);
const rootsCampaign = JSON.parse(localStorage.getItem('etymancerCampaign:roots'));
check('campaign victory persists selected boss', rootsCampaign.defeatedBossIds.includes('lexivore'));
check('victory shows 1/6 campaign progress', html().includes('Campaign: 1/6 bosses defeated'));
eq('campaign victory does not change Etymancer Level', game.player.level, levelBeforeVictory);
check('campaign victory does not show legacy level-up copy', !html().includes('Level up!'));
eq('victory remains a resumable terminal duel state', game.flow.gameplayState, 'duel-victory');

game.askQuestion();
eq('Continue Casting after victory enters normal spell', game.flow.gameplayState, 'casting-question');
game.showSpellbookSetup();
game.askQuestion();
eq('Grimoire Continue returns to same spell state', game.flow.gameplayState, 'casting-question');
check('Boss battle -> Spell -> Grimoire -> Continue keeps gameplay nav', hasGameplayNav());

game.showBossCampaign();
check('completed boss card is marked defeated', html().includes('Defeated ✓'));

// Campaign progress is independent per Grimoire just like player/mastery progress.
game.selectSpellbookForSetup('words');
eq('switch activates other Grimoire', game.wordSet.id, 'words');
eq('other Grimoire starts with zero defeated bosses', game.campaignProgress().defeated, 0);
game.selectSpellbookForSetup('roots');
eq('roots campaign progress survives switch', game.campaignProgress().defeated, 1);

console.log(`\nRESULT: ${passed} checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

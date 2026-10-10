// Browser-session integration journey for the player-chosen boss campaign.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

let store = {};
const els = {};
const container = {dataset: {screen: 'menu'}};
const ID_LIST = ['word-set','level','gold','mana','max-mana','streak','intelligence',
    'strength','armor','weapon','game-area','answer-input','new-game-btn'];

function resetDom() {
    container.dataset.screen = 'menu';
    ID_LIST.forEach(id => els[id] = {
        textContent:'', innerHTML:'', value:'', focus(){ this.focused = true; }, focused:false,
        onclick:null, dataset:{}, querySelector(){ return null; }, appendChild(){}, parentNode:null
    });
}
resetDom();
const headChildren = [];
global.document = {
    head: {appendChild(node) { headChildren.push(node); }},
    getElementById: id => {
        if (id === 'boss-campaign-styles') return headChildren.find(node => node.id === id) || null;
        return els[id] || null;
    },
    querySelector: selector => selector === '.game-container' ? container : null,
    createElement: tag => ({
        tagName:tag, id:'', type:'', textContent:'', innerHTML:'', className:'', dataset:{}, onclick:null,
        querySelector(){ return null; }, appendChild(){}, remove(){}, setAttribute(){}
    })
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

store = {};
resetDom();
const {game} = loadGame();
game.chooseWordSet('roots');
game.newGame();

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

// Existing explicit flow-state navigation still preserves an active campaign duel.
const duelQuestion = game.currentQuestion;
const bossHp = game.duel.bossHp;
game.showSpellbookSetup();
game.showMainMenu();
game.askQuestion();
eq('duel detour restores selected boss HP', game.duel.bossHp, bossHp);
eq('duel detour restores duel question', game.currentQuestion, duelQuestion);
eq('duel detour resumes duel state', game.flow.gameplayState, 'duel-question');

// Winning marks only this Grimoire and renders campaign progress.
game.duel.bossHp = 1;
els['answer-input'].value = correctAnswerFor(game);
game.duelCast(false);
const rootsCampaign = JSON.parse(localStorage.getItem('etymancerCampaign:roots'));
check('campaign victory persists selected boss', rootsCampaign.defeatedBossIds.includes('lexivore'));
check('victory shows 1/6 campaign progress', html().includes('Campaign: 1/6 bosses defeated'));
eq('victory remains a resumable terminal duel state', game.flow.gameplayState, 'duel-victory');

game.openBossCampaignAfterDuel();
check('completed boss card is marked defeated', html().includes('Defeated ✓'));
check('leaving terminal duel for Bosses clears return target', !game.flow.returnTo);

// Campaign progress is independent per Grimoire just like player/mastery progress.
game.selectSpellbookForSetup('words');
eq('switch activates other Grimoire', game.wordSet.id, 'words');
eq('other Grimoire starts with zero defeated bosses', game.campaignProgress().defeated, 0);
game.selectSpellbookForSetup('roots');
eq('roots campaign progress survives switch', game.campaignProgress().defeated, 1);

console.log(`\nRESULT: ${passed} checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

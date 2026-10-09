// Comprehensive playthrough harness for Etymancer's Quest.
// Run from the repository with: node tests/playthrough.js
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

let store = {};
const els = {};
const ID_LIST = ['word-set','level','gold','mana','max-mana','streak','intelligence',
    'strength','armor','weapon','game-area','answer-input','new-game-btn'];

function resetDom() {
    ID_LIST.forEach(id => els[id] = {
        textContent:'', innerHTML:'', value:'', focus(){}, onclick:null,
        querySelector(){ return null; }, appendChild(){}, parentNode:null
    });
}
resetDom();
const timers = [];
global.document = {
    getElementById: id => els[id] || null,
    querySelector: () => null,
    createElement: () => ({
        textContent:'', innerHTML:'', className:'', querySelector(){ return null; },
        appendChild(){}, remove(){}
    })
};
global.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k,v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
};
global.setTimeout = fn => { timers.push(fn); };

function loadGame() {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const inline = html.match(/<script>([\s\S]*?)<\/script>/g).pop()
        .replace(/^<script>/, '').replace(/<\/script>$/, '');
    const src = ['roots.js','words.js','equipment.js']
        .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n')
        + '\n' + inline
        + '\n' + fs.readFileSync(path.join(ROOT, 'mastery.js'), 'utf8')
        + '\nmodule.exports = {game, EtymancerGame, WORD_SETS};';
    const mod = {exports:{}};
    new Function('module','document','localStorage','setTimeout', src)
        (mod, global.document, global.localStorage, global.setTimeout);
    return mod.exports;
}

let pass = 0;
const failures = [];
function check(label, cond, detail='') {
    if (cond) pass++;
    else failures.push(`${label}${detail ? ' — ' + detail : ''}`);
}
function eq(label, actual, expected) {
    check(label, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function section(name) { console.log(`\n=== ${name} ===`); }
const html = () => els['game-area'].innerHTML;
function correctAnswerFor(g) {
    const {type, term} = g.currentAnswer;
    return type === 'definition' ? g.getDefinitionsForTerm(term)[0] : term;
}
function answer(g, value) { els['answer-input'].value = value; g.submitAnswer(); }
function freshGame(setId) {
    store = {}; resetDom(); timers.length = 0;
    const m = loadGame();
    m.game.chooseWordSet(setId);
    m.game.newGame();
    return m;
}

section('1. Boot, lists, save isolation');
{
    store = {}; resetDom();
    const m = loadGame();
    m.game.showStart();
    check('first launch shows picker', html().includes('CHOOSE YOUR SPELLBOOK'));
    m.game.chooseWordSet('roots');
    eq('roots list active', m.game.wordSet.id, 'roots');
    eq('starting INT includes gear', m.game.player.intelligence, 15);
    eq('starting STR', m.game.player.strength, 10);
    m.game.player.gold = 123; m.game.saveGame();
    m.game.chooseWordSet('words');
    eq('words list has independent save', m.game.player.gold, 0);
    m.game.player.gold = 42; m.game.saveGame();
    m.game.chooseWordSet('roots');
    eq('roots save restored', m.game.player.gold, 123);
}

section('2. Casting, streaks, rewards, answer matching');
{
    const {game} = freshGame('roots');
    game.askQuestion();
    const firstGold = game.getGoldReward();
    answer(game, correctAnswerFor(game));
    eq('correct cast increments streak', game.player.streak, 1);
    eq('correct cast awards gold', game.player.gold, firstGold);
    eq('correct cast awards mana', game.player.mana, 5);

    game.askQuestion();
    answer(game, correctAnswerFor(game));
    eq('second correct starts combo', game.getComboMultiplier(), 2);

    game.askQuestion();
    answer(game, 'zzzzz');
    eq('miss resets streak', game.player.streak, 0);
    check('miss reveals answer', /fizzles/i.test(html()));

    const sampleRoot = Object.keys(game.terms)[0];
    const sampleDefinition = game.getDefinitionsForTerm(sampleRoot)[0];
    const significantWord = sampleDefinition.split(/[\s,/]+/)
        .find(word => word.length >= 3 && !['the','and','for','with'].includes(word));
    check('significant definition word accepted', game.isDefinitionMatch(significantWord, sampleDefinition));
    game.currentAnswer = {type:'term', term:sampleRoot, definition:sampleDefinition};
    check('reverse root accepted', game.evaluateAnswer(sampleRoot));
}

section('3. Whole-word list behavior');
{
    const {game} = freshGame('words');
    game.currentAnswer = {type:'definition', term:'acrimonious'};
    check('any listed meaning is accepted', game.getDefinitionsForTerm('acrimonious').every(d => game.evaluateAnswer(d)));
    check('parenthetical context is ignored', game.isDefinitionMatch('mean-spirited', 'mean-spirited (dialogue)'));
    game.currentAnswer = {type:'term', term:'acrimonious', definition:'bitter'};
    check('reverse word accepted', game.evaluateAnswer('acrimonious'));
}

section('4. Shop and gear replacement');
{
    const {game} = freshGame('roots');
    game.player.gold = 1000;
    const s0 = game.player.strength, i0 = game.player.intelligence;
    game.buyItem('leather armor');
    eq('armor purchase replaces old armor STR', game.player.strength, s0 + 5);
    eq('armor purchase removes old armor INT', game.player.intelligence, i0 - 3);
    game.buyItem('magic wand');
    eq('weapon purchase equips wand', game.player.weapon, 'magic wand');
    const before = {str:game.player.strength, int:game.player.intelligence};
    game.equipItem('cloth robe');
    check('vault re-equip changes stats', game.player.strength !== before.str || game.player.intelligence !== before.int);

    const g2 = freshGame('roots').game;
    g2.player.gold = 10000;
    eq('first mana crystal costs 300', g2.manaUpgrade().cost, 300);
    g2.buyManaUpgrade();
    eq('mana crystal raises max mana', g2.player.maxMana, 40);
}

section('5. Duel Cast and Channel');
{
    const {game} = freshGame('roots');
    game.player.mana = 30;
    game.startDuel('Lexivore');
    game.duel.bossHp = game.duel.bossMaxHp = 100000;
    game.duel.playerHp = game.duel.playerMaxHp = 100000;
    game.duelTurn();
    const base = game.baseSpellDamage() + (game.duel.duelStreak + 1) * 2;
    const hp = game.duel.bossHp;
    els['answer-input'].value = correctAnswerFor(game);
    game.duelCast(false);
    eq('normal duel cast deals advertised damage', hp - game.duel.bossHp, base);

    game.duel.bossHp = game.duel.bossMaxHp = 100000;
    game.duel.playerHp = game.duel.playerMaxHp = 100000;
    game.duelTurn();
    const plain = game.baseSpellDamage() + (game.duel.duelStreak + 1) * 2;
    const hp2 = game.duel.bossHp, mana2 = game.player.mana;
    els['answer-input'].value = correctAnswerFor(game);
    game.duelCast(true);
    eq('channel doubles damage', hp2 - game.duel.bossHp, plain * 2);
    eq('channel costs 10 mana', mana2 - game.player.mana, 10);
}

section('6. Legacy save migration');
{
    store = {}; resetDom();
    store.etymancerSave = JSON.stringify({
        player:{level:4,strength:88,intelligence:91,gold:320,mana:12,maxMana:30,streak:3,
            armor:'plate armor',weapon:'magic wand',ownedItems:['cloth robe','wooden staff','plate armor','magic wand']},
        questionsAnswered:41,
        questionPool:[{root:'graph',type:'root'}]
    });
    localStorage.setItem('etymancerWordSet','roots');
    const m = loadGame();
    eq('legacy level kept', m.game.player.level, 4);
    eq('legacy STR normalized to equipped gear', m.game.player.strength, 25);
    eq('legacy INT normalized to equipped gear', m.game.player.intelligence, 20);
    check('legacy save key removed', localStorage.getItem('etymancerSave') === null);
}

section('7. Mastery progression and adaptive review');
{
    const {game} = freshGame('roots');
    const rootTerms = Object.keys(game.terms);
    const term = rootTerms[0];
    const strong = rootTerms[1];
    check('mastery test has two valid roots', Boolean(term && strong));
    eq('fresh term starts New', game.masteryStage(term), 'New');
    eq('New weight', game.masteryWeight(term), 5);

    game.recordMastery(term, true);
    eq('first correct -> Learning', game.masteryStage(term), 'Learning');
    game.recordMastery(term, true);
    game.recordMastery(term, true);
    eq('third correct -> Familiar', game.masteryStage(term), 'Familiar');
    for (let i = 0; i < 3; i++) game.recordMastery(term, true);
    eq('six correct -> Mastered', game.masteryStage(term), 'Mastered');
    eq('Mastered stays in rotation', game.masteryWeight(term), 1);

    game.saveGame();
    const m2 = loadGame();
    eq('mastery survives reload', m2.game.masteryStage(term), 'Mastered');
    eq('attempts survive reload', m2.game.mastery[term]?.attempts, 6);

    m2.game.recordMastery(term, false);
    eq('miss demotes Mastered -> Familiar', m2.game.masteryStage(term), 'Familiar');
    eq('recent miss boosts review weight', m2.game.masteryWeight(term), 4);
    m2.game.recordMastery(term, false);
    eq('second miss demotes Familiar -> Learning', m2.game.masteryStage(term), 'Learning');
    eq('Learning recent-miss weight', m2.game.masteryWeight(term), 6);

    for (let i = 0; i < 6; i++) m2.game.recordMastery(strong, true);
    m2.game.refillQuestionPool();
    const weakCount = m2.game.questionPool.filter(q => q.term === term).length;
    const strongCount = m2.game.questionPool.filter(q => q.term === strong).length;
    check('adaptive pool repeats weak terms more often', weakCount > strongCount, `${weakCount} vs ${strongCount}`);

    const summary = m2.game.masterySummary();
    eq('mastery buckets add to total', summary.New + summary.Learning + summary.Familiar + summary.Mastered, summary.total);

    m2.game.saveGame();
    m2.game.chooseWordSet('words');
    const wordTerm = Object.keys(m2.game.terms)[0];
    m2.game.recordMastery(wordTerm, true);
    eq('other list has independent mastery', m2.game.masteryStage(wordTerm), 'Learning');
    m2.game.newGame();
    eq('New Game resets active mastery', m2.game.masteryStage(wordTerm), 'New');
    m2.game.chooseWordSet('roots');
    eq('other list mastery survives', m2.game.masteryStage(term), 'Learning');
}

console.log(`\n=== RESULT: ${pass} checks passed, ${failures.length} failed ===`);
if (failures.length) {
    console.log('\nFAILURES:');
    failures.forEach(f => console.log(' x ' + f));
    process.exitCode = 1;
}

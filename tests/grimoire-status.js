const fs = require('fs');
const path = require('path');

const savedWords = {
    player: {level: 2},
    questionsAnswered: 7,
    mastery: {
        a: {stage: 'Mastered'},
        b: {stage: 'Mastered'},
        c: {stage: 'Mastered'},
        d: {stage: 'Mastered'}
    }
};

const localStorage = {
    getItem(key) {
        if (key === 'etymancerSave:words') return JSON.stringify(savedWords);
        return null;
    }
};

const WORD_SETS = {
    roots: {
        id: 'roots', name: 'Roots & Affixes', grade: 'harder', termLabel: 'root', blurb: 'Roots',
        terms: Object.fromEntries(Array.from({length: 10}, (_, i) => [`r${i}`, {}]))
    },
    words: {
        id: 'words', name: 'Vocabulary Words', grade: 'easier', termLabel: 'word', blurb: 'Words',
        terms: Object.fromEntries(Array.from({length: 12}, (_, i) => [`w${i}`, {}]))
    }
};

class EtymancerGame {
    constructor() {
        this.wordSet = WORD_SETS.roots;
        this.player = {level: 4};
        this.questionsAnswered = 23;
    }
    escapeHtml(value) { return String(value); }
    masterySummary() { return {Mastered: 6, total: 10}; }
}

const game = new EtymancerGame();
const source = fs.readFileSync(path.join(__dirname, '..', 'grimoire-status.js'), 'utf8');
new Function('EtymancerGame', 'game', 'WORD_SETS', 'localStorage', source)
    (EtymancerGame, game, WORD_SETS, localStorage);

const html = game.renderSpellbookCards();
let failed = 0;
function check(label, condition) {
    if (condition) console.log(`PASS: ${label}`);
    else { failed++; console.error(`FAIL: ${label}`); }
}

check('active Grimoire shows live spell/level/mastery', html.includes('Spell 23 · Level 4 · 6/10 mastered'));
check('inactive Grimoire shows its saved spell/level/mastery', html.includes('Spell 7 · Level 2 · 4/12 mastered'));
check('active Grimoire keeps active treatment', html.includes('spellbook-card active') && html.includes('★ Roots & Affixes'));
check('status is a distinct card line', (html.match(/spellbook-status/g) || []).length === 2);
check('no explanatory save-model copy is added', !/keeps its own progress|independent save/i.test(html));

console.log(`\nRESULT: ${5 - failed} checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

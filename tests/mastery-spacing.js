const fs = require('fs');
const path = require('path');

class EtymancerGame {
    constructor() {
        this.terms = {};
        this.mastery = {};
        this.masterySequence = 0;
        this.questionPool = [];
    }
    ensureMastery() {}
    masteryWeight(term) {
        return this.mastery[term]?.weight || 1;
    }
    shuffleArray() {}
}

const game = new EtymancerGame();
const source = fs.readFileSync(path.join(__dirname, '..', 'mastery-spacing.js'), 'utf8');
new Function('EtymancerGame', 'game', source)(EtymancerGame, game);

let failed = 0;
function check(label, condition, detail = '') {
    if (condition) console.log(`PASS: ${label}`);
    else {
        failed++;
        console.error(`FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    }
}
function countTerm(term) {
    return game.questionPool.filter(q => q.term === term).length;
}
function typesFor(term) {
    return new Set(game.questionPool.filter(q => q.term === term).map(q => q.type));
}

// Normal-sized list: recent terms are excluded entirely, regardless of direction.
game.terms = {alpha:{}, beta:{}, gamma:{}, delta:{}, epsilon:{}};
game.masterySequence = 10;
game.mastery = {
    alpha: {lastSeen: 10, weight: 4},
    beta: {lastSeen: 9, weight: 4},
    gamma: {lastSeen: 8, weight: 4},
    delta: {lastSeen: 7, weight: 4},
    epsilon: {lastSeen: 0, weight: 1}
};
game.refillQuestionPool();
check('most recent term is excluded', countTerm('alpha') === 0);
check('second-most recent term is excluded', countTerm('beta') === 0);
check('third-most recent term is excluded', countTerm('gamma') === 0);
check('term returns after three intervening answers', countTerm('delta') > 0);
check('both directions obey the same spacing rule', typesFor('alpha').size === 0 && typesFor('delta').size === 2);

// Adaptive weighting is preserved among candidates that are eligible.
game.mastery.delta.weight = 4;
game.mastery.epsilon.weight = 1;
game.refillQuestionPool();
check('weaker eligible term still receives higher exposure', countTerm('delta') > countTerm('epsilon'), `${countTerm('delta')} vs ${countTerm('epsilon')}`);

// Two-term lists relax enough to alternate instead of exhausting the pool.
game.terms = {alpha:{}, beta:{}};
game.masterySequence = 20;
game.mastery = {
    alpha: {lastSeen: 20, weight: 4},
    beta: {lastSeen: 19, weight: 4}
};
game.refillQuestionPool();
check('small list relaxes spacing', game.questionPool.length > 0);
check('small list still prevents immediate repeat', countTerm('alpha') === 0 && countTerm('beta') > 0);

// One-term lists remain playable.
game.terms = {alpha:{}};
game.masterySequence = 30;
game.mastery = {alpha: {lastSeen: 30, weight: 4}};
game.refillQuestionPool();
check('one-term list gracefully relaxes all spacing', countTerm('alpha') > 0);

console.log(`\nRESULT: ${9 - failed} checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

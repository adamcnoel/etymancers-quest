const fs = require('fs');
const path = require('path');

let html = '';
const gameArea = {
    get innerHTML() { return html; },
    set innerHTML(value) { html = value; }
};

global.document = {
    getElementById: id => id === 'game-area' ? gameArea : null,
    querySelector: () => null,
    createElement: () => ({
        setAttribute(){}, appendChild(){}, className:'', innerHTML:'', onclick:null
    })
};

class EtymancerGame {
    showShop() {
        document.getElementById('game-area').innerHTML = `
            <div>✓ magic wand: 80 gold (+0 STR, +8 INT for you)</div>
            <div>▸ equip cloth robe (+0 STR, +3 INT for you)</div>`;
    }
    showStart() {}
    askQuestion() {}
    showCastResult() {}
    offerBossFight() {}
    duelTurn() {}
    winDuel() {}
    loseDuel() {}
    showPurchaseResult() {}
    showPurchaseFailure() {}
    showHelp() {}
    updateStats() {}
}

global.EtymancerGame = EtymancerGame;
global.game = new EtymancerGame();
global.WORD_SETS = {};
global.localStorage = {getItem: () => null};

const ui = fs.readFileSync(path.join(__dirname, '..', 'ui.js'), 'utf8');
new Function(ui)();

global.game.showShop();

if (/for you/i.test(html)) {
    console.error('FAIL: Arcane Emporium still contains redundant "for you" copy.');
    process.exit(1);
}

console.log('RESULT: shop copy regression passed');

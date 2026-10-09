const fs = require('fs');
const path = require('path');

let html = '';
global.document = {
    getElementById: id => id === 'game-area' ? {
        get innerHTML() { return html; },
        set innerHTML(value) { html = value; }
    } : null
};

class EtymancerGame {
    showShop() {
        document.getElementById('game-area').innerHTML = `
            <div>✓ magic wand: 80 gold (+0 STR, +8 INT for you)</div>
            <div>▸ equip cloth robe (+0 STR, +3 INT for you)</div>`;
    }
}
global.EtymancerGame = EtymancerGame;

const ui = fs.readFileSync(path.join(__dirname, '..', 'ui.js'), 'utf8');
new Function('EtymancerGame', 'document', ui)(EtymancerGame, global.document);

const game = new EtymancerGame();
game.showShop();

if (/for you/i.test(html)) {
    console.error('FAIL: Arcane Emporium still contains redundant "for you" copy.');
    process.exit(1);
}

console.log('RESULT: shop copy regression passed');

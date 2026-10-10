const fs = require('fs');
const path = require('path');

let html = '';
const gameArea = {};
Object.defineProperty(gameArea, 'innerHTML', {
    get() { return html; },
    set(value) { html = String(value); }
});

global.document = {
    getElementById(id) { return id === 'game-area' ? gameArea : null; }
};

class EtymancerGame {
    constructor() {
        this.wordSet = {name: 'Roots'};
        this.questionsAnswered = 8;
        this.player = {
            armor: 'leather armor',
            weapon: 'wooden staff',
            ownedItems: ['cloth robe', 'leather armor', 'wooden staff']
        };
        this.shopItems = {
            'cloth robe': {type:'armor', strength:0, intelligence:3},
            'leather armor': {type:'armor', strength:5, intelligence:0},
            'wooden staff': {type:'weapon', strength:0, intelligence:2}
        };
        this.lastScreen = null;
        this.equipped = null;
    }
    escapeHtml(value) { return String(value); }
    setScreen(name) { this.lastScreen = name; }
    showSpellbookSetup() {}
    netVsEquipped(itemName) {
        if (itemName === 'cloth robe') return {strength:-5, intelligence:3};
        return {strength:0, intelligence:0};
    }
    renderStatDelta(net) {
        return `${net.strength >= 0 ? '+' : ''}${net.strength} STR, ${net.intelligence >= 0 ? '+' : ''}${net.intelligence} INT`;
    }
    equipItem(itemName) {
        this.equipped = itemName;
        const item = this.shopItems[itemName];
        if (item.type === 'armor') this.player.armor = itemName;
        else this.player.weapon = itemName;
    }
    showCharacterSheet() {
        gameArea.innerHTML = '<div>Equipment</div><button onclick="game.showShop()">Open Emporium</button>';
    }
    showShop() {
        gameArea.innerHTML = '<div>=== ARCANE EMPORIUM ===</div><br><div>=== YOUR VAULT ===</div><div class="shop-item">old robe</div><div class="input-area"><button>Back</button></div><div class="view-actions secondary-actions"><button onclick="game.showCharacterSheet()">Etymancer</button><button onclick="game.showMainMenu()">Main Menu</button></div>';
    }
}

const game = new EtymancerGame();
const source = fs.readFileSync(path.join(__dirname, '..', 'inventory.js'), 'utf8');
new Function('EtymancerGame', 'game', 'document', source)(EtymancerGame, game, global.document);

let failed = 0;
function check(label, condition) {
    if (condition) console.log(`PASS: ${label}`);
    else { failed++; console.error(`FAIL: ${label}`); }
}

game.showInventory();
check('Inventory uses dedicated screen state', game.lastScreen === 'inventory');
check('Inventory renders owned armor', html.includes('cloth robe') && html.includes('leather armor'));
check('Inventory renders owned weapon', html.includes('wooden staff'));
check('equipped items are marked equipped', html.includes('leather armor') && html.includes('Equipped'));
check('stored gear can be equipped', html.includes("equipInventoryItem('cloth robe')"));
check('Inventory offers casting return', html.includes('game.resumeCasting()'));

game.equipInventoryItem('cloth robe');
check('Inventory reuses core equip logic', game.equipped === 'cloth robe' && game.player.armor === 'cloth robe');
check('Inventory rerenders after equip', html.includes('cloth robe') && html.includes('Equipped'));

game.showCharacterSheet();
check('Character Sheet links to Inventory', html.includes('Open Inventory'));

game.showShop();
check('Emporium no longer renders legacy Vault', !html.includes('YOUR VAULT') && !html.includes('old robe'));
check('Emporium links to Inventory', html.includes('>Inventory</button>'));

console.log(`\nRESULT: ${11 - failed} checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

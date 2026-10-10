const fs = require('fs');
const path = require('path');

let html = '';
const input = {value:'', focus(){}};
const gameArea = {get innerHTML(){return html;}, set innerHTML(v){html=v;}};
global.document = {getElementById(id){ if (id === 'game-area') return gameArea; if (id === 'answer-input') return input; return null; }};

class EtymancerGame {
    constructor() {
        this.currentQuestion = "What root means 'old'?";
        this.player = {mana:30, maxMana:30};
        this.duel = {bossName:'Lexivore', bossHp:80, bossMaxHp:100, playerHp:90, playerMaxHp:100, bossHit:18, duelStreak:0, channelArmed:false};
    }
    duelTurn() {}
    baseSpellDamage(){ return 31; }
    renderBar(){ return '████'; }
    armChannel(on){ this.duel.channelArmed = on; }
    duelCast() {}
}
global.EtymancerGame = EtymancerGame;

const source = fs.readFileSync(path.join(__dirname, '..', 'duel-copy.js'), 'utf8');
new Function(source)();
const game = new EtymancerGame();
game.duelTurn();

if (!html.includes("What root means 'old'?")) process.exit(1);
if (!html.includes('⚡ 33 damage · 🔥 66 channeled (10 mana) · Miss: −18 HP')) process.exit(1);
if (!html.includes('Channel with Enter')) process.exit(1);
if (/Answer to strike|Your spell damage:|doubles that whole number/.test(html)) process.exit(1);

game.renderDuelQuestionState({draft:'par'});
if (input.value !== 'par') process.exit(1);
console.log('RESULT: concise duel copy regression passed');

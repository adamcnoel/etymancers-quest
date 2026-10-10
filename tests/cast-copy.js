const fs = require('fs');
const path = require('path');

let captured = null;
class EtymancerGame {
    showCastResult(resultText, userAnswer) { captured = {resultText, userAnswer}; }
}
global.EtymancerGame = EtymancerGame;

const source = fs.readFileSync(path.join(__dirname, '..', 'cast-copy.js'), 'utf8');
new Function(source)();

const game = new EtymancerGame();
game.showCastResult('<div class="correct">ok</div><div class="examples">Keep your streak alive for even bigger hauls — gold buys gear, mana powers duel Channels.</div>', 'x');
if (!captured || /Keep your streak alive/.test(captured.resultText)) process.exit(1);
game.showCastResult('<div class="correct">ok</div><div class="examples">Answer correctly again to start a combo and multiply your rewards.</div>', 'x');
if (/Answer correctly again/.test(captured.resultText)) process.exit(1);
console.log('RESULT: concise cast copy regression passed');

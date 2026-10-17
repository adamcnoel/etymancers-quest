// Keep successful casting feedback focused on the result itself.
(function () {
    if (typeof EtymancerGame === 'undefined') return;

    const proto = EtymancerGame.prototype;
    if (proto.__castCopyInstalled) return;
    proto.__castCopyInstalled = true;

    const originalShowCastResult = proto.showCastResult;

    proto.showCastResult = function (resultText, userAnswer) {
        const cleaned = String(resultText || '')
            .replace(/\s*<div class="examples">Keep your streak alive for even bigger hauls — gold buys gear, mana powers duel Channels\.<\/div>/g, '')
            .replace(/\s*<div class="examples">Answer correctly again to start a combo and multiply your rewards\.<\/div>/g, '');
        return originalShowCastResult.call(this, cleaned, userAnswer);
    };
})();

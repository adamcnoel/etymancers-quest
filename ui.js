// Lightweight UI patches that live outside the core game loop.
(function () {
    if (typeof EtymancerGame === 'undefined') return;

    const proto = EtymancerGame.prototype;
    const originalShowShop = proto.showShop;

    proto.showShop = function () {
        const result = originalShowShop.call(this);
        const area = document.getElementById('game-area');
        if (area) {
            area.innerHTML = area.innerHTML.replace(/ for you(?=\))/g, '');
        }
        return result;
    };
})();

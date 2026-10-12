// Etymancer Level is intentionally hidden until #34 defines a real progression model.
// Keep the legacy field internally for save/mechanics compatibility, but do not
// present it to players as though it were an XP-backed progression system.
(function () {
    if (typeof EtymancerGame === 'undefined' || typeof game === 'undefined') return;

    const proto = EtymancerGame.prototype;
    if (proto.__levelHoldInstalled) return;
    proto.__levelHoldInstalled = true;

    const originalUpdateCompactHud = proto.updateCompactHud;
    const originalShowMainMenu = proto.showMainMenu;
    const originalShowCharacterSheet = proto.showCharacterSheet;
    const originalShowResetConfirm = proto.showResetConfirm;

    function area() {
        return document.getElementById('game-area');
    }

    function scrubLevelCopy() {
        const gameArea = area();
        if (!gameArea || typeof gameArea.innerHTML !== 'string') return;
        gameArea.innerHTML = gameArea.innerHTML
            .replace(/\s*·\s*Level\s+\d+/g, '')
            .replace(/Level\s+\d+\s+([^<]+Etymancer)/g, '$1')
            .replace(/resets level, gold,/gi, 'resets gold,');
    }

    if (originalUpdateCompactHud) {
        proto.updateCompactHud = function () {
            const result = originalUpdateCompactHud.call(this);
            const hud = document.getElementById('compact-hud');
            if (hud && typeof hud.innerHTML === 'string') {
                hud.innerHTML = hud.innerHTML.replace(/\s*<span class="hud-primary">Lv\s+\d+<\/span>/, '');
            }
            return result;
        };
    }

    if (originalShowMainMenu) {
        proto.showMainMenu = function () {
            const result = originalShowMainMenu.call(this);
            scrubLevelCopy();
            return result;
        };
    }

    if (originalShowCharacterSheet) {
        proto.showCharacterSheet = function () {
            const result = originalShowCharacterSheet.call(this);
            scrubLevelCopy();
            return result;
        };
    }

    if (originalShowResetConfirm) {
        proto.showResetConfirm = function () {
            const result = originalShowResetConfirm.call(this);
            scrubLevelCopy();
            return result;
        };
    }
})();

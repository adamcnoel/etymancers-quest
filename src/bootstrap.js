// Browser-only extension bootstrap. Runtime feature layers depend on the
// EtymancerGame class and global game instance defined by index.html.
(function () {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // index.html constructs the game synchronously before this script runs. Keep
    // the neutral loading shell visible while the extension stack installs so
    // no legacy/intermediate menu can become the first painted application UI.
    const loadingArea = typeof document.getElementById === 'function'
        ? document.getElementById('game-area')
        : null;
    if (loadingArea) {
        loadingArea.innerHTML = '<div>Welcome, Etymancer!</div><p>Loading your spellbook…</p>';
    }

    window.addEventListener('DOMContentLoaded', () => {
        const extensions = [
            'src/core/mastery.js',
            'src/core/mastery-spacing.js',
            'src/ui/ui.js',
            'src/ui/grimoire-status.js',
            'src/ui/grimoire-sort.js',
            'src/features/boss-flow.js',
            'src/ui/cast-copy.js',
            'src/core/flow-state.js',
            'src/ui/duel-copy.js',
            'src/ui/ui-navigation.js',
            'src/data/bosses.js',
            'src/features/boss-campaign.js',
            'src/features/level-hold.js',
            'src/features/inventory.js',
            'src/features/boss-mechanics.js',
            'src/dev/debug.js'
        ];

        // ui.js and ui-navigation.js historically render as they install. Mask
        // those installation-time calls on the game instance; once every layer
        // is present, reveal the final prototype implementation and render once.
        const canGuardMenu = typeof game !== 'undefined' && game;
        const hadOwnShowMainMenu = canGuardMenu
            ? Object.prototype.hasOwnProperty.call(game, 'showMainMenu')
            : false;
        const previousOwnShowMainMenu = hadOwnShowMainMenu ? game.showMainMenu : null;
        if (canGuardMenu) game.showMainMenu = () => {};

        // One fresh token per page load prevents stale extension code from
        // surviving deployments while leaving persistent game data untouched.
        const cacheToken = Date.now();
        const finishBootstrap = () => {
            if (!canGuardMenu) return;
            if (hadOwnShowMainMenu) game.showMainMenu = previousOwnShowMainMenu;
            else delete game.showMainMenu;
            if (typeof game.showStart === 'function') game.showStart();
        };
        const loadNext = index => {
            if (index >= extensions.length) {
                finishBootstrap();
                return;
            }
            const script = document.createElement('script');
            script.src = `${extensions[index]}?v=${cacheToken}`;
            script.onload = () => loadNext(index + 1);
            document.body.appendChild(script);
        };
        loadNext(0);
    });
})();

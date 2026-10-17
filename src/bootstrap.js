// Browser-only extension bootstrap. Runtime feature layers depend on the
// EtymancerGame class and global game instance defined by index.html.
(function () {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

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
            'src/dev/debug.js'
        ];

        // One fresh token per page load prevents stale extension code from
        // surviving deployments while leaving persistent game data untouched.
        const cacheToken = Date.now();
        const loadNext = index => {
            if (index >= extensions.length) return;
            const script = document.createElement('script');
            script.src = `${extensions[index]}?v=${cacheToken}`;
            script.onload = () => loadNext(index + 1);
            document.body.appendChild(script);
        };
        loadNext(0);
    });
})();

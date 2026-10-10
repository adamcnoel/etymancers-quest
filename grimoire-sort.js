// Keep Grimoire review rows in a stable alphabetical order without changing
// the underlying word-set/question-pool order used by gameplay.
(function () {
    if (typeof EtymancerGame === 'undefined') return;

    const proto = EtymancerGame.prototype;
    if (proto.__grimoireSortInstalled) return;
    proto.__grimoireSortInstalled = true;

    const originalRenderGrimoireRows = proto.renderGrimoireRows;
    if (typeof originalRenderGrimoireRows !== 'function') return;

    proto.renderGrimoireRows = function () {
        if (!this.terms || typeof this.terms !== 'object') {
            return originalRenderGrimoireRows.call(this);
        }

        const originalTerms = this.terms;
        const sortedEntries = Object.entries(originalTerms).sort(([a], [b]) =>
            a.localeCompare(b, undefined, {sensitivity: 'base'})
        );

        // The renderer reads Object.keys(this.terms). Swap in an ordered view
        // only for rendering, then restore the authoritative object immediately.
        this.terms = Object.fromEntries(sortedEntries);
        try {
            return originalRenderGrimoireRows.call(this);
        } finally {
            this.terms = originalTerms;
        }
    };
})();

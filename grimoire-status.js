// Saved-progress status for each Grimoire card.
// Loaded after ui.js so the selector can expose each Grimoire's independent save.
(function () {
    if (typeof EtymancerGame === 'undefined' || typeof game === 'undefined' || typeof WORD_SETS === 'undefined') return;

    const proto = EtymancerGame.prototype;
    if (proto.__grimoireStatusInstalled) return;
    proto.__grimoireStatusInstalled = true;

    function safe(text) {
        return game.escapeHtml ? game.escapeHtml(text) : String(text);
    }

    function savedStatus(instance, set) {
        const count = Object.keys(set.terms).length;
        const active = instance.wordSet && instance.wordSet.id === set.id;

        if (active && instance.player) {
            const summary = typeof instance.masterySummary === 'function'
                ? instance.masterySummary()
                : {Mastered: 0, total: count};
            const spell = Number(instance.questionsAnswered) || 0;
            return {
                spell,
                level: Number(instance.player.level) || 1,
                mastered: Number(summary.Mastered) || 0,
                total: Number(summary.total) || count
            };
        }

        try {
            const saved = localStorage.getItem(`etymancerSave:${set.id}`);
            if (!saved) return {spell: 0, level: 1, mastered: 0, total: count};

            const state = JSON.parse(saved);
            const mastery = state.mastery || {};
            return {
                spell: Number(state.questionsAnswered) || 0,
                level: Number(state.player?.level) || 1,
                mastered: Object.values(mastery).filter(record => record?.stage === 'Mastered').length,
                total: count
            };
        } catch (err) {
            return {spell: 0, level: 1, mastered: 0, total: count};
        }
    }

    proto.renderSpellbookCards = function () {
        return Object.values(WORD_SETS).map(set => {
            const active = this.wordSet && set.id === this.wordSet.id;
            const count = Object.keys(set.terms).length;
            const status = savedStatus(this, set);
            const progress = status.spell > 0 ? `Spell ${status.spell}` : 'Not started';

            return `<button class="spellbook-card ${active ? 'active' : ''}" onclick="game.selectSpellbookForSetup('${set.id}')">
                <span class="spellbook-name">${active ? '★ ' : ''}${safe(set.name)}</span>
                <span class="spellbook-meta">${safe(set.grade)} · ${count} ${safe(set.termLabel)}s</span>
                <span class="spellbook-status">${progress} · Level ${status.level} · ${status.mastered}/${status.total} mastered</span>
                <span class="spellbook-blurb">${safe(set.blurb)}</span>
            </button>`;
        }).join('');
    };
})();

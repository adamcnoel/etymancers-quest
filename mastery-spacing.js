// Recency guard for adaptive mastery review.
// Keeps weaker material weighted more heavily while preventing one term from
// monopolizing a short session. Loaded after mastery.js.
(function () {
    if (typeof EtymancerGame === 'undefined' || typeof game === 'undefined') return;

    const proto = EtymancerGame.prototype;
    if (proto.__masterySpacingInstalled) return;
    proto.__masterySpacingInstalled = true;

    const NORMAL_GAP = 3;

    function eligibleTerms(instance, minimumGap) {
        return Object.keys(instance.terms || {}).filter(term => {
            const record = instance.mastery && instance.mastery[term];
            const lastSeen = record && Number.isFinite(record.lastSeen) ? record.lastSeen : 0;
            if (!lastSeen) return true;
            return (instance.masterySequence - lastSeen) >= minimumGap;
        });
    }

    proto.refillQuestionPool = function () {
        this.ensureMastery();
        this.questionPool = [];

        const allTerms = Object.keys(this.terms || {});
        if (!allTerms.length) return;

        // Prefer three other answered terms between appearances. If the active
        // list is too small to satisfy that, relax one step at a time. A
        // two-term list therefore alternates instead of dead-ending; a one-term
        // list still remains playable.
        let candidates = [];
        for (let gap = NORMAL_GAP; gap >= 1; gap--) {
            candidates = eligibleTerms(this, gap);
            if (candidates.length) break;
        }
        if (!candidates.length) candidates = allTerms;

        candidates.forEach(term => {
            const weight = this.masteryWeight(term);
            for (let i = 0; i < weight; i++) {
                // Both directions share the same spacing because they test the
                // same underlying vocabulary item.
                this.questionPool.push({term, type: 'definition'});
                this.questionPool.push({term, type: 'term'});
            }
        });

        this.shuffleArray(this.questionPool);
    };
})();
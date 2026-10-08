// Per-term learning progress and adaptive review for Etymancer's Quest.
// Loaded after the core game has started; patches the game class without
// coupling the main RPG loop to the learning-model details.
(function () {
    const STAGES = ["New", "Learning", "Familiar", "Mastered"];
    const BASE_WEIGHTS = {
        New: 5,
        Learning: 4,
        Familiar: 2,
        Mastered: 1
    };

    function blankMastery() {
        return {
            attempts: 0,
            correct: 0,
            misses: 0,
            correctStreak: 0,
            stage: "New",
            lastSeen: 0
        };
    }

    function installMasterySystem() {
        if (typeof EtymancerGame === "undefined" || typeof game === "undefined") return;

        const proto = EtymancerGame.prototype;
        if (proto.__masteryInstalled) return;
        proto.__masteryInstalled = true;

        const originalSaveGame = proto.saveGame;
        const originalLoadGame = proto.loadGame;
        const originalNewGame = proto.newGame;
        const originalSubmitAnswer = proto.submitAnswer;
        const originalSkipQuestion = proto.skipQuestion;
        const originalDuelCast = proto.duelCast;
        const originalUpdateStats = proto.updateStats;
        const originalShowStart = proto.showStart;
        const originalShowHelp = proto.showHelp;

        proto.ensureMastery = function () {
            if (!this.mastery || typeof this.mastery !== "object") this.mastery = {};
            if (!Number.isFinite(this.masterySequence)) this.masterySequence = 0;

            Object.keys(this.terms).forEach(term => {
                const existing = this.mastery[term];
                if (!existing || typeof existing !== "object") {
                    this.mastery[term] = blankMastery();
                    return;
                }

                // Backfill future-safe defaults and sanitize older/partial data.
                this.mastery[term] = {...blankMastery(), ...existing};
                if (!STAGES.includes(this.mastery[term].stage)) {
                    this.mastery[term].stage = "New";
                }
            });
        };

        proto.hydrateMastery = function () {
            this.mastery = {};
            this.masterySequence = 0;

            try {
                const saved = localStorage.getItem(this.saveKey());
                if (saved) {
                    const state = JSON.parse(saved);
                    this.mastery = state.mastery || {};
                    this.masterySequence = state.masterySequence || 0;
                }
            } catch (err) {
                // A damaged mastery payload should never make the game unplayable.
                this.mastery = {};
                this.masterySequence = 0;
            }

            this.ensureMastery();
        };

        proto.masteryStage = function (term) {
            this.ensureMastery();
            return this.mastery[term] ? this.mastery[term].stage : "New";
        };

        proto.masteryWeight = function (term) {
            this.ensureMastery();
            const record = this.mastery[term] || blankMastery();
            let weight = BASE_WEIGHTS[record.stage] || BASE_WEIGHTS.New;

            // A recent miss should come back sooner until the learner proves it
            // again with a correct answer. Mastered terms still reappear, just
            // much less often than material that needs work.
            if (record.misses > 0 && record.correctStreak === 0 && record.stage !== "Mastered") {
                weight += 2;
            }
            return weight;
        };

        proto.refillQuestionPool = function () {
            this.ensureMastery();
            this.questionPool = [];

            Object.keys(this.terms).forEach(term => {
                const weight = this.masteryWeight(term);
                for (let i = 0; i < weight; i++) {
                    // Keep both recall directions equally represented.
                    this.questionPool.push({term, type: "definition"});
                    this.questionPool.push({term, type: "term"});
                }
            });
            this.shuffleArray(this.questionPool);
        };

        proto.recordMastery = function (term, correct) {
            if (!term || !this.terms[term]) return null;
            this.ensureMastery();

            const record = this.mastery[term];
            const before = record.stage;
            record.attempts += 1;
            record.lastSeen = ++this.masterySequence;

            if (correct) {
                record.correct += 1;
                record.correctStreak += 1;

                if (record.stage === "New") {
                    record.stage = "Learning";
                } else if (record.stage === "Learning" &&
                           record.correct >= 3 && record.correctStreak >= 2) {
                    record.stage = "Familiar";
                } else if (record.stage === "Familiar" &&
                           record.correct >= 6 && record.correctStreak >= 3) {
                    record.stage = "Mastered";
                }
            } else {
                record.misses += 1;
                record.correctStreak = 0;

                // One miss does not erase everything learned, but it does move
                // advanced material back into heavier review.
                if (record.stage === "Mastered") record.stage = "Familiar";
                else if (record.stage === "Familiar") record.stage = "Learning";
            }

            // Rebuild before the next question so the new learning state affects
            // selection immediately instead of waiting for an old pool to drain.
            this.questionPool = [];

            return {
                term,
                correct,
                before,
                after: record.stage,
                attempts: record.attempts,
                correctCount: record.correct
            };
        };

        proto.masteryTermForAnswer = function (userAnswer) {
            if (!this.currentAnswer) return null;
            if (this.currentAnswer.type === "definition") return this.currentAnswer.term;

            // When several words share a meaning, credit the word the player
            // actually recalled rather than an arbitrary canonical pool entry.
            const typed = String(userAnswer || "").trim().toLowerCase();
            const valid = this.getTermsForDefinition(this.currentAnswer.definition);
            if (valid.includes(typed)) return typed;
            return this.currentAnswer.term;
        };

        proto.masterySummary = function () {
            this.ensureMastery();
            const summary = {New: 0, Learning: 0, Familiar: 0, Mastered: 0};
            Object.keys(this.terms).forEach(term => {
                summary[this.masteryStage(term)] += 1;
            });
            summary.total = Object.keys(this.terms).length;
            return summary;
        };

        proto.renderMasteryFeedback = function (change) {
            if (!change) return;
            const area = document.getElementById("game-area");
            if (!area) return;
            const inputArea = area.querySelector(".input-area");
            if (!inputArea) return;

            const old = area.querySelector(".mastery-feedback");
            if (old) old.remove();

            let text;
            if (change.after !== change.before) {
                text = change.correct
                    ? `✦ Mastery advanced: ${change.term} — ${change.before} → ${change.after}`
                    : `Mastery review: ${change.term} — ${change.before} → ${change.after}`;
            } else {
                text = `Mastery: ${change.term} — ${change.after}`;
            }

            const line = document.createElement("div");
            line.className = "examples mastery-feedback";
            line.textContent = text;
            inputArea.parentNode.insertBefore(line, inputArea);
        };

        proto.updateMasteryStat = function () {
            const panel = document.querySelector(".stats-panel");
            if (!panel || !this.wordSet || !this.player) return;

            let row = document.getElementById("mastery-stat-row");
            if (!row) {
                row = document.createElement("div");
                row.className = "stat-line";
                row.id = "mastery-stat-row";
                row.innerHTML = 'Mastered: <span id="mastery-count">0 / 0</span>';

                const streakRow = document.getElementById("streak")?.parentElement;
                if (streakRow && streakRow.nextSibling) {
                    panel.insertBefore(row, streakRow.nextSibling);
                } else {
                    panel.appendChild(row);
                }
            }

            const summary = this.masterySummary();
            document.getElementById("mastery-count").textContent =
                `${summary.Mastered} / ${summary.total}`;
        };

        proto.appendMasterySummary = function () {
            const area = document.getElementById("game-area");
            if (!area || !this.wordSet) return;
            const summary = this.masterySummary();
            const existing = area.querySelector(".mastery-summary");
            if (existing) existing.remove();

            const line = document.createElement("div");
            line.className = "examples mastery-summary";
            line.textContent = `Mastery: ${summary.Mastered}/${summary.total} mastered · ${summary.Familiar} familiar · ${summary.Learning} learning · ${summary.New} new.`;
            const inputArea = area.querySelector(".input-area");
            if (inputArea) inputArea.parentNode.insertBefore(line, inputArea);
            else area.appendChild(line);
        };

        proto.saveGame = function () {
            originalSaveGame.call(this);
            if (!this.wordSet) return;
            this.ensureMastery();

            try {
                const state = JSON.parse(localStorage.getItem(this.saveKey()) || "{}");
                state.mastery = this.mastery;
                state.masterySequence = this.masterySequence;
                localStorage.setItem(this.saveKey(), JSON.stringify(state));
            } catch (err) {
                // Leave the core save intact if mastery serialization ever fails.
            }
        };

        proto.loadGame = function () {
            // Prevent a patched adaptive refill during the core load from using
            // mastery data belonging to the previously active word list.
            this.mastery = {};
            this.masterySequence = 0;
            originalLoadGame.call(this);
            this.hydrateMastery();
            this.refillQuestionPool();
            this.saveGame();
            this.updateMasteryStat();
        };

        proto.newGame = function () {
            this.mastery = {};
            this.masterySequence = 0;
            this.ensureMastery();
            originalNewGame.call(this);
            this.refillQuestionPool();
            this.saveGame();
            this.updateMasteryStat();
        };

        proto.submitAnswer = function () {
            const input = document.getElementById("answer-input");
            const answer = input ? input.value.trim().toLowerCase() : "";
            if (!answer) return originalSubmitAnswer.call(this);

            const correct = this.evaluateAnswer(answer);
            const term = this.masteryTermForAnswer(answer);
            const result = originalSubmitAnswer.call(this);
            const change = this.recordMastery(term, correct);
            this.saveGame();
            this.updateStats();
            this.renderMasteryFeedback(change);
            return result;
        };

        proto.skipQuestion = function () {
            const term = this.currentAnswer ? this.currentAnswer.term : null;
            const result = originalSkipQuestion.call(this);
            const change = this.recordMastery(term, false);
            this.saveGame();
            this.updateStats();
            this.renderMasteryFeedback(change);
            return result;
        };

        proto.duelCast = function (channel) {
            const input = document.getElementById("answer-input");
            const answer = input ? input.value.trim().toLowerCase() : "";
            if (!answer) return originalDuelCast.call(this, channel);

            const correct = this.evaluateAnswer(answer);
            const term = this.masteryTermForAnswer(answer);
            const result = originalDuelCast.call(this, channel);
            const change = this.recordMastery(term, correct);
            this.saveGame();
            this.updateStats();
            this.renderMasteryFeedback(change);
            return result;
        };

        proto.updateStats = function () {
            originalUpdateStats.call(this);
            this.updateMasteryStat();
        };

        proto.showStart = function () {
            const result = originalShowStart.call(this);
            this.appendMasterySummary();
            return result;
        };

        proto.showHelp = function () {
            const result = originalShowHelp.call(this);
            if (!this.wordSet) return result;

            const area = document.getElementById("game-area");
            const inputArea = area ? area.querySelector(".input-area") : null;
            if (!area || !inputArea || area.querySelector(".mastery-help")) return result;

            const section = document.createElement("div");
            section.className = "mastery-help";
            section.innerHTML = `
                <br>
                <div class="combo">Mastery &amp; review</div>
                <div class="examples">
                    Every ${this.wordSet.termLabel} moves through New → Learning → Familiar → Mastered.
                    Correct recalls advance mastery; misses move advanced material back into review.
                    New, learning, and recently missed material appears more often, while mastered
                    material still returns occasionally so it stays fresh.
                </div>`;
            inputArea.parentNode.insertBefore(section, inputArea);
            return result;
        };

        // The current game was constructed before this file loaded, so hydrate it
        // once now. Future word-list switches and new games use the patched hooks.
        game.hydrateMastery();
        game.refillQuestionPool();
        game.saveGame();
        game.updateStats();
        game.appendMasterySummary();
    }

    installMasterySystem();
})();

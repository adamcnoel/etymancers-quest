// Explicit navigation/gameplay flow state for Etymancer's Quest.
//
// Persistent player/study data remains in the existing localStorage saves. This
// layer only remembers which logical screen the current page session is showing
// so side-screen detours can return without inferring state from rendered DOM.
(function () {
    if (typeof EtymancerGame === 'undefined' || typeof game === 'undefined') return;

    const proto = EtymancerGame.prototype;
    if (proto.__flowStateInstalled) return;
    proto.__flowStateInstalled = true;

    const originalSetScreen = proto.setScreen;
    const originalAskQuestion = proto.askQuestion;
    const originalShowCastResult = proto.showCastResult;
    const originalOfferBossFight = proto.offerBossFight;
    const originalDuelTurn = proto.duelTurn;
    const originalDuelCast = proto.duelCast;
    const originalWinDuel = proto.winDuel;
    const originalLoseDuel = proto.loseDuel;
    const originalSubmitAnswer = proto.submitAnswer;
    const originalSkipQuestion = proto.skipQuestion;
    const originalNewGame = proto.newGame;

    const BOSS_NAMES = [
        'Gorgon of Garbled Roots',
        'Lexivore',
        'The Babbling Wyrm',
        'Warden of Lost Meanings',
        'Etymophage'
    ];

    function area() {
        return document.getElementById('game-area');
    }

    function currentInputValue() {
        const input = document.getElementById('answer-input');
        return input ? input.value : '';
    }

    function restoreDraft(payload) {
        const input = document.getElementById('answer-input');
        if (!input) return;
        input.value = payload?.draft || '';
        input.focus();
    }

    function masterySnapshot(instance, answer, correctOverride) {
        if (!instance.currentAnswer || typeof instance.masteryStage !== 'function') return null;
        let term = instance.currentAnswer.term;
        if (typeof instance.masteryTermForAnswer === 'function') {
            term = instance.masteryTermForAnswer(answer) || term;
        }
        if (!term) return null;
        return {
            term,
            before: instance.masteryStage(term),
            correct: correctOverride
        };
    }

    function finishMasterySnapshot(instance, snapshot) {
        if (!snapshot || typeof instance.masteryStage !== 'function') return null;
        return {...snapshot, after: instance.masteryStage(snapshot.term)};
    }

    function masteryMarkup(snapshot) {
        if (!snapshot || !snapshot.term || !snapshot.after) return '';
        let text;
        if (snapshot.after !== snapshot.before) {
            text = snapshot.correct
                ? `✦ Mastery advanced: ${snapshot.term} — ${snapshot.before} → ${snapshot.after}`
                : `Mastery review: ${snapshot.term} — ${snapshot.before} → ${snapshot.after}`;
        } else {
            text = `Mastery: ${snapshot.term} — ${snapshot.after}`;
        }
        return `<div class="examples mastery-feedback">${text}</div>`;
    }

    proto.ensureFlowState = function () {
        if (!this.flow || typeof this.flow !== 'object') {
            const container = document.querySelector('.game-container');
            this.flow = {
                screen: container?.dataset?.screen || 'menu',
                gameplayState: null,
                payload: null,
                returnTo: null
            };
        }
        return this.flow;
    };

    proto.recordGameplayState = function (gameplayState, payload = null) {
        const flow = this.ensureFlowState();
        flow.screen = 'gameplay';
        flow.gameplayState = gameplayState;
        flow.payload = payload;
        flow.returnTo = null;
    };

    proto.discardGameplayReturn = function () {
        const flow = this.ensureFlowState();
        flow.returnTo = null;
        flow.gameplayState = null;
        flow.payload = null;
    };

    proto.setScreen = function (name) {
        const flow = this.ensureFlowState();
        if (name !== 'gameplay' && flow.screen === 'gameplay' && flow.gameplayState) {
            if (flow.gameplayState === 'casting-question' || flow.gameplayState === 'duel-question') {
                flow.payload = {...(flow.payload || {}), draft: currentInputValue()};
            }
            flow.returnTo = {screen: 'gameplay', gameplayState: flow.gameplayState};
        }
        flow.screen = name;
        return originalSetScreen.call(this, name);
    };

    proto.renderCastingQuestionState = function () {
        const gameArea = area();
        if (!gameArea) return;
        const flow = this.ensureFlowState();
        const comboBanner = this.player.streak >= 2
            ? `<div class="combo">🔥 Combo x${this.getComboMultiplier()} (streak ${this.player.streak}) — earning ${this.getComboMultiplier()}× gold &amp; mana!</div>`
            : '';
        gameArea.innerHTML = `
            <div class="question-counter">--- Spell ${this.questionsAnswered} ---</div>
            ${comboBanner}
            <div>${this.currentQuestion}</div>
            <div class="input-area">
                <input type="text" id="answer-input" placeholder="Speak the incantation..." onkeypress="if(event.key==='Enter') game.submitAnswer()">
                <button onclick="game.submitAnswer()">Cast</button>
                <button onclick="game.skipQuestion()">Fizzle</button>
            </div>
        `;
        this.setScreen('gameplay');
        restoreDraft(flow.payload);
    };

    proto.renderCastingResultState = function (payload = {}) {
        const gameArea = area();
        if (!gameArea) return;
        gameArea.innerHTML = `
            <div class="question-counter">--- Spell ${this.questionsAnswered} ---</div>
            <div>${this.currentQuestion}</div>
            ${payload.userAnswer ? `<div>Your incantation: ${this.escapeHtml(payload.userAnswer)}</div>` : ''}
            ${payload.resultText || ''}
            ${masteryMarkup(payload.mastery)}
            <div class="input-area">
                <button onclick="game.nextQuestion()">Continue</button>
            </div>
        `;
        this.setScreen('gameplay');
    };

    proto.renderBossOfferState = function (payload = {}) {
        const gameArea = area();
        if (!gameArea) return;
        const bossName = payload.bossName || BOSS_NAMES[this.player.level % BOSS_NAMES.length];
        gameArea.innerHTML = `
            <div>The air crackles with arcane pressure...</div>
            <div>A Level ${this.player.level} <span class="combo">${bossName}</span> blocks your path!</div>
            <br>
            <div>Defeat it in a spell duel: cast ${this.wordSet.termLabel}s to strike,</div>
            <div>and channel your mana for devastating blows.</div>
            <div class="input-area">
                <button onclick="game.startDuel('${bossName}')">Begin Duel</button>
                <button onclick="game.askQuestion()">Flee (Keep Casting)</button>
            </div>
        `;
        this.setScreen('gameplay');
    };

    proto.renderDuelQuestionState = function () {
        const gameArea = area();
        const d = this.duel;
        if (!gameArea || !d) return;
        const flow = this.ensureFlowState();
        const canChannel = this.player.mana >= 10;
        const base = this.baseSpellDamage();
        const streakBonus = (d.duelStreak + 1) * 2;
        const nextDamage = base + streakBonus;

        gameArea.innerHTML = `
            <div>=== SPELL DUEL: ${d.bossName} ===</div>
            <div class="incorrect">Boss HP ${d.bossHp}/${d.bossMaxHp}</div>
            <div class="incorrect">[${this.renderBar(d.bossHp, d.bossMaxHp)}]</div>
            <div class="correct">Your HP ${d.playerHp}/${d.playerMaxHp}</div>
            <div class="correct">[${this.renderBar(d.playerHp, d.playerMaxHp)}]</div>
            <br>
            <div>Answer to strike. A wrong answer lets the boss hit you for ${d.bossHit}.</div>
            <div>${this.currentQuestion}</div>
            <div class="examples">
                Your spell damage: <b>${nextDamage}</b> = ${base} base (INT+STR) + ${streakBonus} streak.<br>
                Channel casts the same answer for 10 mana and doubles that whole number:
                <b>${nextDamage * 2}</b>. (Mana: ${this.player.mana}/${this.player.maxMana})
                ${canChannel
                    ? `<br><label><input type="checkbox" onchange="game.armChannel(this.checked)" ${d.channelArmed ? 'checked' : ''}> Channel when I press Enter</label>`
                    : `<br>Not enough mana to channel — you need 10.`}
            </div>
            <div class="input-area">
                <input type="text" id="answer-input" placeholder="Speak the incantation..." onkeypress="if(event.key==='Enter') game.duelCast(game.duel.channelArmed)">
                <button onclick="game.duelCast(false)">⚡ Cast — ${nextDamage} dmg</button>
                <button onclick="game.duelCast(true)" ${canChannel ? '' : 'disabled'}>${canChannel
                    ? `🔥 Channel — ${nextDamage * 2} dmg (10 mana)`
                    : `🔥 Channel — needs 10 mana`}</button>
            </div>
        `;
        this.setScreen('gameplay');
        restoreDraft(flow.payload);
    };

    proto.renderDuelResultState = function (payload = {}) {
        const gameArea = area();
        const d = this.duel;
        if (!gameArea || !d) return;

        let outcome = '';
        if (payload.fallback) {
            outcome += '<div class="incorrect">Not enough mana to channel — you cast normally instead.</div>';
        }
        if (payload.correct) {
            outcome += `<div class="correct">✨ Your spell strikes for ${payload.damage || 0}${payload.channelUsed ? ' (CHANNELED — double damage, 10 mana spent!)' : ''}!</div>`;
        } else {
            outcome += `<div class="incorrect">💨 Your spell fizzles! ${payload.revealHeadline || ''}</div>`;
            if (payload.channelUsed) outcome += '<div class="incorrect">Your channel is wasted — 10 mana burned.</div>';
            outcome += `<div class="incorrect">The ${d.bossName} strikes back for ${payload.bossHit || d.bossHit}!</div>`;
        }

        gameArea.innerHTML = `
            <div>=== SPELL DUEL: ${d.bossName} ===</div>
            <div class="incorrect">Boss HP ${Math.max(0, d.bossHp)}/${d.bossMaxHp}  [${this.renderBar(d.bossHp, d.bossMaxHp)}]</div>
            <div class="correct">Your HP ${Math.max(0, d.playerHp)}/${d.playerMaxHp}  [${this.renderBar(d.playerHp, d.playerMaxHp)}]</div>
            <br>
            ${outcome}
            ${masteryMarkup(payload.mastery)}
            <div class="input-area">
                <button onclick="game.duelTurn()">Next Exchange</button>
            </div>
        `;
        this.setScreen('gameplay');
    };

    proto.renderDuelVictoryState = function (payload = {}) {
        const gameArea = area();
        if (!gameArea) return;
        gameArea.innerHTML = `
            ${payload.outcomeHtml || ''}
            <div class="correct">⚔️ VICTORY! ⚔️</div>
            <div>You vanquished the ${payload.bossName || 'boss'}!</div>
            <div>Level up! Now level ${payload.level || this.player.level}</div>
            <div>+${payload.goldReward || 0} gold, and your mana is fully restored!</div>
            ${masteryMarkup(payload.mastery)}
            <div class="input-area">
                <button onclick="game.askQuestion()">Continue Casting</button>
            </div>
        `;
        this.setScreen('gameplay');
    };

    proto.renderDuelDefeatState = function (payload = {}) {
        const gameArea = area();
        if (!gameArea) return;
        gameArea.innerHTML = `
            ${payload.outcomeHtml || ''}
            <div class="incorrect">💀 DEFEATED! 💀</div>
            <div>The ${payload.bossName || 'boss'} overwhelms you. Your progress is safe —</div>
            <div>gather gold, buy stronger robes and staves, and return.</div>
            ${masteryMarkup(payload.mastery)}
            <div class="input-area">
                <button onclick="showShop()">Arcane Emporium</button>
                <button onclick="game.askQuestion()">Keep Casting</button>
            </div>
        `;
        this.setScreen('gameplay');
    };

    proto.renderCurrentGameplay = function () {
        const flow = this.ensureFlowState();
        switch (flow.gameplayState) {
            case 'casting-question':
                this.renderCastingQuestionState();
                break;
            case 'casting-result':
                this.renderCastingResultState(flow.payload || {});
                break;
            case 'boss-offer':
                this.renderBossOfferState(flow.payload || {});
                break;
            case 'duel-question':
                this.renderDuelQuestionState();
                break;
            case 'duel-result':
                this.renderDuelResultState(flow.payload || {});
                break;
            case 'duel-victory':
                this.renderDuelVictoryState(flow.payload || {});
                break;
            case 'duel-defeat':
                this.renderDuelDefeatState(flow.payload || {});
                break;
            default:
                return false;
        }
        return true;
    };

    proto.resumeCasting = function () {
        const flow = this.ensureFlowState();
        if (!flow.returnTo || !flow.gameplayState) return this.askQuestion();
        flow.returnTo = null;
        flow.screen = 'gameplay';
        return this.renderCurrentGameplay();
    };

    proto.askQuestion = function () {
        const flow = this.ensureFlowState();
        if (flow.screen !== 'gameplay' && flow.returnTo && flow.gameplayState) {
            return this.resumeCasting();
        }
        const result = originalAskQuestion.call(this);
        this.recordGameplayState('casting-question', {draft: ''});
        return result;
    };

    proto.showCastResult = function (resultText, userAnswer) {
        const result = originalShowCastResult.call(this, resultText, userAnswer);
        this.recordGameplayState('casting-result', {resultText, userAnswer, mastery: null});
        return result;
    };

    proto.offerBossFight = function () {
        const bossName = BOSS_NAMES[this.player.level % BOSS_NAMES.length];
        const result = originalOfferBossFight.call(this);
        this.recordGameplayState('boss-offer', {bossName});
        return result;
    };

    proto.duelTurn = function () {
        const result = originalDuelTurn.call(this);
        this.recordGameplayState('duel-question', {draft: ''});
        return result;
    };

    proto.winDuel = function (outcomeHtml) {
        const bossName = this.duel?.bossName || 'boss';
        const result = originalWinDuel.call(this, outcomeHtml);
        const goldReward = 50 + this.player.level * 10;
        this.recordGameplayState('duel-victory', {
            outcomeHtml,
            bossName,
            level: this.player.level,
            goldReward,
            mastery: null
        });
        return result;
    };

    proto.loseDuel = function (outcomeHtml) {
        const bossName = this.duel?.bossName || 'boss';
        const result = originalLoseDuel.call(this, outcomeHtml);
        this.recordGameplayState('duel-defeat', {outcomeHtml, bossName, mastery: null});
        return result;
    };

    proto.submitAnswer = function () {
        const answer = currentInputValue().trim().toLowerCase();
        const correct = answer && this.currentAnswer ? this.evaluateAnswer(answer) : null;
        const mastery = answer ? masterySnapshot(this, answer, !!correct) : null;
        const result = originalSubmitAnswer.call(this);
        const flow = this.ensureFlowState();
        if (flow.gameplayState === 'casting-result' && flow.payload) {
            flow.payload.mastery = finishMasterySnapshot(this, mastery);
        }
        return result;
    };

    proto.skipQuestion = function () {
        const mastery = masterySnapshot(this, '', false);
        const result = originalSkipQuestion.call(this);
        const flow = this.ensureFlowState();
        if (flow.gameplayState === 'casting-result' && flow.payload) {
            flow.payload.mastery = finishMasterySnapshot(this, mastery);
        }
        return result;
    };

    proto.duelCast = function (channel) {
        const answer = currentInputValue().trim().toLowerCase();
        if (!answer || !this.duel) return originalDuelCast.call(this, channel);

        const correct = this.evaluateAnswer(answer);
        const mastery = masterySnapshot(this, answer, correct);
        const before = {
            bossHp: this.duel.bossHp,
            playerHp: this.duel.playerHp,
            mana: this.player.mana,
            bossHit: this.duel.bossHit
        };
        const requestedChannel = !!channel;
        const channelUsed = requestedChannel && before.mana >= 10;
        const fallback = requestedChannel && before.mana < 10;
        const revealHeadline = correct ? '' : this.revealAnswer().headline;

        const result = originalDuelCast.call(this, channel);
        const flow = this.ensureFlowState();
        const finishedMastery = finishMasterySnapshot(this, mastery);

        if (this.duel) {
            this.recordGameplayState('duel-result', {
                correct,
                channelUsed,
                fallback,
                damage: Math.max(0, before.bossHp - this.duel.bossHp),
                bossHit: Math.max(0, before.playerHp - this.duel.playerHp) || before.bossHit,
                revealHeadline,
                mastery: finishedMastery
            });
        } else if ((flow.gameplayState === 'duel-victory' || flow.gameplayState === 'duel-defeat') && flow.payload) {
            flow.payload.mastery = finishedMastery;
        }
        return result;
    };

    proto.newGame = function () {
        const result = originalNewGame.call(this);
        if (this.flow) {
            this.flow.gameplayState = null;
            this.flow.payload = null;
            this.flow.returnTo = null;
        }
        return result;
    };

    game.ensureFlowState();
})();

// Distinct campaign boss mechanics and personality layered over the shared duel engine.
(function () {
    if (typeof EtymancerGame === 'undefined' || typeof game === 'undefined' || typeof BOSSES === 'undefined') return;

    const proto = EtymancerGame.prototype;
    if (proto.__bossMechanicsInstalled) return;
    proto.__bossMechanicsInstalled = true;

    const originalGenerateQuestion = proto.generateQuestion;
    const originalDuelTurn = proto.duelTurn;
    const originalDuelCast = proto.duelCast;
    const originalRenderDuelQuestionState = proto.renderDuelQuestionState;
    const originalSetScreen = proto.setScreen;
    const originalArmChannel = proto.armChannel;
    const originalRenderBossCards = proto.renderBossCards;

    function bossFor(instance) {
        const id = instance.duel?.campaignBossId;
        return id ? BOSSES.find(boss => boss.id === id) || null : null;
    }

    function area() {
        return document.getElementById('game-area');
    }

    function safe(instance, text) {
        return instance.escapeHtml ? instance.escapeHtml(text) : String(text);
    }

    function setQuestionForTerm(instance, term, type) {
        if (!instance.terms?.[term]) return false;
        if (type === 'term') {
            const definitions = instance.getDefinitionsForTerm(term);
            if (!definitions.length) return false;
            const definition = definitions[Math.floor(Math.random() * definitions.length)];
            instance.currentQuestion = `What ${instance.wordSet.termLabel} means '${definition}'?`;
            instance.currentAnswer = {type: 'term', term, definition};
        } else {
            instance.currentQuestion = instance.wordSet.definePrompt(term);
            instance.currentAnswer = {type: 'definition', term};
        }
        return true;
    }

    function weakTerm(instance) {
        if (typeof instance.ensureMastery === 'function') instance.ensureMastery();
        const mastery = instance.mastery || {};
        const weak = Object.keys(instance.terms || {}).map(term => {
            const record = mastery[term] || {};
            const stage = record.stage || 'New';
            const activeMiss = (record.misses || 0) > 0 && (record.correctStreak || 0) === 0;
            if (!activeMiss && stage !== 'New' && stage !== 'Learning') return null;
            const tier = activeMiss ? 3 : stage === 'Learning' ? 2 : 1;
            return {term, tier, lastSeen: record.lastSeen || 0};
        }).filter(Boolean).sort((a, b) => b.tier - a.tier || b.lastSeen - a.lastSeen || a.term.localeCompare(b.term));

        if (!weak.length) return null;
        const windowSize = Math.min(4, weak.length);
        const cursor = instance.duel?.wardenCursor || 0;
        if (instance.duel) instance.duel.wardenCursor = cursor + 1;
        return weak[cursor % windowSize].term;
    }

    function reactionLine(boss, correct, exchange) {
        const lines = correct ? boss.correctLines : boss.missLines;
        if (!Array.isArray(lines) || !lines.length) return '';
        return lines[(Math.max(1, exchange || 1) - 1) % lines.length];
    }

    function decorateQuestion(instance) {
        const boss = bossFor(instance);
        const gameArea = area();
        if (!boss || !gameArea) return;

        let html = gameArea.innerHTML;
        html = html.replace(
            '<div class="correct">Your HP ',
            '<div class="correct" id="duel-player-hp">Your HP '
        );

        if (boss.id === 'null-scribe') {
            html = html.replace(
                /<br><label><input type="checkbox"[\s\S]*?<\/label>/,
                '<br><span class="incorrect">Null Field: Channel is unavailable in this duel.</span>'
            );
            html = html.replace(
                /<button onclick="game\.duelCast\(true\)"[\s\S]*?<\/button>/,
                '<button disabled>🔥 Channel — nullified</button>'
            );
        }

        const rule = `<div class="boss-mechanic"><strong>${safe(instance, boss.mechanic)}</strong> — ${safe(instance, boss.mechanicText)}</div>`;
        const voice = `<div class="examples boss-voice">“${safe(instance, boss.intro)}”</div>`;
        gameArea.innerHTML = rule + voice + html;
    }

    function decorateResult(instance, boss, correct, effectText, exchange) {
        const gameArea = area();
        if (!boss || !gameArea) return;
        const line = reactionLine(boss, correct, exchange);
        const effect = effectText ? `<div class="incorrect boss-effect">${safe(instance, effectText)}</div>` : '';
        const voice = line ? `<div class="examples boss-voice">${safe(instance, boss.name)}: “${safe(instance, line)}”</div>` : '';
        gameArea.innerHTML = effect + voice + gameArea.innerHTML;
    }

    proto.stopBossPressure = function () {
        if (this._bossPressureTimer && typeof clearInterval === 'function') {
            clearInterval(this._bossPressureTimer);
        }
        this._bossPressureTimer = null;
    };

    proto.applyBossPressureTick = function () {
        const boss = bossFor(this);
        if (!boss || boss.id !== 'babbling-wyrm' || !this.duel) return false;
        if (typeof document !== 'undefined' && document.hidden) return false;

        const flow = typeof this.ensureFlowState === 'function' ? this.ensureFlowState() : null;
        if (flow && (flow.screen !== 'gameplay' || flow.gameplayState !== 'duel-question')) return false;

        this.duel.playerHp = Math.max(0, this.duel.playerHp - 1);
        const hp = document.getElementById('duel-player-hp');
        if (hp) hp.textContent = `Your HP ${this.duel.playerHp}/${this.duel.playerMaxHp}  [${this.renderBar(this.duel.playerHp, this.duel.playerMaxHp)}]`;

        if (this.duel.playerHp <= 0) {
            this.stopBossPressure();
            this.loseDuel('<div class="incorrect">The Babbling Wyrm’s ceaseless voice wears you down to nothing.</div>');
        }
        return true;
    };

    proto.startBossPressure = function () {
        this.stopBossPressure();
        const boss = bossFor(this);
        if (!boss || boss.id !== 'babbling-wyrm' || typeof setInterval !== 'function') return;
        this._bossPressureTimer = setInterval(() => this.applyBossPressureTick(), 2000);
    };

    proto.generateQuestion = function () {
        const boss = bossFor(this);
        const duel = this.duel;

        if (boss?.id === 'gorgon-garbled-roots' && duel?.repeatQuestion) {
            this.currentQuestion = duel.repeatQuestion.question;
            this.currentAnswer = {...duel.repeatQuestion.answer};
            return;
        }

        if (boss?.id === 'warden-lost-meanings') {
            const term = weakTerm(this);
            if (term) {
                if (!Array.isArray(this.questionPool) || this.questionPool.length === 0) this.refillQuestionPool();
                const normalSlot = this.questionPool.pop() || {type: 'definition'};
                if (setQuestionForTerm(this, term, normalSlot.type)) return;
            }
        }

        return originalGenerateQuestion.call(this);
    };

    proto.duelTurn = function () {
        this.stopBossPressure();
        if (this.duel?.campaignBossId) this.duel.exchangeCount = (this.duel.exchangeCount || 0) + 1;
        const result = originalDuelTurn.call(this);
        decorateQuestion(this);
        this.startBossPressure();
        return result;
    };

    if (originalRenderDuelQuestionState) {
        proto.renderDuelQuestionState = function () {
            this.stopBossPressure();
            const result = originalRenderDuelQuestionState.call(this);
            decorateQuestion(this);
            this.startBossPressure();
            return result;
        };
    }

    proto.duelCast = function (channel) {
        const boss = bossFor(this);
        const duel = this.duel;
        const input = document.getElementById('answer-input');
        const userAnswer = input ? input.value.trim().toLowerCase() : '';
        if (!duel || !userAnswer) return originalDuelCast.call(this, channel);

        const correct = this.currentAnswer ? this.evaluateAnswer(userAnswer) : false;
        const exchange = duel.exchangeCount || 1;
        let effectText = '';

        if (boss?.id === 'gorgon-garbled-roots') {
            if (correct) {
                duel.repeatQuestion = null;
            } else {
                duel.repeatQuestion = {
                    question: this.currentQuestion,
                    answer: {...this.currentAnswer}
                };
                effectText = 'Petrifying Gaze fixes this term in place. It will return next exchange.';
            }
        }

        if (boss?.id === 'etymophage' && !correct) {
            const before = duel.bossHp;
            duel.bossHp = Math.min(duel.bossMaxHp, duel.bossHp + 18);
            const healed = duel.bossHp - before;
            if (healed > 0) effectText = `Feeds on Failure restores ${healed} HP.`;
        }

        if (boss?.id === 'null-scribe') {
            channel = false;
            duel.channelArmed = false;
        }

        this.stopBossPressure();
        const result = originalDuelCast.call(this, channel);
        decorateResult(this, boss, correct, effectText, exchange);
        return result;
    };

    proto.armChannel = function (on) {
        const boss = bossFor(this);
        if (boss?.id === 'null-scribe') {
            if (this.duel) this.duel.channelArmed = false;
            return;
        }
        return originalArmChannel.call(this, on);
    };

    proto.setScreen = function (name) {
        if (name !== 'gameplay') this.stopBossPressure();
        return originalSetScreen.call(this, name);
    };

    if (originalRenderBossCards) {
        proto.renderBossCards = function () {
            let html = originalRenderBossCards.call(this);
            BOSSES.forEach(boss => {
                const name = safe(this, boss.name);
                const needle = `<div class="boss-name">${name}</div>`;
                const summary = `<div class="boss-mechanic-summary"><strong>${safe(this, boss.mechanic)}</strong><br>${safe(this, boss.mechanicText)}</div>`;
                html = html.replace(needle, needle + summary);
            });
            return html;
        };
    }
})();

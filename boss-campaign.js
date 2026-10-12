// Finite, player-chosen boss campaign layered on top of the existing duel engine.
(function () {
    if (typeof EtymancerGame === 'undefined' || typeof game === 'undefined' || typeof BOSSES === 'undefined') return;

    const proto = EtymancerGame.prototype;
    if (proto.__bossCampaignInstalled) return;
    proto.__bossCampaignInstalled = true;

    const originalNewGame = proto.newGame;
    const originalWinDuel = proto.winDuel;
    const originalLoseDuel = proto.loseDuel;
    const originalRenderVictory = proto.renderDuelVictoryState;
    const originalRenderDefeat = proto.renderDuelDefeatState;
    const originalShowMainMenu = proto.showMainMenu;
    const originalEnsureUiShell = proto.ensureUiShell;
    const originalShowHelp = proto.showHelp;
    const originalAskQuestion = proto.askQuestion;
    const originalResumeCasting = proto.resumeCasting;

    function area() {
        return document.getElementById('game-area');
    }

    function shell() {
        return document.querySelector('.game-container');
    }

    function safe(instance, text) {
        return instance.escapeHtml ? instance.escapeHtml(text) : String(text);
    }

    function injectStyles() {
        if (!document.head || document.getElementById('boss-campaign-styles')) return;
        const style = document.createElement('style');
        style.id = 'boss-campaign-styles';
        style.textContent = `
            .boss-progress { margin: 10px 0 18px; color: #ffff00; }
            .boss-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 18px 0; }
            .boss-card { border: 1px solid #006600; background: #001100; padding: 14px; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
            .boss-card.defeated { border-color: #338833; opacity: .82; }
            .boss-card.active-battle { border-color: #ffff00; }
            .boss-name { color: #ffff00; font-weight: bold; min-height: 2.4em; }
            .boss-threat { letter-spacing: .08em; }
            .boss-state { color: #aaffaa; font-size: .82rem; min-height: 1.3em; }
            .boss-card button { width: 100%; margin: auto 0 0; }
            .campaign-complete { border: 1px solid #ffff00; background: #221f00; padding: 14px; margin: 14px 0 18px; }
            @media (max-width: 600px) { .boss-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; } .boss-card { padding: 10px; } }
        `;
        document.head.appendChild(style);
    }

    function restoreGameplayChrome(instance) {
        const container = shell();
        if (container) container.dataset.screen = 'gameplay';
        if (originalEnsureUiShell) originalEnsureUiShell.call(instance);
        instance.ensureCampaignNavigation();
    }

    proto.campaignKey = function () {
        return this.wordSet ? `etymancerCampaign:${this.wordSet.id}` : null;
    };

    proto.getCampaignState = function () {
        const key = this.campaignKey();
        const valid = new Set(BOSSES.map(boss => boss.id));
        if (!key) return {defeatedBossIds: []};
        try {
            const parsed = JSON.parse(localStorage.getItem(key) || '{}');
            const defeatedBossIds = Array.isArray(parsed.defeatedBossIds)
                ? [...new Set(parsed.defeatedBossIds.filter(id => valid.has(id)))]
                : [];
            return {defeatedBossIds};
        } catch (err) {
            return {defeatedBossIds: []};
        }
    };

    proto.saveCampaignState = function (state) {
        const key = this.campaignKey();
        if (!key) return;
        localStorage.setItem(key, JSON.stringify({defeatedBossIds: state.defeatedBossIds || []}));
    };

    proto.campaignProgress = function () {
        const state = this.getCampaignState();
        return {defeated: state.defeatedBossIds.length, total: BOSSES.length, complete: state.defeatedBossIds.length === BOSSES.length};
    };

    proto.isBossDefeated = function (bossId) {
        return this.getCampaignState().defeatedBossIds.includes(bossId);
    };

    proto.markBossDefeated = function (bossId) {
        const state = this.getCampaignState();
        if (!state.defeatedBossIds.includes(bossId)) state.defeatedBossIds.push(bossId);
        this.saveCampaignState(state);
        return this.campaignProgress();
    };

    proto.activeCampaignBossId = function () {
        return this.duel?.campaignBossId || null;
    };

    proto.ensureCampaignNavigation = function () {
        injectStyles();
        const nav = document.getElementById('gameplay-nav');
        if (nav && !nav.querySelector('[data-campaign-nav]')) {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.campaignNav = 'true';
            button.textContent = 'Bosses';
            button.onclick = () => this.showBossCampaign();
            nav.appendChild(button);
        }
        const actions = document.querySelector('.menu-actions');
        if (actions && this.wordSet && !actions.querySelector('[data-campaign-menu]')) {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.campaignMenu = 'true';
            button.textContent = 'Bosses';
            button.onclick = () => this.showBossCampaign();
            actions.appendChild(button);
        }
    };

    if (originalEnsureUiShell) {
        proto.ensureUiShell = function () {
            const result = originalEnsureUiShell.call(this);
            this.ensureCampaignNavigation();
            return result;
        };
    }

    if (originalShowMainMenu) {
        proto.showMainMenu = function () {
            const result = originalShowMainMenu.call(this);
            this.ensureCampaignNavigation();
            return result;
        };
    }

    // Explicitly restore the gameplay shell after any side-screen resume. This
    // prevents a valid gameplay state from being rendered while the container
    // still carries side-screen chrome/visibility rules.
    if (originalResumeCasting) {
        proto.resumeCasting = function () {
            const result = originalResumeCasting.call(this);
            restoreGameplayChrome(this);
            return result;
        };
    }

    if (originalAskQuestion) {
        proto.askQuestion = function () {
            const result = originalAskQuestion.call(this);
            const flow = typeof this.ensureFlowState === 'function' ? this.ensureFlowState() : null;
            if (flow?.screen === 'gameplay') restoreGameplayChrome(this);
            return result;
        };
    }

    proto.renderBossCards = function () {
        const defeated = new Set(this.getCampaignState().defeatedBossIds);
        const activeBossId = this.activeCampaignBossId();
        return BOSSES.map(boss => {
            const isDefeated = defeated.has(boss.id);
            const isActive = activeBossId === boss.id;
            const anotherActive = !!activeBossId && !isActive;
            const threat = '★'.repeat(boss.threat) + '☆'.repeat(BOSSES.length - boss.threat);
            let stateText;
            let buttonText;
            let disabled = false;
            if (isDefeated) {
                stateText = 'Defeated ✓';
                buttonText = 'Defeated';
                disabled = true;
            } else if (isActive) {
                stateText = `Battle in progress · ${Math.max(0, this.duel.bossHp)}/${this.duel.bossMaxHp} HP`;
                buttonText = 'Resume Battle';
            } else if (anotherActive) {
                stateText = 'Finish your current battle first';
                buttonText = 'Battle in progress';
                disabled = true;
            } else {
                stateText = `${boss.hp} HP · ${boss.hit} damage on a miss`;
                buttonText = 'Challenge';
            }
            return `<article class="boss-card ${isDefeated ? 'defeated' : ''} ${isActive ? 'active-battle' : ''}">
                <div class="boss-name">${safe(this, boss.name)}</div>
                <div class="boss-threat" aria-label="Threat ${boss.threat} of ${BOSSES.length}">${threat}</div>
                <div class="boss-state">${stateText}</div>
                <button ${disabled ? 'disabled' : ''} onclick="game.challengeBoss('${boss.id}')">${buttonText}</button>
            </article>`;
        }).join('');
    };

    proto.showBossCampaign = function () {
        if (!this.wordSet || !this.player) return this.showSpellbookSetup();
        this.setScreen('bosses');
        const progress = this.campaignProgress();
        const gameArea = area();
        if (!gameArea) return;
        gameArea.innerHTML = `
            <section class="screen-section boss-campaign-screen">
                <div class="screen-kicker">BOSS CAMPAIGN</div>
                <div class="screen-title">Choose your challenge.</div>
                <div class="boss-progress">${progress.defeated}/${progress.total} bosses defeated</div>
                ${progress.complete ? `<div class="campaign-complete"><strong>CAMPAIGN COMPLETE.</strong><br>You defeated every boss in this Grimoire. Keep studying, improving mastery, and building your Etymancer whenever you want.</div>` : ''}
                <div class="boss-grid">${this.renderBossCards()}</div>
                <div class="view-actions">
                    <button class="primary-action" onclick="game.askQuestion()">${this.questionsAnswered ? 'Continue Casting' : 'Begin Casting'}</button>
                    <button onclick="game.showMainMenu()">Main Menu</button>
                </div>
            </section>`;
        this.ensureCampaignNavigation();
    };

    proto.openBossCampaignAfterDuel = function () {
        if (typeof this.discardGameplayReturn === 'function') this.discardGameplayReturn();
        return this.showBossCampaign();
    };

    proto.resumeActiveBoss = function () {
        if (!this.activeCampaignBossId()) return this.showBossCampaign();
        const flow = typeof this.ensureFlowState === 'function' ? this.ensureFlowState() : null;
        if (flow?.returnTo && flow.gameplayState) return this.resumeCasting();
        if (flow) {
            flow.returnTo = null;
            flow.screen = 'gameplay';
        }
        const result = typeof this.renderCurrentGameplay === 'function' ? this.renderCurrentGameplay() : this.duelTurn();
        restoreGameplayChrome(this);
        return result;
    };

    proto.challengeBoss = function (bossId) {
        const boss = BOSSES.find(candidate => candidate.id === bossId);
        if (!boss || this.isBossDefeated(bossId)) return this.showBossCampaign();

        const activeBossId = this.activeCampaignBossId();
        if (activeBossId) {
            if (activeBossId === bossId) return this.resumeActiveBoss();
            return this.showBossCampaign();
        }

        if (typeof this.discardGameplayReturn === 'function') this.discardGameplayReturn();
        this.currentQuestion = null;
        this.currentAnswer = null;
        const playerHp = 60 + this.player.strength * 2 + this.player.level * 10;
        this.duel = {
            campaignBossId: boss.id,
            bossName: boss.name,
            bossMaxHp: boss.hp,
            bossHp: boss.hp,
            bossHit: boss.hit,
            playerMaxHp: playerHp,
            playerHp,
            duelStreak: 0,
            channelArmed: false
        };
        return this.duelTurn();
    };

    // Bosses are now chosen from the campaign screen, never injected every 10 casts.
    proto.nextQuestion = function () {
        return this.askQuestion();
    };

    proto.newGame = function () {
        const key = this.campaignKey();
        const result = originalNewGame.call(this);
        if (key) localStorage.removeItem(key);
        return result;
    };

    proto.winDuel = function (outcomeHtml) {
        const bossId = this.duel?.campaignBossId || null;
        if (!bossId) return originalWinDuel.call(this, outcomeHtml);

        // The legacy duel engine increments player.level on victory despite there
        // being no XP model. Preserve the mature duel/flow handling, then restore
        // level and normalize the reward to the pre-victory level. A future level
        // system is tracked separately from the campaign feature.
        const levelBefore = this.player.level;
        const goldBefore = this.player.gold;
        const result = originalWinDuel.call(this, outcomeHtml);
        const goldReward = 50 + levelBefore * 10;
        this.player.level = levelBefore;
        this.player.gold = goldBefore + goldReward;
        this.player.mana = this.player.maxMana;
        if (typeof this.updateStats === 'function') this.updateStats();
        if (typeof this.saveGame === 'function') this.saveGame();

        const progress = this.markBossDefeated(bossId);
        const flow = typeof this.ensureFlowState === 'function' ? this.ensureFlowState() : null;
        if (flow?.gameplayState === 'duel-victory') {
            flow.payload = {
                ...(flow.payload || {}),
                campaignBossId: bossId,
                campaignProgress: progress,
                level: levelBefore,
                goldReward
            };
            this.renderDuelVictoryState(flow.payload);
        }
        return result;
    };

    proto.loseDuel = function (outcomeHtml) {
        const bossId = this.duel?.campaignBossId || null;
        const result = originalLoseDuel.call(this, outcomeHtml);
        if (!bossId) return result;
        const flow = typeof this.ensureFlowState === 'function' ? this.ensureFlowState() : null;
        if (flow?.gameplayState === 'duel-defeat') {
            flow.payload = {...(flow.payload || {}), campaignBossId: bossId};
            this.renderDuelDefeatState(flow.payload);
        }
        return result;
    };

    proto.renderDuelVictoryState = function (payload = {}) {
        if (!payload.campaignBossId) return originalRenderVictory ? originalRenderVictory.call(this, payload) : undefined;
        const progress = payload.campaignProgress || this.campaignProgress();
        const gameArea = area();
        if (!gameArea) return;
        gameArea.innerHTML = `
            ${payload.outcomeHtml || ''}
            <div class="correct">⚔️ VICTORY! ⚔️</div>
            <div>You vanquished the ${safe(this, payload.bossName || 'boss')}!</div>
            <div>+${payload.goldReward || 0} gold, and your mana is fully restored!</div>
            <div class="boss-progress">Campaign: ${progress.defeated}/${progress.total} bosses defeated</div>
            ${progress.complete ? `<div class="campaign-complete"><strong>CAMPAIGN COMPLETE.</strong><br>Every boss in ${safe(this, this.wordSet.name)} has fallen.</div>` : ''}
            <div class="input-area">
                <button onclick="game.openBossCampaignAfterDuel()">${progress.complete ? 'View Completed Campaign' : 'Choose Another Boss'}</button>
                <button onclick="game.askQuestion()">Continue Casting</button>
            </div>`;
        this.setScreen('gameplay');
        restoreGameplayChrome(this);
    };

    proto.renderDuelDefeatState = function (payload = {}) {
        if (!payload.campaignBossId) return originalRenderDefeat ? originalRenderDefeat.call(this, payload) : undefined;
        const gameArea = area();
        if (!gameArea) return;
        gameArea.innerHTML = `
            ${payload.outcomeHtml || ''}
            <div class="incorrect">💀 DEFEATED! 💀</div>
            <div>The ${safe(this, payload.bossName || 'boss')} overwhelms you. Your progress is safe.</div>
            <div>Study, improve your gear, and challenge it again when you're ready.</div>
            <div class="input-area">
                <button onclick="game.openBossCampaignAfterDuel()">Back to Bosses</button>
                <button onclick="game.showShop()">Arcane Emporium</button>
                <button onclick="game.askQuestion()">Keep Casting</button>
            </div>`;
        this.setScreen('gameplay');
        restoreGameplayChrome(this);
    };

    if (originalShowHelp) {
        proto.showHelp = function () {
            const result = originalShowHelp.call(this);
            const gameArea = area();
            if (gameArea) {
                gameArea.innerHTML = gameArea.innerHTML
                    .replace('fight a boss every 10 spells.', 'challenge any undefeated boss when you feel ready.')
                    .replace('Every 10 spells, a boss can challenge you to a duel.', 'Open Bosses whenever you are ready to choose your next duel. Defeat all six to complete the campaign.');
            }
            return result;
        };
    }

    injectStyles();
    game.ensureCampaignNavigation();
})();

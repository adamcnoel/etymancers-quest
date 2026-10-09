// Responsive screen/navigation layer for Etymancer's Quest.
// Keeps presentation concerns outside the learning/RPG engine so each view can
// grow independently (Grimoire, richer shop, character detail, art, etc.).
(function () {
    if (typeof EtymancerGame === 'undefined' || typeof game === 'undefined') return;

    const proto = EtymancerGame.prototype;
    if (proto.__uiShellInstalled) return;
    proto.__uiShellInstalled = true;

    const originalShowStart = proto.showStart;
    const originalAskQuestion = proto.askQuestion;
    const originalShowCastResult = proto.showCastResult;
    const originalOfferBossFight = proto.offerBossFight;
    const originalDuelTurn = proto.duelTurn;
    const originalWinDuel = proto.winDuel;
    const originalLoseDuel = proto.loseDuel;
    const originalShowShop = proto.showShop;
    const originalShowPurchaseResult = proto.showPurchaseResult;
    const originalShowPurchaseFailure = proto.showPurchaseFailure;
    const originalShowHelp = proto.showHelp;
    const originalUpdateStats = proto.updateStats;

    let grimoireDirection = 'forward';

    function area() {
        return document.getElementById('game-area');
    }

    function shell() {
        return document.querySelector('.game-container');
    }

    function safe(text) {
        if (game.escapeHtml) return game.escapeHtml(text);
        return String(text);
    }

    function masteryFor(term) {
        return typeof game.masteryStage === 'function' ? game.masteryStage(term) : 'New';
    }

    function masterySummary() {
        return typeof game.masterySummary === 'function'
            ? game.masterySummary()
            : {New: Object.keys(game.terms || {}).length, Learning: 0, Familiar: 0, Mastered: 0, total: Object.keys(game.terms || {}).length};
    }

    proto.ensureUiShell = function () {
        const main = document.querySelector('.main-panel');
        const gameArea = area();
        if (!main || !gameArea) return;

        if (!document.getElementById('compact-hud')) {
            const hud = document.createElement('button');
            hud.id = 'compact-hud';
            hud.className = 'compact-hud';
            hud.type = 'button';
            hud.setAttribute('aria-label', 'Open Etymancer character sheet');
            hud.onclick = () => this.showCharacterSheet();
            main.insertBefore(hud, gameArea);
        }

        if (!document.getElementById('gameplay-nav')) {
            const nav = document.createElement('nav');
            nav.id = 'gameplay-nav';
            nav.className = 'gameplay-nav';
            nav.setAttribute('aria-label', 'Game navigation');
            nav.innerHTML = `
                <button type="button" onclick="game.showMainMenu()">Menu</button>
                <button type="button" onclick="game.showSpellbookSetup()">Spellbook</button>
                <button type="button" onclick="game.showCharacterSheet()">Etymancer</button>
                <button type="button" onclick="game.showShop()">Emporium</button>`;
            main.appendChild(nav);
        }
    };

    proto.setScreen = function (name) {
        this.ensureUiShell();
        const container = shell();
        if (container) container.dataset.screen = name;
        this.updateCompactHud();
    };

    proto.updateCompactHud = function () {
        const hud = document.getElementById('compact-hud');
        if (!hud || !this.player || !this.wordSet) return;
        const summary = masterySummary();
        hud.innerHTML = `
            <span class="hud-primary">Lv ${this.player.level}</span>
            <span>${this.player.gold}g</span>
            <span>Mana ${this.player.mana}/${this.player.maxMana}</span>
            <span>Streak ${this.player.streak}</span>
            <span>${summary.Mastered}/${summary.total} mastered</span>
            <span class="hud-open">Etymancer ▸</span>`;
    };

    proto.showMainMenu = function () {
        this.setScreen('menu');
        const gameArea = area();
        if (!gameArea) return;

        const hasGame = !!(this.wordSet && this.player);
        const summary = hasGame ? masterySummary() : null;
        gameArea.innerHTML = `
            <section class="screen-section menu-screen">
                <div class="screen-kicker">MAIN MENU</div>
                ${hasGame ? `
                    <div class="menu-status-card">
                        <div class="screen-title">Welcome back, Etymancer.</div>
                        <div>${safe(this.wordSet.name)} · Level ${this.player.level}</div>
                        <div class="examples">${summary.Mastered}/${summary.total} mastered · ${this.player.gold} gold · Mana ${this.player.mana}/${this.player.maxMana}</div>
                    </div>
                    <div class="menu-actions">
                        <button class="primary-action" onclick="game.askQuestion()">Continue Casting</button>
                        <button onclick="game.showSpellbookSetup()">Spellbook &amp; Grimoire</button>
                        <button onclick="game.showCharacterSheet()">Etymancer</button>
                        <button onclick="game.showShop()">Arcane Emporium</button>
                        <button onclick="game.showHelp()">How to Play</button>
                        <button onclick="game.showResetConfirm()">New Game</button>
                    </div>` : `
                    <div class="screen-title">Choose a spellbook to begin.</div>
                    <div class="examples">Review the material before casting, then enter the dungeon when you're ready.</div>
                    <div class="menu-actions">
                        <button class="primary-action" onclick="game.showSpellbookSetup()">Choose Spellbook</button>
                        <button onclick="game.showHelp()">How to Play</button>
                    </div>`}
            </section>`;
    };

    proto.showResetConfirm = function () {
        this.setScreen('menu');
        if (!this.wordSet) return this.showSpellbookSetup();
        area().innerHTML = `
            <section class="screen-section">
                <div class="screen-kicker">NEW GAME</div>
                <div class="screen-title">Reset ${safe(this.wordSet.name)}?</div>
                <p>This resets level, gold, gear, mana, streak and mastery for this spellbook only.</p>
                <div class="view-actions">
                    <button class="danger-action" onclick="newGame(); game.showMainMenu()">Reset Progress</button>
                    <button onclick="game.showMainMenu()">Cancel</button>
                </div>
            </section>`;
    };

    proto.renderSpellbookCards = function () {
        return Object.values(WORD_SETS).map(set => {
            const active = this.wordSet && set.id === this.wordSet.id;
            const count = Object.keys(set.terms).length;
            let progress = '';
            try {
                const saved = localStorage.getItem(`etymancerSave:${set.id}`);
                if (saved) {
                    const state = JSON.parse(saved);
                    const mastery = state.mastery || {};
                    const mastered = Object.values(mastery).filter(m => m && m.stage === 'Mastered').length;
                    progress = ` · ${mastered}/${count} mastered`;
                }
            } catch (err) {}

            return `<button class="spellbook-card ${active ? 'active' : ''}" onclick="game.selectSpellbookForSetup('${set.id}')">
                <span class="spellbook-name">${active ? '★ ' : ''}${safe(set.name)}</span>
                <span class="spellbook-meta">${safe(set.grade)} · ${count} ${safe(set.termLabel)}s${progress}</span>
                <span class="spellbook-blurb">${safe(set.blurb)}</span>
            </button>`;
        }).join('');
    };

    proto.selectSpellbookForSetup = function (setId) {
        if (!WORD_SETS[setId]) return;
        if (!this.wordSet || this.wordSet.id !== setId) this.activateWordSet(setId);
        this.showSpellbookSetup();
    };

    proto.renderGrimoireRows = function () {
        if (!this.wordSet) return '';

        if (grimoireDirection === 'reverse') {
            const rows = [];
            Object.keys(this.terms).forEach(term => {
                this.getDefinitionsForTerm(term).forEach(definition => {
                    rows.push(`<div class="grimoire-row">
                        <div class="grimoire-prompt">${safe(definition)}</div>
                        <div class="grimoire-answer">${safe(term)}</div>
                        <div class="mastery-chip" data-stage="${masteryFor(term)}">${masteryFor(term)}</div>
                    </div>`);
                });
            });
            return rows.join('');
        }

        return Object.keys(this.terms).map(term => {
            const definitions = this.getDefinitionsForTerm(term);
            const examples = this.getExamplesForTerm(term);
            return `<div class="grimoire-row">
                <div class="grimoire-prompt">${safe(term)}</div>
                <div class="grimoire-answer">
                    ${definitions.map(safe).join(' · ')}
                    ${examples.length ? `<div class="grimoire-examples">${examples.map(safe).join(', ')}</div>` : ''}
                </div>
                <div class="mastery-chip" data-stage="${masteryFor(term)}">${masteryFor(term)}</div>
            </div>`;
        }).join('');
    };

    proto.setGrimoireDirection = function (direction) {
        grimoireDirection = direction === 'reverse' ? 'reverse' : 'forward';
        this.showSpellbookSetup();
    };

    proto.showSpellbookSetup = function () {
        this.setScreen('spellbook');
        const gameArea = area();
        if (!gameArea) return;

        const activeContent = this.wordSet ? `
            <section class="grimoire-panel">
                <div class="section-heading-row">
                    <div>
                        <div class="screen-kicker">GRIMOIRE</div>
                        <div class="screen-title">${safe(this.wordSet.name)}</div>
                    </div>
                    <div class="segmented-control" aria-label="Grimoire review direction">
                        <button class="${grimoireDirection === 'forward' ? 'selected' : ''}" onclick="game.setGrimoireDirection('forward')">${safe(this.wordSet.termLabel)} → meaning</button>
                        <button class="${grimoireDirection === 'reverse' ? 'selected' : ''}" onclick="game.setGrimoireDirection('reverse')">meaning → ${safe(this.wordSet.termLabel)}</button>
                    </div>
                </div>
                <div class="examples">Review mode only. Configuring which direction the game asks is tracked separately in #10.</div>
                <div class="grimoire-list">${this.renderGrimoireRows()}</div>
                <div class="view-actions sticky-actions">
                    <button class="primary-action" onclick="game.askQuestion()">${this.questionsAnswered ? 'Continue Casting' : 'Begin Casting'}</button>
                    <button onclick="game.showMainMenu()">Main Menu</button>
                </div>
            </section>` : `
            <section class="empty-grimoire">
                <div class="screen-title">Select a spellbook to inspect its Grimoire.</div>
            </section>`;

        gameArea.innerHTML = `
            <section class="screen-section spellbook-setup">
                <div class="screen-kicker">SPELLBOOK SETUP</div>
                <div class="screen-title">Choose your study material.</div>
                <div class="spellbook-grid">${this.renderSpellbookCards()}</div>
                ${activeContent}
            </section>`;
    };

    proto.showCharacterSheet = function () {
        if (!this.wordSet || !this.player) return this.showSpellbookSetup();
        this.setScreen('character');
        const summary = masterySummary();
        area().innerHTML = `
            <section class="screen-section character-sheet">
                <div class="screen-kicker">ETYMANCER // CHARACTER SHEET</div>
                <div class="screen-title">Level ${this.player.level} ${safe(this.wordSet.name)} Etymancer</div>
                <div class="character-grid">
                    <div class="detail-card">
                        <div class="detail-label">Resources</div>
                        <div class="detail-value">${this.player.gold} gold</div>
                        <div>Mana ${this.player.mana} / ${this.player.maxMana}</div>
                        <div>Streak ${this.player.streak}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">Power</div>
                        <div class="detail-value">${this.player.intelligence} INT</div>
                        <div class="detail-value">${this.player.strength} STR</div>
                        <div>Base spell damage ${this.baseSpellDamage()}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">Equipment</div>
                        <div>Robes: ${safe(this.player.armor)}</div>
                        <div>Staff: ${safe(this.player.weapon)}</div>
                        <button onclick="game.showShop()">Open Emporium</button>
                    </div>
                    <div class="detail-card mastery-card">
                        <div class="detail-label">Mastery</div>
                        <div class="detail-value">${summary.Mastered} / ${summary.total} mastered</div>
                        <div>${summary.Familiar} familiar · ${summary.Learning} learning · ${summary.New} new</div>
                        <button onclick="game.showSpellbookSetup()">Open Grimoire</button>
                    </div>
                </div>
                <div class="view-actions">
                    <button class="primary-action" onclick="game.askQuestion()">Back to Casting</button>
                    <button onclick="game.showMainMenu()">Main Menu</button>
                </div>
            </section>`;
    };

    proto.showStart = function () {
        this.showMainMenu();
    };

    proto.askQuestion = function () {
        const result = originalAskQuestion.call(this);
        this.setScreen('gameplay');
        return result;
    };

    proto.showCastResult = function (resultText, userAnswer) {
        const result = originalShowCastResult.call(this, resultText, userAnswer);
        this.setScreen('gameplay');
        return result;
    };

    proto.offerBossFight = function () {
        const result = originalOfferBossFight.call(this);
        this.setScreen('gameplay');
        return result;
    };

    proto.duelTurn = function () {
        const result = originalDuelTurn.call(this);
        this.setScreen('gameplay');
        return result;
    };

    proto.winDuel = function (outcome) {
        const result = originalWinDuel.call(this, outcome);
        this.setScreen('gameplay');
        return result;
    };

    proto.loseDuel = function (outcome) {
        const result = originalLoseDuel.call(this, outcome);
        this.setScreen('gameplay');
        return result;
    };

    proto.showShop = function () {
        const result = originalShowShop.call(this);
        const gameArea = area();
        if (gameArea) {
            gameArea.innerHTML = gameArea.innerHTML.replace(/ for you(?=\))/g, '');
            gameArea.innerHTML += `<div class="view-actions secondary-actions">
                <button onclick="game.showCharacterSheet()">Etymancer</button>
                <button onclick="game.showMainMenu()">Main Menu</button>
            </div>`;
        }
        this.setScreen('shop');
        return result;
    };

    proto.showPurchaseResult = function (message) {
        const result = originalShowPurchaseResult.call(this, message);
        this.setScreen('shop');
        return result;
    };

    proto.showPurchaseFailure = function (cost) {
        const result = originalShowPurchaseFailure.call(this, cost);
        this.setScreen('shop');
        return result;
    };

    proto.showHelp = function () {
        if (!this.wordSet) {
            this.setScreen('support');
            area().innerHTML = `
                <section class="screen-section">
                    <div class="screen-kicker">HOW TO PLAY</div>
                    <div class="screen-title">Study words. Cast spells. Defeat bosses.</div>
                    <p>Choose a spellbook, review its Grimoire, then answer questions to earn gold and mana. Build streaks, buy stronger gear, and fight a boss every 10 spells.</p>
                    <div class="view-actions"><button onclick="game.showMainMenu()">Main Menu</button></div>
                </section>`;
            return;
        }
        const result = originalShowHelp.call(this);
        area().innerHTML += `<div class="view-actions secondary-actions"><button onclick="game.showMainMenu()">Main Menu</button></div>`;
        this.setScreen('support');
        return result;
    };

    proto.updateStats = function () {
        const result = originalUpdateStats.call(this);
        this.updateCompactHud();
        return result;
    };

    // The inline script rendered the legacy start screen before ui.js loaded.
    // Replace it with the new screen architecture immediately.
    game.ensureUiShell();
    game.showMainMenu();
})();

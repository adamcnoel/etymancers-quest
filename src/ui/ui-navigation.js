// Navigation policy layered on top of explicit flow-state.js.
// Side screens are free to render normally; flow-state.js remembers the logical
// gameplay state and makes existing "Back/Continue Casting" actions resume it.
(function () {
    if (typeof EtymancerGame === 'undefined' || typeof game === 'undefined') return;

    const proto = EtymancerGame.prototype;
    if (proto.__uiNavigationInstalled) return;
    proto.__uiNavigationInstalled = true;

    const originalSelectSpellbookForSetup = proto.selectSpellbookForSetup;

    function area() {
        return document.getElementById('game-area');
    }

    function safe(text) {
        return game.escapeHtml ? game.escapeHtml(text) : String(text);
    }

    function renderMainMenu(instance, returningToGameplay) {
        const gameArea = area();
        if (!gameArea || !instance.wordSet || !instance.player) return;

        const primaryLabel = returningToGameplay ? 'Continue Casting' : 'Begin Casting';
        const statusTitle = returningToGameplay
            ? 'Your adventure is in progress.'
            : 'Your adventure is ready to begin.';

        gameArea.innerHTML = `
            <section class="screen-section menu-screen">
                <div class="screen-kicker">MAIN MENU</div>
                <div class="menu-status-card">
                    <div class="screen-title">${statusTitle}</div>
                    <div>${safe(instance.wordSet.name)}</div>
                    <div class="examples">Review your Grimoire, prepare your Etymancer, or enter the dungeon when you're ready.</div>
                </div>
                <div class="menu-actions">
                    <button class="primary-action" onclick="game.askQuestion()">${primaryLabel}</button>
                    <button onclick="game.showSpellbookSetup()">Grimoire</button>
                    <button onclick="game.showCharacterSheet()">Etymancer</button>
                    <button onclick="game.showShop()">Arcane Emporium</button>
                    <button onclick="game.showHelp()">How to Play</button>
                    <button onclick="game.showResetConfirm()">Reset Grimoire</button>
                </div>
            </section>`;
    }

    proto.resetGrimoireFromUi = function () {
        if (!this.wordSet) return this.showSpellbookSetup();
        if (typeof this.discardGameplayReturn === 'function') this.discardGameplayReturn();
        this.newGame();
        this.currentQuestion = null;
        this.currentAnswer = null;
        this.duel = null;
        this.showMainMenu();
    };

    proto.showMainMenu = function () {
        // No selected Grimoire is onboarding, not a distinct menu state. Send a
        // fresh device directly to the one screen where that choice is made.
        if (!this.wordSet || !this.player) return this.showSpellbookSetup();

        this.setScreen('menu');
        const flow = typeof this.ensureFlowState === 'function' ? this.ensureFlowState() : null;
        const returningToGameplay = !!flow?.returnTo;
        renderMainMenu(this, returningToGameplay);
    };

    proto.showResetConfirm = function () {
        this.setScreen('menu');
        if (!this.wordSet) return this.showSpellbookSetup();
        const gameArea = area();
        if (!gameArea) return;
        gameArea.innerHTML = `
            <section class="screen-section">
                <div class="screen-kicker">RESET GRIMOIRE</div>
                <div class="screen-title">Reset ${safe(this.wordSet.name)}?</div>
                <p>This resets spell progress, gold, gear, mana, streak, mastery, and boss campaign progress for this Grimoire only. Your other Grimoire is untouched.</p>
                <div class="view-actions">
                    <button class="danger-action" onclick="game.resetGrimoireFromUi()">Reset Grimoire</button>
                    <button onclick="game.showMainMenu()">Cancel</button>
                </div>
            </section>`;
    };

    proto.selectSpellbookForSetup = function (setId) {
        if (this.wordSet && this.wordSet.id !== setId &&
            typeof this.discardGameplayReturn === 'function') {
            this.discardGameplayReturn();
        }
        return originalSelectSpellbookForSetup.call(this, setId);
    };
})();

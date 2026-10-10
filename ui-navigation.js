// Navigation policy layered on top of explicit flow-state.js.
// Side screens are free to render normally; flow-state.js remembers the logical
// gameplay state and makes existing "Back/Continue Casting" actions resume it.
(function () {
    if (typeof EtymancerGame === 'undefined' || typeof game === 'undefined') return;

    const proto = EtymancerGame.prototype;
    if (proto.__uiNavigationInstalled) return;
    proto.__uiNavigationInstalled = true;

    const originalShowMainMenu = proto.showMainMenu;
    const originalSelectSpellbookForSetup = proto.selectSpellbookForSetup;

    function area() {
        return document.getElementById('game-area');
    }

    function shell() {
        return document.querySelector('.game-container');
    }

    function safe(text) {
        return game.escapeHtml ? game.escapeHtml(text) : String(text);
    }

    function renderFreshMainMenu() {
        const gameArea = area();
        if (!gameArea || !game.wordSet || !game.player) return;
        gameArea.innerHTML = `
            <section class="screen-section menu-screen">
                <div class="screen-kicker">MAIN MENU</div>
                <div class="menu-status-card">
                    <div class="screen-title">Your adventure is ready to begin.</div>
                    <div>${safe(game.wordSet.name)}</div>
                    <div class="examples">Review your Grimoire first, or begin casting when you're ready.</div>
                </div>
                <div class="menu-actions">
                    <button class="primary-action" onclick="game.askQuestion()">Begin Casting</button>
                    <button onclick="game.showSpellbookSetup()">Grimoire</button>
                    <button onclick="game.showHelp()">How to Play</button>
                </div>
            </section>`;
    }

    proto.startNewGameFromUi = function () {
        if (typeof this.discardGameplayReturn === 'function') this.discardGameplayReturn();
        this.newGame();
        this.currentQuestion = null;
        this.currentAnswer = null;
        this.duel = null;
        this.showMainMenu();
    };

    proto.showMainMenu = function () {
        const result = originalShowMainMenu.call(this);
        const flow = typeof this.ensureFlowState === 'function' ? this.ensureFlowState() : null;
        const returningToGameplay = !!flow?.returnTo;

        if (!returningToGameplay && this.wordSet && this.player &&
            this.questionsAnswered === 0 && !this.currentQuestion) {
            renderFreshMainMenu();
        }
        return result;
    };

    proto.showResetConfirm = function () {
        this.setScreen('menu');
        if (!this.wordSet) return this.showSpellbookSetup();
        const gameArea = area();
        if (!gameArea) return;
        gameArea.innerHTML = `
            <section class="screen-section">
                <div class="screen-kicker">NEW GAME</div>
                <div class="screen-title">Reset ${safe(this.wordSet.name)}?</div>
                <p>This resets level, gold, gear, mana, streak and mastery for this Grimoire only.</p>
                <div class="view-actions">
                    <button class="danger-action" onclick="game.startNewGameFromUi()">Reset Progress</button>
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

    // ui.js renders the first menu before this final navigation policy is loaded.
    // Re-render once so a fresh save uses the intentional fresh-game menu.
    const initialContainer = shell();
    if (initialContainer && initialContainer.dataset.screen === 'menu') {
        game.showMainMenu();
    }
})();

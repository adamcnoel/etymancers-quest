// Navigation-state fixes layered on top of the modular UI shell.
// Leaving any gameplay state for Menu / Grimoire / Emporium / Character Sheet /
// Help / Inventory should suspend that exact state until the player explicitly
// advances it.
(function () {
    if (typeof EtymancerGame === 'undefined' || typeof game === 'undefined') return;

    const proto = EtymancerGame.prototype;
    if (proto.__uiNavigationInstalled) return;
    proto.__uiNavigationInstalled = true;

    const originalShowMainMenu = proto.showMainMenu;
    const originalShowSpellbookSetup = proto.showSpellbookSetup;
    const originalShowCharacterSheet = proto.showCharacterSheet;
    const originalShowShop = proto.showShop;
    const originalShowPurchaseResult = proto.showPurchaseResult;
    const originalShowPurchaseFailure = proto.showPurchaseFailure;
    const originalShowHelp = proto.showHelp;
    const originalShowResetConfirm = proto.showResetConfirm;
    const originalSelectSpellbookForSetup = proto.selectSpellbookForSetup;

    let suspendedEncounter = null;

    function area() {
        return document.getElementById('game-area');
    }

    function shell() {
        return document.querySelector('.game-container');
    }

    function safe(text) {
        return game.escapeHtml ? game.escapeHtml(text) : String(text);
    }

    function captureGameplayState() {
        if (suspendedEncounter) return;
        const container = shell();
        const gameArea = area();
        const input = document.getElementById('answer-input');

        if (!gameArea) return;

        // A duel is authoritative gameplay state even if another UI layer has
        // temporarily left the screen marker stale. Otherwise, any screen marked
        // gameplay is resumable: unanswered cast, cast result, boss offer, duel
        // outcome, victory, or defeat.
        const activeDuel = !!game.duel;
        const activeGameplay = !!(
            container && container.dataset.screen === 'gameplay'
        );
        if (!activeDuel && !activeGameplay) return;

        suspendedEncounter = {
            kind: activeDuel ? 'duel' : 'gameplay',
            html: gameArea.innerHTML,
            inputValue: input ? (input.value || '') : '',
            currentQuestion: game.currentQuestion,
            currentAnswer: game.currentAnswer,
            questionsAnswered: game.questionsAnswered,
            duel: activeDuel ? {...game.duel} : null
        };
    }

    // Later-loaded UI layers (currently Inventory) can use the same navigation
    // contract without duplicating snapshot logic.
    proto.suspendGameplayState = function () {
        captureGameplayState();
    };

    function wireResumeButtons() {
        const gameArea = area();
        if (!gameArea) return;
        gameArea.innerHTML = gameArea.innerHTML.replace(
            /onclick="game\.askQuestion\(\)"/g,
            'onclick="game.resumeCasting()"'
        );
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

    proto.resumeCasting = function () {
        if (!suspendedEncounter) return this.askQuestion();

        const snapshot = suspendedEncounter;
        suspendedEncounter = null;
        this.currentQuestion = snapshot.currentQuestion;
        this.currentAnswer = snapshot.currentAnswer;
        this.questionsAnswered = snapshot.questionsAnswered;
        this.duel = snapshot.duel ? {...snapshot.duel} : null;

        const gameArea = area();
        if (!gameArea) return;
        gameArea.innerHTML = snapshot.html;
        this.setScreen('gameplay');

        const input = document.getElementById('answer-input');
        if (input) {
            input.value = snapshot.inputValue;
            input.focus();
        }
    };

    proto.startNewGameFromUi = function () {
        suspendedEncounter = null;
        this.newGame();
        this.currentQuestion = null;
        this.currentAnswer = null;
        this.duel = null;
        this.showMainMenu();
    };

    proto.showMainMenu = function () {
        captureGameplayState();
        const result = originalShowMainMenu.call(this);

        if (suspendedEncounter) {
            wireResumeButtons();
        } else if (this.wordSet && this.player && this.questionsAnswered === 0 && !this.currentQuestion) {
            renderFreshMainMenu();
        }
        return result;
    };

    proto.showSpellbookSetup = function () {
        captureGameplayState();
        const result = originalShowSpellbookSetup.call(this);
        if (suspendedEncounter) wireResumeButtons();
        return result;
    };

    proto.showCharacterSheet = function () {
        captureGameplayState();
        const result = originalShowCharacterSheet.call(this);
        if (suspendedEncounter) wireResumeButtons();
        return result;
    };

    proto.showShop = function () {
        captureGameplayState();
        const result = originalShowShop.call(this);
        if (suspendedEncounter) wireResumeButtons();
        return result;
    };

    proto.showPurchaseResult = function (message) {
        const result = originalShowPurchaseResult.call(this, message);
        if (suspendedEncounter) wireResumeButtons();
        return result;
    };

    proto.showPurchaseFailure = function (cost) {
        const result = originalShowPurchaseFailure.call(this, cost);
        if (suspendedEncounter) wireResumeButtons();
        return result;
    };

    proto.showHelp = function () {
        captureGameplayState();
        const result = originalShowHelp.call(this);
        if (suspendedEncounter) wireResumeButtons();
        return result;
    };

    proto.showResetConfirm = function () {
        const result = originalShowResetConfirm.call(this);
        const gameArea = area();
        if (gameArea) {
            gameArea.innerHTML = gameArea.innerHTML.replace(
                'onclick="newGame(); game.showMainMenu()"',
                'onclick="game.startNewGameFromUi()"'
            );
        }
        return result;
    };

    proto.selectSpellbookForSetup = function (setId) {
        if (this.wordSet && this.wordSet.id !== setId) suspendedEncounter = null;
        return originalSelectSpellbookForSetup.call(this, setId);
    };

    // ui.js renders the first menu before this navigation layer is installed.
    // Re-render that menu once so startup goes through the final navigation
    // rules (including the fresh-game "ready to begin" state).
    const initialContainer = shell();
    if (initialContainer && initialContainer.dataset.screen === 'menu') {
        game.showMainMenu();
    }
})();
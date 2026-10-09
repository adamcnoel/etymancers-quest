// Navigation-state fixes layered on top of the modular UI shell.
// Leaving an unanswered casting prompt for Menu / Grimoire / Emporium /
// Character Sheet should suspend that exact prompt, not consume a new one.
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

    let suspendedCast = null;

    function area() {
        return document.getElementById('game-area');
    }

    function shell() {
        return document.querySelector('.game-container');
    }

    function captureActiveCast() {
        if (suspendedCast) return;
        const container = shell();
        const gameArea = area();
        const input = document.getElementById('answer-input');

        // Only suspend an unresolved normal casting prompt. Result screens and
        // other gameplay states should continue through their normal workflow.
        if (!container || container.dataset.screen !== 'gameplay' || !gameArea || !input || game.duel) return;

        suspendedCast = {
            html: gameArea.innerHTML,
            inputValue: input.value || '',
            currentQuestion: game.currentQuestion,
            currentAnswer: game.currentAnswer,
            questionsAnswered: game.questionsAnswered
        };
    }

    function wireResumeButtons() {
        const gameArea = area();
        if (!gameArea) return;
        gameArea.innerHTML = gameArea.innerHTML.replace(
            /onclick="game\.askQuestion\(\)"/g,
            'onclick="game.resumeCasting()"'
        );
    }

    proto.resumeCasting = function () {
        if (!suspendedCast) return this.askQuestion();

        const snapshot = suspendedCast;
        suspendedCast = null;
        this.currentQuestion = snapshot.currentQuestion;
        this.currentAnswer = snapshot.currentAnswer;
        this.questionsAnswered = snapshot.questionsAnswered;

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
        suspendedCast = null;
        this.newGame();
        this.currentQuestion = null;
        this.currentAnswer = null;
        this.duel = null;
        this.showSpellbookSetup();
    };

    proto.showMainMenu = function () {
        captureActiveCast();
        const result = originalShowMainMenu.call(this);
        if (suspendedCast) wireResumeButtons();
        return result;
    };

    proto.showSpellbookSetup = function () {
        captureActiveCast();
        const result = originalShowSpellbookSetup.call(this);
        if (suspendedCast) wireResumeButtons();
        return result;
    };

    proto.showCharacterSheet = function () {
        captureActiveCast();
        const result = originalShowCharacterSheet.call(this);
        if (suspendedCast) wireResumeButtons();
        return result;
    };

    proto.showShop = function () {
        captureActiveCast();
        const result = originalShowShop.call(this);
        if (suspendedCast) wireResumeButtons();
        return result;
    };

    proto.showPurchaseResult = function (message) {
        const result = originalShowPurchaseResult.call(this, message);
        if (suspendedCast) wireResumeButtons();
        return result;
    };

    proto.showPurchaseFailure = function (cost) {
        const result = originalShowPurchaseFailure.call(this, cost);
        if (suspendedCast) wireResumeButtons();
        return result;
    };

    proto.showHelp = function () {
        captureActiveCast();
        const result = originalShowHelp.call(this);
        if (suspendedCast) wireResumeButtons();
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
        if (this.wordSet && this.wordSet.id !== setId) suspendedCast = null;
        return originalSelectSpellbookForSetup.call(this, setId);
    };
})();
// Boss transition timing layered onto the core casting flow.
// Spell results should remain visible until the player explicitly continues.
(function () {
    if (typeof EtymancerGame === 'undefined' || typeof game === 'undefined') return;

    const proto = EtymancerGame.prototype;
    if (proto.__bossFlowInstalled) return;
    proto.__bossFlowInstalled = true;

    proto.showCastResult = function (resultText, userAnswer) {
        this.updateStats();
        this.saveGame();

        const gameArea = document.getElementById('game-area');
        if (!gameArea) return;

        gameArea.innerHTML = `
            <div class="question-counter">--- Spell ${this.questionsAnswered} ---</div>
            <div>${this.currentQuestion}</div>
            ${userAnswer ? `<div>Your incantation: ${this.escapeHtml(userAnswer)}</div>` : ''}
            ${resultText}
            <div class="input-area">
                <button onclick="game.nextQuestion()">Continue</button>
            </div>
        `;

        if (typeof this.setScreen === 'function') this.setScreen('gameplay');
    };

    proto.nextQuestion = function () {
        if (this.questionsAnswered > 0 && this.questionsAnswered % 10 === 0) {
            return this.offerBossFight();
        }
        return this.askQuestion();
    };
})();

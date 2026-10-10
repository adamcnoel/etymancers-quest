// Opt-in developer shortcuts for manual testing. Nothing is rendered unless
// the page is opened with ?debug=1.
(function () {
    if (typeof EtymancerGame === 'undefined' || typeof game === 'undefined') return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const params = new URLSearchParams(window.location.search || '');
    if (params.get('debug') !== '1') return;

    const proto = EtymancerGame.prototype;
    if (proto.__debugToolsInstalled) return;
    proto.__debugToolsInstalled = true;

    proto.debugStartDuel = function () {
        if (!this.wordSet || !this.player) return this.showSpellbookSetup();
        this.startDuel('Debugging Wyrm');
        if (typeof this.setScreen === 'function') this.setScreen('gameplay');
    };

    proto.debugPrimeBossThreshold = function () {
        if (!this.wordSet || !this.player) return this.showSpellbookSetup();
        this.questionsAnswered = 9;
        this.duel = null;
        this.askQuestion();
    };

    proto.debugFillMana = function () {
        if (!this.player) return;
        this.player.mana = this.player.maxMana;
        this.updateStats();
        this.saveGame();
        renderDebugPanel();
    };

    proto.debugAddGold = function () {
        if (!this.player) return;
        this.player.gold += 1000;
        this.updateStats();
        this.saveGame();
        renderDebugPanel();
    };

    function renderDebugPanel() {
        const existing = document.getElementById('debug-tools');
        if (existing) existing.remove();

        const panel = document.createElement('details');
        panel.id = 'debug-tools';
        panel.className = 'debug-tools';
        panel.innerHTML = `
            <summary>Dev Tools</summary>
            <div class="debug-actions">
                <button type="button" onclick="game.debugStartDuel()">Start Boss Duel</button>
                <button type="button" onclick="game.debugPrimeBossThreshold()">Next Spell Triggers Boss</button>
                <button type="button" onclick="game.debugFillMana()">Fill Mana</button>
                <button type="button" onclick="game.debugAddGold()">+1000 Gold</button>
            </div>`;

        const host = document.querySelector('.game-container') || document.body;
        host.appendChild(panel);
    }

    renderDebugPanel();
})();
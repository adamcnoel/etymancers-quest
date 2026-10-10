// Compact duel question copy while preserving the same mechanics and controls.
(function () {
    if (typeof EtymancerGame === 'undefined') return;

    const proto = EtymancerGame.prototype;
    if (proto.__duelCopyInstalled) return;
    proto.__duelCopyInstalled = true;

    const originalDuelTurn = proto.duelTurn;

    function renderConcise(game, payload = {}) {
        const d = game.duel;
        const gameArea = document.getElementById('game-area');
        if (!d || !gameArea) return;

        const canChannel = game.player.mana >= 10;
        const base = game.baseSpellDamage();
        const streakBonus = (d.duelStreak + 1) * 2;
        const nextDamage = base + streakBonus;

        gameArea.innerHTML = `
            <div>=== SPELL DUEL: ${d.bossName} ===</div>
            <div class="incorrect">Boss HP ${d.bossHp}/${d.bossMaxHp}</div>
            <div class="incorrect">[${game.renderBar(d.bossHp, d.bossMaxHp)}]</div>
            <div class="correct">Your HP ${d.playerHp}/${d.playerMaxHp}</div>
            <div class="correct">[${game.renderBar(d.playerHp, d.playerMaxHp)}]</div>
            <br>
            <div>${game.currentQuestion}</div>
            <div class="examples">⚡ ${nextDamage} damage · 🔥 ${nextDamage * 2} channeled (10 mana) · Miss: −${d.bossHit} HP${canChannel
                ? `<br><label><input type="checkbox" onchange="game.armChannel(this.checked)" ${d.channelArmed ? 'checked' : ''}> Channel with Enter</label>`
                : ''}</div>
            <div class="input-area">
                <input type="text" id="answer-input" placeholder="Speak the incantation..." onkeypress="if(event.key==='Enter') game.duelCast(game.duel.channelArmed)">
                <button onclick="game.duelCast(false)">⚡ Cast — ${nextDamage} dmg</button>
                <button onclick="game.duelCast(true)" ${canChannel ? '' : 'disabled'}>${canChannel
                    ? `🔥 Channel — ${nextDamage * 2} dmg (10 mana)`
                    : `🔥 Channel — needs 10 mana`}</button>
            </div>`;

        const input = document.getElementById('answer-input');
        if (input) {
            input.value = payload.draft || '';
            input.focus();
        }
    }

    proto.duelTurn = function () {
        const result = originalDuelTurn.call(this);
        renderConcise(this, {draft: ''});
        return result;
    };

    proto.renderDuelQuestionState = function (payload = {}) {
        renderConcise(this, payload);
    };
})();

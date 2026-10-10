// Dedicated equipment-management interface.
// Loaded after the UI/navigation layers so Inventory can reuse the existing
// character sheet, shop, and casting-resume behavior without changing the RPG engine.
(function () {
    if (typeof EtymancerGame === 'undefined' || typeof game === 'undefined') return;

    const proto = EtymancerGame.prototype;
    if (proto.__inventoryUiInstalled) return;
    proto.__inventoryUiInstalled = true;

    const originalShowCharacterSheet = proto.showCharacterSheet;
    const originalShowShop = proto.showShop;

    function area() {
        return document.getElementById('game-area');
    }

    function safe(text) {
        return game.escapeHtml ? game.escapeHtml(text) : String(text);
    }

    function equipped(instance, itemName, item) {
        return item.type === 'armor'
            ? instance.player.armor === itemName
            : instance.player.weapon === itemName;
    }

    function itemStats(item) {
        const parts = [];
        if (item.strength) parts.push(`+${item.strength} STR`);
        if (item.intelligence) parts.push(`+${item.intelligence} INT`);
        return parts.length ? parts.join(' · ') : 'No stat bonus';
    }

    function renderItemCard(instance, itemName) {
        const item = instance.shopItems[itemName];
        if (!item) return '';

        const isEquipped = equipped(instance, itemName, item);
        const net = instance.netVsEquipped(itemName);
        return `<div class="detail-card inventory-item${isEquipped ? ' equipped' : ''}">
            <div class="detail-label">${safe(itemName)}</div>
            <div class="detail-value">${itemStats(item)}</div>
            <div class="examples">${item.type === 'armor' ? 'Armor' : 'Weapon'}</div>
            ${isEquipped
                ? '<div class="inventory-status">Equipped</div>'
                : `<button onclick="game.equipInventoryItem('${safe(itemName)}')">Equip (${safe(instance.renderStatDelta(net))})</button>`}
        </div>`;
    }

    function renderGroup(instance, title, type, owned) {
        const items = owned.filter(itemName => instance.shopItems[itemName]?.type === type);
        return `<section class="inventory-group">
            <div class="screen-title">${title}</div>
            <div class="character-grid inventory-grid">
                ${items.length
                    ? items.map(itemName => renderItemCard(instance, itemName)).join('')
                    : '<div class="detail-card"><div class="examples">No items owned in this slot yet.</div></div>'}
            </div>
        </section>`;
    }

    function stripLegacyVault(html) {
        return String(html || '').replace(
            /<br><div>=== YOUR VAULT ===<\/div>[\s\S]*?(?=<div class="input-area">)/,
            ''
        );
    }

    proto.showInventory = function () {
        if (!this.wordSet || !this.player) return this.showSpellbookSetup();
        this.setScreen('inventory');

        const owned = (this.player.ownedItems || []).filter(itemName => this.shopItems[itemName]);
        const gameArea = area();
        if (!gameArea) return;

        gameArea.innerHTML = `
            <section class="screen-section inventory-screen">
                <div class="screen-kicker">INVENTORY</div>
                <div class="screen-title">Owned equipment</div>
                <div class="examples">Equip any item you already own for free. Equipped gear is shown separately from stored gear.</div>
                ${renderGroup(this, 'Armor', 'armor', owned)}
                ${renderGroup(this, 'Weapons', 'weapon', owned)}
                <div class="view-actions">
                    <button class="primary-action" onclick="game.resumeCasting()">${this.questionsAnswered ? 'Back to Casting' : 'Begin Casting'}</button>
                    <button onclick="game.showCharacterSheet()">Etymancer</button>
                    <button onclick="game.showShop()">Arcane Emporium</button>
                    <button onclick="game.showMainMenu()">Main Menu</button>
                </div>
            </section>`;
    };

    proto.equipInventoryItem = function (itemName) {
        if (!this.shopItems[itemName] || !this.player?.ownedItems?.includes(itemName)) return;
        this.equipItem(itemName);
        this.showInventory();
    };

    proto.showCharacterSheet = function () {
        const result = originalShowCharacterSheet.call(this);
        const gameArea = area();
        if (gameArea) {
            gameArea.innerHTML = gameArea.innerHTML.replace(
                '<button onclick="game.showShop()">Open Emporium</button>',
                '<button onclick="game.showInventory()">Open Inventory</button><button onclick="game.showShop()">Open Emporium</button>'
            );
        }
        return result;
    };

    proto.showShop = function () {
        const result = originalShowShop.call(this);
        const gameArea = area();
        if (gameArea) {
            gameArea.innerHTML = stripLegacyVault(gameArea.innerHTML);
            gameArea.innerHTML = gameArea.innerHTML.replace(
                '<button onclick="game.showCharacterSheet()">Etymancer</button>',
                '<button onclick="game.showInventory()">Inventory</button><button onclick="game.showCharacterSheet()">Etymancer</button>'
            );
        }
        return result;
    };
})();
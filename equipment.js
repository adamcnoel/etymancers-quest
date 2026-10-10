const EQUIPMENT = {
    // Armor
    "cloth robe": {cost: 25, strength: 0, intelligence: 3, type: "armor"},
    "leather armor": {cost: 50, strength: 5, intelligence: 0, type: "armor"},
    "studded leather": {cost: 75, strength: 7, intelligence: 0, type: "armor"},
    "chain mail": {cost: 100, strength: 10, intelligence: 0, type: "armor"},
    "scale mail": {cost: 140, strength: 12, intelligence: 0, type: "armor"},
    "plate armor": {cost: 180, strength: 15, intelligence: 0, type: "armor"},
    "enchanted plate": {cost: 280, strength: 18, intelligence: 5, type: "armor"},
    "wizard robes": {cost: 75, strength: 0, intelligence: 8, type: "armor"},
    "mage robes": {cost: 120, strength: 0, intelligence: 12, type: "armor"},
    "archmage robes": {cost: 180, strength: 0, intelligence: 18, type: "armor"},
    "battle robes": {cost: 230, strength: 8, intelligence: 15, type: "armor"},
    "mystic armor": {cost: 300, strength: 12, intelligence: 20, type: "armor"},
    "dragon scale armor": {cost: 350, strength: 20, intelligence: 8, type: "armor"},
    "celestial robes": {cost: 420, strength: 5, intelligence: 25, type: "armor"},
    "godlike vestments": {cost: 600, strength: 15, intelligence: 35, type: "armor"},
    
    // Weapons
    "wooden staff": {cost: 20, strength: 0, intelligence: 2, type: "weapon"},
    "iron sword": {cost: 60, strength: 8, intelligence: 0, type: "weapon"},
    "steel sword": {cost: 100, strength: 12, intelligence: 0, type: "weapon"},
    "magic wand": {cost: 80, strength: 0, intelligence: 10, type: "weapon"},
    "crystal wand": {cost: 140, strength: 0, intelligence: 15, type: "weapon"},
    "enchanted sword": {cost: 170, strength: 15, intelligence: 3, type: "weapon"},
    "flaming sword": {cost: 220, strength: 18, intelligence: 0, type: "weapon"},
    "staff of power": {cost: 190, strength: 5, intelligence: 18, type: "weapon"},
    "runic blade": {cost: 280, strength: 20, intelligence: 8, type: "weapon"},
    "staff of mastery": {cost: 320, strength: 0, intelligence: 25, type: "weapon"},
    "legendary blade": {cost: 350, strength: 25, intelligence: 5, type: "weapon"},
    "void blade": {cost: 480, strength: 30, intelligence: 10, type: "weapon"},
    "cosmic staff": {cost: 450, strength: 8, intelligence: 30, type: "weapon"},
    "excalibur": {cost: 700, strength: 40, intelligence: 15, type: "weapon"},
    "staff of eternity": {cost: 650, strength: 10, intelligence: 40, type: "weapon"}
};

// Browser-only extensions depend on the EtymancerGame class and global game
// instance defined later in index.html. Load them sequentially after the inline
// game script so each layer can safely build on the previous one.
// The guard keeps equipment.js safe for the Node-based playthrough harness.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        const extensions = [
            'mastery.js',
            'mastery-spacing.js',
            'ui.js',
            'grimoire-status.js',
            'grimoire-sort.js',
            'boss-flow.js',
            'cast-copy.js',
            'flow-state.js',
            'ui-navigation.js',
            'inventory.js',
            'debug.js'
        ];
        // A fresh token on every page load prevents stale extension code from
        // surviving branch switches or deployments. This affects browser asset
        // caching only; game progress remains in the existing localStorage keys.
        const cacheToken = Date.now();
        const loadNext = index => {
            if (index >= extensions.length) return;
            const script = document.createElement('script');
            script.src = `${extensions[index]}?v=${cacheToken}`;
            script.onload = () => loadNext(index + 1);
            document.body.appendChild(script);
        };
        loadNext(0);
    });
}

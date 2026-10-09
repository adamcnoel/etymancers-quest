// Structural regression checks for the modular UI shell.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const ui = fs.readFileSync(path.join(ROOT, 'ui.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');

const checks = [
    ['main menu view exists', ui.includes('showMainMenu')],
    ['grimoire view exists', ui.includes('showSpellbookSetup') && ui.includes('renderGrimoireRows')],
    ['character sheet exists', ui.includes('showCharacterSheet')],
    ['gameplay screen state exists', ui.includes("setScreen('gameplay')")],
    ['shop screen state exists', ui.includes("setScreen('shop')")],
    ['compact HUD is implemented', ui.includes('compact-hud') && css.includes('.compact-hud')],
    ['gameplay navigation is implemented', ui.includes('gameplay-nav') && css.includes('.gameplay-nav')],
    ['gameplay nav uses Grimoire terminology', ui.includes('>Grimoire</button>')],
    ['gameplay nav does not duplicate Etymancer link', !ui.includes('<button type="button" onclick="game.showCharacterSheet()">Etymancer</button>')],
    ['no internal issue references leak into UI', !/#\d+/.test(ui)],
    ['no player-facing Spellbook label remains', !/>[^<]*Spellbook[^<]*</i.test(ui)],
    ['grimoire layout is scalable', css.includes('.spellbook-grid')],
    ['character layout is scalable', css.includes('.character-grid')],
    ['tablet/phone breakpoint exists', css.includes('@media (max-width: 720px)')],
    ['small-phone breakpoint exists', css.includes('@media (max-width: 420px)')],
    ['dynamic viewport units supported', css.includes('100dvh')],
    ['legacy permanent stats panel hidden', /\.stats-panel,\s*\n\.game-footer\s*\{\s*\n\s*display:\s*none/.test(css)],
    ['main header limited to menu', css.includes('.game-container:not([data-screen="menu"]) .game-header')],
    ['grimoire review can flip direction', ui.includes("setGrimoireDirection('forward')") && ui.includes("setGrimoireDirection('reverse')")]
];

let failed = 0;
for (const [label, ok] of checks) {
    if (ok) console.log(`PASS: ${label}`);
    else {
        failed++;
        console.error(`FAIL: ${label}`);
    }
}

console.log(`\nRESULT: ${checks.length - failed} checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

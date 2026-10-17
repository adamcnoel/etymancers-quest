# Etymancer's Quest

A retro, terminal-styled vocabulary RPG. You play an **Etymancer**: study a Grimoire, cast spells by answering vocabulary questions, earn gold and mana, equip better gear, and challenge a six-boss campaign when you decide you are ready.

The project is intentionally small and static: no build step and no runtime dependencies. It can be opened directly or served as a static site, and it is installable as a PWA.

## Running locally

```bash
python3 -m http.server
# open http://localhost:8000
```

You can also open `index.html` directly in a modern browser.

## Grimoire data

The game ships with two independent Grimoire datasets:

- **Roots & Affixes** (`src/data/roots.js`) — Greek/Latin roots and examples; the harder list.
- **Vocabulary Words** (`src/data/words.js`) — whole vocabulary words with multiple acceptable meanings; the easier list.

Each Grimoire has its own save namespace (`etymancerSave:roots` / `etymancerSave:words`), including spell count, gold, equipment, mana, mastery, and campaign progress.

## Core study loop

Questions run in both directions: term → meaning and meaning → term. Correct answers earn gold and mana and build a streak; misses/fizzles reveal the answer and reset the streak.

Streaks increase the reward multiplier, up to x5. Per-term mastery progresses through:

**New → Learning → Familiar → Mastered**

Adaptive review gives more exposure to weaker and recently missed material while spacing recently answered terms so the same term does not immediately repeat.

The **Grimoire** remains available as a study/reference screen and shows mastery status for every term.

## Gear and Inventory

Gold can be spent in the **Arcane Emporium** on robes, staves/weapons, and mana upgrades. Purchased equipment is owned permanently within that Grimoire and can be re-equipped from **Inventory**.

INT and STR affect duel damage; STR also contributes to duel HP. The legacy internal `player.level` field remains for compatibility, but Etymancer Level is intentionally not presented as a progression system until a real level model is defined.

## Boss campaign

Bosses are **not** triggered every ten spells anymore.

Open **Bosses** whenever you want and choose from six bosses. All undefeated bosses are visible from the start with fixed baseline difficulty. Starting a boss fight intentionally replaces any suspended normal-casting question.

During an active duel:

- the active boss can be resumed without resetting HP or the current question;
- other bosses are unavailable until the fight ends;
- correct answers damage the boss;
- misses damage the player;
- Channel spends 10 mana to double a successful hit.

Boss victories grant campaign credit, gold, and a full mana refill. Campaign completion is tracked independently per Grimoire. Defeating all six completes the campaign without ending normal study/casting.

Boss-specific mechanics and personalities are intentionally separate from the campaign framework.

## Session/navigation state

Persistent study/RPG progress lives in `localStorage`. Encounter/navigation state is session-only and uses an explicit flow-state model, so leaving gameplay for Grimoire, Emporium, Inventory, or other side screens can return to the correct question/result/duel without persisting stale DOM snapshots across reloads.

A cold reload preserves saved progress but starts a fresh page session rather than pretending an old in-memory encounter still exists.

## PWA

`manifest.json` keeps the GitHub Pages start URL at `/etymancers-quest/` and references the root-level icon assets:

- `favicon.svg`
- `apple-touch-icon.png`
- `icon-192.png`
- `icon-512.png`
- `icon-512-maskable.png`

Those entry assets intentionally remain at the repository root so browser/PWA paths stay simple and stable. `tests/pwa-assets.js` verifies manifest, icon, stylesheet, data-script, bootstrap, and extension-loader paths.

## Project structure

```text
/
├── index.html                 # Core game class and static page shell
├── style.css                  # Retro terminal UI theme
├── manifest.json              # PWA metadata
├── favicon.svg
├── apple-touch-icon.png
├── icon-192.png
├── icon-512.png
├── icon-512-maskable.png
├── src/
│   ├── bootstrap.js           # Sequential extension loader + cache busting
│   ├── data/
│   │   ├── roots.js           # Roots & Affixes data
│   │   ├── words.js           # Vocabulary Words data
│   │   ├── equipment.js       # Equipment catalog
│   │   └── bosses.js          # Six-boss roster/data
│   ├── core/
│   │   ├── mastery.js
│   │   ├── mastery-spacing.js
│   │   └── flow-state.js
│   ├── ui/
│   │   ├── ui.js
│   │   ├── ui-navigation.js
│   │   ├── grimoire-status.js
│   │   ├── grimoire-sort.js
│   │   ├── cast-copy.js
│   │   └── duel-copy.js
│   ├── features/
│   │   ├── boss-flow.js
│   │   ├── boss-campaign.js
│   │   ├── inventory.js
│   │   └── level-hold.js
│   └── dev/
│       └── debug.js
├── tests/
└── .github/workflows/tests.yml
```

The repository root is limited to static-site/PWA entry files and assets. Game data and runtime JavaScript live under `src/`. `index.html` loads the three required data files first; after the core game is constructed, `src/bootstrap.js` loads the feature layers sequentially with a per-page cache-busting token.

## Tests

The GitHub Actions suite runs syntax checks plus gameplay, campaign, mastery, navigation, UI, cache-busting, and PWA path regressions.

For a broad local check:

```bash
node tests/playthrough.js
node tests/campaign-playthrough.js
node tests/pwa-assets.js
```

Individual regression scripts in `tests/` can also be run directly with Node.

## Editing vocabulary

`src/data/roots.js` maps each root to a definition and examples:

```js
const ROOTS = {
  path: { definition: "feeling", examples: ["sympathy", "empathy", "apathy"] }
};
```

`src/data/words.js` maps each word to an array of acceptable meanings:

```js
const WORDS = {
  acrimonious: ["bitter", "angry", "mean-spirited (dialogue)"]
};
```

Parenthetical context is ignored during definition matching. If several words share a meaning, keep the shared meaning text consistent so reverse-direction questions can accept all valid terms.

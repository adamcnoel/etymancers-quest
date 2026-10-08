# 🧙 Etymancer's Quest

A retro, terminal-styled vocabulary RPG. You play an *Etymancer* — a mage whose
power comes from knowing words and what they mean. Name words and their meanings
to cast spells, earn gold and mana, buy arcane gear, and defeat bosses in spell
duels.

It ships with **two word lists** you can pick between: Greek/Latin **roots** for
older players, and whole **vocabulary words** for younger ones.

It's a single-page app with no build step and no dependencies — just open
`index.html` in a browser. It also works as an installable PWA on iOS/desktop.

## Running it

Open `index.html` directly in any modern browser, or serve the folder with any
static file server, e.g.:

```bash
python3 -m http.server
# then visit http://localhost:8000
```

Progress is saved automatically to your browser's `localStorage` (one key per
word list: `etymancerSave:roots` and `etymancerSave:words`), so you can close the
tab and pick up where you left off.

## How to play

### Choosing a word list (difficulty level)

On first launch — and any time via the **Word List** button in the footer — you
pick which spellbook to study:

| List | Level | Contents |
|------|-------|----------|
| **Roots & Affixes** (`roots.js`) | harder — 8th grade | Greek/Latin roots with one meaning each, plus example words. |
| **Vocabulary Words** (`words.js`) | easier — 4th grade | Whole words, each with several possible meanings. |

Each list keeps **its own** level, gold, gear, mastery data and question pool, so
two players can share a browser (or one player can switch between levels) without
overwriting each other's progress. The active list is shown in the stats panel.

### Casting spells (the core loop)

You're shown one of two kinds of question, alternating evenly. With the roots
list:

- **"What does '`sed`' mean?"** — type the meaning (e.g. `sit`).
- **"What root means '`sit`'?"** — type the root (e.g. `sed`).

With the vocabulary-words list:

- **"What is the definition of '`acrimonious`'?"** — type **any one** of its
  meanings (`bitter`, `angry` or `mean-spirited` all count).
- **"What word means '`bitter`'?"** — type the word (`acrimonious`). The meaning
  used in the prompt is picked at random from that word's list.

Type your answer (your "incantation") and press **Cast** (or Enter). If you
don't know it, press **Fizzle** to give up and reveal the answer.

- **Correct** → `✨ Spell cast!` You earn **gold** and **mana**, and your
  **streak** goes up.
- **Wrong / fizzled** → `💨 Your spell fizzles!` The answer and some example
  words are shown so you can learn it, and your streak resets to 0.

Answer matching is forgiving: for meanings, you can type the full definition or
any significant word in it (so "care" is accepted for "care for"), and anything
in parentheses is context for the reader only — "mean-spirited (dialogue)" is
answered by typing just `mean-spirited`.

### Mastery and adaptive review

Every term has its own learning state:

**New → Learning → Familiar → Mastered**

Correct recalls move a term forward through those stages. Misses move advanced
material back into heavier review rather than erasing all prior progress.
Question selection is weighted toward new, learning and recently missed terms;
mastered terms still return occasionally so they stay fresh.

Mastery is stored with the active word list's save. The stats panel shows how
many terms are currently mastered, and the result screen shows the current
term's mastery state after each answer.

### Streaks & combos

Consecutive correct casts build a **streak**, which raises your **combo
multiplier**:

| Streak | Multiplier |
|--------|------------|
| 0–1    | x1         |
| 2–3    | x2         |
| 4–5    | x3         |
| …      | up to **x5** |

The multiplier scales **both** the gold and mana you earn per cast, so keeping a
streak alive is worth much more than answering carelessly. A single wrong answer
or fizzle drops you back to x1. The game shows your active multiplier above each
question and spells out the bonus on every correct cast (e.g. *"Combo x2 → +20
gold, +10 mana"*), so you can see the streak paying off.

Not sure how it all fits together? A **How to Play** button in the footer lays
out the full loop at any time.

### Stats

Your Etymancer panel tracks:

- **Level** — raised by winning spell duels.
- **Gold** — spent in the Arcane Emporium.
- **Mana** — earned by casting; spent to *channel* in duels (see below). Caps at
  a maximum (starts at 30).
- **Streak** — current run of correct casts (drives the combo multiplier).
- **Mastered** — how many terms in the active spellbook have reached Mastered.
- **Intelligence / Strength** — raised by gear; together they determine your
  spell damage in duels, and Strength also adds duel HP.
- **Robes / Staff** — your currently equipped armor and weapon. INT and STR are
  always exactly your base 10 plus these two items.

### The Arcane Emporium (shop)

Spend gold on **robes** (armor) and **staves** (weapons) to raise your
Intelligence and Strength. A purchase is **equipped immediately and replaces**
whatever was in that slot — the old item moves to **your vault**, where it can
be re-equipped for free at any time. Each listing shows the change to *your*
stats, so a cheap item that would be a downgrade is easy to spot.

The shop shows gear near your current budget that you don't already own, and
gear is also **gated by level**: the strongest items stay locked until you've won
enough duels, so gold can't buy the whole catalog in your first ten spells.

Gold also buys **mana crystals**, which permanently raise your maximum mana by
10 (up to a per-level cap). Each one costs more than the last, so gold always has
somewhere to go — and a bigger mana pool means more Channels per duel.

### Spell duels (boss fights)

Every 10 spells, a named boss appears (the Lexivore, the Babbling Wyrm, the
Etymophage…) scaled to your level. You can **Begin Duel** or **Flee** back to
casting.

A duel is a turn-by-turn magic battle. Both you and the boss have an **HP bar**,
and each turn spells out exactly how much damage your next spell will deal — the
full sum, every term shown (e.g. *"24 = 22 base (INT+STR) + 2 streak"*):

- Each exchange is a word question. **Answer correctly** to strike the boss;
  spell damage scales with your **Intelligence + Strength**, plus a bonus for
  consecutive correct answers within the duel.
- **Answer wrong** and your spell fizzles — the boss strikes *you* instead.
- **Cast** vs **Channel**: both buttons cast the *same answer* you typed. **Cast**
  is a normal hit; **Channel** spends **10 mana to double the whole number
  shown**. It's the payoff for all the mana you've banked while casting — but
  it's a gamble, since a channeled spell that misses spends the mana anyway (the
  game says so when it happens).
- Tick **"Channel when I press Enter"** to channel from the keyboard; the choice
  sticks for the rest of the duel. Without it, Enter always casts normally.

Duel exchanges don't count toward the every-10-spells boss timer, so a long duel
never queues up the next boss.

Reduce the boss's HP to zero to **win**: you level up, earn bonus gold, get a
**full mana refill**, and keep your casting streak. If your HP hits zero you're
**defeated** — but you keep all your progress, so you can grind gold, upgrade
your gear, and try again.

## Editing the word lists

Both lists are plain JS objects you can extend freely — the game rebuilds its
entire question pool from whichever list is active.

`roots.js` maps a root to one `definition` plus `examples`:

```js
const ROOTS = {
  path: { definition: "feeling", examples: ["sympathy", "empathy", "apathy"] }
};
```

`words.js` maps a word to an array of acceptable meanings (no examples):

```js
const WORDS = {
  acrimonious: ["bitter", "angry", "mean-spirited (dialogue)"]
};
```

Two notes on `words.js`: parentheses hold context that's ignored when matching,
and meanings shared by several words should be written *identically* (e.g.
`"tired"` for both `drowsy` and `weary`) so any of them is accepted for the
"What word means …?" question.

To add a third list, register it in the `WORD_SETS` map at the top of the script
block in `index.html`: a display name, a `grade` and `blurb` for the picker, a
`termLabel` (the singular noun for one entry — the rest of the UI pluralizes it),
a `definePrompt`, and its data. The map key becomes the list's id and its
`localStorage` key. Gear lives in `equipment.js` in the same spirit.

## Project structure

| File | Purpose |
|------|---------|
| `index.html` | Layout, the `WORD_SETS` registry, and the entire `EtymancerGame` class. |
| `roots.js` | Harder list (`ROOTS`): word roots, one definition each, plus example words. |
| `words.js` | Easier list (`WORDS`): whole words, each with several meanings. |
| `equipment.js` | The shop catalog (`EQUIPMENT`): robes and staves with stats. |
| `mastery.js` | Per-term mastery, adaptive review weighting, persistence hooks, and mastery UI. |
| `style.css` | The green-on-black terminal theme. |
| `manifest.json` | PWA metadata (name, icons, theme). |
| `favicon.svg` | Scalable browser-tab icon (green terminal "E"). |
| `apple-touch-icon.png` | Home-screen icon for iOS. |
| `tests/playthrough.js` | Node harness covering the main game loop, saves, gear, duels, legacy migration, and mastery/adaptive review. |

## Tests

`tests/playthrough.js` loads the real script out of `index.html` against small
DOM/`localStorage` stubs and exercises the main game systems plus mastery
progression, persistence, demotion, list isolation, and adaptive review weights.

```bash
node tests/playthrough.js
```

It prints `RESULT: N checks passed, 0 failed` when the game is behaving.

// Exact transcription/format regression for The Word Within the Word — List #11.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'src/data/roots-list-11.js');
const src = fs.readFileSync(dataPath, 'utf8');
const list = new Function(src + '\nreturn ROOTS_LIST_11;')();
const keys = Object.keys(list);
const expected = {
    "-i": "plural",
    "jus": "law",
    "lum": "light",
    "ann": "year",
    "apo": "away",
    "sen": "old",
    "sol": "alone",
    "bas": "low",
    "rogat": "ask",
    "parl": "speak",
    "potent": "power",
    "surg": "rise",
    "log": "word or reason",
    "gram": "writing",
    "cant": "sing",
    "reg": "rule",
    "pro": "forward",
    "gyn": "woman",
    "ag": "to do",
    "act": "to do",
    "mob": "move",
    "sess": "sit",
    "fic": "make",
    "nounce": "tell",
    "andro": "man"
};

assert.strictEqual(keys.length, 25, 'Study sheet contains 25 separate word parts');
assert.deepStrictEqual(keys, Object.keys(expected), 'Source order and terms match printed List #11');
for (const [term, definition] of Object.entries(expected)) {
    const entry = list[term];
    assert.strictEqual(entry.definition, definition, `Incorrect meaning for ${term}`);
    assert(Array.isArray(entry.examples) && entry.examples.length >= 4, `Missing example words for ${term}`);
    assert(entry.examples.every(example => typeof example === 'string' && example.trim() === example), `Malformed example for ${term}`);
    assert(['Greek', 'Latin'].includes(entry.origin), `Missing printed origin for ${term}`);
}
assert.strictEqual(list['-i'].examples.length, 9);
assert(list.jus.examples.includes('jus soli'));
assert(list.sol.examples.includes('solifidian'));
assert(list.sess.examples.includes('insessorial'));
assert(list.andro.examples.includes('android (droid)'));
assert.strictEqual(list.ag.definition, list.act.definition, 'Two distinct terms intentionally share to do');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(index.includes('src="src/data/roots-list-11.js"'), 'Browser must load List #11 data before the inline game');
assert(index.includes('rawData: ROOTS_LIST_11'), 'List #11 must have its own selectable Grimoire');
console.log('PASS: 25 word parts, printed meanings, example integrity, and browser Grimoire wiring');

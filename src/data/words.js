// Whole-word vocabulary list (the easier "Vocabulary Words" set).
//
// Each entry maps a word to the meanings that count as correct. Any one of them
// is accepted when the game asks "What is the definition of 'X'?", and each one
// can be asked in reverse as "What word means 'Y'?".
//
// Parentheses hold context that helps a reader but is ignored when matching, so
// "mean-spirited (dialogue)" is answered by typing just "mean-spirited".
// Meanings shared by several words should be written identically (e.g. "tired")
// so that any of those words is accepted for the reverse question.
const WORDS = {
  con: ["with", "together"],
  trans: ["across"],
  gress: ["step"],
  re: ["back again"],
  dolor: ["pain", "sorrow"],
  ravine: ["a long, deep hollow in the earth", "gorge"],
  condolences: ["expressions of sympathy"],
  regress: ["to go back"],
  nomadic: ["related to wandering from place to place"],
  skeptical: ["doubting", "questioning"],
  acrimonious: ["bitter", "angry", "mean-spirited"]
};

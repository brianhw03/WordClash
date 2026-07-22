function maskWord(word, guessedLetters) {
  return word
    .split("")
    .map((letter) => (guessedLetters.includes(letter) ? letter : "_"))
    .join("");
}

function isCorrectGuess(word, letter) {
  return word.includes(letter);
}

function isWordComplete(word, guessedLetters) {
  return word.split("").every((letter) => guessedLetters.includes(letter));
}

function calculateScore(livesLeft) {
  return livesLeft * 100;
}

module.exports = { maskWord, isCorrectGuess, isWordComplete, calculateScore };

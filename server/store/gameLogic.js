// !Change letter to mask version

function maskWord(word, guessedLetters) {
  return word
    .split("")
    .map((letter) => {
      if (!/[A-Z]/.test(letter)) return letter;
      return guessedLetters.includes(letter) ? letter : "_";
    })
    .join("");
}

// !Check if a letter is in the word & return true if guess is correct
function isCorrectGuess(word, letter) {
  return word.includes(letter);
}

// !Check if all letters of the word have been guessed
function isWordComplete(word, guessedLetters) {
  return word
    .split("")
    .filter((letter) => /[A-Z]/.test(letter))
    .every((letter) => guessedLetters.includes(letter));
}

function calculateScore(livesLeft) {
  return livesLeft * 100;
}

module.exports = { maskWord, isCorrectGuess, isWordComplete, calculateScore };

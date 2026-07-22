const { maskWord, isCorrectGuess, isWordComplete, calculateScore } = require("./store/gameLogic");

const word = "REACT";
let guessed = [];

console.log(maskWord(word, guessed));           // _____
guessed.push("R");
console.log(maskWord(word, guessed));           // R____
guessed.push("A");
console.log(maskWord(word, guessed));           // R_A__

console.log(isCorrectGuess(word, "E"));         // true
console.log(isCorrectGuess(word, "Z"));         // false

console.log(isWordComplete(word, ["R","E","A","C","T"]));  // true
console.log(isWordComplete(word, ["R","E","A"]));          // false

console.log(calculateScore(4));                 // 400
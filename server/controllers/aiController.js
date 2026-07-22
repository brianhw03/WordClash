const openai = require("../config/ai");

// ! Fallback words in case the API fails or is slow (saves the demo).
const FALLBACK_WORDS = {
  general: ["WINDOW", "GARDEN", "PENCIL", "ROCKET", "BRIDGE", "CANDLE"],
  animals: ["TIGER", "ELEPHANT", "GIRAFFE", "PENGUIN", "DOLPHIN"],
  movies: ["AVATAR", "TITANIC", "GLADIATOR", "INCEPTION", "MATRIX"],
  sports: ["SOCCER", "TENNIS", "BOXING", "CRICKET", "HOCKEY"],
  countries: ["JAPAN", "BRAZIL", "CANADA", "EGYPT", "FRANCE"],
};

// ! Pick a random fallback word for a category.
function getFallbackWord(category) {
  const key = (category || "").toLowerCase();
  const list = FALLBACK_WORDS[key] || FALLBACK_WORDS.general;
  return list[Math.floor(Math.random() * list.length)];
}

// ! Generate a single word for Hangman via OpenAI.
async function generateWord(category, difficulty) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a word generator for a Hangman game. Reply ONLY with valid JSON, no markdown.",
        },
        {
          role: "user",
          content: `Give 1 English word for Hangman.
Category: ${category}. Difficulty: ${difficulty}.
Rules: single word, no spaces, no punctuation, letters only.
easy=4-5 letters, medium=6-8 letters, hard=9+ letters.
Format: {"word":"EXAMPLE"}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 1.0,
      max_tokens: 500,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    // ! Clean up: uppercase, letters only.
    const clean = result.word.toUpperCase().replace(/[^A-Z]/g, "");

    // ! If the result is odd (too short), use fallback.
    if (clean.length < 3) {
      return getFallbackWord(category);
    }

    return clean;
  } catch (err) {
    // ! API error / timeout → don't let the game die, use fallback.
    console.log("AI generateWord failed, using fallback:", err.message);
    return getFallbackWord(category);
  }
}

module.exports = { generateWord };

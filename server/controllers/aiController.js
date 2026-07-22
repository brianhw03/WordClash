const openai = require("../config/ai");
const fs = require("fs");
const path = require("path");

const CATEGORY_DETAILS = {
  animal: "a familiar animal name",
  country: "a widely recognized country name",
  job: "a common job or profession",
  movie: "a famous, mainstream movie title",
  artist: "a globally popular music artist, actor, actress or popular people",
  music: "a famous, mainstream song title",
};

// Used when the AI request is unavailable, while still respecting the selected category.
const FALLBACK_WORDS = {
  animal: [
    "LION",
    "BEAR",
    "WOLF",
    "DOLPHIN",
    "GIRAFFE",
    "PENGUIN",
    "CHAMELEON",
    "PORCUPINE",
    "ALLIGATOR",
  ],
  country: ["CUBA", "BRAZIL", "SWEDEN", "AUSTRALIA", "SINGAPORE", "ARGENTINA"],
  job: [
    "CHEF",
    "PILOT",
    "NURSE",
    "DOCTOR",
    "LAWYER",
    "FARMER",
    "ARCHITECT",
    "FIREFIGHTER",
    "JOURNALIST",
  ],
  movie: [
    "COCO",
    "TOP GUN",
    "FROZEN",
    "THE MATRIX",
    "THE GODFATHER",
    "JURASSIC PARK",
    "THE PRESTIGE",
    "MAD MAX",
    "THE MARTIAN",
    "WHIPLASH",
    "MOANA",
    "RATATOUILLE",
    "FIGHT CLUB",
  ],
  artist: [
    "ADELE",
    "DRAKE",
    "EMINEM",
    "LADY GAGA",
    "RIHANNA",
    "METALLICA",
    "POST MALONE",
    "THE WEEKND",
  ],
  music: [
    "STAY",
    "HELLO",
    "HAVANA",
    "BAD GUY",
    "You BELONG WITH ME",
    "BILLIE JEAN",
  ],
};

const RECENT_WORD_LIMIT = 30;
const RECENT_WORDS_FILE = path.join(__dirname, "../data/recent-words.json");

function loadRecentWords() {
  try {
    const storedWords = JSON.parse(fs.readFileSync(RECENT_WORDS_FILE, "utf8"));
    return new Map(
      Object.entries(storedWords).map(([category, words]) => [
        category,
        Array.isArray(words) ? words.slice(0, RECENT_WORD_LIMIT) : [],
      ]),
    );
  } catch {
    return new Map();
  }
}

const recentWordsByCategory = loadRecentWords();

function normalizeCategory(category) {
  const key = String(category || "animal")
    .trim()
    .toLowerCase();
  return CATEGORY_DETAILS[key] ? key : "animal";
}

function getFallbackWord(category, excludedWords = []) {
  const key = normalizeCategory(category);
  const excluded = new Set(
    excludedWords.map((word) => String(word).toUpperCase()),
  );
  const list = FALLBACK_WORDS[key].filter((word) => !excluded.has(word));
  const availableWords = list.length ? list : FALLBACK_WORDS[key];
  return availableWords[Math.floor(Math.random() * availableWords.length)];
}

function getRecentWords(category) {
  return recentWordsByCategory.get(normalizeCategory(category)) || [];
}

function rememberWord(category, word) {
  const key = normalizeCategory(category);
  const previousWords = getRecentWords(key).filter(
    (previousWord) => previousWord !== word,
  );
  recentWordsByCategory.set(
    key,
    [word, ...previousWords].slice(0, RECENT_WORD_LIMIT),
  );
  try {
    fs.mkdirSync(path.dirname(RECENT_WORDS_FILE), { recursive: true });
    fs.writeFileSync(
      RECENT_WORDS_FILE,
      JSON.stringify(Object.fromEntries(recentWordsByCategory), null, 2),
      "utf8",
    );
  } catch (error) {
    console.warn("Unable to save recent word history:", error.message);
  }
  return word;
}

function isValidWord(word) {
  return (
    /^[A-Z](?:[A-Z '\-]*[A-Z])?$/.test(word) &&
    word.replace(/[^A-Z]/g, "").length >= 3
  );
}

const MOVIE_FOCUSES = [
  "an animated film",
  "a science-fiction film",
  "a comedy film",
  "a horror film",
  "a mystery or thriller film",
  "a romance film",
  "an action film",
  "a fantasy film",
  "a drama film",
  "a family adventure film",
  "a film released before 2000",
  "a film released after 2010",
];

// Generate one Hangman answer via OpenAI.
async function generateWord(category, excludedWords = []) {
  const normalizedCategory = normalizeCategory(category);
  const excluded = new Set(
    [...excludedWords, ...getRecentWords(normalizedCategory)].map((word) =>
      String(word).toUpperCase(),
    ),
  );
  const wordSchema = {
    type: "string",
    pattern: "^[A-Z](?:[A-Z '\\-]*[A-Z])?$",
  };
  const varietyToken = Math.random().toString(36).slice(2, 10);
  const movieFocus =
    MOVIE_FOCUSES[Math.floor(Math.random() * MOVIE_FOCUSES.length)];
  const categoryFocus =
    normalizedCategory === "movie"
      ? `For this request, choose ${movieFocus}; avoid default blockbuster answers unless they match this focus.`
      : "Choose a different valid answer each time.";

  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const retryInstruction = attempt
        ? "Your previous answer was invalid. Follow every rule exactly."
        : "";
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
            content: `Give one English Hangman answer.
Category: ${CATEGORY_DETAILS[normalizedCategory]}.
Choose an answer that is popular, familiar, or currently relevant to a broad audience. Avoid obscure, technical, archaic, or overly niche answers.
For Movie, Artist, and Music, generate a widely known real answer; never invent or alter a title or name.
${categoryFocus}
Rules: the answer may contain multiple words. Keep spaces, apostrophes, and hyphens exactly as written; do not use numbers or other punctuation.
Examples of valid Music answers: YESTERDAY, WONDERWALL, BILLIE JEAN.
Do not use any of these answers that were recently used: ${[...excluded].join(", ") || "none"}.
Variation token: ${varietyToken}. Use it only to vary your choice; never include it in the answer.
${retryInstruction}
Format: {"word":"EXAMPLE"}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "hangman_word",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["word"],
              properties: {
                word: {
                  ...wordSchema,
                },
              },
            },
          },
        },
        temperature: 0.9,
        max_tokens: 30,
      });

      const result = JSON.parse(completion.choices[0].message.content);
      const clean = String(result.word || "")
        .toUpperCase()
        .replace(/\u2019|\u2018/g, "'")
        .replace(/\s+/g, " ")
        .trim();

      if (isValidWord(clean) && !excluded.has(clean)) {
        console.info(`AI generated a ${normalizedCategory} word.`);
        return rememberWord(normalizedCategory, clean);
      }

      console.warn(
        `AI returned an invalid ${normalizedCategory} word; retrying.`,
      );
    }

    return rememberWord(
      normalizedCategory,
      getFallbackWord(normalizedCategory, [...excluded]),
    );
  } catch (err) {
    // ! API error / timeout → don't let the game die, use fallback.
    console.log("AI generateWord failed, using fallback:", err.message);
    return rememberWord(
      normalizedCategory,
      getFallbackWord(normalizedCategory, [...excluded]),
    );
  }
}

module.exports = { generateWord };

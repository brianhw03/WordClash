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

const FALLBACK_HINTS = {
  animal: "Think of a familiar creature from the animal kingdom.",
  country: "Think of a well-known nation on the world map.",
  job: "Think of a common profession people do for work.",
  movie: "Think of a famous film title recognized by many audiences.",
  artist: "Think of a globally known entertainer or music performer.",
  music: "Think of a well-known song title heard by many listeners.",
};

const RECENT_WORD_LIMIT = 100;
const RECENT_WORDS_FILE = process.env.WORD_HISTORY_PATH || path.join(__dirname, "../data/recent-words.json");

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

function isValidHint(hint, word) {
  const cleanHint = String(hint || "").replace(/\s+/g, " ").trim();
  const hintWords = cleanHint.split(" ").filter(Boolean);
  if (hintWords.length < 5 || hintWords.length > 24 || cleanHint.length > 180) return false;

  const normalizedHint = cleanHint.toUpperCase().replace(/[^A-Z]/g, "");
  const normalizedWord = word.replace(/[^A-Z]/g, "");
  if (normalizedHint.includes(normalizedWord)) return false;

  return !word
    .split(/[ '\-]+/)
    .filter((part) => part.length >= 4)
    .some((part) => new RegExp(`\\b${part}\\b`, "i").test(cleanHint));
}

const CATEGORY_FOCUSES = {
  animal: [
    "a familiar ocean animal",
    "a familiar bird",
    "a familiar wild mammal",
    "a familiar reptile",
    "a familiar farm animal",
    "a familiar animal from Africa",
    "a familiar animal from Asia",
  ],
  country: [
    "a familiar country in Asia",
    "a familiar country in Europe",
    "a familiar country in Africa",
    "a familiar country in North or South America",
    "a familiar island country",
  ],
  job: [
    "a familiar healthcare profession",
    "a familiar creative profession",
    "a familiar public-service profession",
    "a familiar technology profession",
    "a familiar outdoor profession",
  ],
  movie: [
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
  ],
  artist: [
    "a globally known singer",
    "a globally known band",
    "a globally known actor or actress",
    "a globally known solo music artist",
  ],
  music: [
    "a famous pop song",
    "a famous rock song",
    "a famous song released before 2000",
    "a famous song released after 2010",
    "a famous soundtrack song",
  ],
};

// Generate the answer and its shared hint in one request to avoid extra game delay.
async function generateRoundContent(category, excludedWords = []) {
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
  const focuses = CATEGORY_FOCUSES[normalizedCategory];
  const categoryFocus = focuses[Math.floor(Math.random() * focuses.length)];

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
For this request, choose ${categoryFocus}. Do not default to the most obvious answer unless it matches this focus.
Rules: the answer may contain multiple words. Keep spaces, apostrophes, and hyphens exactly as written; do not use numbers or other punctuation.
Examples of valid Music answers: YESTERDAY, WONDERWALL, BILLIE JEAN.
Do not use any of these answers that were recently used: ${[...excluded].join(", ") || "none"}.
Variation token: ${varietyToken}. Use it only to vary your choice; never include it in the answer.
Also provide one fair shared hint in English. The hint must be 5 to 24 words, describe the answer without giving away its title/name, and must not contain the answer or any significant word from it.
${retryInstruction}
Format: {"word":"EXAMPLE","hint":"A concise clue that does not reveal the answer."}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "hangman_round_content",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["word", "hint"],
              properties: {
                word: {
                  ...wordSchema,
                },
                hint: {
                  type: "string",
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

        const hint = String(result.hint || "").replace(/\s+/g, " ").trim();
        if (isValidWord(clean) && !excluded.has(clean) && isValidHint(hint, clean)) {
          console.info(`AI generated a ${normalizedCategory} word.`);
          return { word: rememberWord(normalizedCategory, clean), hint };
      }

      console.warn(
        `AI returned an invalid ${normalizedCategory} word; retrying.`,
      );
    }

    return {
      word: rememberWord(
        normalizedCategory,
        getFallbackWord(normalizedCategory, [...excluded]),
      ),
      hint: FALLBACK_HINTS[normalizedCategory],
    };
  } catch (err) {
    // ! API error / timeout → don't let the game die, use fallback.
    console.log("AI generateWord failed, using fallback:", err.message);
    return {
      word: rememberWord(
        normalizedCategory,
        getFallbackWord(normalizedCategory, [...excluded]),
      ),
      hint: FALLBACK_HINTS[normalizedCategory],
    };
  }
}

module.exports = { generateRoundContent };

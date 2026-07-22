if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const { generateWord } = require("./controllers/aiController");

async function run() {
  console.log("Testing generateWord...\n");

  const tests = [
    ["tech", "easy"],
    ["animal", "medium"],
    ["food", "hard"],
  ];

  for (const [category, difficulty] of tests) {
    const word = await generateWord(category, difficulty);
    console.log(`${category}/${difficulty} → ${word} (${word.length} letters)`);
  }
}

run();
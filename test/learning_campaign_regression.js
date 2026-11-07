const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const questions = JSON.parse(fs.readFileSync(path.join(root, "assets/data/questions.json"), "utf8"));
const webQuestions = JSON.parse(fs.readFileSync(path.join(root, "build/web/questions.json"), "utf8"));
assert.deepEqual(webQuestions, questions, "Godot and web must ship the same authored question bank");
assert.equal(questions.length, 1000, "Question bank should contain the complete 1000-word campaign");

const counts = new Map([[0, 0], [1, 0], [2, 0], [3, 0]]);
const words = new Set();
const ids = new Set();
const prompts = new Set();
for (const card of questions) {
  assert(card.id && card.word && card.level && card.question_type, `Missing question identity or level: ${card.word}`);
  assert.equal(card.options?.length, 4, `${card.word} needs four choices`);
  assert.equal(new Set(card.options.map(value => value.trim().toLocaleLowerCase("en"))).size, 4, `${card.word} has duplicate choices`);
  assert(card.correct_index >= 0 && card.correct_index < 4, `${card.word} has an invalid answer index`);
  assert(card.example?.trim(), `${card.word} needs a usage example`);
  assert(!words.has(card.word.toLocaleLowerCase("en")), `Duplicate vocabulary card: ${card.word}`);
  assert(!ids.has(String(card.id)), `Duplicate question id: ${card.id}`);
  assert(!prompts.has(card.question.trim().toLocaleLowerCase("tr")), `Duplicate prompt: ${card.question}`);
  words.add(card.word.toLocaleLowerCase("en"));
  ids.add(String(card.id));
  prompts.add(card.question.trim().toLocaleLowerCase("tr"));
  counts.set(card.correct_index, counts.get(card.correct_index) + 1);
}

assert(Math.max(...counts.values()) - Math.min(...counts.values()) <= 60,
  "Correct answers should not reveal a preferred option position");
assert.deepEqual(Object.fromEntries([...new Set(questions.map(card => card.level))].map(level => [
  level, questions.filter(card => card.level === level).length
])), { A1: 220, A2: 200, B1: 190, B2: 160, C1: 130, C2: 100 }, "CEFR quotas should match the approved campaign plan");
const archetypes = new Set(questions.map(card => card.enemy_archetype));
assert(archetypes.size >= 60, "Words should map to a broad set of meaning-based enemy families");
for (const card of questions) {
  for (const field of ["meaning_tr", "enemy_visual_modifier", "enemy_attack", "buff_name", "buff_meaning_link"]) {
    assert(card[field]?.trim(), `${card.word} needs ${field}`);
  }
}
assert(questions.filter(card => card.type === "Prefix").length >= 4, "Prefix practice must support the existing Prefix Overdrive synergy");
console.log("Learning campaign regression passed: 1000 unique questions, balanced keys, CEFR quotas, semantic enemies/buffs and prefix coverage.");

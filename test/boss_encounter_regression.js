const fs = require("node:fs");
const assert = require("node:assert/strict");

const source = fs.readFileSync("build/web/game.js", "utf8");
const roster = source.match(/const MILESTONE_BOSS_ROSTER = \[([\s\S]*?)\n\];/);
assert.ok(roster, "milestone boss roster exists");
assert.equal((roster[1].match(/^\s*\[/gm) || []).length, 20, "20 authored milestone bosses cover waves 5–100");
assert.match(source, /if \(state\.current_wave % 5 !== 0\) \{\s*spawnTimer -= dt;/, "regular horde spawning is disabled on boss waves");
assert.doesNotMatch(source, /Rare Wave 20\+ Mini-Boss|MINI-BOSS/, "non-milestone waves never inject boss enemies");
assert.match(source, /if \(state\.milestone_boss_delay === 0\) spawnMilestoneBoss\(state\.current_wave\);/, "milestone waves spawn their boss after the reveal delay");
assert.match(source, /const \[type, sprite, name, color, skill\] = MILESTONE_BOSS_ROSTER/, "bosses define distinct visual identity and skill archetype");
assert.match(source, /if \(e\.is_boss && state\.current_wave % 5 === 0\) milestoneBossDefeated = true;/, "defeating the milestone boss completes the wave");
assert.match(source, /if \(milestoneBossDefeated\) state\.boss_defeated = true;/, "boss defeat is tracked separately from clearing accumulated word echoes");
assert.match(source, /if \(state\.boss_defeated && !livingBoss && !livingEcho && state\.boss_mistake_queue\.length === 0\) endWave\(\);/, "the existing intermission starts after the boss and all queued echoes are cleared");
assert.match(source, /state\.boss_mistake_queue = \[\.\.\.\(state\.mistake_words \|\| \[\]\)\]/, "boss encounters collect the full accumulated mistake notebook");
assert.match(source, /const BOSS_ECHO_ACTIVE_CAP = 3;/, "each boss fight keeps echo pressure readable with at most three active word enemies");
assert.doesNotMatch(source, /boss_mistake_queue[\s\S]{0,240}\.slice\(0, 4\)/, "the accumulated word queue is not truncated to an arbitrary four entries");
assert.ok(source.includes("is_mistake_echo: true") && source.includes("memory_word: memoryWord"), "echoes visibly name the vocabulary the player missed");
assert.match(source, /if \(state\.current_wave % 5 !== 0\) \{\s*spawnTimer -= dt;/, "echoes do not enable regular horde spawning on boss waves");
assert.match(source, /boss\.boss_phase < 2/);
assert.match(source, /boss\.boss_phase < 3/);
assert.match(source, /const BOSS_TELEGRAPH_GUIDANCE = \{/);
for (const skill of ["judgment", "quake", "nova", "fan", "orbit", "charge", "mirror", "gravity", "crossfire", "rift", "return", "echo", "snare", "shards", "embers", "finale"]) {
  assert.match(source, new RegExp(`\\b${skill}:`), `${skill} has a readable boss tell`);
}

console.log("Boss encounter regressions passed (single-boss 5-wave duels, full mistake queue, capped active echoes, phases, telegraphs, story handoff).");

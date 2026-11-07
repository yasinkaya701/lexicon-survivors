const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync(new URL("../build/web/game.js", `file://${__filename}`), "utf8");
const godotEnemy = fs.readFileSync(new URL("../scripts/enemy.gd", `file://${__filename}`), "utf8");
const skillStart = source.indexOf("function updateMilestoneBossSkill(");
const skillEnd = source.indexOf("\nfunction updateCommanderAuras(", skillStart);
assert(skillStart >= 0 && skillEnd > skillStart, "Milestone boss skill controller should exist");
const skillController = source.slice(skillStart, skillEnd);

const requiredMechanics = {
  sever: ["resolveBossLine", "slash.timer = duration + delay", "[[-0.19, 0, 27], [0.19, 0.34, 31]]"],
  split: ["const perpX = -dirY", "offset = phase === 3 ? 116 : 104", "groundMark(markX, markY"],
  eclipse: ["const escapeAngle = Math.atan2", "if (Math.abs(difference) < 0.42) continue", "clampPlayerToArena(state.player)", "\"shard\", markX, markY"],
  return: ["projectile.return_owner = boss", "projectile.return_after = 0.62", "projectile.shape = \"return\""],
  void_bloom: ["for (let index = 0; index < 3; index++)", "bloom.timer += delay", "fireBossProjectile(boss, shard * Math.PI * 2 / shardCount"]
};

for (const [skill, markers] of Object.entries(requiredMechanics)) {
  const start = skillController.indexOf(`case "${skill}":`);
  const next = skillController.indexOf("\n    case \"", start + 1);
  assert(start >= 0, `${skill} should have a dedicated boss ability`);
  const handler = skillController.slice(start, next > start ? next : skillController.length);
  for (const marker of markers) assert(handler.includes(marker), `${skill} should include ${marker}`);
  assert(source.includes(`${skill}: "`), `${skill} should have player-facing telegraph guidance`);
}

for (const boss of ["The Redactor", "The Split-Truth Ogre", "The False Neris", "The Unwritten"]) {
  assert(source.includes(`\"${boss}\"`), `${boss} should be present in the milestone roster`);
}
for (const skill of Object.keys(requiredMechanics).filter(skill => skill !== "return")) {
  assert.match(source, new RegExp(`\\\"(?:The Redactor|The Split-Truth Ogre|The False Neris|The Unwritten)\\\"[^\\n]+\\\"${skill}\\\"`),
    `${skill} should be assigned to one of the newly distinct bosses`);
}
assert.match(source, /"The Reversing Shade"[^\n]+"return"/, "the returning projectile pattern belongs to the Reversing Shade");
assert.match(skillController, /boss_skill === "crossfire" \|\| boss\.boss_skill === "finale"[\s\S]*telegraphLine\(angle \+ Math\.PI \/ 2, 820\)/,
  "crossfire and finale must telegraph the perpendicular lane they also fire into");
assert.match(source, /if \(ep\.return_owner && !ep\.return_owner\.dead\)[\s\S]*ep\.returning = true/,
  "returning boss projectiles must turn back toward their owner after their outward leg");
assert(!skillController.includes("spawnEnemy("), "Boss abilities must not add regular enemies to solo encounters");
assert.match(source, /getBossEchoMechanic\(enemyAttack, wordType\)[\s\S]*return "line"[\s\S]*return "snare"[\s\S]*return "mirror"/,
  "accumulated mistake echoes should gain category-specific combat patterns");
assert.match(source, /echo_mechanic: getBossEchoMechanic\(wordCard\.enemy_attack, mistake\.type\)/,
  "each echo should receive the attack mechanic assigned to its missed word");
assert.match(source, /const echoPower = 1\.25 \+ failures \* 0\.15/);
assert.match(source, /const echoSpeed = 1\.0 \+ failures \* 0\.05/);
assert.match(source, /const echoDamage = 1\.0 \+ failures \* 0\.12/);
assert.match(source, /140 \+ \(state\.current_wave - 1\) \* 36/,
  "web word echoes should scale from the same wave health curve as Godot's Spelling Spectre");
assert.match(godotEnemy, /max_health \*= 1\.25 \+ mistake_echo_fail_count \* 0\.15/);
assert.match(godotEnemy, /speed \*= 1\.0 \+ mistake_echo_fail_count \* 0\.05/);
assert.match(godotEnemy, /damage_to_player \*= 1\.0 \+ mistake_echo_fail_count \* 0\.12/);
for (const asset of [
  "upgrade_v1/boss_eclipse_sigil.svg",
  "upgrade_v1/boss_void_bloom_sigil.svg",
  "upgrade_v1/boss_split_sigil.svg",
  "upgrade_v1/boss_return_sigil.svg"
]) {
  const sourceAsset = `assets/sprites/${asset}`;
  const webAsset = `build/web/assets/sprites/${asset}`;
  assert(fs.existsSync(sourceAsset) && fs.existsSync(webAsset), `${asset} should ship in source and web build`);
  assert.equal(fs.readFileSync(webAsset, "utf8"), fs.readFileSync(sourceAsset, "utf8"), `${asset} source/build copies should match`);
  assert(source.includes(asset), `${asset} should be loaded by the game renderer`);
}
assert.match(source, /const BOSS_AREA_SIGILS = Object\.freeze\([\s\S]*eclipse:[\s\S]*void_bloom:[\s\S]*split:[\s\S]*return:/,
  "distinct boss area abilities should display their own authored sigils");
assert(source.includes("const sigil = images[BOSS_AREA_SIGILS[tg.kind]]") && source.includes("ctx.drawImage(sigil,"),
  "boss telegraphs should render the matching authored sigil");
console.log("Boss unique ability regression passed (sever, split, eclipse, void bloom, telegraphs, solo encounters).");

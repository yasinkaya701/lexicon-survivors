const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("build/web/game.js", "utf8");
const start = source.indexOf("function getHeroRenderAction(player) {");
assert.notEqual(start, -1, "rendering needs one locomotion/attack action selector");
const end = source.indexOf("\n}\n", start);
assert.notEqual(end, -1, "the action selector must be a complete function");
const actionSelector = Function(`${source.slice(start, end + 2)}; return getHeroRenderAction;`)();
const directionStart = source.indexOf("function getHeroActionDirection(player) {");
assert.notEqual(directionStart, -1, "the character needs a consistent movement/aim direction selector");
const directionEnd = source.indexOf("\n}\n", directionStart);
const directionSelector = Function("getHeroRenderAction", `${source.slice(directionStart, directionEnd + 2)}; return getHeroActionDirection;`)(actionSelector);
const player = (overrides = {}) => ({
  vx: 0, vy: 0, is_dashing: false, attack_anim_timer: 0,
  attack_anim_duration: 0, attack_anim_windup: 0, attack_anim_active: 0,
  attack_anim_kind: "ranged", ...overrides
});

assert.equal(actionSelector(player({ vx: 180, attack_anim_timer: 0.08, attack_anim_kind: "ranged" })), "run",
  "ranged shots must not replace the run cycle while the hero is moving");
assert.equal(actionSelector(player({ attack_anim_timer: 0.08, attack_anim_kind: "ranged" })), "ranged",
  "a stationary shot should keep its release pose");
assert.equal(actionSelector(player({ vx: 180, attack_anim_timer: 0.22, attack_anim_duration: 0.4,
  attack_anim_windup: 0.08, attack_anim_active: 0.12, attack_anim_kind: "melee" })), "attack",
  "melee wind-up and contact must keep the attack pose");
assert.equal(actionSelector(player({ vx: 180, attack_anim_timer: 0.08, attack_anim_duration: 0.4,
  attack_anim_windup: 0.08, attack_anim_active: 0.12, attack_anim_kind: "melee" })), "run",
  "melee recovery should return to the locomotion cycle");
assert.equal(actionSelector(player({ is_dashing: true, attack_anim_timer: 0.08, attack_anim_kind: "ranged" })), "run",
  "a dash must retain its locomotion silhouette during weapon recovery");
assert.deepEqual(directionSelector(player({ vx: 180, attack_anim_timer: 0.08, attack_anim_kind: "ranged",
  last_aim: { x: -1, y: 0 } })), { x: 1, y: 0 }, "a moving shooter should keep their travel direction between recoil beats");
assert.deepEqual(directionSelector(player({ vx: 180, shot_recoil_timer: 0.08, attack_anim_kind: "ranged",
  last_aim: { x: -1, y: 0 } })), { x: -1, y: 0 }, "a shooter should face the shot during the brief recoil");

assert.match(source, /getHeroRenderLayers\(p\)/, "the canvas player sprite must use the locomotion/action layer selector");
assert.match(source, /getHeroRenderAction\(state\.player\)/, "the runtime state output must report the rendered action");
console.log("Locomotion and attack blend passed: movement holds its run cycle while attacks layer briefly.");

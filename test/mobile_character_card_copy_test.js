const fs = require("node:fs");
const assert = require("node:assert/strict");

const web = fs.readFileSync("build/web/game.js", "utf8");
const godot = fs.readFileSync("scripts/stats_manager.gd", "utf8");

for (const stale of [
  "The Balanced Scholar", "Glass Cannon", "The Tank", "Mystic Mage", "Resource Alchemist", "Critical Assassin"
]) {
  assert.ok(!web.includes(stale), `the web character cards should not mix in the stale English label: ${stale}`);
  assert.ok(!godot.includes(stale), `Godot should use the same localized role labels: ${stale}`);
}

const hooks = web.match(/selectionHook: "([^"]+)"/g) || [];
assert.equal(hooks.length, 6, "all six character cards need a curated short story hook");
for (const hook of hooks) {
  const copy = hook.match(/selectionHook: "([^"]+)"/)[1];
  assert.ok(Array.from(copy).length <= 48, `mobile story hooks must stay readable without truncation: ${copy}`);
}
assert.match(web, /\$\{c\.selectionHook\}/, "cards should render the curated hook instead of the long campaign synopsis");
console.log("Mobile character card copy contract passed: localized roles and six concise story hooks.");

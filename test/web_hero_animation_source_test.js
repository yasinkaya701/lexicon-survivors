const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("build/web/game.js", "utf8");
assert.match(source, /function getHeroAnimationFrame\(action, player\)/);
assert.match(source, /if \(action === "attack" \|\| action === "ranged"\) return getAttackAnimationFrame\(player\);/);
assert.match(source, /function getHeroRenderAction\(player\)/, "the renderer should blend locomotion with the action phase");
assert.match(source, /const renderLayers = getHeroRenderLayers\(p\);/, "the player should keep a continuous gait while attacks overlay the upper body");
assert.match(source, /const actionAsset = renderLayers\.base === "run"[\s\S]*?\$\{animationKey\}_\$\{renderLayers\.base\}_v2_\$\{frame\}\.png/);
assert.match(source, /const base = moving \? "run" : action;/, "moving attacks should use one clean locomotion sprite");
assert.doesNotMatch(source, /if \(renderLayers\.upperBody\)/, "the old full-body attack overlay must not double the moving character");
assert.match(source, /ctx\.translate\(root\.x \+ playerPoseOffset\.x, root\.y \+ playerPoseOffset\.y\)/, "the weapon mount should follow the animated hand/body offset");
assert.match(source, /const legacyWalkAndSwingFrame = \/\^/, "the loader should identify obsolete duplicate motion frames");
assert.match(source, /function updateAmbientMotes\(dt\)/, "ambient particles should follow simulation time, not render count");
assert.match(source, /function getArenaVignette\(width, height\)/, "static screen lighting should be cached per canvas size");
console.log("Hero animation source wiring passed");

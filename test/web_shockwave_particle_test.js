const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("build/web/game.js", "utf8");
const match = source.match(/function advanceShockwaveParticle\(particle, dt\) \{[\s\S]*?\n\}/);
assert.ok(match, "shockwave lifetime and expansion must be updated by elapsed time");
const advanceShockwaveParticle = new Function(`return (${match[0]})`)();
assert.match(source, /function render\(dt = 1 \/ 60\)/, "render must receive elapsed frame time");
assert.match(source, /render\(rawDt\)/, "the game loop must pass unclamped game-speed-independent wall time to rendering");
assert.doesNotMatch(source, /state\.particles\s*=\s*state\.particles\.filter/, "render must reuse its particle array instead of allocating a replacement each frame");

const atSixtyFps = { radius: 7, alpha: 0.85 };
const atThirtyFps = { radius: 7, alpha: 0.85 };
assert.equal(advanceShockwaveParticle(atSixtyFps, 1 / 60), true);
assert.equal(advanceShockwaveParticle(atThirtyFps, 1 / 30), true);
assert.ok(Math.abs(atSixtyFps.radius - 12.5) < 1e-8, "60fps should preserve the authored ring expansion");
assert.ok(Math.abs(atSixtyFps.alpha - 0.80) < 1e-8, "60fps should preserve the authored ring fade");
assert.ok(Math.abs(atThirtyFps.radius - 18) < 1e-8, "30fps should advance by equal elapsed time, not one smaller frame step");
assert.ok(Math.abs(atThirtyFps.alpha - 0.75) < 1e-8, "30fps should fade by elapsed time");

const expired = { radius: 0, alpha: 0.01 };
assert.equal(advanceShockwaveParticle(expired, 0.1), false, "expired rings must leave the render list");
console.log("Shockwave timing passed: ring animation is stable across frame rates.");

const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("build/web/game.js", "utf8");
const match = source.match(/function adaptCanvasQuality\([\s\S]*?\n\}/);
assert.ok(match, "adaptive canvas quality control must be present");

const createHarness = new Function(`
  let state = { is_wave_active: true };
  const document = { hidden: false };
  let adaptiveCanvasScale = 1;
  let slowFrameSeconds = 0;
  let recoverySeconds = 0;
  let resizeCount = 0;
  const MIN_ADAPTIVE_CANVAS_SCALE = 0.72;
  function resizeGameCanvas() { resizeCount += 1; }
  ${match[0]}
  return { step: (dt, costs) => adaptCanvasQuality(dt, costs), getScale: () => adaptiveCanvasScale, getResizeCount: () => resizeCount };
`);

const schedulerStalls = createHarness();
for (let frame = 0; frame < 8; frame += 1) {
  schedulerStalls.step(0.055, { updateMs: 1, renderMs: 1, totalMs: 2 });
}
assert.equal(
  schedulerStalls.getScale(),
  1,
  "browser scheduling delays must not lower resolution when update and render work are cheap",
);

const sustainedRenderLoad = createHarness();
for (let frame = 0; frame < 180; frame += 1) {
  sustainedRenderLoad.step(1 / 60, { updateMs: 3, renderMs: 18, totalMs: 21 });
}
assert.ok(sustainedRenderLoad.getScale() < 1, "sustained expensive rendering should lower resolution");
assert.equal(sustainedRenderLoad.getScale(), 0.72, "adaptive scaling should stop at the playable resolution floor");

for (let frame = 0; frame < 540; frame += 1) {
  sustainedRenderLoad.step(1 / 60, { updateMs: 2, renderMs: 2, totalMs: 4 });
}
assert.equal(sustainedRenderLoad.getScale(), 1, "resolution should recover after sustained rendering headroom");
console.log("Adaptive canvas quality ignores scheduler stalls, scales under render load, then recovers.");

const fs = require("node:fs");
const assert = require("node:assert/strict");

const html = fs.readFileSync("build/web/index.html", "utf8");
assert.match(html, /id="character-scroll-hint"[^>]*>\s*KAYDIR\s*[↓]/, "the mobile character chooser should tell players to scroll for more heroes");
assert.match(html, /\.card-grid\s*\{[^}]*overflow-y:\s*auto/s, "the character list must remain vertically scrollable");
assert.match(html, /#character-scroll-hint\s*\{[^}]*display:\s*none/s, "the scroll hint should not clutter layouts where every character is visible");
assert.match(html, /@media\s*\(max-width:\s*700px\)[\s\S]*?#character-scroll-hint\s*\{[^}]*display:\s*inline-flex/s, "the scroll hint should appear on narrow screens");

console.log("Mobile character scroll cue contract passed.");

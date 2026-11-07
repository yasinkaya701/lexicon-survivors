const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("build/web/index.html", "utf8");
assert.match(html, /#orientation-hint\[hidden\]\s*\{\s*display:\s*none\s*!important;/,
  "a dismissed portrait hint must stay hidden against the forced mobile display rule");
assert.match(html, /id="orientation-hint"[^>]*onclick="this\.hidden\s*=\s*true"/,
  "the visible close affordance must set the semantic hidden state");
console.log("Mobile orientation hint dismissal contract passed.");

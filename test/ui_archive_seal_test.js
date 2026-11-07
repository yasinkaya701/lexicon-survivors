const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("build/web/index.html", "utf8");
const svg = fs.readFileSync("assets/ui/icons/open_archive.svg", "utf8");
const webSvg = fs.readFileSync("build/web/assets/ui/icons/open_archive.svg", "utf8");
assert.equal(svg, webSvg, "Godot and web must ship the same archive-entry icon");
assert.match(html, /id="start-game-btn"[\s\S]*?assets\/ui\/icons\/open_archive\.svg[\s\S]*?Kütüphaneye gir/);
assert.match(html, /class="quiz-wax-seal" src="assets\/ui\/icons\/open_archive\.svg"|src="assets\/ui\/icons\/open_archive\.svg" class="quiz-wax-seal"/);
assert.match(html, /id="restart-game-btn"[\s\S]*?assets\/ui\/icons\/open_archive\.svg[\s\S]*?Kütüphaneye dön/);
assert.match(svg, /<svg[\s\S]*?<path[\s\S]*?stroke="url\(#gold\)"/);
assert.doesNotMatch(svg, /<text|emoji/i);
assert.match(fs.readFileSync("scenes/title_screen.tscn", "utf8"), /res:\/\/assets\/ui\/icons\/open_archive\.svg/);
assert.match(fs.readFileSync("scenes/main.tscn", "utf8"), /res:\/\/assets\/ui\/icons\/open_archive\.svg/);
console.log("Archive entry seal asset parity passed");

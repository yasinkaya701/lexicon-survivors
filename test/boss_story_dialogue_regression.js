const assert = require("node:assert/strict");
const fs = require("node:fs");

const expansion = JSON.parse(fs.readFileSync("assets/data/story_expansion.json", "utf8"));
const webExpansion = fs.readFileSync("build/web/assets/data/story_expansion.json", "utf8");
const story = JSON.parse(fs.readFileSync("assets/data/story_arc.json", "utf8"));
const webGame = fs.readFileSync("build/web/game.js", "utf8");
const godotHud = fs.readFileSync("scripts/hud.gd", "utf8");

assert.equal(webExpansion, fs.readFileSync("assets/data/story_expansion.json", "utf8"), "Web and Godot must share identical boss dialogue canon");
assert.equal(expansion.boss_encounters.length, 20, "every fifth-wave boss needs a post-fight testimony");
assert.deepEqual(expansion.boss_encounters.map(boss => boss.wave), Array.from({ length: 20 }, (_, i) => (i + 1) * 5));
assert.equal(new Set(expansion.boss_encounters.map(boss => boss.dialogue)).size, 20, "each boss needs a distinct first-person confession");

for (const boss of expansion.boss_encounters) {
  assert.ok(boss.id.startsWith("boss_"), `wave ${boss.wave} needs a stable speaker ID`);
  assert.ok(boss.title && boss.dialogue.length > 60 && boss.portrait_sprite, `wave ${boss.wave} needs a name, spoken testimony and portrait`);
  assert.ok(fs.existsSync(`assets/sprites/${boss.portrait_sprite}`), `wave ${boss.wave} portrait must resolve`);
  for (const [characterId, arc] of Object.entries(story.characters)) {
    const episode = arc.episodes.find(item => item.wave === boss.wave);
    assert.ok(episode && episode.beats.length === 5, `${characterId} wave ${boss.wave} keeps its five-panel comic`);
    assert.ok(episode.beats[0][0].startsWith("boss_"), `${characterId} wave ${boss.wave} opens with a boss voice`);
    assert.ok(!episode.beats[0][1].includes(".."), `${characterId} wave ${boss.wave} keeps the boss line separate from the hero's response`);
  }
}

assert.ok(webGame.includes("assets/data/story_expansion.json"), "Web intermission must load the boss testimony data");
assert.ok(webGame.includes("storyPanelIndex === 0"), "Web must open the post-boss comic with the boss's own testimony");
assert.ok(godotHud.includes("story_expansion.json"), "Godot intermission must load the same boss testimony data");
assert.ok(godotHud.includes("_story_panel_index == 0"), "Godot must open the post-boss comic with the boss's own testimony");
assert.ok(webGame.includes("state.current_wave % 5 === 0"), "boss and comic sequence remains on fifth-wave milestones");
console.log("Boss story regression passed (20 voiced bosses, solo fifth-wave schedule, five panels, matching portraits in both clients).");

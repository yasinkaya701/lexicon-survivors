const assert = require("node:assert/strict");
const fs = require("node:fs");
const expansion = JSON.parse(fs.readFileSync("assets/data/story_expansion.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("assets/data/story_art_600_manifest.json", "utf8"));
const story = JSON.parse(fs.readFileSync("assets/data/story_arc.json", "utf8"));
const runtimeArt = JSON.parse(fs.readFileSync("assets/data/story_art_600_runtime.json", "utf8"));
const webGame = fs.readFileSync("build/web/game.js", "utf8");
const godotHud = fs.readFileSync("scripts/hud.gd", "utf8");

assert.equal(expansion.boss_encounters.length, 20, "every five-wave boss encounter needs its own story arc");
assert.deepEqual(expansion.boss_encounters.map((boss) => boss.wave), Array.from({ length: 20 }, (_, index) => (index + 1) * 5));
for (const boss of expansion.boss_encounters) {
  assert.ok(boss.id && boss.title && boss.skill && boss.location, "wave " + boss.wave + " has complete encounter identity");
  assert.ok(boss.motive.length > 80, "wave " + boss.wave + " motive should be specific enough to guide dialogue");
  assert.ok(boss.combat_story.length > 60, "wave " + boss.wave + " battle should connect to its story");
  assert.ok(boss.reveal.length > 80 && boss.keepsake.length > 20, "wave " + boss.wave + " has a post-fight reveal and earned keepsake");
}

const rosterByWave = new Map(manifest.milestone_boss_roster.map((boss) => [boss.wave, boss]));
for (const boss of expansion.boss_encounters) {
  const roster = rosterByWave.get(boss.wave);
  assert.ok(roster, "wave " + boss.wave + " must remain on the existing boss schedule");
  assert.equal(roster.boss_id, boss.id, "wave " + boss.wave + " expansion must match the gameplay boss ID");
  assert.equal(roster.skill_id, boss.skill, "wave " + boss.wave + " expansion must match the gameplay boss skill");
}

assert.equal(Object.keys(expansion.supporting_cast).length, 14, "the main and extra supporting cast should have full arcs");
for (const [id, person] of Object.entries(expansion.supporting_cast)) {
  assert.ok(person.role && person.desire && person.boundary, id + " needs a role, independent desire and boundary");
  assert.ok(person.turning_points || person.appearances, id + " needs authored story appearances");
  assert.ok(manifest.supporting_cast_arcs[id], id + " must be included in the image production brief");
}

const speakers = new Set(Object.values(story.characters).flatMap((character) =>
  character.episodes.flatMap((episode) => episode.beats.map(([speaker]) =>
    ({ whisper: "blank_page", mother_echo: "lale", lio_echo: "lio" }[speaker] || speaker)))));
for (const requiredVoice of ["mira", "ada", "lale", "sera", "mara", "yel", "tavi", "lira", "ink_child", "silent_mechanic"]) {
  assert.ok(speakers.has(requiredVoice), requiredVoice + " should speak in a playable comic episode");
}

assert.equal(manifest.images.length, 600, "story expansion must preserve the unique 600-panel commission");
const stagedPanels = manifest.images.filter((image) => image.status === "awaiting_human_review");
const approvedPanels = manifest.images.filter((image) => image.status === "approved");
assert.equal(manifest.generated_images, stagedPanels.length + approvedPanels.length,
  "generated_images must track actual staged and approved assets");
assert.equal(runtimeArt.approved_count, 0, "requested or pending assets must not appear in the runtime index");
assert.deepEqual(runtimeArt.panels, {}, "unreviewed story art must not be wired into gameplay");
assert.equal(new Set(manifest.images.map((image) => image.id)).size, 600, "every image request needs a unique stable ID");
assert.equal(new Set(manifest.images.map((image) => image.expected_source_path)).size, 600, "every image request needs its own source asset path");
assert.equal(new Set(manifest.images.map((image) => image.expected_web_path)).size, 600, "every image request needs its own web asset path");
assert.equal(new Set(manifest.images.map((image) => image.composition_id)).size, 600, "every image request needs its own camera, lighting and focal composition combination");
for (const image of manifest.images) {
  assert.ok(image.boss_story_canon?.motive, image.id + " must inherit the encounter's boss story context");
  assert.ok(image.prompt.includes("BOSS STORY CANON"), image.id + " prompt must reference the boss story");
  assert.ok(image.prompt.includes(`PANEL COMPOSITION [${image.composition_id}]`), image.id + " prompt must lock its unique composition direction");
  assert.ok(["requested_not_generated", "awaiting_human_review", "approved"].includes(image.status),
    image.id + " must have a valid art-review state");
  if (image.status === "requested_not_generated") {
    assert.equal(image.human_review, null, image.id + " has not been reviewed");
  } else if (image.status === "awaiting_human_review") {
    assert.equal(image.human_review, null, image.id + " must not claim a human review");
    assert.ok(Object.values(image.qa).every((status) => status === "pending"),
      image.id + " draft QA must remain pending");
    assert.ok(image.source_sha256 && image.source_sha256 === image.web_sha256,
      image.id + " draft hash must match its mirrored copy");
  }
}
assert.match(webGame, /story_art_600_runtime\.json/, "Web must read the human-approved runtime art index");
assert.match(webGame, /\$\{state\.selected_char\}:\$\{episode\.wave\}:\$\{storyPanelIndex \+ 1\}/, "Web must choose art for the active character, wave and panel");
assert.match(godotHud, /story_art_600_runtime\.json/, "Godot must read the same human-approved runtime art index");
assert.match(godotHud, /%s:%d:%d/, "Godot must choose art for the active character, wave and panel");
console.log("Story expansion regression passed (20 boss stories, 14 independent supporting arcs, 600 unique image briefs).");

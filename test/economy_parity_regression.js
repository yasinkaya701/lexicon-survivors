const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const sharedPath = path.join(root, "assets/data/game_economy.json");
const webPath = path.join(root, "build/web/assets/data/game_economy.json");
assert.ok(fs.existsSync(sharedPath), "shared run economy data must be checked in");
assert.ok(fs.existsSync(webPath), "web must ship the same run economy data");
const economy = JSON.parse(fs.readFileSync(sharedPath, "utf8"));
assert.deepEqual(JSON.parse(fs.readFileSync(webPath, "utf8")), economy, "Godot and web must ship identical economy values");
assert.equal(economy.version, 1);
assert.equal(economy.starting_ink, 15, "both platforms should offer the same intentional starter purchase");
assert.deepEqual(economy.boss_wave_reward, { base: 55, per_wave: 1 }, "both platforms must use the same growing milestone-boss reward");
assert.deepEqual(economy.stat_limits, {
  attack_speed_mult: 2.75,
  attack_speed_soft_cap: 2.1,
  armor: 0.65,
  armor_soft_cap: 0.45,
  weapon_min_cooldown_seconds: 0.12,
  starting_enemy_cap: 32,
  hard_spawn_interval_factor: 0.92,
}, "both platforms must share combat ceilings and a readable early-wave cap");
assert.deepEqual(economy.difficulty_ink_multiplier, { easy: 1.05, normal: 1.0, hard: 1.1, alchemist_character: 1.15 });
assert.deepEqual(economy.shop_pricing, { card_wave_rate: 0.12, equipment_wave_rate: 0.1, upgrade_wave_rate: 0.1, reroll_wave_rate: 0.15, repeat_reroll_rate: 0.65 });
const wavePrice = (base, rate, wave) => Math.ceil(base * (1 + rate * Math.max(0, wave - 1)));
assert.equal(wavePrice(20, economy.shop_pricing.card_wave_rate, 1), 20);
assert.ok(wavePrice(20, economy.shop_pricing.card_wave_rate, 20) > 40, "late-wave prices should stay meaningful");
const bossReward = (wave) => Math.round(economy.boss_wave_reward.base + economy.boss_wave_reward.per_wave * wave);
assert.equal(bossReward(5), 60, "the first milestone boss should pay 60 ink before character and difficulty multipliers");
assert.equal(bossReward(100), 155, "the final milestone boss should pay 155 ink before multipliers");
for (const [enemy, reward] of Object.entries(economy.enemy_ink_rewards)) {
  assert.ok(enemy && Number.isInteger(reward) && reward > 0, `${enemy} must have a finite positive defeat reward`);
}
assert.equal(Object.keys(economy.enemy_ink_rewards).length, 18, "every common, split, and boss enemy must have a canonical reward");
const godot = fs.readFileSync(path.join(root, "scripts/stats_manager.gd"), "utf8");
const enemyScript = fs.readFileSync(path.join(root, "scripts/enemy.gd"), "utf8");
const waveManager = fs.readFileSync(path.join(root, "scripts/wave_manager.gd"), "utf8");
const web = fs.readFileSync(path.join(root, "build/web/game.js"), "utf8");
const weapon = fs.readFileSync(path.join(root, "scripts/weapon.gd"), "utf8");
const shopUi = fs.readFileSync(path.join(root, "scripts/shop_ui.gd"), "utf8");
const audio = fs.readFileSync(path.join(root, "scripts/audio_manager.gd"), "utf8");
assert.match(godot, /load_game_economy\(\)/, "Godot must load the shared economy table");
assert.match(godot, /func get_boss_wave_reward\(wave: int\)/, "Godot must calculate milestone-boss payouts from shared economy data");
assert.match(waveManager, /get_boss_wave_reward\(wave\)/, "Godot milestone bosses must use the shared payout");
assert.match(enemyScript, /get_enemy_ink_reward\(/, "Godot enemy setup must use shared rewards");
assert.match(web, /loadGameEconomy\(/, "web must load the shared economy table before starting a run");
assert.match(web, /function getBossWaveReward\(wave\)/, "web must calculate milestone-boss payouts from shared economy data");
assert.match(web, /ink_reward: getBossWaveReward\(wave\)/, "web milestone bosses must use the shared payout");
assert.match(web, /getEnemyInkReward\(/, "web enemy spawns must use the shared rewards");
assert.match(godot, /func add_attack_speed/, "Godot must cap attack-speed growth");
assert.match(godot, /func add_armor/, "Godot must cap armor growth");
assert.match(godot, /func get_shop_price/, "Godot purchases must use wave-scaled prices");
assert.match(weapon, /weapon_min_cooldown_seconds/, "Godot weapons must respect a minimum fire interval");
assert.match(web, /function addAttackSpeed/, "web upgrades must use the capped attack-speed helper");
assert.match(web, /function addArmor/, "web upgrades must use the capped armor helper");
assert.match(web, /function getShopPrice/, "web purchases must use wave-scaled prices");
assert.match(web, /weapon_min_cooldown_seconds/, "web weapons must respect a minimum fire interval");
assert.match(shopUi, /get_card_reroll_cost/, "Godot rerolls must grow by wave and repeated use");
assert.match(audio, /_last_any_weapon_cue_msec < 55/, "Godot weapon sound effects must avoid voice collisions");
console.log(`Economy parity contract passed: ${Object.keys(economy.enemy_ink_rewards).length} enemy rewards; starter ink ${economy.starting_ink}.`);

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const game = fs.readFileSync("build/web/game.js", "utf8");
const html = fs.readFileSync("build/web/index.html", "utf8");
const godot = fs.readFileSync("scripts/player.gd", "utf8");
const response = game.match(/function getPlayerMovementResponse\([\s\S]*?\n\}/);
const approach = game.match(/function approachPlayerVelocity\([\s\S]*?\n\}/);
assert(response && approach, "Web locomotion needs reusable, independently verifiable acceleration and braking response");

const movement = vm.runInNewContext(`${response[0]}\n${approach[0]}\n({getPlayerMovementResponse, approachPlayerVelocity})`);
assert.equal(movement.getPlayerMovementResponse(0, 0, 145, 0), 1450, "Starting and sustained movement should ramp up with controlled acceleration");
assert.equal(movement.getPlayerMovementResponse(235, 0, 0, 0), 2400, "Releasing movement should brake decisively");
assert.equal(movement.getPlayerMovementResponse(235, 0, -235, 0), 1900, "A deliberate reversal should turn faster than ordinary acceleration");
const accelerating = movement.approachPlayerVelocity({vx:0,vy:0}, 235, 0, 0.1, 235);
assert(accelerating.x > 0 && accelerating.x < 235, "Movement must still ease into its configured top speed");
const braked = movement.approachPlayerVelocity({vx:235,vy:0}, 0, 0, 0.1, 235);
assert.deepEqual({x:braked.x,y:braked.y}, {x:0,y:0}, "A short brake should remove most stop drift within a tenth of a second");
const reversed = movement.approachPlayerVelocity({vx:235,vy:0}, -235, 0, 0.016, 235);
assert(reversed.x > 0 && reversed.x < 235, "Reversing direction should not snap or preserve the old slow turn");

assert.match(godot, /var acceleration := 2400\.0 if target_speed < 0\.001 else 1450\.0/, "Godot movement should match web acceleration and braking values");
assert.match(godot, /acceleration = 1900\.0/, "Godot should use the same sharper direction-reversal response");
assert.match(html, /id="hero-hud-portrait"[^>]*src="assets\/sprites\/upgrade_v1\/hero_inky\.png"/, "The HUD should include the selected hero's pixel-art portrait");
assert.match(game, /heroPortrait\.src = portraitPath/, "Changing hero should update the HUD portrait asset");
assert.match(html, /id="boss-hp-portrait"/, "The boss bar should have a framed portrait slot");
assert.match(game, /portrait\.src = portraitPath/, "The live boss bar should use its matching authored portrait");
assert.match(game, /const startAtFixedJoystick = \(clientX, clientY, identifier\) =>[\s\S]*?const rect = joystickZone\.getBoundingClientRect\(\)/,
  "mobile movement should use the visible fixed joystick base as its origin");
assert.doesNotMatch(game, /startFloatingAt|touch-joystick-surface/, "mobile movement must not relocate a floating joystick or capture the whole screen half");
assert.match(html, /#joystick-zone\s*\{[^}]*left:\s*calc\(24px \+ env\(safe-area-inset-left/s,
  "the fixed joystick should remain anchored to the lower-left safe area");
assert.doesNotMatch(html, /id="touch-joystick-surface"/, "a transparent half-screen overlay must not intercept mobile taps");
console.log("Movement/UI asset regression passed: quick braking, smooth reversal, Godot parity, hero and boss portraits.");

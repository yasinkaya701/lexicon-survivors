/**
 * tests/stress/ui_hud_modals_stress.test.ts
 * Milestone O1 UI Components, HUD, WeaponInventoryBar, and Modals Stress Test Suite
 *
 * Exhaustively stress-tests:
 * 1. WeaponInventoryBar:
 *    - 0 to 6 weapons scaling & rendering.
 *    - Tiers 1 to 4 rarity styling, borders, backgrounds, badges, and labels.
 *    - Hotkey badges 1 to 6 ordering and slot numbering.
 *    - Empty slot placeholders with dashed borders and BOŞ indicators.
 *    - Cooldown sweep clipping geometry (0%, 50%, 100%, 0 baseCooldownMs).
 *    - Fallback behavior on invalid tiers, oversized weapon arrays, and null slots.
 * 2. HUD:
 *    - Health bar rendering at 100%, 50%, 25%, 20% (danger pulse), 0%, negative, and over-heal HP.
 *    - In-wave Question Charge meter with 0, 1, 2, and overflowing charges.
 *    - Tactical freeze banner activation under dt=0.
 *    - Wave timer formatting and progress bar calculations.
 *    - 17 RPG stat sheet toggling and completeness.
 *    - Zero emoji characters across source code and rendered outputs.
 * 3. Modals (ShopModal, StudyBuffModal, TacticalFreezeModal, TelemetryModal):
 *    - Keydown event listeners (A/B/C/D, 1/2/3/4) and unmount cleanups.
 *    - Timer intervals (setInterval / clearInterval) and timeout handlers.
 *    - AST invariants verified against adversarial test specifications.
 *    - Weapon combine detection logic in ShopModal.
 *    - Zero emoji characters across all modals.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import ts from 'typescript';

const HARNESS_PATH = path.resolve(__dirname, './ui_harness.ts');
const unicodeEmojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

let callCounter = 0;
function callHarness(action: string, payload: Record<string, any> = {}): any {
  const tmpOut = path.resolve(__dirname, `../../.tmp_harness_${process.pid}_${++callCounter}.json`);
  try {
    execFileSync(
      'npx',
      ['tsx', HARNESS_PATH, action, JSON.stringify(payload), tmpOut],
      {
        encoding: 'utf-8',
        env: { ...process.env, PATH: `${process.env.HOME}/.local/node/bin:${process.env.PATH}` },
      }
    );
    const content = fs.readFileSync(tmpOut, 'utf-8');
    return JSON.parse(content);
  } finally {
    if (fs.existsSync(tmpOut)) {
      try {
        fs.unlinkSync(tmpOut);
      } catch {}
    }
  }
}

function createWeaponFixture(
  id: string,
  name: string,
  tier: 1 | 2 | 3 | 4 = 1,
  currentCooldownMs = 0,
  baseCooldownMs = 1000
) {
  return {
    id,
    blueprint: {
      id: `bp_${id}`,
      name,
      type: 'ranged',
      subtype: 'projectile',
      tier,
      baseDamage: 15 * tier,
      scalingStat: 'rangedDamage',
      scalingRatio: 1.0,
      baseCooldownMs,
      baseRange: 350,
      critChance: 0.05,
      critMultiplier: 1.5,
      knockback: 10,
      pierce: 1,
      bounce: 0,
      projectileSpeed: 600,
      spriteName: `weapon_${name.toLowerCase().replace(/\s+/g, '_')}`,
    },
    currentCooldownMs,
    level: 1,
  };
}

describe('Milestone O1: WeaponInventoryBar Empirical & Stress Tests', () => {
  it('renders exactly 6 empty slots when 0 weapons are provided', () => {
    const res = callHarness('renderWeaponInventoryBar', { weapons: [] });

    expect(res.emptySlotCount).toBe(6);
    expect(res.bosCount).toBe(6);
    expect(res.hotkeysFound).toEqual([1, 2, 3, 4, 5, 6]);
    expect(res.hasTier1).toBe(false);
    expect(res.emojiCount).toBe(0);
    expect(res.hasNaN).toBe(false);
  });

  it('renders all 6 populated weapon slots with hotkeys 1 to 6', () => {
    const weapons = [
      createWeaponFixture('w1', 'Tabanca', 1),
      createWeaponFixture('w2', 'Pompalı', 2),
      createWeaponFixture('w3', 'SMG', 3),
      createWeaponFixture('w4', 'Asa', 4),
      createWeaponFixture('w5', 'Bıçak', 2),
      createWeaponFixture('w6', 'Kılıç', 3),
    ];

    const res = callHarness('renderWeaponInventoryBar', { weapons });

    expect(res.emptySlotCount).toBe(0);
    expect(res.bosCount).toBe(0);
    expect(res.hotkeysFound).toEqual([1, 2, 3, 4, 5, 6]);
    expect(res.html).toContain('Tabanca');
    expect(res.html).toContain('Pompalı');
    expect(res.html).toContain('SMG');
    expect(res.html).toContain('Asa');
    expect(res.html).toContain('Bıçak');
    expect(res.html).toContain('Kılıç');
    expect(res.emojiCount).toBe(0);
  });

  it('handles partial inventory gracefully: 3 weapons and 3 empty slots', () => {
    const weapons = [
      createWeaponFixture('w1', 'Tabanca', 1),
      null,
      createWeaponFixture('w3', 'SMG', 3),
    ];

    const res = callHarness('renderWeaponInventoryBar', { weapons });

    expect(res.bosCount).toBe(4); // index 1, 3, 4, 5 are empty
    expect(res.emptySlotCount).toBe(4);
    expect(res.html).toContain('Tabanca');
    expect(res.html).toContain('SMG');
    expect(res.hotkeysFound).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('strictly caps rendered slots to 6 when passed oversized array (>6 weapons)', () => {
    const weapons = [
      createWeaponFixture('w1', 'Silah 1', 1),
      createWeaponFixture('w2', 'Silah 2', 1),
      createWeaponFixture('w3', 'Silah 3', 1),
      createWeaponFixture('w4', 'Silah 4', 1),
      createWeaponFixture('w5', 'Silah 5', 1),
      createWeaponFixture('w6', 'Silah 6', 1),
      createWeaponFixture('w7', 'Silah 7', 1),
      createWeaponFixture('w8', 'Silah 8', 1),
    ];

    const res = callHarness('renderWeaponInventoryBar', { weapons });

    expect(res.html).toContain('Silah 1');
    expect(res.html).toContain('Silah 6');
    expect(res.html).not.toContain('Silah 7');
    expect(res.html).not.toContain('Silah 8');
  });

  it('renders distinct rarity styles for Tiers 1 through 4', () => {
    const weapons = [
      createWeaponFixture('w1', 'T1Weapon', 1),
      createWeaponFixture('w2', 'T2Weapon', 2),
      createWeaponFixture('w3', 'T3Weapon', 3),
      createWeaponFixture('w4', 'T4Weapon', 4),
    ];

    const res = callHarness('renderWeaponInventoryBar', { weapons });

    expect(res.hasTier1).toBe(true);
    expect(res.hasTier2).toBe(true);
    expect(res.hasTier3).toBe(true);
    expect(res.hasTier4).toBe(true);

    expect(res.hasTier1Border).toBe(true);
    expect(res.hasTier2Border).toBe(true);
    expect(res.hasTier3Border).toBe(true);
    expect(res.hasTier4Border).toBe(true);
  });

  it('gracefully falls back to Tier 1 when tier is unknown or undefined', () => {
    const weirdWeapon = createWeaponFixture('weird', 'MysticWeapon', 1);
    weirdWeapon.blueprint.tier = 99 as any;

    const res = callHarness('renderWeaponInventoryBar', { weapons: [weirdWeapon] });

    expect(res.hasTier1).toBe(true);
    expect(res.hasTier1Border).toBe(true);
  });

  it('correctly calculates cooldown sweep clipping geometry without NaN', () => {
    // 0% cooldown -> no clipping overlay
    const wReady = createWeaponFixture('w_ready', 'Ready', 1, 0, 1000);
    const resReady = callHarness('renderWeaponInventoryBar', { weapons: [wReady] });
    expect(resReady.hasClipPath).toBe(false);

    // 50% cooldown -> clipPath: inset(0 0 50% 0)
    const wHalf = createWeaponFixture('w_half', 'Half', 1, 500, 1000);
    const resHalf = callHarness('renderWeaponInventoryBar', { weapons: [wHalf] });
    expect(resHalf.hasClipPath).toBe(true);
    expect(resHalf.html).toContain('inset(0 0 50% 0)');

    // 100% cooldown -> clipPath: inset(0 0 0% 0)
    const wFull = createWeaponFixture('w_full', 'Full', 1, 1000, 1000);
    const resFull = callHarness('renderWeaponInventoryBar', { weapons: [wFull] });
    expect(resFull.hasClipPath).toBe(true);
    expect(resFull.html).toContain('inset(0 0 0% 0)');

    // Zero baseCooldownMs protection (no divide-by-zero or NaN)
    const wZeroCd = createWeaponFixture('w_zero', 'Zero', 1, 100, 0);
    const resZero = callHarness('renderWeaponInventoryBar', { weapons: [wZeroCd] });
    expect(resZero.hasNaN).toBe(false);
    expect(resZero.hasClipPath).toBe(false);
  });
});

describe('Milestone O1: HUD Stress & Edge Case Tests', () => {
  const baseHudOptions = {
    currentHp: 100,
    maxHp: 100,
    materials: 120,
    wave: 5,
    waveTimeRemainingSec: 45,
    waveDurationSec: 60,
    weapons: [createWeaponFixture('w1', 'Pistol', 1)],
    characterName: 'Patates Bilgini',
    characterBadge: 'Bilge',
  };

  it('renders healthy HP bar at 100% without critical danger pulse', () => {
    const res = callHarness('renderHUD', { ...baseHudOptions, currentHp: 100, maxHp: 100 });

    expect(res.html).toContain('style="width:100%"');
    expect(res.html).toContain('100 / 100 HP');
    expect(res.isCriticalPulse).toBe(false);
    expect(res.emojiCount).toBe(0);
  });

  it('renders HP bar at 50% without danger pulse', () => {
    const res = callHarness('renderHUD', { ...baseHudOptions, currentHp: 50, maxHp: 100 });

    expect(res.html).toContain('style="width:50%"');
    expect(res.html).toContain('50 / 100 HP');
    expect(res.isCriticalPulse).toBe(false);
  });

  it('triggers critical danger pulse when HP is 20% (<= 25% threshold)', () => {
    const res = callHarness('renderHUD', { ...baseHudOptions, currentHp: 20, maxHp: 100 });

    expect(res.html).toContain('style="width:20%"');
    expect(res.html).toContain('20 / 100 HP');
    expect(res.isCriticalPulse).toBe(true);
    expect(res.html).toContain('from-red-600 via-rose-500 to-red-500');
  });

  it('strictly handles 0 HP and negative HP without crashing or negative bar width', () => {
    // 0 HP
    const resZero = callHarness('renderHUD', { ...baseHudOptions, currentHp: 0, maxHp: 100 });
    expect(resZero.html).toContain('style="width:0%"');
    expect(resZero.html).toContain('0 / 100 HP');
    expect(resZero.isCriticalPulse).toBe(true);

    // Negative HP (-25 HP)
    const resNeg = callHarness('renderHUD', { ...baseHudOptions, currentHp: -25, maxHp: 100 });
    expect(resNeg.html).toContain('style="width:0%"');
    expect(resNeg.html).toContain('0 / 100 HP');
    expect(resNeg.html).not.toContain('-25');
  });

  it('clamps over-heal HP to 100% maximum bar width', () => {
    const resOver = callHarness('renderHUD', { ...baseHudOptions, currentHp: 150, maxHp: 100 });
    expect(resOver.html).toContain('style="width:100%"');
    expect(resOver.html).toContain('150 / 100 HP');
  });

  it('renders Question Charge meter with 0 charges (disabled styling & empty pips)', () => {
    const res = callHarness('renderHUD', {
      ...baseHudOptions,
      questionCharges: 0,
      maxQuestionCharges: 2,
    });

    expect(res.html).toContain('SORU [Q]');
    expect(res.html).toContain('opacity-60');
    expect(res.chargedPipCount).toBe(0);
    expect(res.emptyPipCount).toBeGreaterThanOrEqual(2);
  });

  it('renders Question Charge meter with 1 charge (active container & 1 charged pip)', () => {
    const res = callHarness('renderHUD', {
      ...baseHudOptions,
      questionCharges: 1,
      maxQuestionCharges: 2,
    });

    expect(res.html).toContain('border-cyan-500/50 bg-cyan-950/60');
    expect(res.chargedPipCount).toBe(1);
    expect(res.emptyPipCount).toBeGreaterThanOrEqual(1);
  });

  it('renders Question Charge meter with 2 full charges', () => {
    const res = callHarness('renderHUD', {
      ...baseHudOptions,
      questionCharges: 2,
      maxQuestionCharges: 2,
    });

    expect(res.chargedPipCount).toBe(2);
  });

  it('formats wave timer correctly and calculates wave progress', () => {
    const res = callHarness('renderHUD', {
      ...baseHudOptions,
      waveTimeRemainingSec: 75,
      waveDurationSec: 90,
    });

    expect(res.html).toContain('01:15');
    expect(res.html).toContain('style="width:16.666666666666664%"');
  });

  it('renders tactical freeze banner when isTacticalFreeze is true', () => {
    const resFrozen = callHarness('renderHUD', { ...baseHudOptions, isTacticalFreeze: true });
    expect(resFrozen.hasTacticalBanner).toBe(true);

    const resUnfrozen = callHarness('renderHUD', { ...baseHudOptions, isTacticalFreeze: false });
    expect(resUnfrozen.hasTacticalBanner).toBe(false);
  });

  it('renders 17 RPG stat sheet when showStats is true', () => {
    const res = callHarness('renderHUD', { ...baseHudOptions, showStats: true });

    expect(res.hasStatSheet).toBe(true);
    expect(res.html).toContain('Maks Can:');
    expect(res.html).toContain('Can Yenileme:');
    expect(res.html).toContain('Can Çalma:');
    expect(res.html).toContain('Hasar %:');
    expect(res.html).toContain('Yakın Hasar:');
    expect(res.html).toContain('Menzilli Hasar:');
    expect(res.html).toContain('Element Hasarı:');
    expect(res.html).toContain('Saldırı Hızı:');
    expect(res.html).toContain('Kritik Şans:');
    expect(res.html).toContain('Mühendislik:');
    expect(res.html).toContain('Menzil:');
    expect(res.html).toContain('Zırh:');
    expect(res.html).toContain('Sıyrılma (Dodge):');
    expect(res.html).toContain('Hız %:');
    expect(res.html).toContain('Şans (Luck):');
    expect(res.html).toContain('Hasat:');
    expect(res.html).toContain('Çekim Alanı:');
  });

  it('verifies zero unicode emojis in HUD.tsx source and rendered markup', () => {
    const filePath = path.resolve(__dirname, '../../src/components/HUD.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceEmojis = content.match(new RegExp(unicodeEmojiRegex, 'gu'));
    expect(sourceEmojis).toBeNull();

    const res = callHarness('renderHUD', { ...baseHudOptions, showStats: true });
    expect(res.emojiCount).toBe(0);
  });
});

describe('Milestone O1: Modals Stress & AST Invariant Tests', () => {
  it('ShopModal: detects combinable weapon pair of identical name & tier < 4', () => {
    const weapons = [
      createWeaponFixture('w1', 'Tabanca', 1),
      createWeaponFixture('w2', 'Pompalı', 2),
      createWeaponFixture('w3', 'Tabanca', 1), // Identical to w1!
    ];

    const res = callHarness('renderShopModal', { weapons });

    expect(res.hasCombinablePrompt).toBe(true);
    expect(res.html).toContain('Silahları Birleştir (Tier +1)');
    expect(res.emojiCount).toBe(0);
  });

  it('ShopModal: does not offer combination for Tier 4 weapons (max tier reached)', () => {
    const weapons = [
      createWeaponFixture('w1', 'Altın Tabanca', 4),
      createWeaponFixture('w2', 'Altın Tabanca', 4),
    ];

    const res = callHarness('renderShopModal', { weapons });
    expect(res.hasCombinablePrompt).toBe(false);
  });

  it('StudyBuffModal: AST Analysis confirms keydown listener and interval cleanups', () => {
    const filePath = path.resolve(__dirname, '../../src/components/StudyBuffModal.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // 1. Literal token assertions
    expect(content).toContain("window.addEventListener('keydown'");
    expect(content).toContain("window.removeEventListener('keydown'");
    expect(content).toContain('setInterval(');
    expect(content).toContain('clearInterval(');

    // 2. TypeScript AST Deep Verification
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    let hasAddKeydown = false;
    let hasRemoveKeydown = false;
    let hasSetInterval = false;
    let hasClearInterval = false;

    function visit(node: ts.Node) {
      if (ts.isCallExpression(node)) {
        const text = node.expression.getText(sourceFile);
        if (text === 'window.addEventListener') {
          const arg0 = node.arguments[0]?.getText(sourceFile);
          if (arg0 === "'keydown'") hasAddKeydown = true;
        }
        if (text === 'window.removeEventListener') {
          const arg0 = node.arguments[0]?.getText(sourceFile);
          if (arg0 === "'keydown'") hasRemoveKeydown = true;
        }
        if (text === 'setInterval') hasSetInterval = true;
        if (text === 'clearInterval') hasClearInterval = true;
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    expect(hasAddKeydown).toBe(true);
    expect(hasRemoveKeydown).toBe(true);
    expect(hasSetInterval).toBe(true);
    expect(hasClearInterval).toBe(true);
  });

  it('TacticalFreezeModal: AST Analysis confirms keydown listener and timer cleanups', () => {
    const filePath = path.resolve(__dirname, '../../src/components/TacticalFreezeModal.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain("window.addEventListener('keydown'");
    expect(content).toContain("window.removeEventListener('keydown'");
    expect(content).toContain('setInterval(');
    expect(content).toContain('clearInterval(');

    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    let hasAddKeydown = false;
    let hasRemoveKeydown = false;
    let hasSetInterval = false;
    let hasClearInterval = false;

    function visit(node: ts.Node) {
      if (ts.isCallExpression(node)) {
        const text = node.expression.getText(sourceFile);
        if (text === 'window.addEventListener') {
          const arg0 = node.arguments[0]?.getText(sourceFile);
          if (arg0 === "'keydown'") hasAddKeydown = true;
        }
        if (text === 'window.removeEventListener') {
          const arg0 = node.arguments[0]?.getText(sourceFile);
          if (arg0 === "'keydown'") hasRemoveKeydown = true;
        }
        if (text === 'setInterval') hasSetInterval = true;
        if (text === 'clearInterval') hasClearInterval = true;
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    expect(hasAddKeydown).toBe(true);
    expect(hasRemoveKeydown).toBe(true);
    expect(hasSetInterval).toBe(true);
    expect(hasClearInterval).toBe(true);
  });

  it('TelemetryModal: AST Analysis confirms MasteryRadarChart integration and mistake bindings', () => {
    const filePath = path.resolve(__dirname, '../../src/components/TelemetryModal.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('<MasteryRadarChart');
    expect(content).toContain('totalMistakes');
    expect(content).toContain('resolvedMistakes');
  });

  it('verifies zero unicode emojis across all four modal source files', () => {
    const modalFiles = [
      'ShopModal.tsx',
      'StudyBuffModal.tsx',
      'TacticalFreezeModal.tsx',
      'TelemetryModal.tsx',
    ];

    for (const file of modalFiles) {
      const p = path.resolve(__dirname, `../../src/components/${file}`);
      const content = fs.readFileSync(p, 'utf-8');
      const emojis = content.match(new RegExp(unicodeEmojiRegex, 'gu'));
      expect(emojis, `File ${file} must have zero emojis`).toBeNull();
    }
  });

  it('verifies static rendering of all four modals executes cleanly without exceptions', () => {
    // ShopModal
    const resShop = callHarness('renderShopModal', {});
    expect(resShop.length).toBeGreaterThan(0);
    expect(resShop.emojiCount).toBe(0);

    // StudyBuffModal
    const resStudy = callHarness('renderStudyBuffModal', {});
    expect(resStudy.closedLength).toBe(0);
    expect(resStudy.openLength).toBeGreaterThan(0);
    expect(resStudy.hasPrompt).toBe(true);
    expect(resStudy.emojiCount).toBe(0);

    // TacticalFreezeModal
    const resTactical = callHarness('renderTacticalFreezeModal', {});
    expect(resTactical.closedLength).toBe(0);
    expect(resTactical.openLength).toBeGreaterThan(0);
    expect(resTactical.hasTacticalBanner).toBe(true);
    expect(resTactical.emojiCount).toBe(0);

    // TelemetryModal
    const resTelemetry = callHarness('renderTelemetryModal', {});
    expect(resTelemetry.closedLength).toBe(0);
    expect(resTelemetry.openLength).toBeGreaterThan(0);
    expect(resTelemetry.hasRadarTitle).toBe(true);
  });
});

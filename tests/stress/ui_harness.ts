/**
 * tests/stress/ui_harness.ts
 * Headless DOM / React markup test harness for Milestone O1 UI components.
 * Executed via `npx tsx` to ensure proper JSX transform in Node.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { WeaponInventoryBar } from '../../src/components/WeaponInventoryBar';
import { HUD } from '../../src/components/HUD';
import { ShopModal } from '../../src/components/ShopModal';
import { StudyBuffModal } from '../../src/components/StudyBuffModal';
import { TacticalFreezeModal } from '../../src/components/TacticalFreezeModal';
import { TelemetryModal } from '../../src/components/TelemetryModal';

import type { ActiveWeaponInstance, PlayerRPGStats, ShopSlot } from '../../src/types/brotato';
import type { TacticalQuestion } from '../../src/types/game';

function createMockPlayerStats(overrides: Partial<PlayerRPGStats> = {}): PlayerRPGStats {
  return {
    maxHp: 100,
    currentHp: 100,
    hpRegen: 1,
    lifeSteal: 0,
    damagePercent: 10,
    meleeDamage: 5,
    rangedDamage: 8,
    elementalDamage: 0,
    attackSpeed: 15,
    critChancePercent: 10,
    engineering: 0,
    range: 50,
    armor: 4,
    dodgePercent: 10,
    speedPercent: 15,
    luck: 5,
    harvesting: 8,
    pickupRange: 120,
    ...overrides,
  };
}

const mockQuestion: TacticalQuestion = {
  id: 'q_test_1',
  act: 'yks',
  type: 'multiple_choice',
  category: 'TYT Matematik',
  difficulty: 2,
  prompt: '3x + 5 = 20 ise x kaçtır?',
  options: ['3', '4', '5', '6'],
  correctIndex: 2,
  mnemonic: 'Denklemde bilinenleri bir tarafa topla!',
  timeLimitSec: 20,
};

const unicodeEmojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

export function runHarness(action: string, payloadStr: string): any {
  const payload = payloadStr ? JSON.parse(payloadStr) : {};

  switch (action) {
    case 'renderWeaponInventoryBar': {
      const weapons = payload.weapons || [];
      const html = renderToStaticMarkup(
        React.createElement(WeaponInventoryBar, { weapons })
      );
      const emptySlotMatches = html.match(/Boş Silah Yuvası #/g) || [];
      const bosMatches = html.match(/>BOŞ</g) || [];
      const hotkeyMatches: number[] = [];
      for (let i = 1; i <= 6; i++) {
        if (html.includes(`>${i}<`) || html.includes(`Boş Silah Yuvası #${i}`)) {
          hotkeyMatches.push(i);
        }
      }
      const emojiMatches = html.match(new RegExp(unicodeEmojiRegex, 'gu')) || [];

      return {
        html,
        length: html.length,
        emptySlotCount: emptySlotMatches.length,
        bosCount: bosMatches.length,
        hotkeysFound: hotkeyMatches,
        hasTier1: html.includes('>T1<'),
        hasTier2: html.includes('>T2<'),
        hasTier3: html.includes('>T3<'),
        hasTier4: html.includes('>T4<'),
        hasTier1Border: html.includes('border-slate-500/70'),
        hasTier2Border: html.includes('border-sky-500/80'),
        hasTier3Border: html.includes('border-purple-500/80'),
        hasTier4Border: html.includes('border-amber-400/90'),
        hasClipPath: html.includes('clip-path:inset(') || html.includes('clipPath'),
        hasNaN: html.includes('NaN'),
        emojiCount: emojiMatches.length,
      };
    }

    case 'renderHUD': {
      const stats = createMockPlayerStats(payload.playerStats || {});
      const weapons = payload.weapons || [];
      const html = renderToStaticMarkup(
        React.createElement(HUD, {
          currentHp: payload.currentHp ?? 100,
          maxHp: payload.maxHp ?? 100,
          materials: payload.materials ?? 100,
          wave: payload.wave ?? 1,
          waveTimeRemainingSec: payload.waveTimeRemainingSec ?? 30,
          waveDurationSec: payload.waveDurationSec ?? 30,
          weapons,
          playerStats: stats,
          characterName: payload.characterName ?? 'Patates Bilgini',
          characterBadge: payload.characterBadge ?? 'Bilge',
          isTacticalFreeze: payload.isTacticalFreeze ?? false,
          showStats: payload.showStats ?? false,
          questionCharges: payload.questionCharges ?? 2,
          maxQuestionCharges: payload.maxQuestionCharges ?? 2,
        })
      );

      const emojiMatches = html.match(new RegExp(unicodeEmojiRegex, 'gu')) || [];
      const chargedPips = html.match(/border-cyan-400 bg-cyan-400 shadow-\[0_0_8px_rgba\(34,211,238,0.8\)\]/g) || [];
      const emptyPips = html.match(/border-slate-800 bg-slate-900\/80/g) || [];

      return {
        html,
        length: html.length,
        isCriticalPulse: html.includes('border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse'),
        hasTacticalBanner: html.includes('TAKTİKSEL DURAKLATMA (dt=0)'),
        chargedPipCount: chargedPips.length,
        emptyPipCount: emptyPips.length,
        hasStatSheet: html.includes('17 RPG Stat Tablosu'),
        hasWeaponBar: html.includes('data-testid="weapon-inventory-bar"'),
        emojiCount: emojiMatches.length,
        hasNaN: html.includes('NaN'),
      };
    }

    case 'renderShopModal': {
      const weapons = payload.weapons || [];
      const stats = createMockPlayerStats(payload.playerStats || {});
      const slots = payload.slots || [];
      const lockedSlots = new Set<number>(payload.lockedSlots || []);

      const html = renderToStaticMarkup(
        React.createElement(ShopModal, {
          currentWave: payload.currentWave ?? 1,
          materials: payload.materials ?? 100,
          slots,
          lockedSlots,
          rerollCost: payload.rerollCost ?? 5,
          playerStats: stats,
          weapons,
          onPurchaseSlot: () => {},
          onToggleLockSlot: () => {},
          onReroll: () => {},
          onCombineWeapons: () => {},
          onNextWave: () => {},
        })
      );

      const emojiMatches = html.match(new RegExp(unicodeEmojiRegex, 'gu')) || [];
      return {
        html,
        length: html.length,
        hasCombinablePrompt: html.includes('Birleştirilebilir 2 Silah Bulundu'),
        emojiCount: emojiMatches.length,
      };
    }

    case 'renderStudyBuffModal': {
      const htmlClosed = renderToStaticMarkup(
        React.createElement(StudyBuffModal, {
          isOpen: false,
          currentWave: 1,
          availableQuestions: [mockQuestion],
          onApplyReward: () => {},
          onClose: () => {},
        })
      );
      const htmlOpen = renderToStaticMarkup(
        React.createElement(StudyBuffModal, {
          isOpen: true,
          currentWave: 1,
          availableQuestions: [mockQuestion],
          onApplyReward: () => {},
          onClose: () => {},
        })
      );

      const emojiMatches = htmlOpen.match(new RegExp(unicodeEmojiRegex, 'gu')) || [];
      return {
        closedLength: htmlClosed.length,
        openLength: htmlOpen.length,
        hasPrompt: htmlOpen.includes('DALGALAR ARASI ETÜT ODASI'),
        emojiCount: emojiMatches.length,
      };
    }

    case 'renderTacticalFreezeModal': {
      const htmlClosed = renderToStaticMarkup(
        React.createElement(TacticalFreezeModal, {
          isOpen: false,
          source: payload.source || 'mystery_chest',
          question: mockQuestion,
          onSelectSuperpower: () => {},
          onClose: () => {},
        })
      );
      const htmlOpen = renderToStaticMarkup(
        React.createElement(TacticalFreezeModal, {
          isOpen: true,
          source: payload.source || 'mystery_chest',
          question: mockQuestion,
          onSelectSuperpower: () => {},
          onClose: () => {},
        })
      );

      const emojiMatches = htmlOpen.match(new RegExp(unicodeEmojiRegex, 'gu')) || [];
      return {
        closedLength: htmlClosed.length,
        openLength: htmlOpen.length,
        hasTacticalBanner: htmlOpen.includes('dt = 0.00s (Zaman Durduruldu)'),
        emojiCount: emojiMatches.length,
      };
    }

    case 'renderTelemetryModal': {
      const htmlClosed = renderToStaticMarkup(
        React.createElement(TelemetryModal, {
          isOpen: false,
          scores: { turkce: 75, matematik: 85, fen: 60, sosyal: 70, buept: 80 },
          onClose: () => {},
        })
      );
      const htmlOpen = renderToStaticMarkup(
        React.createElement(TelemetryModal, {
          isOpen: true,
          scores: { turkce: 75, matematik: 85, fen: 60, sosyal: 70, buept: 80 },
          onClose: () => {},
        })
      );

      const emojiMatches = htmlOpen.match(new RegExp(unicodeEmojiRegex, 'gu')) || [];
      return {
        closedLength: htmlClosed.length,
        openLength: htmlOpen.length,
        hasRadarTitle: htmlOpen.includes('5-EKSENLİ YETENEK &amp; TELEMETRİ RADARI'),
        emojiCount: emojiMatches.length,
      };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

import * as fs from 'fs';

// CLI handler when called directly: npx tsx tests/stress/ui_harness.ts <action> '<payload>' [outPath]
if (process.argv[1]?.endsWith('ui_harness.ts')) {
  const action = process.argv[2];
  const payloadStr = process.argv[3] || '{}';
  const outPath = process.argv[4];
  try {
    const result = runHarness(action, payloadStr);
    const jsonStr = JSON.stringify(result);
    if (outPath) {
      fs.writeFileSync(outPath, jsonStr, 'utf-8');
    } else {
      process.stdout.write(jsonStr);
    }
    process.exit(0);
  } catch (err: any) {
    process.stderr.write(String(err?.stack || err));
    process.exit(1);
  }
}

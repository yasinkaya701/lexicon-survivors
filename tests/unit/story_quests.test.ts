import { describe, it, expect } from 'vitest';
import {
  ALL_CHARACTER_QUESTS,
  RUNE_SORCERESS_QUEST,
  LEXICON_ALCHEMIST_QUEST,
  SHADOW_SCRIBE_QUEST,
  getStoryMilestone,
  isMilestoneWave,
} from '@/data/storyQuests';
import { relicEngine } from '@/game/relics/RelicEngine';

describe('Boş Sayfa Story Quests & Relic Architecture', () => {
  it('defines all 3 primary protagonists with unique color themes and summaries', () => {
    expect(ALL_CHARACTER_QUESTS.rune_sorceress).toBeDefined();
    expect(ALL_CHARACTER_QUESTS.lexicon_alchemist).toBeDefined();
    expect(ALL_CHARACTER_QUESTS.shadow_scribe).toBeDefined();

    expect(RUNE_SORCERESS_QUEST.questSubtitle).toBe('Lale’nin Haritası');
    expect(LEXICON_ALCHEMIST_QUEST.questSubtitle).toBe('Paylaşılmış Hatıra');
    expect(SHADOW_SCRIBE_QUEST.questSubtitle).toBe('Silgiyi Tutan El');
  });

  it('guarantees exactly 20 milestones per character from Wave 5 to Wave 100 in steps of 5', () => {
    const expectedWaves = Array.from({ length: 20 }, (_, i) => (i + 1) * 5);

    for (const [id, quest] of Object.entries(ALL_CHARACTER_QUESTS)) {
      expect(quest.milestones.length, `${id} must have exactly 20 milestones`).toBe(20);
      const waves = quest.milestones.map((m) => m.wave);
      expect(waves).toEqual(expectedWaves);
    }
  });

  it('validates Rune Sorceress Wave 5 and Wave 100 narrative milestones', () => {
    const wave5 = getStoryMilestone('rune_sorceress', 5);
    expect(wave5).toBeDefined();
    expect(wave5?.title).toBe('Ters katalog');
    expect(wave5?.relic?.name).toBe('Pusula Kırığı');
    expect(wave5?.dialogues.some((d) => d.text.includes('kuzey aşağıdaydı'))).toBe(true);

    const wave100 = getStoryMilestone('rune_sorceress', 100);
    expect(wave100).toBeDefined();
    expect(wave100?.title).toBe('Yeni takımyıldız');
    expect(wave100?.climaxResolution).toBeDefined();
    expect(wave100?.climaxResolution).toContain('Lale haritadan çıkar');
  });

  it('validates Lexicon Alchemist Wave 5 and Wave 100 narrative milestones', () => {
    const wave5 = getStoryMilestone('lexicon_alchemist', 5);
    expect(wave5).toBeDefined();
    expect(wave5?.title).toBe('Ölçüsüz tarif');
    expect(wave5?.relic?.name).toBe('Kör Damla Özü');

    const wave100 = getStoryMilestone('lexicon_alchemist', 100);
    expect(wave100).toBeDefined();
    expect(wave100?.title).toBe('Açık masa');
    expect(wave100?.climaxResolution).toContain('hayatta kalanların ayrı ayrı kararlarıyla');
  });

  it('validates Shadow Scribe Wave 5 and Wave 100 narrative milestones', () => {
    const wave5 = getStoryMilestone('shadow_scribe', 5);
    expect(wave5).toBeDefined();
    expect(wave5?.title).toBe('İlk silgi izi');
    expect(wave5?.relic?.name).toBe('Silinmiş Uç');

    const wave100 = getStoryMilestone('shadow_scribe', 100);
    expect(wave100).toBeDefined();
    expect(wave100?.title).toBe('Açık kayıt');
    expect(wave100?.climaxResolution).toContain('Shadow suçunu silmez; yeni kâtip olur');
  });

  it('correctly identifies milestone waves', () => {
    expect(isMilestoneWave(5)).toBe(true);
    expect(isMilestoneWave(25)).toBe(true);
    expect(isMilestoneWave(50)).toBe(true);
    expect(isMilestoneWave(100)).toBe(true);

    expect(isMilestoneWave(1)).toBe(false);
    expect(isMilestoneWave(4)).toBe(false);
    expect(isMilestoneWave(12)).toBe(false);
    expect(isMilestoneWave(101)).toBe(false);
  });
});

describe('RelicEngine Combat & Passive Calculations', () => {
  it('manages relic lifecycle and applies stat bonuses correctly', () => {
    relicEngine.reset();
    expect(relicEngine.getActiveRelics().length).toBe(0);

    const runeWave5 = getStoryMilestone('rune_sorceress', 5)!.relic!;
    relicEngine.addRelic(runeWave5);

    expect(relicEngine.getActiveRelics().length).toBe(1);
    expect(relicEngine.hasEffect('compass_shatter_burst')).toBe(true);

    const stats = relicEngine.getCombinedStatBuffs();
    expect(stats.critChancePercent).toBe(8);
    expect(stats.range).toBe(25);
  });

  it('calculates special combat multipliers based on active relics', () => {
    relicEngine.reset();
    expect(relicEngine.getEnemyProjectileSpeedMultiplier()).toBe(1.0);
    expect(relicEngine.getExtraChainBounces()).toBe(0);

    // Add Parallax Astrolabe
    const paralaks = getStoryMilestone('rune_sorceress', 50)!.relic!;
    relicEngine.addRelic(paralaks);
    expect(relicEngine.getEnemyProjectileSpeedMultiplier()).toBe(0.7);

    // Add Yıldız Astarı
    const astari = getStoryMilestone('rune_sorceress', 25)!.relic!;
    relicEngine.addRelic(astari);
    expect(relicEngine.getExtraChainBounces()).toBe(2);

    // Add Kör Damla
    const korDamla = getStoryMilestone('lexicon_alchemist', 5)!.relic!;
    relicEngine.addRelic(korDamla);
    expect(relicEngine.getBossDropMultiplier()).toBeGreaterThan(1.0);
  });
});

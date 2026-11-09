import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import vm from 'node:vm';
import { soundEngine } from '@/lib/sound';

describe('Story Dialogue Audio & Manifest Invariants', () => {
  const root = path.resolve(__dirname, '../..');
  const sourceManifestPath = path.join(root, 'assets/data/story_audio_manifest.json');
  const buildManifestPath = path.join(root, 'build/web/assets/data/story_audio_manifest.json');
  const storyArcPath = path.join(root, 'assets/data/story_arc.json');

  const EXPECTED_CAMPAIGNS = [
    'inky',
    'quillmaster',
    'word_knight',
    'rune_sorceress',
    'lexicon_alchemist',
    'shadow_lexicographer',
  ];

  it('both source and build manifests exist on disk', () => {
    expect(fs.existsSync(sourceManifestPath)).toBe(true);
    expect(fs.existsSync(buildManifestPath)).toBe(true);
  });

  it('both manifests contain exactly 600 entries across 6 hero campaigns with 100 entries each', () => {
    const sourceData = JSON.parse(fs.readFileSync(sourceManifestPath, 'utf-8'));
    const buildData = JSON.parse(fs.readFileSync(buildManifestPath, 'utf-8'));

    expect(Array.isArray(sourceData)).toBe(true);
    expect(Array.isArray(buildData)).toBe(true);
    expect(sourceData.length).toBe(600);
    expect(buildData.length).toBe(600);

    // Byte/content equality between source and build mirror
    expect(sourceData).toEqual(buildData);

    const campaignCounts: Record<string, number> = {};
    for (const entry of sourceData) {
      expect(entry).toHaveProperty('campaign');
      expect(entry).toHaveProperty('wave');
      expect(entry).toHaveProperty('beat');
      expect(entry).toHaveProperty('speaker');
      expect(entry).toHaveProperty('text');
      expect(entry).toHaveProperty('audio_url');

      expect(EXPECTED_CAMPAIGNS).toContain(entry.campaign);
      expect(entry.wave).toBeGreaterThanOrEqual(5);
      expect(entry.wave).toBeLessThanOrEqual(100);
      expect(entry.wave % 5).toBe(0);
      expect(entry.beat).toBeGreaterThanOrEqual(1);
      expect(entry.beat).toBeLessThanOrEqual(5);
      expect(typeof entry.speaker).toBe('string');
      expect(entry.speaker.length).toBeGreaterThan(0);
      expect(typeof entry.text).toBe('string');
      expect(entry.text.trim().length).toBeGreaterThan(0);
      expect(entry.audio_url).toMatch(/^assets\/audio\/dialogue\//);
      expect(entry.audio_url.endsWith('.mp3')).toBe(true);

      campaignCounts[entry.campaign] = (campaignCounts[entry.campaign] || 0) + 1;
    }

    expect(Object.keys(campaignCounts).sort()).toEqual([...EXPECTED_CAMPAIGNS].sort());
    for (const camp of EXPECTED_CAMPAIGNS) {
      expect(campaignCounts[camp], `Campaign ${camp} must have exactly 100 entries`).toBe(100);
    }
  });

  it('verbatim matching between story_arc.json and story_audio_manifest.json', () => {
    const arcData = JSON.parse(fs.readFileSync(storyArcPath, 'utf-8'));
    const manifest = JSON.parse(fs.readFileSync(sourceManifestPath, 'utf-8'));

    let manifestIdx = 0;
    for (const [charId, charData] of Object.entries<any>(arcData.characters || {})) {
      for (const episode of charData.episodes || []) {
        const wave = episode.wave;
        const beats = episode.beats || [];
        for (let bIdx = 0; bIdx < beats.length; bIdx++) {
          const beat = beats[bIdx];
          const beatNum = bIdx + 1;
          const entry = manifest[manifestIdx];

          expect(entry).toBeDefined();
          expect(entry.campaign).toBe(charId);
          expect(entry.wave).toBe(wave);
          expect(entry.beat).toBe(beatNum);
          expect(entry.speaker).toBe(beat[0]);
          expect(entry.text).toBe(beat[1]);

          manifestIdx++;
        }
      }
    }
    expect(manifestIdx).toBe(600);
    expect(manifest.length).toBe(600);
  });

  it('verifies all 600 referenced audio files exist and are non-empty in both source and build directories', () => {
    const manifest = JSON.parse(fs.readFileSync(sourceManifestPath, 'utf-8'));
    expect(manifest.length).toBe(600);

    for (const entry of manifest) {
      const sourceAudioPath = path.join(root, entry.audio_url);
      const buildAudioPath = path.join(root, 'build/web', entry.audio_url);

      expect(fs.existsSync(sourceAudioPath), `Missing source audio: ${entry.audio_url}`).toBe(true);
      expect(fs.existsSync(buildAudioPath), `Missing build audio: ${entry.audio_url}`).toBe(true);

      const sourceStat = fs.statSync(sourceAudioPath);
      const buildStat = fs.statSync(buildAudioPath);

      expect(sourceStat.size).toBeGreaterThan(1024);
      expect(buildStat.size).toBeGreaterThan(1024);
      expect(sourceStat.size).toBe(buildStat.size);
    }
  });
});

describe('SoundManager In-Game Audio Playback Integration (Milestone 2)', () => {
  const root = path.resolve(__dirname, '../..');
  const gameJsPath = path.join(root, 'build/web/game.js');
  const gameJsContent = fs.readFileSync(gameJsPath, 'utf-8');

  // Mock Audio element for Node VM sandbox
  class MockAudio {
    src: string;
    volume: number = 1.0;
    muted: boolean = false;
    paused: boolean = true;
    currentTime: number = 0;
    preload: string = '';
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    static instances: MockAudio[] = [];

    constructor(src?: string) {
      this.src = src || '';
      MockAudio.instances.push(this);
    }

    async play(): Promise<void> {
      this.paused = false;
      return Promise.resolve();
    }

    pause(): void {
      this.paused = true;
    }
  }

  function createSoundManagerInstance(initialSettings: Record<string, any> = {}) {
    const storageMap: Record<string, string> = {
      lexicon_granular_audio: JSON.stringify({
        masterVolume: 1.0,
        masterMuted: false,
        sfxVolume: 1.0,
        sfxMuted: false,
        bgmVolume: 1.0,
        bgmMuted: false,
        menuVolume: 1.0,
        menuMuted: false,
        ...initialSettings,
      }),
    };

    const mockStorage = {
      getItem: (k: string) => storageMap[k] ?? null,
      setItem: (k: string, v: string) => { storageMap[k] = String(v); },
      removeItem: (k: string) => { delete storageMap[k]; },
    };

    const smStartIndex = gameJsContent.indexOf('class SoundManager {');
    const smEndIndex = gameJsContent.indexOf('const sounds = new SoundManager();');
    if (smStartIndex < 0 || smEndIndex < 0) {
      throw new Error('Could not locate class SoundManager bounds in build/web/game.js');
    }
    const soundManagerCode = gameJsContent.slice(smStartIndex, smEndIndex).trim();

    const sandbox: Record<string, any> = {
      window: {},
      Audio: MockAudio,
      localStorage: mockStorage,
      console,
      setTimeout,
      clearTimeout,
      performance: { now: () => Date.now() },
    };

    vm.createContext(sandbox);
    vm.runInContext(`${soundManagerCode};\nwindow.SoundManager = SoundManager;`, sandbox);
    return new sandbox.window.SoundManager();
  }

  beforeEach(() => {
    MockAudio.instances = [];
  });

  afterEach(() => {
    soundEngine.stopDialogueVoice();
  });

  it('SoundManager.prototype.playDialogueVoice instantiates Audio, calculates volume, and starts playback', () => {
    const sm = createSoundManagerInstance({ masterVolume: 0.8, sfxVolume: 0.9 });
    const audioPath = 'assets/audio/dialogue/inky/voice_inky_w005_b1_boss_red_pen_boss.mp3';

    expect(typeof sm.playDialogueVoice).toBe('function');
    sm.playDialogueVoice(audioPath);

    expect(sm.activeDialogueVoice).not.toBeNull();
    expect(sm.activeDialogueVoice.src).toBe(audioPath);
    expect(sm.activeDialogueVoice.paused).toBe(false);
    expect(sm.activeDialogueVoice.volume).toBeCloseTo(0.72); // 0.8 * 0.9
  });

  it('advancing dialogue beats halts previous audio clip before starting next clip (zero-overlap)', () => {
    const sm = createSoundManagerInstance();
    const clip1 = 'assets/audio/dialogue/inky/voice_inky_w005_b1_boss_red_pen_boss.mp3';
    const clip2 = 'assets/audio/dialogue/inky/voice_inky_w005_b2_hero.mp3';

    sm.playDialogueVoice(clip1);
    const firstAudio = sm.activeDialogueVoice;
    expect(firstAudio).not.toBeNull();
    expect(firstAudio.src).toBe(clip1);
    expect(firstAudio.paused).toBe(false);

    // Advance to next dialogue beat
    sm.playDialogueVoice(clip2);
    const secondAudio = sm.activeDialogueVoice;

    // First audio clip MUST be stopped and rewound to 0
    expect(firstAudio.paused).toBe(true);
    expect(firstAudio.currentTime).toBe(0);

    // Second audio clip MUST be playing
    expect(secondAudio).not.toBeNull();
    expect(secondAudio.src).toBe(clip2);
    expect(secondAudio.paused).toBe(false);
    expect(secondAudio).not.toBe(firstAudio);
  });

  it('SoundManager.prototype.stopDialogueVoice pauses active audio, rewinds currentTime, and clears reference', () => {
    const sm = createSoundManagerInstance();
    const audioPath = 'assets/audio/dialogue/inky/voice_inky_w005_b1_boss_red_pen_boss.mp3';

    sm.playDialogueVoice(audioPath);
    const voiceRef = sm.activeDialogueVoice;
    expect(voiceRef).not.toBeNull();

    voiceRef.currentTime = 3.5;
    sm.stopDialogueVoice();

    expect(voiceRef.paused).toBe(true);
    expect(voiceRef.currentTime).toBe(0);
    expect(sm.activeDialogueVoice).toBeNull();
    expect(sm.dialoguePausedByMenu).toBe(false);
  });

  it('SoundManager.prototype.pauseDialogueVoice and resumeDialogueVoice correctly pause and restore active speech', () => {
    const sm = createSoundManagerInstance();
    const audioPath = 'assets/audio/dialogue/inky/voice_inky_w005_b1_boss_red_pen_boss.mp3';

    sm.playDialogueVoice(audioPath);
    expect(sm.activeDialogueVoice.paused).toBe(false);
    expect(sm.dialoguePausedByMenu).toBe(false);

    // Pause audio
    sm.pauseDialogueVoice();
    expect(sm.activeDialogueVoice.paused).toBe(true);
    expect(sm.dialoguePausedByMenu).toBe(true);

    // Resume audio
    sm.resumeDialogueVoice();
    expect(sm.activeDialogueVoice.paused).toBe(false);
    expect(sm.dialoguePausedByMenu).toBe(false);
  });

  it('volume scaling and muting respect masterVolume, sfxVolume, masterMuted, and sfxMuted', () => {
    // Scaled volume test
    const sm = createSoundManagerInstance({ masterVolume: 0.5, sfxVolume: 0.6 });
    sm.playDialogueVoice('assets/audio/dialogue/inky/voice_inky_w005_b1_boss_red_pen_boss.mp3');
    expect(sm.activeDialogueVoice.volume).toBeCloseTo(0.3); // 0.5 * 0.6

    // Master muted test
    const masterMutedSm = createSoundManagerInstance({ masterVolume: 1.0, masterMuted: true, sfxVolume: 1.0 });
    masterMutedSm.playDialogueVoice('assets/audio/dialogue/inky/voice_inky_w005_b1_boss_red_pen_boss.mp3');
    expect(masterMutedSm.activeDialogueVoice).toBeNull();

    // SFX muted test
    const sfxMutedSm = createSoundManagerInstance({ masterVolume: 1.0, sfxVolume: 1.0, sfxMuted: true });
    sfxMutedSm.playDialogueVoice('assets/audio/dialogue/inky/voice_inky_w005_b1_boss_red_pen_boss.mp3');
    expect(sfxMutedSm.activeDialogueVoice).toBeNull();
  });

  it('SoundManager.prototype.updateDialogueVolume dynamically adjusts volume and muted on active clip', () => {
    const sm = createSoundManagerInstance({ masterVolume: 1.0, sfxVolume: 0.8 });
    sm.playDialogueVoice('assets/audio/dialogue/inky/voice_inky_w005_b1_boss_red_pen_boss.mp3');
    expect(sm.activeDialogueVoice.volume).toBeCloseTo(0.8);

    sm.sfxVolume = 0.4;
    sm.updateDialogueVolume();
    expect(sm.activeDialogueVoice.volume).toBeCloseTo(0.4);

    sm.masterMuted = true;
    sm.updateDialogueVolume();
    expect(sm.activeDialogueVoice.muted).toBe(true);

    sm.masterMuted = false;
    sm.updateDialogueVolume();
    expect(sm.activeDialogueVoice.muted).toBe(false);
    expect(sm.activeDialogueVoice.volume).toBeCloseTo(0.4);
  });

  it('audio clip onended and onerror callbacks clean up activeDialogueVoice reference', () => {
    const sm = createSoundManagerInstance();
    sm.playDialogueVoice('assets/audio/dialogue/inky/voice_inky_w005_b1_boss_red_pen_boss.mp3');
    const audio = sm.activeDialogueVoice;
    expect(audio).not.toBeNull();

    // Trigger onended
    audio.onended();
    expect(sm.activeDialogueVoice).toBeNull();

    // Replay and trigger onerror
    sm.playDialogueVoice('assets/audio/dialogue/inky/voice_inky_w005_b2_hero.mp3');
    const audio2 = sm.activeDialogueVoice;
    expect(audio2).not.toBeNull();
    audio2.onerror();
    expect(sm.activeDialogueVoice).toBeNull();
  });

  it('renderStoryPanel audio path formulation matches canonical naming across characters and waves', () => {
    const arcData = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/story_arc.json'), 'utf-8'));
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/story_audio_manifest.json'), 'utf-8'));
    const manifestUrls = new Set(manifest.map((m: any) => m.audio_url));

    for (const [charId, charData] of Object.entries<any>(arcData.characters || {})) {
      for (const episode of charData.episodes || []) {
        for (let b = 0; b < episode.beats.length; b++) {
          const beat = episode.beats[b];
          const speakerId = beat[0];

          // Same formulation as renderStoryPanel in build/web/game.js
          const epWaveStr = String(episode.wave).padStart(3, '0');
          const beatNum = b + 1;
          const audioFile = `voice_${charId}_w${epWaveStr}_b${beatNum}_${speakerId}.mp3`;
          const expectedPath = `assets/audio/dialogue/${charId}/${audioFile}`;

          expect(manifestUrls.has(expectedPath), `Path ${expectedPath} should exist in manifest`).toBe(true);
        }
      }
    }
  });

  it('build/web/game.js contains all required SoundManager dialogue methods and lifecycle hooks', () => {
    // SoundManager API definitions
    expect(gameJsContent).toContain('playDialogueVoice(audioPath)');
    expect(gameJsContent).toContain('stopDialogueVoice()');
    expect(gameJsContent).toContain('pauseDialogueVoice()');
    expect(gameJsContent).toContain('resumeDialogueVoice()');
    expect(gameJsContent).toContain('updateDialogueVolume()');

    // renderStoryPanel trigger
    expect(gameJsContent).toMatch(/sounds\.playDialogueVoice\(/);

    // finishStoryIntermission & skipStoryIntermission stops
    expect(gameJsContent).toMatch(/sounds\.stopDialogueVoice\(\)/);

    // toggleGamePause pause / resume
    expect(gameJsContent).toMatch(/sounds\.pauseDialogueVoice\(\)/);
    expect(gameJsContent).toMatch(/sounds\.resumeDialogueVoice\(\)/);

    // returnToMainMenuFromPause stop
    expect(gameJsContent).toMatch(/returnToMainMenuFromPause[\s\S]*?sounds\.stopDialogueVoice\(\)/);

    // saveAudioSettings updates dialogue volume
    expect(gameJsContent).toMatch(/this\.updateDialogueVolume\(\)/);
  });
});

describe('React Application Story Dialogue Audio Parity (Milestone 2)', () => {
  const root = path.resolve(__dirname, '../..');

  it('ProceduralSoundEngine in src/lib/sound.ts implements dialogue voice methods with headless/SSR safety', () => {
    expect(typeof soundEngine.playDialogueVoice).toBe('function');
    expect(typeof soundEngine.stopDialogueVoice).toBe('function');
    expect(typeof soundEngine.pauseDialogueVoice).toBe('function');
    expect(typeof soundEngine.resumeDialogueVoice).toBe('function');
    expect(typeof soundEngine.updateDialogueVolume).toBe('function');
    expect(typeof soundEngine.getEffectiveDialogueVolume).toBe('function');

    // Headless / SSR safety: should not throw in Node environment
    expect(() => {
      soundEngine.playDialogueVoice('assets/audio/dialogue/inky/voice_inky_w005_b1_boss_red_pen_boss.mp3');
      soundEngine.pauseDialogueVoice();
      soundEngine.resumeDialogueVoice();
      soundEngine.updateDialogueVolume();
      soundEngine.stopDialogueVoice();
    }).not.toThrow();
  });

  it('ProceduralSoundEngine calculates effective dialogue volume adhering to master and SFX controls', () => {
    soundEngine.setMasterVolume(0.8);
    soundEngine.setSfxVolume(0.9);
    soundEngine.setMuted(false);
    soundEngine.setSfxMuted(false);

    expect(soundEngine.getEffectiveDialogueVolume()).toBeCloseTo(0.72);

    soundEngine.setSfxMuted(true);
    expect(soundEngine.getEffectiveDialogueVolume()).toBe(0);

    soundEngine.setSfxMuted(false);
    soundEngine.setMuted(true);
    expect(soundEngine.getEffectiveDialogueVolume()).toBe(0);

    // Reset to defaults
    soundEngine.setMuted(false);
    soundEngine.setMasterVolume(0.8);
    soundEngine.setSfxVolume(0.8);
  });

  it('StoryMilestoneModal.tsx integrates dialogue voice playback on beat render and unmount cleanup', () => {
    const modalPath = path.join(root, 'src/game/story/StoryMilestoneModal.tsx');
    const modalContent = fs.readFileSync(modalPath, 'utf-8');

    expect(modalContent).toContain('resolveDialogueAudioPath');
    expect(modalContent).toMatch(/soundEngine\.playDialogueVoice/);
    expect(modalContent).toMatch(/soundEngine\.stopDialogueVoice/);
  });

  it('silences legacy story background music, chapter chimes, and beat advance tones so only character dialogue voices play', () => {
    const gameJsPath = path.join(root, 'build/web/game.js');
    const gameJsContent = fs.readFileSync(gameJsPath, 'utf-8');
    const showIntermissionBlock = gameJsContent.match(/function showStoryIntermission\(wave\)\s*\{[\s\S]*?\n\}/)?.[0] || '';
    const closeIntermissionBlock = gameJsContent.match(/function closeStoryIntermission\(\)\s*\{[\s\S]*?\n\}/)?.[0] || '';

    expect(showIntermissionBlock).toContain('bgm.stop()');
    expect(showIntermissionBlock).not.toContain('bgm.setMode(episode.music)');
    expect(showIntermissionBlock).not.toContain('bgm.playChapterChime()');
    expect(closeIntermissionBlock).not.toContain('sounds.playTone(540 + storyPanelIndex * 34');
  });
});

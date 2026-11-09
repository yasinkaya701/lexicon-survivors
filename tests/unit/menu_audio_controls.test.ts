import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';
import { soundEngine, ProceduralSoundEngine } from '@/lib/sound';

describe('Granular Audio Controls & Menu Navigation Suite', () => {
  it('manages granular volume clamping and mute state across all channels', () => {
    // 1. SFX channel
    soundEngine.setSfxVolume(0.4);
    assert.equal(soundEngine.sfxVolume, 0.4);
    soundEngine.setSfxVolume(1.5);
    assert.equal(soundEngine.sfxVolume, 1.0);
    soundEngine.setSfxVolume(-0.2);
    assert.equal(soundEngine.sfxVolume, 0.0);

    soundEngine.setSfxMuted(true);
    assert.equal(soundEngine.sfxMuted, true);
    const sfxToggled = soundEngine.toggleSfxMute();
    assert.equal(sfxToggled, false);
    assert.equal(soundEngine.sfxMuted, false);

    // 2. BGM channel
    soundEngine.setBgmVolume(0.6);
    assert.equal(soundEngine.bgmVolume, 0.6);
    soundEngine.setBgmVolume(2.0);
    assert.equal(soundEngine.bgmVolume, 1.0);
    soundEngine.setBgmVolume(-1.0);
    assert.equal(soundEngine.bgmVolume, 0.0);

    soundEngine.setBgmMuted(true);
    assert.equal(soundEngine.bgmMuted, true);
    const bgmToggled = soundEngine.toggleBgmMute();
    assert.equal(bgmToggled, false);
    assert.equal(soundEngine.bgmMuted, false);

    // 3. Menu / UI channel
    soundEngine.setMenuVolume(0.7);
    assert.equal(soundEngine.menuVolume, 0.7);
    soundEngine.setMenuVolume(1.2);
    assert.equal(soundEngine.menuVolume, 1.0);
    soundEngine.setMenuVolume(-0.5);
    assert.equal(soundEngine.menuVolume, 0.0);

    soundEngine.setMenuMuted(true);
    assert.equal(soundEngine.menuMuted, true);
    const menuToggled = soundEngine.toggleMenuMute();
    assert.equal(menuToggled, false);
    assert.equal(soundEngine.menuMuted, false);

    // 4. Master channel
    soundEngine.setMasterVolume(0.85);
    assert.equal(soundEngine.masterVolume, 0.85);
    soundEngine.setMuted(true);
    assert.equal(soundEngine.isMuted, true);
    soundEngine.setMuted(false);
    assert.equal(soundEngine.isMuted, false);
  });

  it('serializes and restores granular audio settings batch correctly', () => {
    const customSettings = {
      masterVolume: 0.65,
      isMuted: false,
      sfxVolume: 0.55,
      sfxMuted: true,
      bgmVolume: 0.45,
      bgmMuted: false,
      menuVolume: 0.75,
      menuMuted: true,
    };

    soundEngine.setAudioSettings(customSettings);
    const retrieved = soundEngine.getAudioSettings();

    assert.equal(retrieved.masterVolume, 0.65);
    assert.equal(retrieved.isMuted, false);
    assert.equal(retrieved.sfxVolume, 0.55);
    assert.equal(retrieved.sfxMuted, true);
    assert.equal(retrieved.bgmVolume, 0.45);
    assert.equal(retrieved.bgmMuted, false);
    assert.equal(retrieved.menuVolume, 0.75);
    assert.equal(retrieved.menuMuted, true);

    // Restore standard defaults
    soundEngine.setAudioSettings({
      masterVolume: 0.8,
      isMuted: false,
      sfxVolume: 0.8,
      sfxMuted: false,
      bgmVolume: 0.5,
      bgmMuted: false,
      menuVolume: 0.8,
      menuMuted: false,
    });
  });

  it('safely starts and stops combat BGM loop without runtime errors', () => {
    assert.equal(typeof soundEngine.startCombatBgm, 'function');
    assert.equal(typeof soundEngine.stopCombatBgm, 'function');

    assert.doesNotThrow(() => {
      soundEngine.startCombatBgm();
      soundEngine.stopCombatBgm();
    });
  });

  it('safely plays UI sounds (click, toggle) without runtime errors', () => {
    assert.equal(typeof soundEngine.playMenuClick, 'function');
    assert.equal(typeof soundEngine.playMenuToggle, 'function');

    assert.doesNotThrow(() => {
      soundEngine.playMenuClick();
      soundEngine.playMenuToggle();
    });
  });

  it('verifies settings components exist and export required interfaces', () => {
    const settingsDir = path.resolve(__dirname, '../../src/game/settings');
    assert.ok(fs.existsSync(settingsDir), 'src/game/settings directory must exist');

    const indexFile = path.join(settingsDir, 'index.ts');
    assert.ok(fs.existsSync(indexFile), 'src/game/settings/index.ts must exist');
    const indexContent = fs.readFileSync(indexFile, 'utf-8');
    assert.ok(indexContent.includes("export * from './AudioSettingsControl'"));
    assert.ok(indexContent.includes("export * from './AudioSettingsModal'"));
    assert.ok(indexContent.includes("export * from './PauseSettingsModal'"));

    const controlFile = path.join(settingsDir, 'AudioSettingsControl.tsx');
    assert.ok(fs.existsSync(controlFile), 'AudioSettingsControl.tsx must exist');
    const controlContent = fs.readFileSync(controlFile, 'utf-8');
    assert.ok(controlContent.includes('export const AudioSettingsControl'));
    assert.ok(controlContent.includes('handleToggleMasterMute'));
    assert.ok(controlContent.includes('handleToggleSfxMute'));
    assert.ok(controlContent.includes('handleToggleBgmMute'));
    assert.ok(controlContent.includes('handleToggleMenuMute'));

    const pauseFile = path.join(settingsDir, 'PauseSettingsModal.tsx');
    assert.ok(fs.existsSync(pauseFile), 'PauseSettingsModal.tsx must exist');
    const pauseContent = fs.readFileSync(pauseFile, 'utf-8');
    assert.ok(pauseContent.includes('export const PauseSettingsModal'));
    assert.ok(pauseContent.includes('data-testid="pause-resume-button"'));
    assert.ok(pauseContent.includes('data-testid="pause-return-to-main-menu"'));
    assert.ok(pauseContent.includes('AudioSettingsControl'));
  });

  it('verifies return-to-main-menu buttons exist in Game Over, Victory, and Pause screens', () => {
    const pageFile = path.resolve(__dirname, '../../src/app/page.tsx');
    const pageContent = fs.readFileSync(pageFile, 'utf-8');

    // Return to main menu on Game Over
    assert.ok(
      pageContent.includes('data-testid="return-to-main-menu-gameover"'),
      'Game over screen must include return-to-main-menu button'
    );

    // Return to main menu on Victory
    assert.ok(
      pageContent.includes('data-testid="return-to-main-menu-victory"'),
      'Victory screen must include return-to-main-menu button'
    );

    // Main menu / hub audio settings button
    assert.ok(
      pageContent.includes('data-testid="hub-audio-settings-button"'),
      'Hub navigation header must include audio settings button'
    );

    // Pause button in HUD
    const hudFile = path.resolve(__dirname, '../../src/components/HUD.tsx');
    const hudContent = fs.readFileSync(hudFile, 'utf-8');
    assert.ok(
      hudContent.includes('data-testid="hud-pause-button"'),
      'HUD must provide pause button'
    );

    // GameCanvas pause modal wiring
    const canvasFile = path.resolve(__dirname, '../../src/components/GameCanvas.tsx');
    const canvasContent = fs.readFileSync(canvasFile, 'utf-8');
    assert.ok(
      canvasContent.includes('isPaused'),
      'GameCanvas must manage pause state'
    );
    assert.ok(
      canvasContent.includes('PauseSettingsModal'),
      'GameCanvas must mount PauseSettingsModal'
    );
    assert.ok(
      canvasContent.includes('onReturnToMainMenu'),
      'GameCanvas must wire return to main menu callback'
    );
    assert.ok(
      canvasContent.includes('isScreenShakeEnabledRef.current'),
      'GameCanvas must respect isScreenShakeEnabledRef in render loop'
    );
    assert.ok(
      canvasContent.includes('isDamageNumbersEnabledRef.current'),
      'GameCanvas must respect isDamageNumbersEnabledRef before spawning damage numbers'
    );
    assert.ok(
      canvasContent.includes('isTacticalFreezeRef.current'),
      'GameCanvas must use isTacticalFreezeRef to avoid stale closures'
    );
  });

  it('guarantees clean initial RPG stats reset on return-to-hub and run start', () => {
    const pageFile = path.resolve(__dirname, '../../src/app/page.tsx');
    const pageContent = fs.readFileSync(pageFile, 'utf-8');

    // Verify DEFAULT_INITIAL_STATS schema exists and is used in resets
    assert.ok(
      pageContent.includes('DEFAULT_INITIAL_STATS'),
      'Page must define DEFAULT_INITIAL_STATS to prevent residual stat bleed'
    );

    // Verify handleReturnToHub resets to DEFAULT_INITIAL_STATS
    assert.ok(
      pageContent.includes('...DEFAULT_INITIAL_STATS'),
      'handleReturnToHub and handleStartRun must spread DEFAULT_INITIAL_STATS'
    );

    // Verify residual state wipe: materials, currentWave, activeWeapons, shopSlots
    assert.ok(pageContent.includes('setCurrentWave(1)'));
    assert.ok(pageContent.includes('setRunMaterials(0)'));
    assert.ok(pageContent.includes('setActiveWeapons([null, null, null, null, null, null])'));
    assert.ok(pageContent.includes('setShopSlots([null, null, null, null])'));
  });

  it('synchronizes soundEngine enabled and muted states when unmuting', () => {
    soundEngine.enabled = false;
    soundEngine.setMuted(true);
    assert.equal(soundEngine.isMuted, true);
    assert.equal(soundEngine.enabled, false);

    // Unmuting should automatically restore enabled flag
    soundEngine.setMuted(false);
    assert.equal(soundEngine.isMuted, false);
    assert.equal(soundEngine.enabled, true);
  });

  it('verifies Godot main menu button exists in scene and connects to reset handler', () => {
    const tscnFile = path.resolve(__dirname, '../../scenes/main.tscn');
    assert.ok(fs.existsSync(tscnFile), 'Godot main.tscn must exist');
    const tscnContent = fs.readFileSync(tscnFile, 'utf-8');
    assert.ok(
      tscnContent.includes('[node name="MainMenuButton" type="Button" parent="GameOverLayer/GameOverPanel"]'),
      'main.tscn GameOverPanel must contain MainMenuButton'
    );

    const gdFile = path.resolve(__dirname, '../../scripts/main.gd');
    assert.ok(fs.existsSync(gdFile), 'Godot main.gd must exist');
    const gdContent = fs.readFileSync(gdFile, 'utf-8');
    assert.ok(
      gdContent.includes('main_menu_button.pressed.connect(_on_main_menu_pressed)'),
      'main.gd must connect main_menu_button to _on_main_menu_pressed'
    );
    assert.ok(
      gdContent.includes('func _on_main_menu_pressed():'),
      'main.gd must implement _on_main_menu_pressed'
    );
    assert.ok(
      gdContent.includes('StatsManager.reset()'),
      '_on_main_menu_pressed must reset StatsManager data'
    );
  });

  it('notifies subscribers reactively upon any audio setting change', () => {
    let callCount = 0;
    let lastMuted: boolean | undefined = undefined;
    const unsub = soundEngine.subscribe((settings) => {
      callCount++;
      lastMuted = settings.isMuted;
    });

    soundEngine.setMuted(true);
    assert.equal(lastMuted, true);
    assert.ok(callCount >= 1);

    soundEngine.setMuted(false);
    assert.equal(lastMuted, false);

    unsub();
    const countAfterUnsub = callCount;
    soundEngine.setMasterVolume(0.7);
    assert.equal(callCount, countAfterUnsub);
  });

  it('plays BGM preview without starting or stopping the combat BGM loop', () => {
    soundEngine.stopCombatBgm();
    assert.equal(soundEngine.isBgmPlaying, false);

    // Preview should NOT alter isBgmPlaying
    soundEngine.playBgmPreview();
    assert.equal(soundEngine.isBgmPlaying, false);

    // When combat BGM is already running, preview should NOT stop it
    soundEngine.startCombatBgm();
    soundEngine.playBgmPreview();
    soundEngine.stopCombatBgm();
    assert.equal(soundEngine.isBgmPlaying, false);
  });

  it('verifies waveCompleteTimeoutRef in GameCanvas prevents post-unmount transitions', () => {
    const canvasFile = path.resolve(__dirname, '../../src/components/GameCanvas.tsx');
    const canvasContent = fs.readFileSync(canvasFile, 'utf-8');
    assert.ok(
      canvasContent.includes('waveCompleteTimeoutRef'),
      'GameCanvas must declare waveCompleteTimeoutRef'
    );
    assert.ok(
      canvasContent.includes('clearTimeout(waveCompleteTimeoutRef.current)'),
      'GameCanvas must clear waveCompleteTimeoutRef in cleanup & pause exit'
    );
  });

  it('verifies Return-to-Main-Menu button is available in the ShopModal', () => {
    const shopFile = path.resolve(__dirname, '../../src/components/ShopModal.tsx');
    const shopContent = fs.readFileSync(shopFile, 'utf-8');
    assert.ok(
      shopContent.includes('data-testid="return-to-main-menu-shop"'),
      'ShopModal must provide return-to-main-menu button'
    );

    const pageFile = path.resolve(__dirname, '../../src/app/page.tsx');
    const pageContent = fs.readFileSync(pageFile, 'utf-8');
    assert.ok(
      pageContent.includes('onReturnToMenu={handleReturnToHub}'),
      'page.tsx must pass handleReturnToHub to ShopModal'
    );
  });

  it('handles adversarial non-finite inputs, NaN, and corrupted batch settings gracefully', () => {
    // 1. NaN and non-finite tests
    soundEngine.setMasterVolume(0.8);
    soundEngine.setMasterVolume(NaN);
    assert.equal(soundEngine.masterVolume, 0.8, 'NaN should retain current master volume');
    assert.ok(Number.isFinite(soundEngine.masterVolume));

    soundEngine.setMasterVolume(Infinity);
    assert.equal(soundEngine.masterVolume, 1.0, 'Infinity should clamp to 1.0');

    soundEngine.setMasterVolume(-Infinity);
    assert.equal(soundEngine.masterVolume, 0.0, '-Infinity should clamp to 0.0');

    // SFX
    soundEngine.setSfxVolume(0.7);
    soundEngine.setSfxVolume(NaN);
    assert.equal(soundEngine.sfxVolume, 0.7);

    // BGM
    soundEngine.setBgmVolume(0.6);
    soundEngine.setBgmVolume(NaN);
    assert.equal(soundEngine.bgmVolume, 0.6);

    // Menu
    soundEngine.setMenuVolume(0.5);
    soundEngine.setMenuVolume(NaN);
    assert.equal(soundEngine.menuVolume, 0.5);

    // 2. Corrupted batch settings
    assert.doesNotThrow(() => {
      soundEngine.setAudioSettings(null as any);
      soundEngine.setAudioSettings(undefined as any);
      soundEngine.setAudioSettings({
        masterVolume: NaN,
        sfxVolume: Infinity,
        bgmVolume: -Infinity,
        menuVolume: NaN,
      });
    });

    const settings = soundEngine.getAudioSettings();
    assert.ok(Number.isFinite(settings.masterVolume));
    assert.ok(Number.isFinite(settings.sfxVolume));
    assert.ok(Number.isFinite(settings.bgmVolume));
    assert.ok(Number.isFinite(settings.menuVolume));
    assert.equal(settings.sfxVolume, 1.0);
    assert.equal(settings.bgmVolume, 0.0);
  });

  it('guarantees bi-directional sync between soundEngine.enabled and soundEngine.isMuted', () => {
    let notifiedMuted: boolean | undefined = undefined;
    const unsub = soundEngine.subscribe((s) => {
      notifiedMuted = s.isMuted;
    });

    // Setting enabled = false sets isMuted = true
    soundEngine.enabled = false;
    assert.equal(soundEngine.enabled, false);
    assert.equal(soundEngine.isMuted, true);
    assert.equal(notifiedMuted, true);

    // Setting enabled = true sets isMuted = false
    soundEngine.enabled = true;
    assert.equal(soundEngine.enabled, true);
    assert.equal(soundEngine.isMuted, false);
    assert.equal(notifiedMuted, false);

    // Setting setMuted(true) sets enabled = false
    soundEngine.setMuted(true);
    assert.equal(soundEngine.enabled, false);
    assert.equal(soundEngine.isMuted, true);

    // Setting setMuted(false) sets enabled = true
    soundEngine.setMuted(false);
    assert.equal(soundEngine.enabled, true);
    assert.equal(soundEngine.isMuted, false);

    unsub();
  });

  it('verifies combat BGM pauses on mid-run pause and resumes on resume in GameCanvas', () => {
    const canvasFile = path.resolve(__dirname, '../../src/components/GameCanvas.tsx');
    const canvasContent = fs.readFileSync(canvasFile, 'utf-8');

    // Verify handlePause stops combat BGM
    assert.ok(
      canvasContent.includes('soundEngine.stopCombatBgm()'),
      'GameCanvas must stop combat BGM on pause and exit'
    );

    // Verify handleResume resumes combat BGM
    assert.ok(
      canvasContent.includes('soundEngine.startCombatBgm()'),
      'GameCanvas must restart combat BGM on resume'
    );
  });

  it('verifies setKilyosStormAmbient safely silences even when BGM bus is muted', () => {
    soundEngine.setBgmMuted(true);
    assert.doesNotThrow(() => {
      soundEngine.setKilyosStormAmbient(false);
    });
    soundEngine.setBgmMuted(false);
  });
});

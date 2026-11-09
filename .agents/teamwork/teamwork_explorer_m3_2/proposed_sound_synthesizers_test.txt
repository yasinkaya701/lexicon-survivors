import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { soundEngine, ProceduralSoundEngine } from '@/lib/sound';

describe('Web Audio Synthesizer Suite (Features 72-74)', () => {
  it('instantiates the sound engine singleton and default states', () => {
    assert.ok(soundEngine);
    assert.ok(soundEngine instanceof ProceduralSoundEngine);
    assert.equal(soundEngine.enabled, true);
    assert.equal(soundEngine.masterVolume, 0.8);
    assert.equal(soundEngine.isMuted, false);
  });

  it('handles volume clamping and muting mechanics', () => {
    soundEngine.setMasterVolume(0.5);
    assert.equal(soundEngine.masterVolume, 0.5);
    soundEngine.setMasterVolume(1.8);
    assert.equal(soundEngine.masterVolume, 1.0);
    soundEngine.setMasterVolume(-0.4);
    assert.equal(soundEngine.masterVolume, 0.0);

    // Mute toggle
    soundEngine.setMuted(true);
    assert.equal(soundEngine.isMuted, true);
    const toggled = soundEngine.toggleMute();
    assert.equal(toggled, false);
    assert.equal(soundEngine.isMuted, false);

    // Reset volume
    soundEngine.setMasterVolume(0.8);
  });

  it('Feature 72: exposes all 12 procedural sound synthesizers', () => {
    const requiredSynths = [
      'playPistolShot',
      'playShotgunShot',
      'playSMGShot',
      'playMagicCast',
      'playMeleeSwing',
      'playEnemyHit',
      'playEnemyDeath',
      'playPlayerHurt',
      'playDodge',
      'playGemPickup',
      'playWaveComplete',
      'playTacticalFreeze',
    ] as const;

    for (const synth of requiredSynths) {
      assert.equal(
        typeof (soundEngine as any)[synth],
        'function',
        `Synthesizer ${synth} must be implemented`
      );
      // Safe execution in headless/SSR test environment
      assert.doesNotThrow(() => {
        (soundEngine as any)[synth]();
      });
    }
  });

  it('Feature 73: exposes combat sound triggers and aliases', () => {
    assert.equal(typeof soundEngine.playShotgunBlast, 'function');
    assert.equal(typeof soundEngine.playSmgShot, 'function');
    assert.equal(typeof soundEngine.playEnemyHurt, 'function');
    assert.equal(typeof soundEngine.playPickupMaterial, 'function');
    assert.equal(typeof soundEngine.playVictoryFanfare, 'function');

    assert.doesNotThrow(() => {
      soundEngine.playShotgunBlast();
      soundEngine.playSmgShot();
      soundEngine.playEnemyHurt();
      soundEngine.playPickupMaterial(3);
      soundEngine.playVictoryFanfare();
    });
  });

  it('Feature 74: exposes tactical superpowers and educational triggers', () => {
    assert.equal(typeof soundEngine.playQuestionCorrect, 'function');
    assert.equal(typeof soundEngine.playQuestionWrong, 'function');
    assert.equal(typeof soundEngine.playNukeDetonation, 'function');

    assert.doesNotThrow(() => {
      soundEngine.playQuestionCorrect();
      soundEngine.playQuestionWrong();
      soundEngine.playNukeDetonation();
    });
  });

  it('preserves legacy sound triggers and ambient storm loop', () => {
    assert.equal(typeof soundEngine.playHit, 'function');
    assert.equal(typeof soundEngine.playComboUp, 'function');
    assert.equal(typeof soundEngine.playOrbitalLaser, 'function');
    assert.equal(typeof soundEngine.playShieldBreak, 'function');
    assert.equal(typeof soundEngine.playWrongBuzz, 'function');
    assert.equal(typeof soundEngine.playCashRegister, 'function');
    assert.equal(typeof soundEngine.setKilyosStormAmbient, 'function');

    assert.doesNotThrow(() => {
      soundEngine.playHit();
      soundEngine.playComboUp(2);
      soundEngine.playOrbitalLaser();
      soundEngine.playShieldBreak();
      soundEngine.playWrongBuzz();
      soundEngine.playCashRegister();
      soundEngine.setKilyosStormAmbient(true);
      soundEngine.setKilyosStormAmbient(false);
    });
  });
});

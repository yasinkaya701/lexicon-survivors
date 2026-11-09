import assert from 'node:assert/strict';
import { soundEngine, ProceduralSoundEngine } from './proposed_sound';

console.log('Testing proposed_sound.ts instantiation and headless safety...');

// 1. Instance check
assert.ok(soundEngine instanceof ProceduralSoundEngine, 'soundEngine should be instance of ProceduralSoundEngine');
assert.equal(soundEngine.enabled, true, 'soundEngine.enabled should default to true');
assert.equal(soundEngine.masterVolume, 0.8, 'soundEngine.masterVolume should default to 0.8');
assert.equal(soundEngine.isMuted, false, 'soundEngine.isMuted should default to false');

// 2. Volume & Mute mutation
soundEngine.setMasterVolume(0.5);
assert.equal(soundEngine.masterVolume, 0.5, 'setMasterVolume should clamp and update');
soundEngine.setMasterVolume(1.5);
assert.equal(soundEngine.masterVolume, 1.0, 'setMasterVolume should clamp to 1.0 max');
soundEngine.setMasterVolume(-0.5);
assert.equal(soundEngine.masterVolume, 0.0, 'setMasterVolume should clamp to 0.0 min');

soundEngine.setMuted(true);
assert.equal(soundEngine.isMuted, true);
assert.equal(soundEngine.toggleMute(), false);
assert.equal(soundEngine.isMuted, false);

// 3. Verify all 12 synthesizers exist as callable functions
const synths: Array<keyof ProceduralSoundEngine> = [
  'playPistolShot',
  'playShotgunShot',
  'playShotgunBlast',
  'playSMGShot',
  'playSmgShot',
  'playMagicCast',
  'playMeleeSwing',
  'playEnemyHit',
  'playEnemyHurt',
  'playEnemyDeath',
  'playPlayerHurt',
  'playDodge',
  'playGemPickup',
  'playPickupMaterial',
  'playWaveComplete',
  'playVictoryFanfare',
  'playTacticalFreeze',
  'playQuestionCorrect',
  'playQuestionWrong',
  'playNukeDetonation',
  'playHit',
  'playComboUp',
  'playOrbitalLaser',
  'playShieldBreak',
  'playWrongBuzz',
  'playCashRegister',
  'setKilyosStormAmbient',
  'initOnUserGesture',
];

for (const name of synths) {
  assert.equal(typeof (soundEngine as any)[name], 'function', `Method ${name} must be a function`);
  // Calling headless should be safe (no exceptions thrown)
  assert.doesNotThrow(() => {
    if (name === 'playComboUp' || name === 'playGemPickup' || name === 'playPickupMaterial') {
      (soundEngine as any)[name](1);
    } else if (name === 'setKilyosStormAmbient') {
      (soundEngine as any)[name](true);
      (soundEngine as any)[name](false);
    } else {
      (soundEngine as any)[name]();
    }
  }, `Method ${name} should execute safely in headless environment`);
}

console.log('✅ All 12 Synthesizers + Tactical/Legacy methods verified successfully in headless environment!');

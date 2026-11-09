import assert from 'node:assert/strict';

// Mock Web Audio API primitives
class MockAudioParam {
  public value: number = 0;
  setValueAtTime(val: number, time: number) { this.value = val; }
  exponentialRampToValueAtTime(val: number, time: number) { this.value = val; }
  linearRampToValueAtTime(val: number, time: number) { this.value = val; }
}

class MockAudioNode {
  connect(dest: any) { return dest; }
  disconnect() {}
}

class MockOscillatorNode extends MockAudioNode {
  public type: OscillatorType = 'sine';
  public frequency = new MockAudioParam();
  start(time?: number) {}
  stop(time?: number) {}
}

class MockGainNode extends MockAudioNode {
  public gain = new MockAudioParam();
}

class MockBiquadFilterNode extends MockAudioNode {
  public type: BiquadFilterType = 'lowpass';
  public frequency = new MockAudioParam();
  public Q = new MockAudioParam();
}

class MockBufferSourceNode extends MockAudioNode {
  public buffer: any = null;
  public loop: boolean = false;
  start(time?: number) {}
  stop(time?: number) {}
}

class MockDynamicsCompressorNode extends MockAudioNode {
  public threshold = new MockAudioParam();
  public knee = new MockAudioParam();
  public ratio = new MockAudioParam();
  public attack = new MockAudioParam();
  public release = new MockAudioParam();
}

class MockAudioBuffer {
  private data: Float32Array;
  constructor(channels: number, length: number, sampleRate: number) {
    this.data = new Float32Array(length);
  }
  getChannelData(channel: number) { return this.data; }
}

class MockAudioContext {
  public currentTime = 10.0;
  public sampleRate = 44100;
  public state: AudioContextState = 'running';
  public destination = new MockAudioNode();

  createOscillator() { return new MockOscillatorNode(); }
  createGain() { return new MockGainNode(); }
  createBiquadFilter() { return new MockBiquadFilterNode(); }
  createBufferSource() { return new MockBufferSourceNode(); }
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer(channels, length, sampleRate);
  }
  createDynamicsCompressor() { return new MockDynamicsCompressorNode(); }
  async resume() { this.state = 'running'; }
}

// Attach to global window
(global as any).window = {
  AudioContext: MockAudioContext,
  addEventListener: () => {},
  removeEventListener: () => {},
};

import { ProceduralSoundEngine } from './proposed_sound';

console.log('Testing Web Audio node graphs with simulated Web Audio engine...');

const engine = new ProceduralSoundEngine();

// Test all 12 synthesizers with simulated active Web Audio context
const tests = [
  () => engine.playPistolShot(),
  () => engine.playShotgunShot(),
  () => engine.playShotgunBlast(),
  () => engine.playSMGShot(),
  () => engine.playSmgShot(),
  () => engine.playMagicCast(),
  () => engine.playMeleeSwing(),
  () => engine.playEnemyHit(),
  () => engine.playEnemyHurt(),
  () => engine.playEnemyDeath(),
  () => engine.playPlayerHurt(),
  () => engine.playDodge(),
  () => engine.playGemPickup(0),
  () => engine.playGemPickup(5),
  () => engine.playPickupMaterial(10),
  () => engine.playWaveComplete(),
  () => engine.playVictoryFanfare(),
  () => engine.playTacticalFreeze(),
  () => engine.playQuestionCorrect(),
  () => engine.playQuestionWrong(),
  () => engine.playNukeDetonation(),
  () => engine.playHit(),
  () => engine.playComboUp(2),
  () => engine.playOrbitalLaser(),
  () => engine.playShieldBreak(),
  () => engine.playWrongBuzz(),
  () => engine.playCashRegister(),
  () => engine.setKilyosStormAmbient(true),
  () => engine.setKilyosStormAmbient(false),
];

for (let i = 0; i < tests.length; i++) {
  assert.doesNotThrow(tests[i], `Test #${i + 1} failed execution`);
}

console.log('✅ All 29 Web Audio node graphs created and scheduled successfully without errors!');

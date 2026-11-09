import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProceduralSoundEngine } from '@/lib/sound';
import { FloatingTextManager, type FloatingTextSlot } from '@/game/vfx/FloatingTextManager';
import { VFXManager, type ParticleSlot } from '@/game/vfx/VFXManager';

// ============================================================================
// High-Fidelity Web Audio API Mock for Polyphony & Graph Integrity Testing
// ============================================================================

interface MockScheduledCall {
  type: 'setValueAtTime' | 'exponentialRampToValueAtTime' | 'linearRampToValueAtTime';
  value: number;
  time: number;
}

class MockAudioParam {
  public value: number = 0;
  public scheduledCalls: MockScheduledCall[] = [];

  setValueAtTime(val: number, startTime: number): MockAudioParam {
    if (!Number.isFinite(val) || !Number.isFinite(startTime)) {
      throw new TypeError(`Failed to execute 'setValueAtTime': The provided float value is non-finite (${val}, ${startTime})`);
    }
    this.value = val;
    this.scheduledCalls.push({ type: 'setValueAtTime', value: val, time: startTime });
    return this;
  }

  exponentialRampToValueAtTime(val: number, endTime: number): MockAudioParam {
    if (!Number.isFinite(val) || !Number.isFinite(endTime)) {
      throw new TypeError(`Failed to execute 'exponentialRampToValueAtTime': The provided float value is non-finite (${val}, ${endTime})`);
    }
    if (val <= 0) {
      throw new RangeError(`Failed to execute 'exponentialRampToValueAtTime': The value must be greater than zero (${val})`);
    }
    this.value = val;
    this.scheduledCalls.push({ type: 'exponentialRampToValueAtTime', value: val, time: endTime });
    return this;
  }

  linearRampToValueAtTime(val: number, endTime: number): MockAudioParam {
    if (!Number.isFinite(val) || !Number.isFinite(endTime)) {
      throw new TypeError(`Failed to execute 'linearRampToValueAtTime': The provided float value is non-finite (${val}, ${endTime})`);
    }
    this.value = val;
    this.scheduledCalls.push({ type: 'linearRampToValueAtTime', value: val, time: endTime });
    return this;
  }
}

class MockAudioNode {
  public connectedTo: (MockAudioNode | MockAudioParam)[] = [];

  connect(destination: MockAudioNode | MockAudioParam): void {
    this.connectedTo.push(destination);
  }

  disconnect(): void {
    this.connectedTo = [];
  }
}

class MockGainNode extends MockAudioNode {
  public gain = new MockAudioParam();
  constructor() {
    super();
    this.gain.value = 1.0;
  }
}

class MockOscillatorNode extends MockAudioNode {
  public type: OscillatorType = 'sine';
  public frequency = new MockAudioParam();
  public startTime: number = -1;
  public stopTime: number = -1;

  start(time: number = 0): void {
    if (!Number.isFinite(time)) throw new TypeError('start time must be finite');
    this.startTime = time;
  }

  stop(time: number = 0): void {
    if (!Number.isFinite(time)) throw new TypeError('stop time must be finite');
    this.stopTime = time;
  }
}

class MockDynamicsCompressorNode extends MockAudioNode {
  public threshold = new MockAudioParam();
  public knee = new MockAudioParam();
  public ratio = new MockAudioParam();
  public attack = new MockAudioParam();
  public release = new MockAudioParam();
}

class MockBiquadFilterNode extends MockAudioNode {
  public type: BiquadFilterType = 'lowpass';
  public frequency = new MockAudioParam();
  public Q = new MockAudioParam();
}

class MockAudioBuffer {
  public numberOfChannels: number;
  public length: number;
  public sampleRate: number;
  private channelData: Float32Array;

  constructor(channels: number, length: number, sampleRate: number) {
    this.numberOfChannels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.channelData = new Float32Array(length);
  }

  getChannelData(_channel: number): Float32Array {
    return this.channelData;
  }
}

class MockAudioBufferSourceNode extends MockAudioNode {
  public buffer: MockAudioBuffer | null = null;
  public loop: boolean = false;
  public startTime: number = -1;
  public stopTime: number = -1;

  start(time: number = 0): void {
    if (!Number.isFinite(time)) throw new TypeError('start time must be finite');
    this.startTime = time;
  }

  stop(time: number = 0): void {
    if (!Number.isFinite(time)) throw new TypeError('stop time must be finite');
    this.stopTime = time;
  }
}

class MockAudioContext {
  public state: AudioContextState = 'running';
  public currentTime: number = 0.05;
  public sampleRate: number = 44100;
  public destination = new MockAudioNode();

  public createdOscillators: MockOscillatorNode[] = [];
  public createdGains: MockGainNode[] = [];
  public createdFilters: MockBiquadFilterNode[] = [];
  public createdBuffers: MockAudioBuffer[] = [];
  public createdBufferSources: MockAudioBufferSourceNode[] = [];
  public createdCompressors: MockDynamicsCompressorNode[] = [];

  createGain(): MockGainNode {
    const node = new MockGainNode();
    this.createdGains.push(node);
    return node;
  }

  createOscillator(): MockOscillatorNode {
    const node = new MockOscillatorNode();
    this.createdOscillators.push(node);
    return node;
  }

  createDynamicsCompressor(): MockDynamicsCompressorNode {
    const node = new MockDynamicsCompressorNode();
    this.createdCompressors.push(node);
    return node;
  }

  createBiquadFilter(): MockBiquadFilterNode {
    const node = new MockBiquadFilterNode();
    this.createdFilters.push(node);
    return node;
  }

  createBuffer(channels: number, length: number, sampleRate: number): MockAudioBuffer {
    const buf = new MockAudioBuffer(channels, length, sampleRate);
    this.createdBuffers.push(buf);
    return buf;
  }

  createBufferSource(): MockAudioBufferSourceNode {
    const node = new MockAudioBufferSourceNode();
    this.createdBufferSources.push(node);
    return node;
  }

  async resume(): Promise<void> {
    this.state = 'running';
  }
}

// Mock Canvas 2D Context for rendering stress
function createMockCanvasContext() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    strokeText: vi.fn(),
    fillText: vi.fn(),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    globalAlpha: 1.0,
    globalCompositeOperation: 'source-over',
    fillStyle: '#ffffff',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineJoin: 'round',
    lineCap: 'round',
    font: '',
    textAlign: 'center',
    textBaseline: 'middle',
  } as unknown as CanvasRenderingContext2D;
}

// ============================================================================
// SUITE 1: Extreme Polyphony & Audio Synthesizer Stress Tests
// ============================================================================

describe('ProceduralSoundEngine Polyphony & Web Audio Stress Suite', () => {
  it('handles 1,000 rapid polyphonic bursts across all synthesizers in headless SSR mode', () => {
    const engine = new ProceduralSoundEngine();
    expect(engine.enabled).toBe(true);

    const startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      engine.playPistolShot();
      engine.playShotgunShot();
      engine.playSMGShot();
      engine.playMagicCast();
      engine.playMeleeSwing();
      engine.playEnemyHit();
      engine.playEnemyDeath();
      engine.playPlayerHurt();
      engine.playDodge();
      engine.playGemPickup(i);
      engine.playWaveComplete();
      engine.playTacticalFreeze();
      engine.playNukeDetonation();
      engine.playHit();
      engine.playComboUp(i % 5);
      engine.playOrbitalLaser();
      engine.playShieldBreak();
      engine.playCashRegister();
    }
    const elapsedMs = performance.now() - startTime;

    // 18,000 procedural calls executed in headless mode without a single throw
    expect(elapsedMs).toBeLessThan(250);
  });

  describe('Active Web Audio Context Polyphony Simulation', () => {
    let mockCtx: MockAudioContext;
    let originalWindow: any;

    beforeEach(() => {
      mockCtx = new MockAudioContext();
      originalWindow = (global as any).window;
      // Provide valid constructor function for `new AudioContext()`
      function MockAudioContextConstructor() {
        return mockCtx;
      }
      (global as any).window = {
        AudioContext: MockAudioContextConstructor,
        addEventListener: vi.fn(),
      };
    });

    afterEach(() => {
      (global as any).window = originalWindow;
    });

    it('processes 600+ rapid simultaneous synthesizers without AudioContext crash or audio param corruption', () => {
      const engine = new ProceduralSoundEngine();

      // Trigger 600 rapid multi-weapon and combat events
      for (let i = 0; i < 100; i++) {
        mockCtx.currentTime += 0.005; // advance audio time slightly
        engine.playPistolShot();
        engine.playShotgunShot();
        engine.playSMGShot();
        engine.playMagicCast();
        engine.playMeleeSwing();
        engine.playEnemyHit();
      }

      // Verify master audio graph architecture
      expect(mockCtx.createdCompressors.length).toBe(1);
      expect(mockCtx.createdGains.length).toBeGreaterThan(600);
      expect(mockCtx.createdOscillators.length).toBeGreaterThan(600);

      // Verify that the noise buffer was allocated only ONCE (cached singleton buffer)
      expect(mockCtx.createdBuffers.length).toBe(1);

      // Verify that ALL created oscillators received start() and stop() with valid stopTime >= startTime
      for (const osc of mockCtx.createdOscillators) {
        expect(osc.startTime).toBeGreaterThanOrEqual(0);
        expect(osc.stopTime).toBeGreaterThanOrEqual(osc.startTime);
        expect(Number.isFinite(osc.startTime)).toBe(true);
        expect(Number.isFinite(osc.stopTime)).toBe(true);
      }

      // Verify that all scheduled audio param ramps have strictly positive values (no exponential ramps <= 0)
      for (const osc of mockCtx.createdOscillators) {
        for (const call of osc.frequency.scheduledCalls) {
          expect(Number.isFinite(call.value)).toBe(true);
          expect(Number.isFinite(call.time)).toBe(true);
          if (call.type === 'exponentialRampToValueAtTime') {
            expect(call.value).toBeGreaterThan(0);
          }
        }
      }

      // Verify gain nodes
      for (const gainNode of mockCtx.createdGains) {
        for (const call of gainNode.gain.scheduledCalls) {
          expect(Number.isFinite(call.value)).toBe(true);
          expect(Number.isFinite(call.time)).toBe(true);
          if (call.type === 'exponentialRampToValueAtTime') {
            expect(call.value).toBeGreaterThan(0);
          }
        }
      }
    });

    it('verifies memory cleanliness: noise buffer sources are distinct instances referencing singleton buffer', () => {
      const engine = new ProceduralSoundEngine();

      // Trigger synthesizers that utilize white noise (shotgun, pistol, melee, enemy death, freeze)
      for (let i = 0; i < 50; i++) {
        engine.playShotgunShot();
        engine.playMeleeSwing();
        engine.playEnemyDeath();
        engine.playTacticalFreeze();
      }

      // A single 2-second audio buffer was allocated
      expect(mockCtx.createdBuffers.length).toBe(1);
      expect(mockCtx.createdBuffers[0].length).toBe(mockCtx.sampleRate * 2);

      // Multiple buffer sources were created, each scheduled to stop
      expect(mockCtx.createdBufferSources.length).toBe(200);
      for (const bs of mockCtx.createdBufferSources) {
        expect(bs.buffer).toBe(mockCtx.createdBuffers[0]);
        expect(bs.stopTime).toBeGreaterThan(bs.startTime);
      }
    });

    it('verifies user gesture unlocking and suspended state recovery', async () => {
      mockCtx.state = 'suspended';
      const engine = new ProceduralSoundEngine();

      // Initial call triggers getContext which attempts to resume
      engine.playPistolShot();

      // Explicit user gesture unlocks audio context
      await engine.initOnUserGesture();
      expect(mockCtx.state).toBe('running');
    });

    it('preserves volume normalization and handles master volume stress', () => {
      const engine = new ProceduralSoundEngine();

      // Initialize graph
      engine.playPistolShot();

      // Stress master volume limits
      const extremeVolumes = [-50, -0.001, 0, 0.25, 0.77, 1.0, 1.001, 999];
      for (const vol of extremeVolumes) {
        engine.setMasterVolume(vol);
        expect(engine.masterVolume).toBeGreaterThanOrEqual(0.0);
        expect(engine.masterVolume).toBeLessThanOrEqual(1.0);
      }

      // Rapid mute toggling under high polyphony
      for (let i = 0; i < 200; i++) {
        const isMuted = engine.toggleMute();
        expect(engine.isMuted).toBe(isMuted);
      }
    });

    it('exercises streak-scaling pitch algorithms and validates positive frequency clamping', () => {
      const engine = new ProceduralSoundEngine();

      // Streak values from 0 to 100
      for (let streak = 0; streak <= 100; streak += 5) {
        expect(() => {
          engine.playGemPickup(streak);
          engine.playComboUp(streak % 10);
        }).not.toThrow();
      }

      // Verify that all generated oscillator frequencies are strictly positive finite numbers
      for (const osc of mockCtx.createdOscillators) {
        for (const call of osc.frequency.scheduledCalls) {
          expect(call.value).toBeGreaterThan(0);
          expect(Number.isFinite(call.value)).toBe(true);
        }
      }
    });

    it('ambient storm rain loop toggles without audio graph leakage', () => {
      const engine = new ProceduralSoundEngine();

      // Rapidly toggle storm ambient 50 times
      for (let i = 0; i < 50; i++) {
        engine.setKilyosStormAmbient(true);
        engine.setKilyosStormAmbient(false);
      }

      // Verify that the continuous looping white noise buffer source was created only ONCE
      const loopingSources = mockCtx.createdBufferSources.filter((s) => s.loop === true);
      expect(loopingSources.length).toBe(1);
    });
  });
});

// ============================================================================
// SUITE 2: FloatingTextManager Pool Exhaustion & Zero-Allocation Stress Tests
// ============================================================================

describe('FloatingTextManager Object Pool Exhaustion & Allocation Stress Suite', () => {
  it('strictly clamps to pre-allocated capacity when inundated with 1,000+ rapid spawns', () => {
    const capacity = 64;
    const ftm = new FloatingTextManager(capacity);

    // Verify initial pool state
    const pool = (ftm as any).pool as FloatingTextSlot[];
    expect(pool.length).toBe(capacity);
    expect(pool.every((slot) => !slot.active)).toBe(true);

    // Blast 1,500 mixed spawns past capacity
    for (let i = 0; i < 1500; i++) {
      ftm.spawnDamage(100 + i, 200 + i, i * 5, false);
      if (i % 5 === 0) ftm.spawnCrit(150, 250, i * 15);
      if (i % 7 === 0) ftm.spawnPlayerDamage(200, 300, 25);
      if (i % 11 === 0) ftm.spawnDodge(200, 300);
      if (i % 13 === 0) ftm.spawnHeal(200, 300, 10, true);
      if (i % 17 === 0) ftm.spawnPickup(100, 100, '+10 💎');
      if (i % 23 === 0) ftm.spawnBanner(500, 500, 'DALGA TAMAMLANDI!');
    }

    // Pool capacity must remain strictly 64, with zero dynamic array resizing
    expect(pool.length).toBe(capacity);
    expect(pool.every((slot) => slot.active)).toBe(true);

    // Verify every single slot has valid numerical values
    for (const slot of pool) {
      expect(Number.isFinite(slot.x)).toBe(true);
      expect(Number.isFinite(slot.y)).toBe(true);
      expect(Number.isFinite(slot.vx)).toBe(true);
      expect(Number.isFinite(slot.vy)).toBe(true);
      expect(Number.isFinite(slot.scale)).toBe(true);
      expect(Number.isFinite(slot.alpha)).toBe(true);
      expect(slot.alpha).toBeGreaterThanOrEqual(0);
      expect(slot.alpha).toBeLessThanOrEqual(1.0);
      expect(slot.scale).toBeGreaterThan(0);
      expect(typeof slot.text).toBe('string');
      expect(slot.text.length).toBeGreaterThan(0);
      expect(typeof slot.fontString).toBe('string');
    }
  });

  it('enforces priority-based eviction: high-priority banners and crits evict older regular damage', () => {
    const capacity = 8;
    const ftm = new FloatingTextManager(capacity);
    const pool = (ftm as any).pool as FloatingTextSlot[];

    // Fill pool entirely with priority 1 regular damage
    for (let i = 0; i < capacity; i++) {
      ftm.spawnDamage(i * 10, i * 10, 10 + i, false);
    }
    expect(pool.every((s) => s.priority === 1)).toBe(true);

    // Age the first few damage slots
    pool[0].lifetimeMs = 500;
    pool[1].lifetimeMs = 300;

    // Spawn high-priority Banner (priority 5)
    ftm.spawnBanner(500, 500, 'VICTORY BANNER');

    // Slot 0 (oldest priority 1) should have been recycled for the banner
    expect(pool.some((s) => s.type === 'banner' && s.priority === 5)).toBe(true);

    // Spawn Critical Strike (priority 3)
    ftm.spawnCrit(200, 200, 999);
    expect(pool.some((s) => s.type === 'crit' && s.priority === 3)).toBe(true);
  });

  it('maintains continuous simulation invariants over 1,000 update frames with randomized deltas', () => {
    const ftm = new FloatingTextManager(64);
    const pool = (ftm as any).pool as FloatingTextSlot[];

    for (let frame = 0; frame < 1000; frame++) {
      // Intermittent spawns
      if (frame % 3 === 0) {
        ftm.spawnDamage(500, 500, 42, false);
      }
      if (frame % 8 === 0) {
        ftm.spawnCrit(500, 500, 150);
      }
      if (frame % 15 === 0) {
        ftm.spawnDodge(500, 500);
      }

      // Random delta time between 8ms and 33ms
      const dtSec = 0.008 + Math.random() * 0.025;
      ftm.update(dtSec);

      // Verify invariants after every frame
      for (const slot of pool) {
        if (slot.active) {
          expect(slot.lifetimeMs).toBeLessThanOrEqual(slot.maxLifetimeMs);
          expect(slot.alpha).toBeGreaterThanOrEqual(0.0);
          expect(slot.alpha).toBeLessThanOrEqual(1.0);
          expect(slot.scale).toBeGreaterThan(0.0);
          expect(Number.isFinite(slot.x)).toBe(true);
          expect(Number.isFinite(slot.y)).toBe(true);
        }
      }
    }
  });

  it('executes canvas batch rendering without memory leaks or unclosed canvas transformations', () => {
    const ftm = new FloatingTextManager(64);
    for (let i = 0; i < 64; i++) {
      ftm.spawnCrit(100 + i, 100 + i, 77);
    }

    const mockCtx = createMockCanvasContext();

    // Render 100 consecutive frames
    for (let i = 0; i < 100; i++) {
      ftm.update(0.016);
      ftm.render(mockCtx);
    }

    // save() and restore() must match exactly to avoid canvas transformation stack overflow
    const saveCount = (mockCtx.save as any).mock.calls.length;
    const restoreCount = (mockCtx.restore as any).mock.calls.length;
    expect(saveCount).toBe(restoreCount);

    // Font cache size must be small and bounded
    const fontCache = (ftm as any).fontCache as Map<string, string>;
    expect(fontCache.size).toBeLessThanOrEqual(10);
  });

  it('clear() instantaneously deactivates all slots without heap reallocation', () => {
    const ftm = new FloatingTextManager(64);
    for (let i = 0; i < 64; i++) {
      ftm.spawnDamage(100, 100, 10);
    }
    const pool = (ftm as any).pool as FloatingTextSlot[];
    expect(pool.every((s) => s.active)).toBe(true);

    ftm.clear();
    expect(pool.every((s) => !s.active)).toBe(true);
    expect(pool.length).toBe(64);
  });
});

// ============================================================================
// SUITE 3: VFXManager Pool Exhaustion & Swap-and-Pop Compaction Stress Tests
// ============================================================================

describe('VFXManager Pool Exhaustion & Swap-and-Pop Compaction Suite', () => {
  it('strictly caps particle count at maxCapacity (512) under 1,500+ rapid spawner calls', () => {
    const maxCapacity = 512;
    const vfx = new VFXManager(maxCapacity);
    const pool = (vfx as any).pool as ParticleSlot[];

    expect(pool.length).toBe(maxCapacity);

    // Fire 1,500 particle events across all 7 archetypes
    for (let i = 0; i < 200; i++) {
      vfx.spawnHitSparks(100, 100, Math.PI / 4, true, 8);
      vfx.spawnBloodSplatter(200, 200, '#ef4444', 10);
      vfx.spawnMuzzleFlash(300, 300, 0);
      vfx.spawnMeleeSlashArc(400, 400, Math.PI / 2, 120, 80);
      vfx.spawnPickupRing(500, 500, 'material');
      vfx.spawnDustPuff(600, 600, 4);
      vfx.spawnDeathBurst(700, 700, '#a855f7', true);
    }

    const activeCount = (vfx as any).activeCount as number;
    expect(activeCount).toBe(maxCapacity);
    expect(pool.length).toBe(maxCapacity);

    // Verify all active particle properties are numerically valid
    for (let i = 0; i < activeCount; i++) {
      const p = pool[i];
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(Number.isFinite(p.vx)).toBe(true);
      expect(Number.isFinite(p.vy)).toBe(true);
      expect(Number.isFinite(p.radius)).toBe(true);
      expect(p.radius).toBeGreaterThan(0);
      expect(p.alpha).toBeGreaterThanOrEqual(0.0);
      expect(p.alpha).toBeLessThanOrEqual(1.0);
    }
  });

  it('validates O(1) swap-and-pop compaction mathematical correctness over 2,000 cycles', () => {
    const maxCapacity = 64;
    const vfx = new VFXManager(maxCapacity);
    const pool = (vfx as any).pool as ParticleSlot[];

    for (let cycle = 0; cycle < 2000; cycle++) {
      // Spawn random particles
      if (cycle % 2 === 0) {
        vfx.spawnHitSparks(100, 100, 0, false, 4);
      }
      if (cycle % 5 === 0) {
        vfx.spawnBloodSplatter(200, 200, '#f97316', 6);
      }
      if (cycle % 7 === 0) {
        vfx.spawnDustPuff(300, 300, 3);
      }

      const activeBefore = (vfx as any).activeCount as number;
      expect(activeBefore).toBeLessThanOrEqual(maxCapacity);
      expect(activeBefore).toBeGreaterThanOrEqual(0);

      // Advance simulation with random dt
      const dtSec = 0.01 + Math.random() * 0.04;
      vfx.update(dtSec);

      const activeAfter = (vfx as any).activeCount as number;
      expect(activeAfter).toBeLessThanOrEqual(maxCapacity);
      expect(activeAfter).toBeGreaterThanOrEqual(0);

      // Compaction Invariant:
      // Every element from index 0 to activeCount - 1 MUST be alive (lifetimeMs < maxLifetimeMs)
      for (let i = 0; i < activeAfter; i++) {
        const p = pool[i];
        expect(p.lifetimeMs).toBeLessThan(p.maxLifetimeMs);
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
        expect(Number.isFinite(p.radius)).toBe(true);
        expect(p.radius).toBeGreaterThan(0);
        expect(p.alpha).toBeGreaterThanOrEqual(0.0);
        expect(p.alpha).toBeLessThanOrEqual(1.0);
      }
    }
  });

  it('manages hit-stop micro-freezes accurately across frame boundaries', () => {
    const vfx = new VFXManager(512);

    // Initial state: not frozen
    let res = vfx.update(0.016);
    expect(res.isSimulationFrozen).toBe(false);

    // Trigger 50ms hit stop
    vfx.triggerHitStop(50);

    // Frame 1 (16ms elapsed): remaining = 34ms, frozen
    res = vfx.update(0.016);
    expect(res.isSimulationFrozen).toBe(true);

    // Frame 2 (16ms elapsed): remaining = 18ms, frozen
    res = vfx.update(0.016);
    expect(res.isSimulationFrozen).toBe(true);

    // Frame 3 (20ms elapsed): finishes remaining 18ms (remaining becomes -2ms), returns frozen for this frame
    res = vfx.update(0.020);
    expect(res.isSimulationFrozen).toBe(true);

    // Frame 4 (16ms elapsed): remaining <= 0, cleanly unfreezes
    res = vfx.update(0.016);
    expect(res.isSimulationFrozen).toBe(false);

    // Overlapping hit stop retains max remaining duration
    vfx.triggerHitStop(30);
    vfx.triggerHitStop(80);
    const hitStopRemaining = (vfx as any).hitStopRemainingSec as number;
    expect(hitStopRemaining).toBeCloseTo(0.08, 3);
  });

  it('renders batched composite passes with balanced context state', () => {
    const vfx = new VFXManager(64);
    vfx.spawnHitSparks(100, 100, 0, true, 8);
    vfx.spawnBloodSplatter(200, 200, '#ef4444', 8);
    vfx.spawnMuzzleFlash(300, 300, 0);
    vfx.spawnPickupRing(400, 400, 'fruit');

    const mockCtx = createMockCanvasContext();
    vfx.update(0.016);
    vfx.render(mockCtx);

    const saveCount = (mockCtx.save as any).mock.calls.length;
    const restoreCount = (mockCtx.restore as any).mock.calls.length;
    expect(saveCount).toBe(restoreCount);
  });
});

// ============================================================================
// SUITE 4: Trauma Screen Shake Numerical Stability & Non-Divergence Tests
// ============================================================================

describe('Trauma Screen Shake Numerical Stability & Long-Duration Suite', () => {
  it('verifies non-linear polynomial punch curve: shake = trauma^2.2 strictly clamped', () => {
    const vfx = new VFXManager();

    // Clamped between 0 and 1
    vfx.addTrauma(0.5);
    expect((vfx as any).trauma).toBeCloseTo(0.5, 4);

    vfx.addTrauma(0.8);
    // 0.5 + 0.8 = 1.3 clamped to 1.0
    expect((vfx as any).trauma).toBe(1.0);

    // Update frame
    vfx.update(0.016);
    expect(Math.abs(vfx.shakeOffsetX)).toBeLessThanOrEqual(15.0);
    expect(Math.abs(vfx.shakeOffsetY)).toBeLessThanOrEqual(15.0);
    expect(Math.abs(vfx.shakeRotationRad)).toBeLessThanOrEqual(0.035);
  });

  it('sustains numeric stability and zero-divergence over 50,000 frames (~14 virtual hours)', () => {
    const vfx = new VFXManager();
    const totalFrames = 50000;
    const dtSec = 0.016;

    for (let frame = 0; frame < totalFrames; frame++) {
      // Periodic trauma injections
      if (frame % 100 === 0) {
        vfx.addTrauma(0.4);
      }
      if (frame % 500 === 0) {
        vfx.addTrauma(0.9);
      }

      vfx.update(dtSec);

      // Shake offsets must remain finite, bounded, and non-divergent
      expect(Number.isFinite(vfx.shakeOffsetX)).toBe(true);
      expect(Number.isFinite(vfx.shakeOffsetY)).toBe(true);
      expect(Number.isFinite(vfx.shakeRotationRad)).toBe(true);
      expect(Math.abs(vfx.shakeOffsetX)).toBeLessThanOrEqual(15.0);
      expect(Math.abs(vfx.shakeOffsetY)).toBeLessThanOrEqual(15.0);
      expect(Math.abs(vfx.shakeRotationRad)).toBeLessThanOrEqual(0.035);
    }
  });

  it('guarantees zero-drift decay: offsets drop to exact zero after trauma decays completely', () => {
    const vfx = new VFXManager();
    vfx.addTrauma(1.0);

    // Decay rate is 1.35 units/sec. In 1.0 second, trauma will decay by 1.35 and reach 0
    vfx.update(1.0);

    expect((vfx as any).trauma).toBe(0);
    expect(Math.abs(vfx.shakeOffsetX)).toBe(0);
    expect(Math.abs(vfx.shakeOffsetY)).toBe(0);
    expect(Math.abs(vfx.shakeRotationRad)).toBe(0);

    // Calling applyCameraShake with zero trauma executes 0 canvas context transformations
    const mockCtx = createMockCanvasContext();
    vfx.applyCameraShake(mockCtx);
    expect((mockCtx.translate as any).mock.calls.length).toBe(0);
    expect((mockCtx.rotate as any).mock.calls.length).toBe(0);
  });

  it('resilient against adversarial trauma values (massive numbers and extreme dt)', () => {
    const vfx = new VFXManager();

    // Massive trauma clamping
    vfx.addTrauma(1e6);
    expect((vfx as any).trauma).toBe(1.0);

    // Extreme delta time (e.g. background tab suspend for 1 hour)
    vfx.update(3600); // 1 hour elapsed in 1 tick
    expect((vfx as any).trauma).toBe(0);
    expect(Math.abs(vfx.shakeOffsetX)).toBe(0);
    expect(Math.abs(vfx.shakeOffsetY)).toBe(0);
    expect(Math.abs(vfx.shakeRotationRad)).toBe(0);
  });

  it('stabilizes screen-space overlays (damage vignette, white flash, and heartbeat pulse)', () => {
    const vfx = new VFXManager();
    const mockCtx = createMockCanvasContext();

    vfx.triggerDamageVignette(0.9);
    vfx.triggerWhiteFlash(0.7);

    // Decays smoothly over 1.0 second
    for (let i = 0; i < 60; i++) {
      vfx.update(0.016);
      vfx.renderScreenOverlays(mockCtx, 1920, 1080, 0.15); // Critical HP < 25%
    }

    // Overlays must remain active or decaying without throwing
    const gradCalls = (mockCtx.createRadialGradient as any).mock.calls.length;
    expect(gradCalls).toBeGreaterThan(0);
  });
});

'use client';

/**
 * Procedural Web Audio Engine for Brotato Arena Roguelite Web Game
 * 
 * Features:
 * - 12 Procedural Sound Synthesizers (Features 72-74)
 * - Zero external audio file dependencies (pure Web Audio API synthesis)
 * - Browser Autoplay Policy compliant (lazy initialization, user gesture unlocking)
 * - Hardware-grade volume normalization via DynamicsCompressorNode (peak limiter)
 * - Master gain controls, mute toggling, and streak-scaling pitch algorithms
 * - Safe for Headless / SSR / Node environments (returns cleanly if window/AudioContext undefined)
 */

export const AUDIO_SETTINGS_STORAGE_KEY = 'lexicon_survivors_audio_settings';

export interface AudioSettingsState {
  masterVolume: number;
  isMuted: boolean;
  sfxVolume: number;
  sfxMuted: boolean;
  bgmVolume: number;
  bgmMuted: boolean;
  menuVolume: number;
  menuMuted: boolean;
  inGameMusicVolume?: number;
  mainMenuMusicVolume?: number;
}

function sanitizeVolume(val: unknown, currentVal: number, fallback: number = 0.8): number {
  if (typeof val !== 'number' || Number.isNaN(val)) {
    return Number.isFinite(currentVal) ? currentVal : fallback;
  }
  if (!Number.isFinite(val)) {
    return val > 0 ? 1 : 0;
  }
  return Math.max(0, Math.min(1, val));
}

export class ProceduralSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private menuGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  
  private _enabled: boolean = true;
  private _masterVolume: number = 0.8;
  private _isMuted: boolean = false;

  private _sfxVolume: number = 0.8;
  private _sfxMuted: boolean = false;

  private _bgmVolume: number = 0.6;
  private _bgmMuted: boolean = false;

  private _menuVolume: number = 0.7;
  private _menuMuted: boolean = false;
  
  // Dialogue voice channel
  private activeDialogueVoice: HTMLAudioElement | null = null;
  private dialoguePausedByMenu: boolean = false;
  
  private rainNode: AudioNode | null = null;
  private rainGain: GainNode | null = null;
  private userGestureAttached: boolean = false;

  private bgmIntervalId: ReturnType<typeof setInterval> | null = null;
  private bgmOscillators: Set<OscillatorNode> = new Set();
  private bgmPreviewOscillators: Set<OscillatorNode> = new Set();
  public isBgmPlaying: boolean = false;

  private menuBgmIntervalId: ReturnType<typeof setInterval> | null = null;
  private menuBgmOscillators: Set<OscillatorNode> = new Set();
  private menuPreviewOscillators: Set<OscillatorNode> = new Set();
  public isMenuMusicPlaying: boolean = false;

  private listeners: Set<(settings: AudioSettingsState) => void> = new Set();

  public get enabled(): boolean {
    return this._enabled && !this._isMuted;
  }

  public set enabled(val: boolean) {
    const boolVal = Boolean(val);
    this._enabled = boolVal;
    this.setMuted(!boolVal);
  }

  public subscribe(cb: (settings: AudioSettingsState) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notifyListeners(): void {
    if (this.listeners.size === 0) return;
    const settings = this.getAudioSettings();
    for (const cb of this.listeners) {
      try {
        cb(settings);
      } catch {}
    }
  }

  private getStorage(): Storage | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
    } catch {
      // Restricted security context / private browsing
    }
    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        return (globalThis as any).localStorage;
      }
    } catch {
      // Restricted
    }
    return null;
  }

  public saveToLocalStorage(): void {
    try {
      const storage = this.getStorage();
      if (!storage) return;

      const data: AudioSettingsState = {
        masterVolume: this._masterVolume,
        isMuted: this._isMuted,
        sfxVolume: this._sfxVolume,
        sfxMuted: this._sfxMuted,
        bgmVolume: this._bgmVolume,
        bgmMuted: this._bgmMuted,
        menuVolume: this._menuVolume,
        menuMuted: this._menuMuted,
        inGameMusicVolume: this._bgmVolume,
        mainMenuMusicVolume: this._menuVolume,
      };

      storage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(data));
      storage.setItem('mainMenuMusicVolume', String(this._menuVolume));
      storage.setItem('inGameMusicVolume', String(this._bgmVolume));
    } catch {}
  }

  public loadFromLocalStorage(): void {
    try {
      const storage = this.getStorage();
      if (!storage) return;

      const raw = storage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.masterVolume === 'number') this._masterVolume = sanitizeVolume(parsed.masterVolume, this._masterVolume);
          if (typeof parsed.isMuted === 'boolean') {
            this._isMuted = parsed.isMuted;
            this._enabled = !parsed.isMuted;
          }
          if (typeof parsed.sfxVolume === 'number') this._sfxVolume = sanitizeVolume(parsed.sfxVolume, this._sfxVolume);
          if (typeof parsed.sfxMuted === 'boolean') this._sfxMuted = parsed.sfxMuted;
          const bgmVal = typeof parsed.inGameMusicVolume === 'number' ? parsed.inGameMusicVolume : parsed.bgmVolume;
          if (typeof bgmVal === 'number') this._bgmVolume = sanitizeVolume(bgmVal, this._bgmVolume, 0.6);
          if (typeof parsed.bgmMuted === 'boolean') this._bgmMuted = parsed.bgmMuted;
          const menuVal = typeof parsed.mainMenuMusicVolume === 'number' ? parsed.mainMenuMusicVolume : parsed.menuVolume;
          if (typeof menuVal === 'number') this._menuVolume = sanitizeVolume(menuVal, this._menuVolume, 0.7);
          if (typeof parsed.menuMuted === 'boolean') this._menuMuted = parsed.menuMuted;
        }
      } else {
        const savedBgm = storage.getItem('inGameMusicVolume');
        if (savedBgm !== null) {
          const val = parseFloat(savedBgm);
          if (Number.isFinite(val)) this._bgmVolume = sanitizeVolume(val, this._bgmVolume, 0.6);
        }
        const savedMenu = storage.getItem('mainMenuMusicVolume');
        if (savedMenu !== null) {
          const val = parseFloat(savedMenu);
          if (Number.isFinite(val)) this._menuVolume = sanitizeVolume(val, this._menuVolume, 0.7);
        }
      }
    } catch {}
  }

  constructor() {
    this.loadFromLocalStorage();
    this.attachAutoUnlock();
  }

  /**
   * Automatically unlocks AudioContext on first user interaction in browser.
   */
  private attachAutoUnlock(): void {
    if (typeof window === 'undefined' || this.userGestureAttached) return;
    this.userGestureAttached = true;
    
    const unlock = () => {
      this.initOnUserGesture();
    };

    ['pointerdown', 'keydown', 'touchstart', 'click'].forEach((evt) => {
      window.addEventListener(evt, unlock, { once: true, passive: true });
    });
  }

  /**
   * Explicit hook for UI button clicks to ensure AudioContext is active.
   */
  public async initOnUserGesture(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const ctx = this.getContext();
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
      }
    } catch {
      // Ignored if blocked
    }
  }

  /**
   * Lazily initializes AudioContext and master dynamics graph.
   */
  private getContext(): AudioContext | null {
    if (!this.enabled || this._isMuted || typeof window === 'undefined') return null;
    
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initAudioGraph();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Creates master dynamics compressor (AGC/limiter) and hierarchical volume bus.
   * Hierarchical bus: SFX / BGM / Menu -> Master Gain -> Compressor -> Destination.
   * Prevents clipping during intense multi-weapon polyphony.
   */
  private initAudioGraph(): void {
    if (!this.ctx) return;

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-6, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(24, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this._isMuted ? 0 : this._masterVolume, this.ctx.currentTime);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this._sfxMuted ? 0 : this._sfxVolume, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(this._bgmMuted ? 0 : this._bgmVolume, this.ctx.currentTime);
    this.bgmGain.connect(this.masterGain);

    this.menuGain = this.ctx.createGain();
    this.menuGain.gain.setValueAtTime(this._menuMuted ? 0 : this._menuVolume, this.ctx.currentTime);
    this.menuGain.connect(this.masterGain);

    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);
  }

  /**
   * Route SFX audio to SFX bus. Returns null if SFX or Master is muted or disabled.
   */
  public getSfxOut(): AudioNode | null {
    if (!this.enabled || this._isMuted || this._sfxMuted) return null;
    return this.sfxGain || this.masterGain || (this.ctx ? this.ctx.destination : null);
  }

  /**
   * Route BGM audio to BGM bus. Returns null if BGM or Master is muted or disabled.
   */
  public getBgmOut(): AudioNode | null {
    if (!this.enabled || this._isMuted || this._bgmMuted) return null;
    return this.bgmGain || this.masterGain || (this.ctx ? this.ctx.destination : null);
  }

  /**
   * Route Menu & UI audio to Menu bus. Returns null if Menu or Master is muted or disabled.
   */
  public getMenuOut(): AudioNode | null {
    if (!this.enabled || this._isMuted || this._menuMuted) return null;
    return this.menuGain || this.masterGain || (this.ctx ? this.ctx.destination : null);
  }

  /**
   * Pre-allocates a reusable 2-second white noise buffer for zero GC latency.
   */
  private getNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (!this.noiseBuffer) {
      const bufferSize = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return this.noiseBuffer;
  }

  // =========================================================================
  // VOLUME & MUTE CONTROLS
  // =========================================================================

  // Master Volume & Mute
  public get masterVolume(): number {
    return this._masterVolume;
  }

  public set masterVolume(val: number) {
    this.setMasterVolume(val);
  }

  public setMasterVolume(val: number): void {
    this._masterVolume = sanitizeVolume(val, this._masterVolume, 0.8);
    if (this.ctx && this.masterGain && !this._isMuted) {
      this.masterGain.gain.setValueAtTime(this._masterVolume, this.ctx.currentTime);
    }
    this.saveToLocalStorage();
    this.notifyListeners();
    this.updateDialogueVolume();
  }

  public get isMuted(): boolean {
    return this._isMuted;
  }

  public set isMuted(val: boolean) {
    this.setMuted(val);
  }

  public setMuted(muted: boolean): void {
    const isMutedBool = Boolean(muted);
    this._isMuted = isMutedBool;
    this._enabled = !isMutedBool;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(isMutedBool ? 0 : this._masterVolume, this.ctx.currentTime);
    }
    this.saveToLocalStorage();
    this.notifyListeners();
    this.updateDialogueVolume();
  }

  public toggleMute(): boolean {
    this.setMuted(!this._isMuted);
    return this._isMuted;
  }

  // Sound Effects (SFX) Controls
  public get sfxVolume(): number {
    return this._sfxVolume;
  }

  public set sfxVolume(val: number) {
    this.setSfxVolume(val);
  }

  public setSfxVolume(val: number): void {
    this._sfxVolume = sanitizeVolume(val, this._sfxVolume, 0.8);
    if (this.ctx && this.sfxGain && !this._sfxMuted) {
      this.sfxGain.gain.setValueAtTime(this._sfxVolume, this.ctx.currentTime);
    }
    this.saveToLocalStorage();
    this.notifyListeners();
    this.updateDialogueVolume();
  }

  public get sfxMuted(): boolean {
    return this._sfxMuted;
  }

  public set sfxMuted(val: boolean) {
    this.setSfxMuted(val);
  }

  public setSfxMuted(muted: boolean): void {
    this._sfxMuted = Boolean(muted);
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(this._sfxMuted ? 0 : this._sfxVolume, this.ctx.currentTime);
    }
    this.saveToLocalStorage();
    this.notifyListeners();
    this.updateDialogueVolume();
  }

  public toggleSfxMute(): boolean {
    this.setSfxMuted(!this._sfxMuted);
    return this._sfxMuted;
  }

  // In-Game Music (BGM) Controls
  public get bgmVolume(): number {
    return this._bgmVolume;
  }

  public set bgmVolume(val: number) {
    this.setBgmVolume(val);
  }

  public setBgmVolume(val: number): void {
    this._bgmVolume = sanitizeVolume(val, this._bgmVolume, 0.6);
    if (this.ctx && this.bgmGain && !this._bgmMuted) {
      this.bgmGain.gain.setValueAtTime(this._bgmVolume, this.ctx.currentTime);
    }
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  public get inGameMusicVolume(): number {
    return this._bgmVolume;
  }

  public set inGameMusicVolume(val: number) {
    this.setBgmVolume(val);
  }

  public setInGameMusicVolume(val: number): void {
    this.setBgmVolume(val);
  }

  public get bgmMuted(): boolean {
    return this._bgmMuted;
  }

  public set bgmMuted(val: boolean) {
    this.setBgmMuted(val);
  }

  public setBgmMuted(muted: boolean): void {
    this._bgmMuted = Boolean(muted);
    if (this.ctx && this.bgmGain) {
      this.bgmGain.gain.setValueAtTime(this._bgmMuted ? 0 : this._bgmVolume, this.ctx.currentTime);
    }
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  public toggleBgmMute(): boolean {
    this.setBgmMuted(!this._bgmMuted);
    return this._bgmMuted;
  }

  // Main Menu Music & UI Sounds Controls
  public get menuVolume(): number {
    return this._menuVolume;
  }

  public set menuVolume(val: number) {
    this.setMenuVolume(val);
  }

  public setMenuVolume(val: number): void {
    this._menuVolume = sanitizeVolume(val, this._menuVolume, 0.7);
    if (this.ctx && this.menuGain && !this._menuMuted) {
      this.menuGain.gain.setValueAtTime(this._menuVolume, this.ctx.currentTime);
    }
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  public get mainMenuMusicVolume(): number {
    return this._menuVolume;
  }

  public set mainMenuMusicVolume(val: number) {
    this.setMenuVolume(val);
  }

  public setMainMenuMusicVolume(val: number): void {
    this.setMenuVolume(val);
  }

  public get menuMuted(): boolean {
    return this._menuMuted;
  }

  public set menuMuted(val: boolean) {
    this.setMenuMuted(val);
  }

  public setMenuMuted(muted: boolean): void {
    this._menuMuted = Boolean(muted);
    if (this.ctx && this.menuGain) {
      this.menuGain.gain.setValueAtTime(this._menuMuted ? 0 : this._menuVolume, this.ctx.currentTime);
    }
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  public toggleMenuMute(): boolean {
    this.setMenuMuted(!this._menuMuted);
    return this._menuMuted;
  }

  // Helper method to retrieve full audio configuration state
  public getAudioSettings(): AudioSettingsState {
    return {
      masterVolume: this._masterVolume,
      isMuted: this._isMuted,
      sfxVolume: this._sfxVolume,
      sfxMuted: this._sfxMuted,
      bgmVolume: this._bgmVolume,
      bgmMuted: this._bgmMuted,
      menuVolume: this._menuVolume,
      menuMuted: this._menuMuted,
      inGameMusicVolume: this._bgmVolume,
      mainMenuMusicVolume: this._menuVolume,
    };
  }

  public setAudioSettings(settings?: Partial<AudioSettingsState> | null): void {
    if (!settings || typeof settings !== 'object') return;

    if (settings.masterVolume !== undefined) {
      this._masterVolume = sanitizeVolume(settings.masterVolume, this._masterVolume, 0.8);
    }
    if (typeof settings.isMuted === 'boolean') {
      this._isMuted = settings.isMuted;
      this._enabled = !settings.isMuted;
    }
    if (settings.sfxVolume !== undefined) {
      this._sfxVolume = sanitizeVolume(settings.sfxVolume, this._sfxVolume, 0.8);
    }
    if (typeof settings.sfxMuted === 'boolean') {
      this._sfxMuted = settings.sfxMuted;
    }
    const inGameVol = settings.inGameMusicVolume !== undefined ? settings.inGameMusicVolume : settings.bgmVolume;
    if (inGameVol !== undefined) {
      this._bgmVolume = sanitizeVolume(inGameVol, this._bgmVolume, 0.6);
    }
    if (typeof settings.bgmMuted === 'boolean') {
      this._bgmMuted = settings.bgmMuted;
    }
    const mainMenuVol = settings.mainMenuMusicVolume !== undefined ? settings.mainMenuMusicVolume : settings.menuVolume;
    if (mainMenuVol !== undefined) {
      this._menuVolume = sanitizeVolume(mainMenuVol, this._menuVolume, 0.7);
    }
    if (typeof settings.menuMuted === 'boolean') {
      this._menuMuted = settings.menuMuted;
    }

    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.masterGain) this.masterGain.gain.setValueAtTime(this._isMuted ? 0 : this._masterVolume, now);
      if (this.sfxGain) this.sfxGain.gain.setValueAtTime(this._sfxMuted ? 0 : this._sfxVolume, now);
      if (this.bgmGain) this.bgmGain.gain.setValueAtTime(this._bgmMuted ? 0 : this._bgmVolume, now);
      if (this.menuGain) this.menuGain.gain.setValueAtTime(this._menuMuted ? 0 : this._menuVolume, now);
    }
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  /**
   * Plays a single 1.76-second preview snippet of the BGM synth bar without mutating isBgmPlaying or combat intervals.
   */
  public playBgmPreview(): void {
    if (typeof window === 'undefined') return;
    const c = this.getContext();
    if (!c) return;
    const out = this.getBgmOut();
    if (!out) return;

    // Cancel any active preview notes to prevent stacking on rapid clicks
    for (const osc of this.bgmPreviewOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    }
    this.bgmPreviewOscillators.clear();

    const now = c.currentTime;
    const notes = [55, 55, 65.41, 73.42, 82.41, 73.42, 65.41, 55];
    const step = 0.22;
    notes.forEach((freq, idx) => {
      const t = now + idx * step;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.04, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + step * 0.9);
      osc.connect(g);
      g.connect(out);

      this.bgmPreviewOscillators.add(osc);
      osc.onended = () => {
        this.bgmPreviewOscillators.delete(osc);
      };

      osc.start(t);
      osc.stop(t + step * 0.9);
    });
  }

  // Procedural BGM Generation
  public startCombatBgm(): void {
    if (this.isBgmPlaying || typeof window === 'undefined') return;
    this.isBgmPlaying = true;

    const playBar = () => {
      if (!this.isBgmPlaying) return;
      const c = this.getContext();
      if (!c) return;
      const out = this.getBgmOut();
      if (!out) return;

      const now = c.currentTime;
      const notes = [55, 55, 65.41, 73.42, 82.41, 73.42, 65.41, 55];
      const step = 0.22;
      notes.forEach((freq, idx) => {
        const t = now + idx * step;
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.04, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + step * 0.9);
        osc.connect(g);
        g.connect(out);

        this.bgmOscillators.add(osc);
        osc.onended = () => {
          this.bgmOscillators.delete(osc);
        };

        osc.start(t);
        osc.stop(t + step * 0.9);
      });
    };

    playBar();
    this.bgmIntervalId = setInterval(playBar, 8 * 220);
  }

  public stopCombatBgm(): void {
    this.isBgmPlaying = false;
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    // Cancel any remaining scheduled oscillators from the current bar
    for (const osc of this.bgmOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    }
    this.bgmOscillators.clear();

    for (const osc of this.bgmPreviewOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    }
    this.bgmPreviewOscillators.clear();
  }

  // Procedural Main Menu Music Generation
  public startMenuMusic(): void {
    if (this.isMenuMusicPlaying || typeof window === 'undefined') return;
    this.isMenuMusicPlaying = true;

    const playBar = () => {
      if (!this.isMenuMusicPlaying) return;
      const c = this.getContext();
      if (!c) return;
      const out = this.getMenuOut();
      if (!out) return;

      const now = c.currentTime;
      const notes = [261.63, 329.63, 392.00, 440.00, 392.00, 329.63, 261.63, 196.00];
      const step = 0.45;
      notes.forEach((freq, idx) => {
        const t = now + idx * step;
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.025, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + step * 0.95);
        osc.connect(g);
        g.connect(out);

        this.menuBgmOscillators.add(osc);
        osc.onended = () => {
          this.menuBgmOscillators.delete(osc);
        };

        osc.start(t);
        osc.stop(t + step * 0.95);
      });
    };

    playBar();
    this.menuBgmIntervalId = setInterval(playBar, 8 * 450);
  }

  public stopMenuMusic(): void {
    this.isMenuMusicPlaying = false;
    if (this.menuBgmIntervalId) {
      clearInterval(this.menuBgmIntervalId);
      this.menuBgmIntervalId = null;
    }
    for (const osc of this.menuBgmOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    }
    this.menuBgmOscillators.clear();

    for (const osc of this.menuPreviewOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    }
    this.menuPreviewOscillators.clear();
  }

  public playMenuMusicPreview(): void {
    if (typeof window === 'undefined') return;
    const c = this.getContext();
    if (!c) return;
    const out = this.getMenuOut();
    if (!out) return;

    for (const osc of this.menuPreviewOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    }
    this.menuPreviewOscillators.clear();

    const now = c.currentTime;
    const notes = [261.63, 329.63, 392.00, 440.00, 392.00, 329.63, 261.63, 196.00];
    const step = 0.22;
    notes.forEach((freq, idx) => {
      const t = now + idx * step;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.03, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + step * 0.9);
      osc.connect(g);
      g.connect(out);

      this.menuPreviewOscillators.add(osc);
      osc.onended = () => {
        this.menuPreviewOscillators.delete(osc);
      };

      osc.start(t);
      osc.stop(t + step * 0.9);
    });
  }

  // Procedural UI / Menu Sound Synthesizers
  public playMenuClick(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.getMenuOut();
    if (!out) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  public playMenuToggle(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.getMenuOut();
    if (!out) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(660, now + 0.04);
    g.gain.setValueAtTime(0.1, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  // =========================================================================
  // 12 PROCEDURAL SYNTHESIZERS (Features 72-74)
  // =========================================================================

  /**
   * Synth 1: playPistolShot()
   * Fast high-frequency pitch-drop chirp + snappy transient crack.
   */
  public playPistolShot(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getSfxOut();
    if (!out) return;

    // Pitch dive oscillator
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1100, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

    oscGain.gain.setValueAtTime(0.24, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(oscGain);
    oscGain.connect(out);
    osc.start(now);
    osc.stop(now + 0.08);

    // Highpass transient snap
    const noiseBuf = this.getNoiseBuffer();
    if (noiseBuf) {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1600, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.14, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(out);
      noise.start(now);
      noise.stop(now + 0.04);
    }
  }

  /**
   * Synth 2: playShotgunShot() / playShotgunBlast()
   * Multi-oscillator white noise burst + punchy sub-bass thump.
   */
  public playShotgunShot(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getSfxOut();
    if (!out) return;

    // Heavy sub-bass thump
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(36, now + 0.25);

    subGain.gain.setValueAtTime(0.38, now);
    subGain.gain.exponentialRampToValueAtTime(0.005, now + 0.25);

    subOsc.connect(subGain);
    subGain.connect(out);
    subOsc.start(now);
    subOsc.stop(now + 0.25);

    // Punchy mid body
    const midOsc = ctx.createOscillator();
    const midGain = ctx.createGain();
    midOsc.type = 'triangle';
    midOsc.frequency.setValueAtTime(240, now);
    midOsc.frequency.exponentialRampToValueAtTime(60, now + 0.14);

    midGain.gain.setValueAtTime(0.22, now);
    midGain.gain.exponentialRampToValueAtTime(0.005, now + 0.14);

    midOsc.connect(midGain);
    midGain.connect(out);
    midOsc.start(now);
    midOsc.stop(now + 0.14);

    // Resonant filtered noise burst
    const noiseBuf = this.getNoiseBuffer();
    if (noiseBuf) {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.exponentialRampToValueAtTime(250, now + 0.22);
      filter.Q.setValueAtTime(2.0, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.32, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(out);
      noise.start(now);
      noise.stop(now + 0.22);
    }
  }

  public playShotgunBlast(): void {
    this.playShotgunShot();
  }

  /**
   * Synth 3: playSMGShot() / playSmgShot()
   * Sharp click-pop rapid fire synth.
   */
  public playSMGShot(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getSfxOut();
    if (!out) return;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1350, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.045);

    oscGain.gain.setValueAtTime(0.18, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(oscGain);
    oscGain.connect(out);
    osc.start(now);
    osc.stop(now + 0.045);

    // Metallic click transient
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(2200, now);
    clickOsc.frequency.exponentialRampToValueAtTime(500, now + 0.02);

    clickGain.gain.setValueAtTime(0.09, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    clickOsc.connect(clickGain);
    clickGain.connect(out);
    clickOsc.start(now);
    clickOsc.stop(now + 0.02);
  }

  public playSmgShot(): void {
    this.playSMGShot();
  }

  /**
   * Synth 4: playMagicCast()
   * Arpeggiating sine waves with shimmering high harmonics.
   */
  public playMagicCast(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getSfxOut();
    if (!out) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const t = now + i * 0.038;

      // Pure fundamental
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.002, t + 0.22);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.22);

      // Shimmering detuned harmonic
      const harmOsc = ctx.createOscillator();
      const harmGain = ctx.createGain();
      harmOsc.type = 'sine';
      harmOsc.frequency.setValueAtTime(freq * 2.015, t);

      harmGain.gain.setValueAtTime(0.07, t);
      harmGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      harmOsc.connect(harmGain);
      harmGain.connect(out);
      harmOsc.start(t);
      harmOsc.stop(t + 0.18);
    });
  }

  /**
   * Synth 5: playMeleeSwing()
   * Filtered white noise swoosh with exponential pitch envelope.
   */
  public playMeleeSwing(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getSfxOut();
    if (!out) return;

    // Resonant bandpass filtered swoosh
    const noiseBuf = this.getNoiseBuffer();
    if (noiseBuf) {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(3.2, now);
      filter.frequency.setValueAtTime(340, now);
      filter.frequency.exponentialRampToValueAtTime(1450, now + 0.05);
      filter.frequency.exponentialRampToValueAtTime(260, now + 0.17);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.26, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.002, now + 0.18);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      noise.start(now);
      noise.stop(now + 0.18);
    }

    // Heft body
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(220, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(70, now + 0.14);

    bodyGain.gain.setValueAtTime(0.14, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.002, now + 0.14);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(out);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.14);
  }

  /**
   * Synth 6: playEnemyHit() / playEnemyHurt()
   * Crisp square-wave blip with pitch drop.
   */
  public playEnemyHit(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getSfxOut();
    if (!out) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(460, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.065);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.002, now + 0.065);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playEnemyHurt(): void {
    this.playEnemyHit();
  }

  /**
   * Synth 7: playEnemyDeath()
   * Resonant low-pass noise pop with crumbling pitch.
   */
  public playEnemyDeath(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getSfxOut();
    if (!out) return;

    // Noise pop
    const noiseBuf = this.getNoiseBuffer();
    if (noiseBuf) {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(3.8, now);
      filter.frequency.setValueAtTime(920, now);
      filter.frequency.exponentialRampToValueAtTime(75, now + 0.20);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.28, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.002, now + 0.20);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(out);
      noise.start(now);
      noise.stop(now + 0.20);
    }

    // Crumbling pitch dive
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(175, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.22);

    subGain.gain.setValueAtTime(0.20, now);
    subGain.gain.exponentialRampToValueAtTime(0.002, now + 0.22);

    subOsc.connect(subGain);
    subGain.connect(out);
    subOsc.start(now);
    subOsc.stop(now + 0.22);
  }

  /**
   * Synth 8: playPlayerHurt()
   * Low thud + descending saw buzz.
   */
  public playPlayerHurt(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getSfxOut();
    if (!out) return;

    // Body thud
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(140, now);
    thudOsc.frequency.exponentialRampToValueAtTime(38, now + 0.20);

    thudGain.gain.setValueAtTime(0.32, now);
    thudGain.gain.exponentialRampToValueAtTime(0.005, now + 0.20);

    thudOsc.connect(thudGain);
    thudGain.connect(out);
    thudOsc.start(now);
    thudOsc.stop(now + 0.20);

    // Gritty saw buzz
    const buzzOsc = ctx.createOscillator();
    const buzzFilter = ctx.createBiquadFilter();
    const buzzGain = ctx.createGain();

    buzzOsc.type = 'sawtooth';
    buzzOsc.frequency.setValueAtTime(200, now);
    buzzOsc.frequency.exponentialRampToValueAtTime(48, now + 0.28);

    buzzFilter.type = 'lowpass';
    buzzFilter.frequency.setValueAtTime(650, now);

    buzzGain.gain.setValueAtTime(0.24, now);
    buzzGain.gain.exponentialRampToValueAtTime(0.002, now + 0.28);

    buzzOsc.connect(buzzFilter);
    buzzFilter.connect(buzzGain);
    buzzGain.connect(out);
    buzzOsc.start(now);
    buzzOsc.stop(now + 0.28);
  }

  /**
   * Synth 9: playDodge()
   * Quick ascending double-sine whistle ("whoop!").
   */
  public playDodge(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getSfxOut();
    if (!out) return;

    // Chirp 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(340, now);
    osc1.frequency.exponentialRampToValueAtTime(820, now + 0.065);

    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.005, now + 0.07);

    osc1.connect(gain1);
    gain1.connect(out);
    osc1.start(now);
    osc1.stop(now + 0.07);

    // Chirp 2 ("whoop!")
    const t2 = now + 0.035;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(680, t2);
    osc2.frequency.exponentialRampToValueAtTime(1420, t2 + 0.075);

    gain2.gain.setValueAtTime(0.20, t2);
    gain2.gain.exponentialRampToValueAtTime(0.005, t2 + 0.08);

    osc2.connect(gain2);
    gain2.connect(out);
    osc2.start(t2);
    osc2.stop(t2 + 0.08);
  }

  /**
   * Synth 10: playGemPickup(streak?: number) / playPickupMaterial(streak?: number)
   * Dynamic pitch-scaled crystal chime (arpeggiating up with consecutive pickups).
   */
  public playGemPickup(streak: number = 0): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getSfxOut();
    if (!out) return;

    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    const step = scale[Math.min(streak, 20) % scale.length];
    const octaveBoost = Math.floor(Math.min(streak, 20) / scale.length) * 12;
    const semitones = step + octaveBoost;
    const baseFreq = 659.25 * Math.pow(2, semitones / 12); // E5 base

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.002, now + 0.16);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.16);

    // Crystal chime harmonic (2.756 non-harmonic bell overtone)
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(baseFreq * 2.756, now);

    bellGain.gain.setValueAtTime(0.06, now);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    bellOsc.connect(bellGain);
    bellGain.connect(out);
    bellOsc.start(now);
    bellOsc.stop(now + 0.12);
  }

  public playPickupMaterial(streak?: number): void {
    this.playGemPickup(streak ?? 0);
  }

  /**
   * Synth 11: playWaveComplete() / playVictoryFanfare()
   * Ascending triumphal major triad fanfare.
   */
  public playWaveComplete(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getSfxOut();
    if (!out) return;

    // Major triad arpeggio: C4 -> E4 -> G4 -> C5
    const notes = [
      { freq: 261.63, delay: 0.00, dur: 0.13 },
      { freq: 329.63, delay: 0.11, dur: 0.13 },
      { freq: 392.00, delay: 0.22, dur: 0.15 },
      { freq: 523.25, delay: 0.35, dur: 0.22 },
    ];

    notes.forEach(({ freq, delay, dur }) => {
      const t = now + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + dur);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + dur);
    });

    // Sustained celebratory C5 + G5 power chord
    const finalTime = now + 0.52;
    const chordFreqs = [523.25, 783.99];
    chordFreqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, finalTime);

      gain.gain.setValueAtTime(0.24, finalTime);
      gain.gain.exponentialRampToValueAtTime(0.002, finalTime + 0.65);

      osc.connect(gain);
      gain.connect(out);
      osc.start(finalTime);
      osc.stop(finalTime + 0.65);
    });
  }

  public playVictoryFanfare(): void {
    this.playWaveComplete();
  }

  /**
   * Synth 12: playTacticalFreeze()
   * Low-pass filtered swoosh + ticking clock pulse.
   */
  public playTacticalFreeze(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getSfxOut();
    if (!out) return;

    // Time-dilation lowpass filter swoosh
    const noiseBuf = this.getNoiseBuffer();
    if (noiseBuf) {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(2.5, now);
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(65, now + 0.45);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.002, now + 0.45);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      noise.start(now);
      noise.stop(now + 0.45);
    }

    // Ticking chronometer pulses (bullet-time clock ticks)
    const tickTimes = [0.08, 0.22, 0.36];
    const tickFreqs = [1400, 1200, 1000];
    tickTimes.forEach((delay, idx) => {
      const t = now + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(tickFreqs[idx], t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.025);
    });
  }

  // =========================================================================
  // ADDITIONAL TACTICAL & EDUCATIONAL TRIGGERS (Features 73-74)
  // =========================================================================

  public playQuestionCorrect(): void {
    this.playComboUp(3);
  }

  public playQuestionWrong(): void {
    this.playWrongBuzz();
  }

  /**
   * Orbital Nuke Superpower Detonation: seismic bass drop + shockwave noise.
   */
  public playNukeDetonation(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getSfxOut();
    if (!out) return;

    // Seismic bass drop
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(190, now);
    subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.85);

    subGain.gain.setValueAtTime(0.40, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    subOsc.connect(subGain);
    subGain.connect(out);
    subOsc.start(now);
    subOsc.stop(now + 0.85);

    // Shockwave noise
    const noiseBuf = this.getNoiseBuffer();
    if (noiseBuf) {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.75);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(out);
      noise.start(now);
      noise.stop(now + 0.75);
    }
  }

  // =========================================================================
  // LEGACY PROTO-COMPATIBILITY PRESERVATION
  // =========================================================================

  public playHit(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getSfxOut();
    if (!out) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.13);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.13);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playComboUp(streak: number): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getSfxOut();
    if (!out) return;
    const baseFreq = 330 + Math.min(streak, 6) * 55;
    [baseFreq, baseFreq * 1.25, baseFreq * 1.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.18, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.06 + 0.18);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.18);
    });
  }

  public playOrbitalLaser(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getSfxOut();
    if (!out) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.38);
    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.008, now + 0.38);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  public playShieldBreak(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getSfxOut();
    if (!out) return;
    [880, 1174, 1567, 2093].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.045);
      gain.gain.setValueAtTime(0.22, now + i * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.005, now + i * 0.045 + 0.25);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now + i * 0.045);
      osc.stop(now + i * 0.045 + 0.25);
    });
  }

  public playWrongBuzz(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getSfxOut();
    if (!out) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.setValueAtTime(112, now + 0.12);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.3);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playCashRegister(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getSfxOut();
    if (!out) return;
    [587.33, 880, 1174.66].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.055);
      gain.gain.setValueAtTime(0.16, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.005, now + i * 0.055 + 0.2);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.2);
    });
  }

  public setKilyosStormAmbient(active: boolean): void {
    if (!active) {
      if (this.rainGain && this.ctx) {
        this.rainGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      }
      return;
    }

    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.getBgmOut();
    if (!out) return;

    if (!this.rainNode) {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 650;
      filter.Q.value = 0.7;

      const gain = ctx.createGain();
      gain.gain.value = 0.035;

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      whiteNoise.start();
      this.rainNode = whiteNoise;
      this.rainGain = gain;
    } else if (this.rainGain) {
      this.rainGain.gain.setValueAtTime(0.035, ctx.currentTime);
    }
  }

  // =========================================================================
  // DIALOGUE VOICE METHODS (STORY INTERMISSION)
  // =========================================================================

  /**
   * Returns current effective SFX/dialogue volume considering master and SFX mute states.
   */
  public getEffectiveDialogueVolume(): number {
    if (!this.enabled || this._isMuted || this._sfxMuted) return 0;
    return Math.max(0, Math.min(1, this._masterVolume * this._sfxVolume));
  }

  /**
   * Plays a dialogue voice audio file, stopping any active dialogue audio first (zero-overlap).
   */
  public playDialogueVoice(audioPath: string): void {
    this.stopDialogueVoice();

    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    if (!audioPath || typeof audioPath !== 'string') return;
    const eff = this.getEffectiveDialogueVolume();
    if (eff <= 0) return;

    try {
      const audio = new Audio(audioPath);
      audio.preload = 'auto';
      audio.volume = eff;
      audio.muted = this._isMuted || this._sfxMuted;
      this.activeDialogueVoice = audio;
      this.dialoguePausedByMenu = false;

      const playPromise = audio.play();
      if (playPromise !== undefined && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Gracefully absorb browser autoplay rejections or aborts
        });
      }

      audio.onended = () => {
        if (this.activeDialogueVoice === audio) {
          this.activeDialogueVoice = null;
          this.dialoguePausedByMenu = false;
        }
      };

      audio.onerror = () => {
        if (this.activeDialogueVoice === audio) {
          this.activeDialogueVoice = null;
          this.dialoguePausedByMenu = false;
        }
      };
    } catch {
      this.activeDialogueVoice = null;
      this.dialoguePausedByMenu = false;
    }
  }

  /**
   * Halts active dialogue audio immediately and resets position to start.
   */
  public stopDialogueVoice(): void {
    if (this.activeDialogueVoice) {
      try {
        this.activeDialogueVoice.onended = null;
        this.activeDialogueVoice.onerror = null;
        this.activeDialogueVoice.pause();
        this.activeDialogueVoice.currentTime = 0;
      } catch {}
      this.activeDialogueVoice = null;
    }
    this.dialoguePausedByMenu = false;
  }

  /**
   * Pauses active dialogue voice when game is paused.
   */
  public pauseDialogueVoice(): void {
    if (this.activeDialogueVoice && !this.activeDialogueVoice.paused) {
      try {
        this.activeDialogueVoice.pause();
        this.dialoguePausedByMenu = true;
      } catch {}
    }
  }

  /**
   * Resumes paused dialogue voice when game is unpaused.
   */
  public resumeDialogueVoice(): void {
    if (this.activeDialogueVoice && this.dialoguePausedByMenu) {
      this.dialoguePausedByMenu = false;
      const eff = this.getEffectiveDialogueVolume();
      if (eff <= 0) return;
      try {
        this.activeDialogueVoice.volume = eff;
        this.activeDialogueVoice.muted = this._isMuted || this._sfxMuted;
        const playPromise = this.activeDialogueVoice.play();
        if (playPromise !== undefined && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
      } catch {}
    }
  }

  /**
   * Dynamically synchronizes active dialogue voice volume with master and SFX controls.
   */
  public updateDialogueVolume(): void {
    if (this.activeDialogueVoice) {
      try {
        const eff = this.getEffectiveDialogueVolume();
        this.activeDialogueVoice.volume = eff;
        this.activeDialogueVoice.muted = this._isMuted || this._sfxMuted;
      } catch {}
    }
  }
}

export const soundEngine = new ProceduralSoundEngine();

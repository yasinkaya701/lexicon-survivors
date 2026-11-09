/**
 * Headless GameLoop & Delta-Time Ticker Module
 * Fully decoupled from React lifecycle. Runs in both Node.js (automated unit/E2E tests)
 * and browser Canvas environments via requestAnimationFrame.
 *
 * Enforces:
 * - Maximum delta-time clamping (dt <= 0.05s) to eliminate tab-switch physics explosions.
 * - Frame-accurate tactical freeze (dt = 0) during YKS/BUEPT study and mystery chest events.
 * - Pause / resume lifecycle management with event listeners.
 */

export const MAX_DELTA_TIME_SEC = 0.05; // 50ms cap (prevents physics explosion)
export const TARGET_FPS = 60;
export const FIXED_TIMESTEP_SEC = 1 / TARGET_FPS;

export type GameLoopState = 'stopped' | 'running' | 'paused';

export interface GameLoopMetrics {
  fps: number;
  frameCount: number;
  simulationTimeSec: number;
  realTimeSec: number;
  lastDeltaTimeSec: number;
}

export type UpdateCallback = (dt: number, metrics: GameLoopMetrics) => void;
export type RenderCallback = (alpha: number, metrics: GameLoopMetrics) => void;
export type StateChangeCallback = (state: GameLoopState) => void;

export class GameLoop {
  private state: GameLoopState = 'stopped';
  private animationFrameId: number | null = null;
  private lastTimestampMs: number = 0;
  private isTacticalFreezeActive: boolean = false;

  // Metrics
  private frameCount: number = 0;
  private simulationTimeSec: number = 0;
  private realTimeSec: number = 0;
  private currentFps: number = TARGET_FPS;
  private lastDeltaTimeSec: number = FIXED_TIMESTEP_SEC;

  // FPS smoothing window
  private fpsBuffer: number[] = [];
  private readonly fpsBufferSize: number = 30;

  // Callbacks
  private updateCallbacks: Set<UpdateCallback> = new Set();
  private renderCallbacks: Set<RenderCallback> = new Set();
  private stateChangeCallbacks: Set<StateChangeCallback> = new Set();

  constructor(private readonly maxDtSec: number = MAX_DELTA_TIME_SEC) {}

  // --------------------------------------------------------------------------
  // Lifecycle Controls
  // --------------------------------------------------------------------------

  public start(): void {
    if (this.state === 'running') return;

    this.state = 'running';
    this.lastTimestampMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.notifyStateChange();

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      const loop = (timestamp: number) => {
        if (this.state !== 'stopped') {
          this.tick(timestamp);
          this.animationFrameId = window.requestAnimationFrame(loop);
        }
      };
      this.animationFrameId = window.requestAnimationFrame(loop);
    }
  }

  public stop(): void {
    if (this.state === 'stopped') return;

    this.state = 'stopped';
    if (this.animationFrameId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.notifyStateChange();
  }

  public pause(): void {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.notifyStateChange();
  }

  public resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this.lastTimestampMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.notifyStateChange();
  }

  public togglePause(): boolean {
    if (this.state === 'running') {
      this.pause();
      return true;
    } else if (this.state === 'paused') {
      this.resume();
      return false;
    }
    return false;
  }

  /**
   * Sets tactical freeze state (e.g. during YKS/BUEPT tactical question events).
   * Freezes simulation delta-time to dt = 0, while keeping the rendering loop active.
   */
  public setTacticalFreeze(frozen: boolean): void {
    this.isTacticalFreezeActive = frozen;
  }

  public isFrozen(): boolean {
    return this.isTacticalFreezeActive;
  }

  public getState(): GameLoopState {
    return this.state;
  }

  // --------------------------------------------------------------------------
  // Execution & Step Ticking
  // --------------------------------------------------------------------------

  /**
   * Manual deterministic step execution for automated tests (Node.js headless).
   */
  public step(customDt?: number): void {
    const dt = customDt !== undefined ? customDt : FIXED_TIMESTEP_SEC;
    this.executeFrame(dt);
  }

  private tick(timestamp: number): void {
    const elapsedMs = timestamp - this.lastTimestampMs;
    this.lastTimestampMs = timestamp;

    let rawDtSec = elapsedMs / 1000;
    if (rawDtSec < 0) rawDtSec = 0;

    // Track real time
    this.realTimeSec += rawDtSec;

    // Update FPS smoothing calculation
    if (rawDtSec > 0) {
      const instantFps = 1 / rawDtSec;
      this.fpsBuffer.push(instantFps);
      if (this.fpsBuffer.length > this.fpsBufferSize) {
        this.fpsBuffer.shift();
      }
      this.currentFps = Math.round(
        this.fpsBuffer.reduce((a, b) => a + b, 0) / this.fpsBuffer.length
      );
    }

    // CLAMPING: Clamp delta time to maxDtSec (0.05s) to eliminate tab-switch physics explosions!
    let dt = Math.min(rawDtSec, this.maxDtSec);

    // If game is paused or tactical freeze is active, dt is strictly 0.0
    if (this.state === 'paused' || this.isTacticalFreezeActive) {
      dt = 0;
    }

    this.executeFrame(dt);
  }

  private executeFrame(dt: number): void {
    this.frameCount++;
    this.simulationTimeSec += dt;
    this.lastDeltaTimeSec = dt;

    const metrics = this.getMetrics();

    // 1. Update simulation state
    for (const callback of this.updateCallbacks) {
      callback(dt, metrics);
    }

    // 2. Render graphics (alpha = 1.0)
    for (const callback of this.renderCallbacks) {
      callback(1.0, metrics);
    }
  }

  // --------------------------------------------------------------------------
  // Metrics & Listeners
  // --------------------------------------------------------------------------

  public getMetrics(): GameLoopMetrics {
    return {
      fps: this.currentFps,
      frameCount: this.frameCount,
      simulationTimeSec: this.simulationTimeSec,
      realTimeSec: this.realTimeSec,
      lastDeltaTimeSec: this.lastDeltaTimeSec,
    };
  }

  public onUpdate(callback: UpdateCallback): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  public onRender(callback: RenderCallback): () => void {
    this.renderCallbacks.add(callback);
    return () => this.renderCallbacks.delete(callback);
  }

  public onStateChange(callback: StateChangeCallback): () => void {
    this.stateChangeCallbacks.add(callback);
    return () => this.stateChangeCallbacks.delete(callback);
  }

  private notifyStateChange(): void {
    for (const cb of this.stateChangeCallbacks) {
      cb(this.state);
    }
  }

  public resetMetrics(): void {
    this.frameCount = 0;
    this.simulationTimeSec = 0;
    this.realTimeSec = 0;
    this.fpsBuffer = [];
    this.currentFps = TARGET_FPS;
  }
}

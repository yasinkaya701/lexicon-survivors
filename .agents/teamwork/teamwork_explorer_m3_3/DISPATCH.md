# Dispatch: teamwork_explorer_m3_3

**Role**: Canvas VFX, Floating Text & Particle Polish Explorer for Milestone 3.
**Objective**:
1. Inspect `src/components/GameCanvas.tsx` to understand the current canvas rendering pipeline.
2. Design high-performance visual polish systems:
   - **Floating Combat Text System**:
     * Numbers for regular damage (white/yellow).
     * Bold large numbers for critical hits (red/orange, with scaling bounce).
     * Blue/cyan `'DODGE!'` text with upward float and fade-out.
     * Green heal numbers (`+3 HP`).
     * Maximum active pool (e.g. 50 items) with recycling to prevent GC stutter.
   - **Particle VFX Engine**:
     * Hit sparks, blood/dust splatters, weapon muzzle flashes, drop sparkle rings.
     * Pre-allocated particle pool for 60 FPS performance without allocation lag.
   - **Juice & Feel**:
     * Screen shake on heavy impacts and player hurt (decaying offset).
     * Hit stop (1-2 frame freeze on critical kills).
     * Enemy flash (white silhouette overlay on hit for 0.08s).
3. Provide ready-to-use TypeScript code for `VFXManager.ts` and `FloatingTextManager.ts`.
4. Write `handoff.md` with complete findings and code recommendations.


## 2026-11-03T19:17:42Z
Investigate high-performance canvas visual effects: floating combat text (damage, crits, DODGE, heal), particle VFX engine (sparks, muzzle flashes, splatters), screen shake, and hit flash overlays at 60 FPS.
Provide concrete drop-in TypeScript architectures for `FloatingTextManager.ts` and `VFXManager.ts`.
Write your full report to handoff.md in your working directory and notify the orchestrator with send_message when done.

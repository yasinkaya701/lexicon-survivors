# Dispatch: teamwork_explorer_m2_1
Role: Movement & Combat Physics Explorer
Mission: Design the implementation architecture for `src/game/engine/`:
1. 360-degree vector kinematics (position, velocity, acceleration, damping friction 0.88).
2. Sliding rectangular arena boundary collisions ($[100, 1820] \times [100, 980]$).
3. 60% dodge avoidance roll mechanics and visual indicators.
4. Delta-time ticker and requestAnimationFrame game loop decoupled from React.
Original Request: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/ORIGINAL_REQUEST.md
Project Index: /Users/afurkanmac/Downloads/hackhaton/PROJECT.md
Working Directory: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m2_1/
## 2026-11-03T18:40:10Z
Role: Movement & Combat Physics Explorer (teamwork_explorer_m2_1)
MISSION (Milestone 2 - Movement & Combat Physics Architecture):
Design the pure TypeScript engine modules for `src/game/engine/`:
1. `Vector2D.ts` and `Kinematics.ts`:
   - 2D vector operations (add, sub, mul, normalize, dot, distance, clamp).
   - 360-degree player movement with acceleration (2400 px/s^2) and friction damping (mu = 0.88).
   - Diagonal input normalization (sqrt(2) bug prevention).
2. `Collision.ts`:
   - Sliding boundary collision against rectangular arena ([100, 1820] x [100, 980]).
   - Circle-circle entity collision and circle-oriented-box melee collision.
3. `Dodge.ts`:
   - Dodge avoidance roll algorithm strictly clamped to 60% maximum cap.
   - Generates dodge visual alert event with 0 damage response.
4. `GameLoop.ts`:
   - Decoupled requestAnimationFrame ticker with delta-time clamping (dt <= 0.05s) to prevent tab-switching physics explosions.
   - Pause / resume lifecycle hooks.

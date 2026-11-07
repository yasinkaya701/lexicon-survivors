# Library Exploration, Mobile Controls, and Run Progress Design

## Intent

Make Lexicon Survivors feel like a physical library roguelite rather than a character sprite sliding around an invisible box. A player should reach the visible bookshelves, see readable movement and weapon actions, use the full game on a phone in either browser or Godot, understand the run economy, and compare a completed run with other players. A short opening sequence should establish the game's archival identity without delaying the first input.

## Current Evidence

- The web client clamps player position to `x ±1168`, `y ±868`; its bookshelf frame is drawn centered on the player, so the visible room follows the camera instead of defining a fixed world edge.
- Godot uses invisible rectangular walls near `x ±1200`, `y ±900`. The library frame is 2800×2100 world units, but `scripts/arena_frame.gd` also draws a second 4400×3300 copy behind it. The usable floor artwork reaches close to the frame's bookshelf perimeter.
- Web has touch inventory and gadget buttons. They respond to Playwright touch input at 390×844, but the inventory button sits within the bottom safe-area risk region on notched phones. The Godot HUD has neither touch buttons nor an inventory/loadout panel; gadget activation only accepts keyboard or mouse input.
- All six heroes have four-frame idle/run/attack sets. Each automatic weapon shot currently sets a 0.28-second hero attack timer, interrupting locomotion repeatedly. The weapon sprite has recoil and muzzle flashes, but the hero pose is not chosen by weapon action.
- Web and Godot duplicate balance catalogs. The current Quill Blaster and starting currency differ between them, so the same purchases and early-run decisions do not match.
- There is no server-side score storage. The public game runs from GitHub Pages. Cloudflare Wrangler is installed through `npx` but the saved auth is expired; no Worker or D1 resource exists in this repository.
- The title/character-select view opens immediately. It has no separate skip-able first-launch sequence.

## Goals

1. Make movement continuous while automatic weapons fire. Aim, recoil, melee swings, and casting should read as actions with anticipation and recovery; an idle/run loop must not be replaced on every projectile.
2. Give both mobile builds explicit inventory and gadget actions. Touch targets must sit above phone safe areas, provide visible cooldown/selection feedback, and remain usable with a modal open or closed as appropriate.
3. Make the visible library boundary truthful. The player should walk to the inside face of the bookshelf art, see the shelves in the camera, and stop against their actual collision surface. Remove the camera-following duplicate frame.
4. Use one canonical balance dataset for weapon price, damage, cadence, and relevant utility. Godot and web should agree on run-start currency, wave income, purchase results, and equipped weapon behavior. Tune prices against effective damage/output and ink income while preserving the wave-by-wave game loop.
5. Provide a cross-device, anonymous global leaderboard on Cloudflare Worker + D1, plus local personal records when offline. The online API should validate and bound submissions, rate-limit abuse, sanitize display names, expose only public ranked fields, and state clearly that scores are client-reported in v1.
6. Add a brief title opening sequence with a skip path and reduced-motion behavior in both runtimes.
7. Keep the existing GitHub Pages game URL working and deploy the leaderboard Worker separately after Cloudflare authorization is refreshed.

## Anti-Goals and Constraints

- Do not turn the game into survival-until-full-screen-cap play; waves remain discrete and the player retains the current choice to advance.
- Do not add decorative invisible walls or create a fake open map beyond the actual shelf line.
- Do not allow leaderboard submissions to contain personal data or provide an account/login system in this pass.
- Do not describe the client-submitted score table as cheat-proof. The client owns simulation today; v1 validation and rate limits can reject malformed/impossible values but cannot prove a run was honestly played.
- This is a 2D pixel-art game; use layered sprite poses, weapon sprites, particles, and UI motion rather than introducing 3D assets.
- The existing Pages deployment is static. A persistent global board requires a server endpoint and a connected Cloudflare account. Do not put API tokens in the browser or commit them.
- Godot's Web export template is not installed. The current public HTML/JS build remains the deployable browser client; native Godot parity is developed and verified separately until an export template is available.

## Approaches Considered

| Approach | Benefits | Trade-offs |
| --- | --- | --- |
| Cloudflare Worker + D1 | Fits the existing static Pages client; shared SQL-backed ranking; can validate and rate-limit at the API edge; selected by the user | Requires refreshed Cloudflare login, D1 creation/migration, and a separate Worker deployment |
| Render service + database | Flexible application server and SQL database | Requires selecting a Render workspace, operating an additional service, and may incur continuing cost |
| Browser localStorage only | No backend setup and works offline | Rankings stay on one browser/device and do not satisfy a shared leaderboard |

**Selected:** Cloudflare Worker + D1. The UI will work offline with local records while remote results load or when the API is unavailable, and will label local records separately from the global ranking.

## Design

### Movement and bookshelf collision

Treat the 2800×2100 arena frame as one fixed world object centered at the origin in both runtimes. Derive the playable rectangle from the frame art's inner shelf face, subtracting the player collider radius so the sprite's feet/body reach the visible edge without clipping through shelves. Use the same named bounds in web and Godot. Godot should use rendered shelf-edge collision shapes (or boundary collision meshes with a visible shelf collision mask) at those exact coordinates. The web renderer should draw the frame at fixed world coordinates and apply equivalent bounds, rather than moving the frame with the player. Keep the camera focused on the player and prevent showing large empty space outside the room at the edge of the camera view. Preserve current enemy spawn safe distance relative to the player and keep all wave/boss spawn points inside the playable floor.

### Mobile controls and inventory

In Godot, add a touch-only HUD cluster with high-contrast, icon-led buttons for active gadget, weapon cycle, and inventory. Add an inventory/loadout panel showing owned weapons and gadgets; tapping an owned item selects it through existing `StatsManager` methods, and the gadget control calls the player's actual activation method with current movement direction (falling back to facing). Provide visible cooldown and active-slot state. Bind the same inventory action to `I` on desktop. Use anchors and safe-area insets rather than fixed screen coordinates. The web build retains its existing controls, gains safe-area offsets and larger touch hit areas, and keeps a reachable close action when the inventory modal is open.

### Animation and combat readability

Separate locomotion animation from automatic firing. Change hero attack pose only for an actual active action with weapon-aware timing; ranged weapons use a short aim/recoil pose, melee weapons use wind-up/swing/recovery, and casts/area weapons use a distinct cast cue. Weapons keep their own recoil, rotation, flash, projectile trail, or swing arc. Direction should be reflected in aim and facing; diagonal movement should not freeze or repeatedly restart the run loop. Use the existing six hero animation assets as the base and add/replace frames only where inspection reveals a pose gap. Apply the same action timing rules in web and Godot.

### Shared economy

Create one versioned JSON balance source under `assets/data/` and copy it into the static web build. Godot loads it from `res://assets/data/`; web loads the shipped JSON before the game loop starts. It is the source for shared weapon economics and the initial ink value. Existing presentation metadata and runtime-only references can remain in their current catalogs, but shared gameplay fields must resolve from the canonical record. Before tuning, record current expected damage rate and purchase costs; avoid buffing all output without considering wave ink income. Add a compact parity check for all shared weapon IDs and key numeric fields. Keep persistence limited to cosmetic/unlock progression if added later; run ink resets between runs.

### Global leaderboard

Expose a public `GET /api/leaderboard?difficulty=...&limit=...` endpoint and a constrained `POST /api/leaderboard` endpoint for both Godot and web clients. D1 stores a generated submission ID, sanitized alias, highest wave cleared, kills, elapsed time, hero, difficulty, and timestamp. **Builder call for ranking:** sort by highest wave cleared descending, then kills descending, then elapsed time ascending; separate boards by difficulty so scores from different challenge levels do not mix. Do not introduce an arbitrary composite score when the existing game has no score system. The Worker uses prepared statements, validates field types/ranges and allowed character/difficulty IDs, applies a per-client rate limit, caps request size and page size, and returns a stable top list. Return CORS headers only for the game's published Pages origin; native Godot requests without an `Origin` header use the same validation and rate limit. Do not treat CORS as authentication or store raw IP addresses. Both clients save an alias locally and submit a run once after the result screen is finalized; duplicate retries use a submission ID. The UI shows a pending/success/offline state and a local personal-best list. Add a short integrity note in the leaderboard panel because scores are client-reported; deeper replay verification is future work.

### Opening sequence

Add a first-visit sequence lasting roughly 1.5–2 seconds: dark archive → illuminated book/shelf details → game title and selected hero. The title/character panel remains the destination; the sequence should end automatically, be skippable with a tap/Space, and be skipped on subsequent visits. Respect `prefers-reduced-motion` and Godot accessibility settings by using a quick fade instead of moving/scaling layers. Avoid forced sound; audio begins only after a user gesture.

## Deployment and Verification

- Develop in the current feature branch and preserve the existing turn-based wave model.
- Validate Godot project parsing, native scene instantiation, player-to-shelf collision, mobile touch HUD actions, and economy parity with focused regression coverage.
- Validate web mobile controls with real touch emulation including open/close inventory and gadget activation after closing it. Verify all screen sizes and no invisible wall before the shelf art.
- Validate the intro skip/reduced-motion paths and that a first-run launch still reaches character selection promptly.
- Run the Worker locally with a local D1 binding and migration; verify leaderboard reads, writes, bounds rejection, sanitized aliases, rate limits, and offline fallback.
- Deploy the Worker to the selected Cloudflare account only after its authentication is refreshed and the D1 binding exists; deploy the updated static web client to GitHub Pages after preview checks.

## Decisions Left to the Builder

- Exact shelf-contact coordinates should be measured from the source texture and confirmed in both engines; the intended target is the inner visible shelf face, approximately `x ±1245`, `y ±870` before collider-radius adjustment.
- Tune the shared economy from current catalog data and simulation rather than picking arbitrary buffs.
- Use a compact curated top list (default 20) and a generous but finite submission throttle; exact numeric thresholds should be set from actual run duration and expected play volume.
- Keep the game name and current English-learning themes; write all new UI copy in Turkish to match the existing interface.

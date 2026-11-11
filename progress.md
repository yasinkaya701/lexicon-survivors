Original prompt: Tasarım paketindeki DESIGN.md ve referansları web oyununa uygula; arayüzleri yeniden yaz, mekanikleri, karakter/canavar kimliklerini koru, erişilebilirlik ve akıcılığı geliştir; Luna ajanlarını kullan.

## Combat refinement release2 — 2026-11-09

Latest user steering implemented: battle action sizes/placement redesigned for portrait and landscape; Envanter replaces Çanta; redundant Silah action removed while equipped-slot/Q/E selection remains. Bottom-left joystick, bottom-right primary gadget plus inventory/notebook, bottom equipment rail and quiet upper HUD are separated. All action/equipment targets are at least48px; primary gadget is129×110 portrait/135×80 short landscape. Effective cooldown progress accounts for relic multipliers, with stable accessible labels. HUD HP text reserves icon space. At640×360 the chapter prose is compacted and redundant speed toast suppressed so notices do not cover Envanter/Defter; the layout regression now includes every visible notice in overlap checks.

Actual CDP two-finger regressions reproduce and resolve movement+gadget activation, inventory and notebook taps while joystick remains held, long-press duplicate-release suppression, inventory pause and resume; keyboard D+Space also passes. Shared action binding retains mouse/keyboard fallback and modal gates. New current HUD/decoy/guide art fixes the remaining stale appearances; settings descriptions wrap at844×390 and other large-text sizes.

Normal ordinary enemies now have1.15×HP/1.10×damage/1.04×speed and0.90×spawn interval; hard has1.20/1.15/1.06/0.88. Easy is unchanged. Bosses retain exactly5×HP and3×damage with previous timing, movement and rewards. Shared data controls pressure and missing values default to1.

Free TTS uses only browser SpeechSynthesis: role-aware Turkish/English voice choice, restrained pacing and punctuation pauses, replay/stale-queue cancellation, mute/level/voice selector/preview and persistence. No paid endpoint, key or service. Headless tests verify behavior, not subjective operating-system voice quality. A separate Luna worker built the adapter; independent Luna reviews checked input/layout/difficulty and resolved the48px equipment finding and secondary multi-touch gap.

Shadow Scribe's new masked masculine ninja portrait is shadow_lexicographer-selection-v3.webp, reused by selection/HUD/results/skilltree. Earlier softer candidate is unused. The dossier focal point keeps the eyes below its status ribbon. Story and six character identities remain canonical.

Loading no longer eagerly requests any legacy hero animation PNG; selected current/WebP/static fallback stays available. Controlled old-filter comparison requested85 legacy animation images totaling427,819 encoded bytes; new filter requests0. Total startup transfer is not compared as a simple reduction, because current weapon/room/actor assets also initialize earlier. Detailed local records are output/deploy/animation-loading-details.json. Existing lazy room fallback and WOFF2 are preserved.

Verification: all24 scripts passed in the broad local run; later targeted passes cover the final portrait, cooldown duration and48px correction. Final full run: /tmp/lexicon-refinement-final-suite.txt. Independent review: /tmp/lexicon-refinement-final-review.md (clean). Publication receipts live in output/deploy; source commit and public hashes are verified after push.


## Current release — 2026-11-09 (supersedes historical notes below)

User explicitly authorized optimization and deployment to the existing GitHub Pages site. Latest balance request: bosses have5×HP and3×raw damage; speed, telegraphs, attack intervals and rewards are unchanged. The isolated web worktree preserves the original dirty gameplay/voice changes; the main Godot checkout was not overwritten.

Final integration: mysterious v6 cover with canonical partial bosses and story clues; all six canonical heroes use96 freshly painted motion frames; all18 enemy identities now use120 new painted frames (128px regular,256px Red Pen/Dragon). The generic cartoon attempt was rejected and never activated. New enemies also appear in the bestiary. Multiweapon sockets surround the player, nearby-target aim originates at the real muzzle, inventory supports manual merging with a one-time hint. Connected skill tree, guide, quiz answer secrecy, fixed return action, story, character-specific endings, settings/audio, shop rows and responsive type are verified.

Local evidence:92 layout checks; large-text navigation including640×360; interface, quiz secrecy, sound settings, inventory merging, skill tree,12 endings,96 hero frames,120 enemy frames, four biomes, structures,96 muzzle rays,60 boss balance cases and loading regression pass. The78 deterministic combat comparison cases retain movement, damage, cadence and projectile properties except the expressly requested socket origins/aim axes; boss balance is an additional explicit user change. Unchanged HUD updates produce0DOM mutations. Current cold local transfer is about7MB versus13.49MB before; see docs/performance-2026-11-09.md for measured attribution and limits.

Release integrity: scripts/prepare-release.py stamps CSS/JS URLs by content hash and creates release.json. Deploy target: gh-pages root at https://yasinkaya701.github.io/lexicon-survivors/. Publication status is recorded after the push/build below.

## Historical working notes (outdated statuses are retained for provenance)

2026-11-08: Actual target is existing isolated gh-pages worktree pages-boss-zoom-20261108 (HEAD aa76c7b), with prior gameplay/voice dirty work. Baseline index.html/game.js copied to /tmp/lexicon-errata-baseline; do not reset. Main checkout build/web is older and intentionally not overwritten. User supplied design pack and direct execution request; using its chosen direction without another approval cycle. Plan: docs/superpowers/plans/2026-11-08-last-errata.md.

## Last Errata web UI implementation — 2026-11-08

Target remains `.worktrees/pages-boss-zoom-20261108` (published web, not main/build/web). Three Luna workers were used repeatedly for asset generation, scoped CSS/controller work, audits and reviews. All prior gameplay/voice edits in baseline preserved. No push/deploy/commit.

Implemented: deleted accumulated original inline CSS; new assets/ui/errata/theme.css and surfaces.css; title landing→3-visible horizontal character dossiers→CEFR/difficulty preparation; bespoke6 engraved canonical selection portraits with actual HP/damage/speed bars and story motive; true logo/art surfaces/buttons; shop six-category rail, illustrated word leaves, row-style armory using original highresweaponatlas; illustrated quizleaf+waxseal+letteredanswers; dark settings/pause; four-step infographic guide (user explicitly liked this); story separate art/text reading rail; inventory/mistakes/results/leaderboard; searchable word/weapon codex withCEFR filters, bestiary from actual18enemyrewardcatalog.

Behavior fixes in interface.js: modal focus trap/restoration, title inert/aria stacking, Escape flows, quiz dialog semantics/live result/Continuefocus, pause freezes simulation and shop countdown, mistake notebook gate fixed, carousel arrows refresh on entry/resize. Main game mechanics remain unchanged (difficulty display names nowRahat/Dengeli/Çetin; CEFRindependent). HUD120unchangedupdates:240DOMmutations before,0after two conditional attribute writes; red/green quiz semantics include textualoutcomes.

Verification scripts (Playwright loaded from ~/.codex/skills/develop-web-game/node_modules/playwright, overridePLAYWRIGHT_MODULE; GAME_URL defaults127.0.0.1:8000):
- test/interface.spec.cjs passed including new modal/countdown/quiz regressions.
- test/hud-performance.cjs passed.
- test/ui-layout.cjs captures92states across1280x720,1024x576,844x390,390x844 inoutput/errata-verification. Latest addition checks dossier copybounds and found ONE remaining clipped dossier at844x390. Fix this before final.
- Skill web_game_playwright_client ran full title→preparation→wave, moveandgadget. /tmp/lexicon-web-client-final/state-0.json modewave playerx562 cooldown4; screenshot inspected. No browsererrorfile.
- node--checkgame.js/interface.js andgitdiff--check passed.

Final independent review reports: /tmp/lexicon-final-review.md (behaviorfindings allfixed byinterfaceworker), /tmp/lexicon-layout-review.md (landscapeCTA/storycopyinitialfold fixed by finalCSSlandscapepatches; needfreshverification). Currentserver Pythonhttp8000session73125.

## Scope extension now active: STORY and ARENA / character holding

User latest: upgrade story + insidegame, arena versions of6heroes, correctweaponholding, modestupscaleallowed. Preserve combatparameters/hitboxes/range/cadence/economy andidentity.
Three Luna workers currently dispatched:
- interface_implementation read-only renderaudit => /tmp/lexicon-hero-render-audit.md
- surface_implementation read-only highressprite sourceatlas/mappingaudit => /tmp/lexicon-hero-assets-audit.md
- title_art generating4newtopdownworldbackgrounds underassets/ui/errata/world/{library,catacombs,observatory,final-page}.webp. Mustintegratewithoutgeometrychanges.
Existing engine assets: upgrade_v1/arena_frame_*.png1448x1086 drawn2800x2100; currentrender useshugeoldrotatinggoldrune. Newarenafloorandsubtleartgrounding planned. Heroanimationsources are mainrepo/output/imagegen/characters/source/*combat_animation_sheet.png1448x1086 (4columns3rows: idle/run/attack). Need audit exact extraction vs current v2runtime frames before changing. Currentrender88x88, collisionconstants15radiusvisualextents39.5x42 mustnotchange. ExistingweaponInHeroFrame suppression andprojectileMuzzle conventions needreview. SourceInky sheet shows quillblade physically held but userwantsimprovedweaponholdandcleanerarena sprites; do notinventnewheroidentity.

Root has NOT yet implemented arena/hero upgrades. Latest outstanding UItest: 844landscapeoneclippeddossiercopy. Broadcodecheck and finalreview needed after nextscope. Keepgoalactive untilbothscopeextensionsdone.

2026-11-08 continuation: User renewed Luna quota and explicitly clarified that the holding/clutter problem starts with multiple weapons. Resumed3Luna workers for renderfixes, faithful128px hero sourceextraction, andremaining3biomes. Root reproduced4weaponstack at/tmp/lexicon-multi-before.png. Inactiveweapons currentlysamefullsize and5pxapart; renderownerfixeslayering/scale while preservingmuzzlehelpers. Root addedflowingnoticesgroupbelowResizeObserver-measuredHUD, replacingoverlappingindependentpositions (chaptercardwascoveringmultiweaponHUD). Tacticalalerttakespriorityoverchapter/synergy. Addedtest/arena-presentation.cjs for6heroes×4biomes,projectilemuzzlecontracts,purerendering,multiweaponHUDboundsandeffectpreferences. Needsrunafterassetintegration.
Latest test/ui-layout.cjs:92checks,0failures,includingprevious844landscapeclippeddossier. Screenshotscharacter/shop/storyinspected. Storycanonicalbeat/backtestpassedearlier; rerunningbehavior/HUD/storyafterHUDgroupchange.

## Current state after live user review (supersedes earlier outstanding notes)

- User rejected compact weapons behind the hero and explicitly requested Brotato sockets. Multiweapon mounts now sit in a stable circle; sprite, muzzle flash and projectile launch use the same root/scale. User then requested closer spacing: final requested radii are44/48/56 for2/3–4/5–6 slots, sprites42px. Single-weapon holding remains. Core damage/cadence/range/collision logic is unchanged; launch origins intentionally follow the requested sockets.
- 78 deterministic far-target cases compare the pre-arena snapshot to the current build with constant RNG: movement, damage, cadence and projectile properties are preserved (positions excluded because sockets changed). Thirteen core simulation function blocks were also compared byte-for-byte to the snapshot. Before the new socket request, the original78 full-state comparisons passed including positions.
- Four new rooms integrated via world.js, lazy loaded; painted floor edges are mapped to the existing inner shelf bounds with nine-slice drawing. The old large central rune is removed for new rooms. New hero textures are128px canonical extracts, normalized with one common square crop per hero; old frames remain fallback. Loading is per selected character with coalesced repaint.
- Three new transparent structure props integrated at the real object coordinates, removing the old38px visual offset. Healing/bell/astrolabe effects are preserved. New victory/defeat archive art backs the character-specific result folio. Six portraits,12 distinct outcome headings, actual story motives/final dialogue and real run stats are used.
- UI notices now flow below measured HUD descendants, including absolute landscape weapon rows. Short landscape notices sit at right to clear the hero. New engraved HUD emblems and a curved route with real chapter stops replace the plain progress line.
- Quiz semantic answer leakage fixed: meaning and semantic effect copy are inserted only after submission, with unsafe translated examples excluded before answers. New secrecy regression passes. Continue now lives outside the quiz-content scroller so it remains visible.
- Global wheel cycling was switching weapons while scrolling quizzes. It is now restricted to active, uncovered gameplay canvas. Interface regression includes quiz scrolling and canvas cycling.
- Prep/dossier worker corrected book content insets, darkened text, restyled settings as ruled rows and reserved34px clear space around dossier flourishes. Tested an additional1220×960 window size and large text.

Still in progress: actual connected skill tree presentation and tab icons (interface_implementation); manual inventory merge and one-time purchase hint (surface_implementation); final art/layout audit (title_art). Root owns integration, result/structure/HUD verification and full regression suite. Do not mark goal complete before these finish and tests/screenshots are inspected. No deploy/push/commit authorized or performed.

## Release audit — 2026-11-09 (supersedes stale status above)

- Active publication URL: https://yasinkaya701.github.io/lexicon-survivors/ (HTTP 200; response `Last-Modified` 2026-11-07). The worktree is `codex/pages-boss-zoom-20261108`, at `aa76c7b`, equal to `origin/gh-pages` before these uncommitted changes.
- The `gh-pages` root contains `.nojekyll`, `index.html`, `game.js`, `questions.json`, and `assets/`; no deploy script or workflow is present in this branch. Prior release records document commits pushed to `gh-pages`. Publish target is the repository root served from `gh-pages`.
- The current worktree has uncommitted changes, so a normal push cannot publish them. They must first be recorded in a commit/ref that updates `gh-pages`; no commit, push, or deploy has been made in this audit. `gh` CLI was unavailable, so Pages settings/branch protection were not queried live.
- Final UI/layout review evidence is recorded in `/tmp/lexicon-release-ui-review.md`. It reports no open release blockers and lists passing checks for the 92-state layout sweep, large-text navigation (including 640×360 at DPR 2), interface, skill tree, sound settings, 12 character outcomes, story flow, quiz secrecy, inventory merge, HUD performance, arena structures, and arena presentation.
- The earlier statement that 13 simulation blocks remain byte-identical is superseded: the requested multiweapon aim helper changed intentionally so weapon sockets and projectile origins align. Deterministic far-target comparisons cover unchanged movement, damage, cadence, and projectile properties while excluding positions. No claim of byte-identical aim behavior should be carried forward.
- Earlier “still in progress” implementation list is stale: the skill tree/tab icons, manual merge/hint, art integration, and layout review are now implemented and included in the passing evidence above. Release/deployment remains pending.

## Canonical enemy art upgrade — 2026-11-09

- Generated and inspected two transparent 4×4 animation sheets referencing the existing canonical sprites, then exported 32 distinct 128×128 lossless WebP frames under `assets/ui/errata/arena-v4/enemies/` for Grammar Goblin, Typo Slime, Punctuation Phantom, Idiom Imp, Homophone Harpy, Tautology Twin, Dangling Modifier and Run-on Reaper.
- Each enemy occupies one row, with four distinct idle/hover poses in chronological columns. Exports retain the common grid framing so the authored bob/wing/cloak offsets remain stable; only detached tiny sheet specks were cleared. Per-file alpha, dimensions and frame uniqueness were checked. Runtime manifest integration is parent-owned and is not included in these asset changes.

### Enemy art correction — 2026-11-09

- The first `arena-v4` common-enemy sheet was rejected after review because it resembled generic monsters. Its files were saved outside the repo in `/tmp/lexicon-enemies-rejected-v1/`; none remain in product assets.
- Replaced those 32 frames with the reviewed canonical-reference sheets: current upgrade_v1 goblin/slime sprites plus high-resolution story-art boss references for the other six enemies, using Rune Sorceress v3 only for painterly finish. Parent reviewed `/tmp/arena-v4-canonical-enemies-contact.jpg` and approved all 32. Prompts and source paths are recorded in `assets/ui/errata/arena-v4/enemies/common-enemies-prompts.md`; each texture is 128×128 RGBA with transparent corners and four distinct poses per identity.

## Wave balance and illustrated collection surfaces — 2026-11-11

- Fixed the ordinary enemy HP curve at the 51/76 segment changes. It previously fell from 12.75× to 10.23× and from 28.02× to 23.28×. New curve carries the prior segment end forward while retaining prior values before wave 51. Spawn cadence, batch sizes and the 150-enemy cap are untouched.
- Replaced the character-selection paper cards and preparation open-book surface with dark portrait dossiers and two illustrated settings panels. Generated and integrated three WebP scenes plus distinct top-three rank marks for the global board; asset notes and image-generation direction are in `assets/ui/errata/ASSETS.md`.
- Local browser review: character/preparation at 1280×800, preparation at 390×844, global-board empty state and injected top-three sample entries. No horizontal overflow at mobile size; rank badges resolve to distinct local images. Global leaderboard API returned HTTP 200 and allowed the Pages origin; localhost browser testing falls back to local records because the API rejects localhost CORS.
- Browser evaluation checked the HP curve at every wave 1–100 and all 60 boss difficulty/wave cases; boss 5× HP/3× damage and all existing spawn-cap checkpoints remain intact. `node --check` and `git diff --check` passed. The standalone `test/boss-balance.cjs` runner could not launch because its Playwright headless browser binary is absent; equivalent balance assertions ran in the connected browser.
- Published on `gh-pages` as `f97ce4d` (`wave-continuity-collection-assets-20261111-5`); Pages build status is `built`.
- Verified live SHA-256 against `release.json` for `index.html`, `game.js`, the new stylesheet, and all six collection-art files. Live browser checks show the new character and preparation screens at 1280×800, preparation/leaderboard at 390×844 with no horizontal overflow, and real global leaderboard rows returned by the Worker.
- Rechecked the live 1–100 enemy HP curve (strictly increasing through waves 51 and 76) and the same spawn-cap checkpoints after deployment.

## Live UI defects, collection scenes and layout regression — 2026-11-12

- Audited the published release in the connected browser. The landing buttons were still picking up a higher-priority paper-border rule from `theme.css`; new CSS now gives them dark dossier styling while preserving the title art and palette.
- The catalogue atlas could show empty card tops during its first download/decode. Added intent-based image warmup for pointer, keyboard focus and touch; compressed both 1280×1280 atlases at WebP quality 82 and added versioned `-v2` filenames. The six new tab scenes total about 400 KB and are requested only when their view is opened.
- Added distinct, matching illustrations for word entries, the bestiary, weapons, settings, guide and leaderboard. Removed the duplicate empty-state podium overlay so the new leaderboard scene and podium art no longer compete.
- The 92-state viewport sweep exposed a character-card clipping regression at 1280×720: a stale 34px bottom margin pushed the dossier copy beyond its card. Reduced that margin to 8px; all six cards now retain a 7px or greater inset. The full 92-check layout sweep and `test/interface.spec.cjs` both pass against the local build; no browser console errors were observed.
- Dense-wave baseline on the currently deployed build using system Chrome headless (1280×720, wave 60 Hard, 150 enemies, 128 player and 128 enemy projectiles) measured 29.98 FPS, 2.2ms game-work p95 and zero frames over 50ms. This headless runtime is refresh-capped at 30 FPS; post-deploy measurement will use the same setup for comparison. No gameplay simulation or spawn limit changed.
- New release `wave-continuity-collection-scenes-20261111-6` is prepared. Deployment and live verification are pending.

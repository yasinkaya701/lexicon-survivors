# Combat controls and free narration refinement

Latest user requests extend the earlier closure audit: make the game harder, slightly optimize, fix gadget use while walking, redesign battle control sizes/positions for portrait and landscape, replace the Çanta label, remove the useless Silah action, add atmosphere to TTS without paid services via a Luna worker, make the ninja portrait more masculine, run an independent final check and publish.

## Global constraints
- Preserve six canonical identities and narrative, weapon mechanics, economy, cooldowns, hitboxes and arena dimensions.
- Bosses retain exactly5×HP and3×raw damage; unchanged boss speed/telegraphs/intervals/rewards.
- Ordinary pressure: easy all1; normal HP1.15/damage1.10/speed1.04/spawninterval0.90; hard HP1.20/damage1.15/speed1.06/spawninterval0.88. No increase to150 enemy cap.
- Existing painted assets, smooth framing; no paid TTS endpoints, keys or dependencies. Browser voice availability determines sound quality.
- Touch targets at least48px, primary gadget at least96px wide/76px tall. No joystick/equipment/action overlap at1280×720,1024×576,844×390,640×360,390×844.
- Envanter replaces Çanta. Remove standalone Silah button; equipment slots and keyboard selectors remain.

## Work and verification
- Input: actual CDP two-finger joystick+gadget regression, long-hold release suppression, keyboard D+Space and modal gate.
- Battle layout: isolated bottom-left movement, bottom-right primary gadget and inventory/notebook actions, lower equipment strip, upper HUD instruments; dock hidden during overlays.
- Closure: current HUD/decoy/guide art, wrapping settings copy in landscape, masculine masked Shadow Scribe portrait in selection/HUD/results/skilltree.
- Voice: role-aware Turkish/English voice selection, restrained pacing, punctuation pauses, replay/cancellation, mute/level/voice selector/preview, persistence; browser integration harness and no paid provider.
- Loading: no eager legacy hero animation PNG requests; current selected hero and static/WebP fallback remain. Record exact legacy request/body-byte saving, do not overclaim total transfer because more room/weapon/current art may initialize earlier.
- Independent Luna code/layout review after focused regressions, followed by release content hashes, Pages build and live checks.

## Completion evidence

All implementation items above are complete. Independent Luna review found the48px equipment gap; it was fixed, test observedredthen green, and scoped review cleared it. A second-finger inventory/notebook regression was also reproduced, fixed with the shared touch binding, and independently cleared. Full suite24scripts plus final narrow regressions pass; release2 content hashing and Pages publication follow.

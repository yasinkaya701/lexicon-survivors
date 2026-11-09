# Dispatch to teamwork_spec_miner_survey_2
Role: Question Buff & Asset Spec Miner
Mission: Document specifications for YKS/BUEPT educational question integration (inspecting src/data/questions.ts, study buffs, tactical pause events, category accuracy tracking) and the visual & audio asset inventory and architecture.
Original Request: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/ORIGINAL_REQUEST.md
Working Directory: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey_2/

## 2026-11-03T18:02:27Z
You are teamwork_spec_miner_survey_2.
Your working directory is: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey_2/
You MUST read /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/ORIGINAL_REQUEST.md before starting.
Also read /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey_2/DISPATCH.md.

Node environment: export PATH="$HOME/.local/node/bin:$PATH"

MISSION:
Investigate and specify two critical subsystems:
1. Educational YKS / BUEPT Tactical Question-Buff System:
   - Inspect `/Users/afurkanmac/Downloads/hackhaton/src/data/questions.ts` to understand existing question schemas, question types, categories (YKS TYT/AYT subjects: Math, Turkish, Physics, Chemistry, Biology, History, Geography, Philosophy; BUEPT English reading, grammar, vocabulary), answer options, and difficulty ratings.
   - Design the Inter-Wave Study Phase:
     * Question presentation modal inside the shop phase.
     * Rewards for correct answers: curriculum study buff (e.g., choice between currency bonus, permanent stat buff based on subject like +Math -> +Damage%, +Biology -> +HP Regen, +Physics -> +Speed, +BUEPT -> +Harvesting, or shop discount coupon).
     * Penalty/grace for wrong answers (no penalty or small consolation to encourage learning).
   - Design In-Run Tactical Events:
     * Mystery chests spawning in arena or dropping from Elites.
     * Elite defeat challenge event.
     * Tactical combat pause: clean state pause (tick frozen, animations paused, modal prompt).
     * Tactical reward upon correct answer: emergency heal (e.g. 50% HP), temporary frenzy / invincible buff, instant nuke/clear nearby enemies, or unique tactical passive.
   - Design Category Performance & Accuracy Tracker:
     * Tracks attempts, correct count, accuracy % per category and overall.
     * Displays summary stats in shop and game over / victory screen.
2. Asset Generation & Visual/Audio Infrastructure Specification:
   - Inventory of all visual assets needed:
     * Player characters / avatars (e.g., Potato Scholar, BUEPT Student, etc.)
     * 5 distinct enemy variants (Swarmer, Rusher, Tank, Ranged Shooter, Elite Boss)
     * Weapons (at least 4 distinct melee & ranged: e.g., Pistol, Shotgun, SMG, Knife, Sword, Wrench, Magic Wand)
     * Projectiles (bullets, magic orbs, enemy spit)
     * Pickups (materials/crystals, health fruits, mystery chest)
     * Terrain / Arena background tiles & borders
     * UI icons (stats icons, question icons)
   - Asset specifications: dimensions, aspect ratios, transparent PNG backgrounds or sprite formats, consistent color palette and art style (cartoonish/vibrant roguelite aesthetic).
   - Image generation prompts formulation for AI generation tool (`generate_image`).
   - Web Audio / Sound engine design: sound triggers (shoot, hit, hurt, enemy death, pickup, question modal open, question correct fanfare, question wrong buzzer, wave victory, defeat) leveraging `src/lib/sound.ts`.

OUTPUT:
Write your full specification report to:
`/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey_2/handoff.md`
and update `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey_2/progress.md`.
Send a completion message to parent when done.

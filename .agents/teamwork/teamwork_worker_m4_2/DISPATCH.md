# Task Assignment — teamwork_worker_m4_2

## Objective
Remediate the Milestone 4 issues identified during the Iteration 1 Gate review by Reviewer 1 and Challenger 1:
1. Fix Turkish diacritic case-folding & category mapping in `src/game/education/BuffMatrix.ts`:
   - In `calculateSubjectBuff(category, waveDifficulty, streak)`:
     * Support ASCII normalized variants for Turkish diacritics: `catLower.includes('mat') || catLower.includes('sayısal') || catLower.includes('sayisal')` to map to `SUBJECT_BUFF_REGISTRY.matematik`.
     * Defend against `NaN` or infinite streak inputs: `const safeStreak = Number.isFinite(streak) ? streak : 0;` and use `safeStreak` in `streakBonus = 1 + Math.min(Math.max(0, safeStreak), 5) * 0.1;`.
   - In `SUBJECT_BUFF_REGISTRY.matematik.categoryKeys`:
     * Add `'AYT Sayisal'` alongside `'AYT Sayısal'`.
   - In `getSubjectBuffPreview(subjectName, waveDifficulty, streak)`:
     * Fix title-to-slug lookup so it doesn't return empty description. Iterate over `Object.values(SUBJECT_BUFF_REGISTRY)` matching `item.categoryKeys.some(ck => ck.toLowerCase() === catLower) || catLower.includes(item.subject.toLowerCase())` and return `matched.description` and `statPreview: buff`.
2. Wire streak & Rescue Mode in `src/components/StudyBuffModal.tsx`:
   - Add optional prop `currentStreak?: number` (defaulting to 0) to `StudyBuffModalProps`.
   - When calling `calculateSubjectBuff`, pass `currentStreak ?? 0` instead of hardcoded `0`.
   - When configuring `consolationReward` on wrong answer:
     * Check `const isRescueMode = (currentStreak ?? 0) <= -2;`
     * In Rescue Mode, award `materialsBonus: 10`, `statModifiers: { speedPercent: 2, luck: 2 }`, and title `"Kurtarma Modu: Moral Telafi Güçlendirmesi"`.
     * In normal mode, award `materialsBonus: 5`, `statModifiers: { speedPercent: 2, luck: 1 }`.
3. In `src/app/page.tsx`:
   - Pass `currentStreak={telemetryRef.current?.getCurrentStreak() ?? 0}` to `<StudyBuffModal />`.
4. Verification:
   - Run: `export PATH="$HOME/.local/node/bin:$PATH" && npx tsc --noEmit && npm run lint && npm test && npm run build`
   - Ensure all 16 test files pass (300+ tests), zero TypeScript errors, zero ESLint warnings, and Next.js production build succeeds.
5. Write your handoff report to `.agents/teamwork/teamwork_worker_m4_2/handoff.md`.

## 2026-11-04T13:45:56Z
You are teamwork_worker_m4_2. Your working directory is `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_worker_m4_2/`.
Read your task instructions at `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_worker_m4_2/DISPATCH.md`.
Read the immutable original user request at `/Users/afurkanmac/Downloads/hackhaton/ORIGINAL_REQUEST.md`.
Read the project specifications and contracts at `/Users/afurkanmac/Downloads/hackhaton/PROJECT.md`.
Read the previous review findings in `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_reviewer_m4_1/handoff.md` and `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_challenger_m4_1/handoff.md`.

## 2026-11-04T13:56:11Z
**Context**: Milestone 4 Remediation Worker Status Check
**Content**: 10 minutes have elapsed since dispatch. Please report your current execution status on the changes in `BuffMatrix.ts`, `StudyBuffModal.tsx`, and `src/app/page.tsx`, and the verification suite results.
**Action**: Reply with your current progress or handoff.md path.

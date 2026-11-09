# Dispatch: teamwork_test_writer_m2_1

**Objective**: Update `tests/adversarial/imports_integrity.test.ts` lines 290-297 to support Milestone 2 rollout.

**Context**:
In Milestone 1, line 290 of `tests/adversarial/imports_integrity.test.ts` asserted:
```typescript
it('guarantees src/components directory is completely empty for clean M2 canvas rollout', () => {
  const componentsDir = path.join(SRC_DIR, 'components');
  if (fs.existsSync(componentsDir)) {
    const files = fs.readdirSync(componentsDir);
    expect(files.filter((f) => !f.startsWith('.'))).toEqual([]);
  }
});
```
This was a transitional test ensuring legacy components were cleanly evacuated from `src/components/` before M2 began.
Now Milestone 2 is deploying `GameCanvas.tsx`, `HUD.tsx`, and `ShopModal.tsx` in `src/components/`.

**Task**:
1. Update this test case in `tests/adversarial/imports_integrity.test.ts` to:
   - Verify that NO legacy components exist in `src/components/` (specifically: `BattleArena.tsx`, `JuryGodModeBar.tsx`, `CharacterSelect.tsx`, `GameEngine.tsx`, `HeroSelect.tsx`, `QuestionModal.tsx`, `StatsDisplay.tsx`, `UpgradeModal.tsx`).
   - Allow valid new Brotato components in `src/components/` (e.g. `GameCanvas.tsx`, `HUD.tsx`, `ShopModal.tsx`, etc.).
2. Run test verification:
   `export PATH="$HOME/.local/node/bin:$PATH" && npm test`
3. Write `handoff.md` and report completion.


## 2026-11-03T18:59:16Z
You are teamwork_test_writer_m2_1.
Your working directory is /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_test_writer_m2_1/
Read the mandatory user request at: /Users/afurkanmac/Downloads/hackhaton/ORIGINAL_REQUEST.md
Read your dispatch file at: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_test_writer_m2_1/DISPATCH.md
Read /Users/afurkanmac/Downloads/hackhaton/PROJECT.md and /Users/afurkanmac/Downloads/hackhaton/TEST_INFRA.md

Task:
Update `tests/adversarial/imports_integrity.test.ts` lines 290-297:
Replace the transitional test asserting that `src/components/` is empty with a test verifying that NO legacy components exist in `src/components/` (specifically: 'BattleArena.tsx', 'JuryGodModeBar.tsx', 'CharacterSelect.tsx', 'GameEngine.tsx', 'HeroSelect.tsx', 'QuestionModal.tsx', 'StatsDisplay.tsx', 'UpgradeModal.tsx') and confirming that any files in `src/components/` are valid Brotato UI components.
Verify by running:
export PATH="$HOME/.local/node/bin:$PATH" && npm test

Write handoff.md in your working directory and notify the orchestrator with send_message when done.

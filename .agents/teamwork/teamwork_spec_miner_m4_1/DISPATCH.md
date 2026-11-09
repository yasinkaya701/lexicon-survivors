# DISPATCH — Milestone 4 Explorer 1 (Spec Miner)

## Mission
Analyze and specify the Question Bank Architecture, Curriculum Taxonomy & Dynamic Difficulty Adjustment (DDA) for Milestone 4.

## Scope of Investigation
- Inspect existing questions in `src/data/questions.ts` and legacy references.
- Specify the expanded 25-30 question dataset across 5 disciplines:
  1. TYT Türkçe (Paragraf, Anlatım Bozukluğu, Dil Bilgisi)
  2. TYT Matematik (Problemler, Temel Kavramlar, Mantık)
  3. AYT Fen Bilimleri (Fizik Newton mekaniği, Kimya periyodik tablo/bağlar, Biyoloji hücre/genetik)
  4. TYT Sosyal Bilimler (Tarih, Coğrafya, Felsefe)
  5. BUEPT English (Academic vocabulary, reading comprehension, collocations)
- Structure: ID, subject, subtopic, difficulty (1-3), prompt, 4 options, correctIndex, detailed pedagogical explanation.
- Specify Dynamic Difficulty Adjustment (DDA) formula based on streak:
  * 2+ consecutive correct -> higher difficulty questions with boosted rewards
  * 2+ consecutive wrong -> remedial difficulty with generous consolation buffs
- Interface contracts with `src/types/brotato.ts`.

## Mandatory References
- `/Users/afurkanmac/Downloads/hackhaton/ORIGINAL_REQUEST.md`
- `/Users/afurkanmac/Downloads/hackhaton/PROJECT.md`
- `/Users/afurkanmac/Downloads/hackhaton/src/data/questions.ts`

## Output Requirements
- Write your detailed specification to `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m4_1/handoff.md`.
- Conclude with actionable implementation blueprint for the Worker.


## 2026-11-04T13:02:11Z
You are teamwork_spec_miner_m4_1. Your working directory is /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m4_1/.
Read /Users/afurkanmac/Downloads/hackhaton/ORIGINAL_REQUEST.md, /Users/afurkanmac/Downloads/hackhaton/PROJECT.md, and your dispatch task at /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m4_1/DISPATCH.md.
Also inspect existing questions in /Users/afurkanmac/Downloads/hackhaton/src/data/questions.ts.

Analyze and design the comprehensive 25-30 question bank spanning TYT Türkçe, TYT Matematik, AYT Fen, TYT Sosyal, and BUEPT English:
- Define full data schema with difficulty tiers, subject categories, subtopics, and comprehensive explanations.
- Design the Dynamic Difficulty Adjustment (DDA) progression algorithm.
- Write your complete specification report to /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m4_1/handoff.md.
- Send a completion message back to parent when done.

CREATE TABLE IF NOT EXISTS leaderboard_entries (
  submission_id TEXT PRIMARY KEY NOT NULL,
  alias TEXT NOT NULL CHECK (length(alias) BETWEEN 1 AND 20),
  waves_cleared INTEGER NOT NULL CHECK (waves_cleared BETWEEN 0 AND 100),
  kills INTEGER NOT NULL CHECK (kills BETWEEN 0 AND 100000),
  elapsed_ms INTEGER NOT NULL CHECK (elapsed_ms BETWEEN 1000 AND 43200000),
  character_id TEXT NOT NULL CHECK (character_id IN (
    'inky', 'quillmaster', 'word_knight', 'rune_sorceress', 'lexicon_alchemist', 'shadow_lexicographer'
  )),
  difficulty_id TEXT NOT NULL CHECK (difficulty_id IN ('easy', 'normal', 'hard')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS leaderboard_rank_idx
  ON leaderboard_entries (difficulty_id, waves_cleared DESC, kills DESC, elapsed_ms ASC, created_at ASC, submission_id ASC);

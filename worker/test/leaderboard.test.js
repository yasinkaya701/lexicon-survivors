import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const ORIGIN = 'https://yasinkaya701.github.io';
const validSubmission = (overrides = {}) => ({
  submissionId: '8c9e4f48-6627-4a60-b78e-822d50b79a20',
  alias: 'İpek Öz',
  wavesCleared: 7,
  kills: 34,
  elapsedMs: 248000,
  characterId: 'word_knight',
  difficultyId: 'normal',
  ...overrides
});

class FakeD1 {
  rows = [];
  calls = 0;
  prepare(sql) {
    this.calls++;
    const db = this;
    let values = [];
    return {
      bind(...args) { values = args; return this; },
      async run() {
        if (sql.includes('INSERT OR IGNORE')) {
          const [submission_id, alias, waves_cleared, kills, elapsed_ms, character_id, difficulty_id, created_at] = values;
          if (!db.rows.some((row) => row.submission_id === submission_id)) {
            db.rows.push({ submission_id, alias, waves_cleared, kills, elapsed_ms, character_id, difficulty_id, created_at });
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        }
        throw new Error(`Unexpected run SQL: ${sql}`);
      },
      async all() {
        const [difficulty, limit] = values;
        const results = db.rows.filter((row) => row.difficulty_id === difficulty).sort(rankOrder).slice(0, limit);
        return { results };
      },
      async first() {
        const [difficulty, waves, kills, elapsed, created, id] = values;
        const ahead = db.rows.filter((row) => row.difficulty_id === difficulty && (
          row.waves_cleared > waves ||
          (row.waves_cleared === waves && row.kills > kills) ||
          (row.waves_cleared === waves && row.kills === kills && row.elapsed_ms < elapsed) ||
          (row.waves_cleared === waves && row.kills === kills && row.elapsed_ms === elapsed && row.created_at < created) ||
          (row.waves_cleared === waves && row.kills === kills && row.elapsed_ms === elapsed && row.created_at === created && row.submission_id < id)
        )).length;
        return { ahead };
      }
    };
  }
}
function rankOrder(a, b) {
  return b.waves_cleared - a.waves_cleared || b.kills - a.kills || a.elapsed_ms - b.elapsed_ms || a.created_at.localeCompare(b.created_at) || a.submission_id.localeCompare(b.submission_id);
}
function context({ db = new FakeD1(), limited = false, rateLimit = true } = {}) {
  const rateKeys = [];
  return {
    env: {
      DB: db,
      RATE_LIMITER: rateLimit ? { async limit({ key }) { rateKeys.push(key); return { success: !limited }; } } : undefined
    },
    db,
    rateKeys
  };
}
function post(body, options = {}) {
  return new Request('https://leaderboard.test/api/leaderboard', {
    method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN, 'cf-connecting-ip': '203.0.113.7', ...options.headers },
    body: options.rawBody ?? JSON.stringify(body)
  });
}

await test('accepts normalized Turkish aliases and reports their rank', async () => {
  const ctx = context();
  const response = await worker.fetch(post(validSubmission({ alias: '  İpek   Öz  ' })), ctx.env);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { accepted: true, rank: 1 });
  assert.equal(ctx.db.rows[0].alias, 'İpek Öz');
});

test('truncates aliases to a safe 20-character display name', async () => {
  const ctx = context();
  const response = await worker.fetch(post(validSubmission({ alias: 'Çok Uzun Bir İsim Daha Fazla' })), ctx.env);
  assert.equal(response.status, 201);
  assert.ok(Array.from(ctx.db.rows[0].alias).length <= 20);
});

test('rejects runs shorter than the minimum game time for cleared waves', async () => {
  const ctx = context();
  const response = await worker.fetch(post(validSubmission({ wavesCleared: 7, elapsedMs: 100000 })), ctx.env);
  assert.equal(response.status, 400);
  assert.equal(ctx.db.rows.length, 0);
});

test('accepts a plausible run time at the same wave count', async () => {
  const ctx = context();
  const response = await worker.fetch(post(validSubmission({ wavesCleared: 7, elapsedMs: 120000 })), ctx.env);
  assert.equal(response.status, 201);
  assert.equal(ctx.db.rows.length, 1);
});

test('rejects more kills than the wave spawn budget can produce', async () => {
  const ctx = context();
  const response = await worker.fetch(post(validSubmission({ wavesCleared: 0, kills: 100000, elapsedMs: 120000 })), ctx.env);
  assert.equal(response.status, 400);
  assert.equal(ctx.db.rows.length, 0);
});

test('keeps room for split-enemy kill counts in an early wave', async () => {
  const ctx = context();
  const response = await worker.fetch(post(validSubmission({ wavesCleared: 0, kills: 120, elapsedMs: 120000 })), ctx.env);
  assert.equal(response.status, 201);
  assert.equal(ctx.db.rows.length, 1);
});

test('rejects invalid IDs, empty aliases, negative counts, and impossible bounds without writing', async (t) => {
  const cases = [
    ['difficulty', { difficultyId: 'nightmare' }],
    ['missing difficulty', { difficultyId: undefined }],
    ['hero', { characterId: 'unknown_hero' }],
    ['missing hero', { characterId: undefined }],
    ['empty alias', { alias: ' !!! ??? ' }],
    ['missing alias', { alias: undefined }],
    ['combining mark only alias', { alias: '\u0307' }],
    ['negative kills', { kills: -1 }],
    ['missing kills', { kills: undefined }],
    ['wave maximum', { wavesCleared: 101 }],
    ['missing wave', { wavesCleared: undefined }],
    ['elapsed time', { elapsedMs: 43200001 }],
    ['missing elapsed time', { elapsedMs: undefined }],
    ['elapsed lower bound', { elapsedMs: 999 }],
    ['unknown field', { account: 'private' }]
  ];
  for (const [name, override] of cases) {
    await t.test(name, async () => {
      const ctx = context();
      const response = await worker.fetch(post(validSubmission(override)), ctx.env);
      assert.equal(response.status, 400);
      assert.equal(ctx.db.rows.length, 0);
    });
  }
});

test('rejects oversized JSON before parsing and writing', async () => {
  const ctx = context();
  const response = await worker.fetch(post({}, { rawBody: ' '.repeat(4097) }), ctx.env);
  assert.equal(response.status, 413);
  assert.equal(ctx.db.rows.length, 0);
});

test('ranks by waves, kills, then elapsed time and filters by difficulty', async () => {
  const db = new FakeD1();
  db.rows = [
    { submission_id: 'c', alias: 'C', waves_cleared: 6, kills: 20, elapsed_ms: 1000, character_id: 'inky', difficulty_id: 'normal', created_at: '2026-01-01T00:00:00.000Z' },
    { submission_id: 'b', alias: 'B', waves_cleared: 7, kills: 30, elapsed_ms: 3000, character_id: 'inky', difficulty_id: 'normal', created_at: '2026-01-01T00:00:01.000Z' },
    { submission_id: 'a', alias: 'A', waves_cleared: 7, kills: 30, elapsed_ms: 2000, character_id: 'inky', difficulty_id: 'normal', created_at: '2026-01-01T00:00:02.000Z' },
    { submission_id: 'z', alias: 'Z', waves_cleared: 99, kills: 999, elapsed_ms: 1, character_id: 'inky', difficulty_id: 'hard', created_at: '2026-01-01T00:00:00.000Z' }
  ];
  const response = await worker.fetch(new Request('https://leaderboard.test/api/leaderboard?difficulty=normal&limit=20', { headers: { origin: ORIGIN } }), context({ db }).env);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload.entries.map((entry) => entry.alias), ['A', 'B', 'C']);
  assert.deepEqual(Object.keys(payload.entries[0]).sort(), ['alias', 'characterId', 'createdAt', 'elapsedMs', 'kills', 'rank', 'wavesCleared'].sort());
});

test('caps excessive list limits and rejects malformed difficulty', async () => {
  const db = new FakeD1();
  const ctx = context({ db });
  const capped = await worker.fetch(new Request('https://leaderboard.test/api/leaderboard?difficulty=normal&limit=999', { headers: { origin: ORIGIN } }), ctx.env);
  assert.equal(capped.status, 200);
  assert.equal((await capped.json()).entries.length, 0);
  const invalid = await worker.fetch(new Request('https://leaderboard.test/api/leaderboard?difficulty=other', { headers: { origin: ORIGIN } }), ctx.env);
  assert.equal(invalid.status, 400);
});

test('rejects disallowed origins and sends CORS only to the published game', async () => {
  const ctx = context();
  const rejected = await worker.fetch(post(validSubmission(), { headers: { origin: 'https://evil.example' } }), ctx.env);
  assert.equal(rejected.status, 403);
  assert.equal(ctx.db.rows.length, 0);
  const accepted = await worker.fetch(new Request('https://leaderboard.test/api/leaderboard?difficulty=normal', { headers: { origin: ORIGIN } }), ctx.env);
  assert.equal(accepted.headers.get('access-control-allow-origin'), ORIGIN);
});

test('allows loopback origins for local game previews without allowing lookalike domains', async () => {
  const ctx = context();
  for (const origin of ['http://127.0.0.1:8014', 'http://localhost:8013']) {
    const response = await worker.fetch(new Request('https://leaderboard.test/api/leaderboard?difficulty=normal', { headers: { origin } }), ctx.env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
  }
  for (const origin of ['http://127.0.0.1.evil:8014', 'https://localhost:8014', 'http://localhost.evil:8014']) {
    const response = await worker.fetch(new Request('https://leaderboard.test/api/leaderboard?difficulty=normal', { headers: { origin } }), ctx.env);
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  }
  for (const origin of ['http://localhost:8013/path', 'http://user@localhost:8013']) {
    const response = await worker.fetch(new Request('https://leaderboard.test/api/leaderboard?difficulty=normal', { headers: { origin } }), ctx.env);
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  }
  const preflight = await worker.fetch(new Request('https://leaderboard.test/api/leaderboard', { method: 'OPTIONS', headers: { origin: 'http://127.0.0.1:8014' } }), ctx.env);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://127.0.0.1:8014');
  assert.match(preflight.headers.get('access-control-allow-methods'), /POST/);
});

test('supports native requests without Origin and preflight for the published origin', async () => {
  const ctx = context();
  const native = new Request('https://leaderboard.test/api/leaderboard', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '198.51.100.4' }, body: JSON.stringify(validSubmission()) });
  assert.equal((await worker.fetch(native, ctx.env)).status, 201);
  const preflight = await worker.fetch(new Request('https://leaderboard.test/api/leaderboard', { method: 'OPTIONS', headers: { origin: ORIGIN } }), ctx.env);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), ORIGIN);
});

test('limits bursts and never stores or forwards the raw client address', async () => {
  const ctx = context({ limited: true });
  const response = await worker.fetch(post(validSubmission()), ctx.env);
  assert.equal(response.status, 429);
  assert.equal(ctx.db.rows.length, 0);
  assert.equal(ctx.rateKeys.length, 1);
  assert.ok(!ctx.rateKeys[0].includes('203.0.113.7'));
});

test('duplicate retry IDs insert once and return the existing ranking position', async () => {
  const ctx = context();
  const first = await worker.fetch(post(validSubmission()), ctx.env);
  const retry = await worker.fetch(post(validSubmission({ alias: 'Renamed' })), ctx.env);
  assert.equal(first.status, 201);
  assert.equal(retry.status, 200);
  assert.deepEqual(await retry.json(), { accepted: true, rank: 1 });
  assert.equal(ctx.db.rows.length, 1);
  assert.equal(ctx.db.rows[0].alias, 'İpek Öz');
});

test('hides database errors behind generic service errors', async () => {
  const env = { RATE_LIMITER: { async limit() { return { success: true }; } }, DB: { prepare() { throw new Error('secret SQL query text'); } } };
  const response = await worker.fetch(new Request('https://leaderboard.test/api/leaderboard?difficulty=normal', { headers: { origin: ORIGIN } }), env);
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /secret SQL/);
});

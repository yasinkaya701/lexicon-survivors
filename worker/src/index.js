const ALLOWED_ORIGIN = 'https://yasinkaya701.github.io';
const MAX_BODY_BYTES = 4096;
const MAX_LIMIT = 20;
const MAX_ALIAS_LENGTH = 20;
const MIN_RUN_TIME_RATIO = 0.75;
const DIFFICULTIES = new Set(['easy', 'normal', 'hard']);
const CHARACTERS = new Set([
  'inky', 'quillmaster', 'word_knight', 'rune_sorceress',
  'lexicon_alchemist', 'shadow_lexicographer'
]);
const SUBMISSION_KEYS = new Set([
  'submissionId', 'alias', 'wavesCleared', 'kills', 'elapsedMs', 'characterId', 'difficultyId'
]);

function json(data, status, corsOrigin = null) {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'vary': 'Origin'
  });
  if (corsOrigin) {
    headers.set('access-control-allow-origin', corsOrigin);
    headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
    headers.set('access-control-allow-headers', 'Content-Type');
    headers.set('access-control-max-age', '86400');
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function publicError(message, status, corsOrigin) {
  return json({ error: message }, status, corsOrigin);
}

function originFor(request) {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  if (origin === ALLOWED_ORIGIN) return ALLOWED_ORIGIN;

  // Permit only canonical HTTP origins on IPv4 loopback or localhost so local
  // previews can use the public read-only leaderboard endpoint.
  try {
    const parsed = new URL(origin);
    const isLoopbackHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (parsed.protocol === 'http:' && isLoopbackHost && parsed.origin === origin) return origin;
  } catch {
    // Invalid Origin headers are rejected below.
  }
  return false;
}

export function sanitizeAlias(value) {
  if (typeof value !== 'string') return '';
  const cleaned = value.normalize('NFKC')
    .replace(/[^\p{Script=Latin}\p{M}0-9 _-]/gu, '')
    .replace(/[\s_-]+/gu, ' ')
    .trim();
  const truncated = Array.from(cleaned).slice(0, MAX_ALIAS_LENGTH).join('').trim();
  return /[\p{Script=Latin}0-9]/u.test(truncated) ? truncated : '';
}

function minimumPlausibleRunTimeMs(wavesCleared) {
  let expectedMinimumMs = 0;
  for (let wave = 1; wave <= wavesCleared; wave++) {
    // Regular waves run for their full timer. Bosses can end early, but appear only after 1.8 seconds.
    expectedMinimumMs += wave % 5 === 0 ? 1800 : Math.min(42, 22 + (wave - 1) * 0.25) * 1000;
  }
  // Leave room for browser timer variance while rejecting obviously impossible submissions.
  return Math.floor(expectedMinimumMs * MIN_RUN_TIME_RATIO);
}

function maximumPlausibleKills(wavesCleared, difficultyId) {
  let maximum = 0;
  const highestEncounteredWave = Math.min(100, wavesCleared + 1);
  for (let wave = 1; wave <= highestEncounteredWave; wave++) {
    if (wave % 5 === 0) {
      maximum += 1;
      continue;
    }
    const duration = Math.min(42, 22 + (wave - 1) * 0.25);
    const difficultyFactor = difficultyId === 'hard' ? 0.75 : difficultyId === 'easy' ? 1.15 : 1.0;
    const spawnInterval = Math.max(0.12, 0.60 - wave * 0.04) * difficultyFactor;
    const batchSize = wave >= 25 ? 3 : wave >= 8 ? 2 : 1;
    // Every spawned slime may split into two more kills. The spare cycles cover timer carry and frame boundaries.
    maximum += (Math.ceil(duration / spawnInterval) + 2) * batchSize * 3;
  }
  return maximum;
}

export function validateSubmission(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  if (Object.keys(input).some((key) => !SUBMISSION_KEYS.has(key))) return null;
  if (typeof input.submissionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.submissionId)) return null;
  if (!DIFFICULTIES.has(input.difficultyId) || !CHARACTERS.has(input.characterId)) return null;
  if (!Number.isInteger(input.wavesCleared) || input.wavesCleared < 0 || input.wavesCleared > 100) return null;
  if (!Number.isInteger(input.kills) || input.kills < 0 || input.kills > 100000) return null;
  if (!Number.isInteger(input.elapsedMs) || input.elapsedMs < 1000 || input.elapsedMs > 43_200_000) return null;
  if (input.elapsedMs < minimumPlausibleRunTimeMs(input.wavesCleared)) return null;
  if (input.kills > maximumPlausibleKills(input.wavesCleared, input.difficultyId)) return null;
  const alias = sanitizeAlias(input.alias);
  if (!alias) return null;
  return {
    submissionId: input.submissionId.toLowerCase(),
    alias,
    wavesCleared: input.wavesCleared,
    kills: input.kills,
    elapsedMs: input.elapsedMs,
    characterId: input.characterId,
    difficultyId: input.difficultyId
  };
}

async function readBoundedJson(request) {
  const declaredSize = Number(request.headers.get('content-length') || 0);
  if (declaredSize > MAX_BODY_BYTES) return { tooLarge: true };
  if (!request.body) return { invalid: true };
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return { tooLarge: true };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { invalid: true };
  }
}

async function clientRateKey(request) {
  // Hash the transient edge address before using it as a rate-limit key; never persist it.
  const address = request.headers.get('cf-connecting-ip') || 'native-client-unknown';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(address));
  const suffix = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `submit:${suffix}`;
}

async function allowSubmission(request, env) {
  if (!env.RATE_LIMITER || typeof env.RATE_LIMITER.limit !== 'function') return false;
  const { success } = await env.RATE_LIMITER.limit({ key: await clientRateKey(request) });
  return success;
}

async function getLeaderboard(url, env, corsOrigin) {
  const difficulty = url.searchParams.get('difficulty');
  if (!DIFFICULTIES.has(difficulty)) return publicError('Geçersiz zorluk.', 400, corsOrigin);
  const rawLimit = url.searchParams.get('limit');
  let limit = 20;
  if (rawLimit !== null) {
    if (!/^\d+$/.test(rawLimit) || Number(rawLimit) < 1) return publicError('Geçersiz liste boyutu.', 400, corsOrigin);
    limit = Math.min(Number(rawLimit), MAX_LIMIT);
  }
  if (!env.DB) return publicError('Sıralama şu anda kullanılamıyor.', 503, corsOrigin);
  try {
    const { results = [] } = await env.DB.prepare(
      `SELECT alias, waves_cleared, kills, elapsed_ms, character_id, created_at
       FROM leaderboard_entries WHERE difficulty_id = ?
       ORDER BY waves_cleared DESC, kills DESC, elapsed_ms ASC, created_at ASC, submission_id ASC
       LIMIT ?`
    ).bind(difficulty, limit).all();
    return json({ entries: results.map((row, index) => ({
      rank: index + 1,
      alias: row.alias,
      wavesCleared: row.waves_cleared,
      kills: row.kills,
      elapsedMs: row.elapsed_ms,
      characterId: row.character_id,
      createdAt: row.created_at
    })) }, 200, corsOrigin);
  } catch {
    return publicError('Sıralama şu anda kullanılamıyor.', 503, corsOrigin);
  }
}

async function submitScore(request, env, corsOrigin) {
  if (!env.DB) return publicError('Skor şu anda kaydedilemiyor.', 503, corsOrigin);
  let allowed;
  try {
    allowed = await allowSubmission(request, env);
  } catch {
    return publicError('Skor şu anda kaydedilemiyor.', 503, corsOrigin);
  }
  if (!allowed) return publicError('Çok sık skor gönderildi. Biraz sonra tekrar dene.', 429, corsOrigin);
  const parsed = await readBoundedJson(request);
  if (parsed.tooLarge) return publicError('İstek çok büyük.', 413, corsOrigin);
  if (parsed.invalid) return publicError('Geçersiz skor bilgisi.', 400, corsOrigin);
  const submission = validateSubmission(parsed.value);
  if (!submission) return publicError('Geçersiz skor bilgisi.', 400, corsOrigin);

  const createdAt = new Date().toISOString();
  try {
    const insert = await env.DB.prepare(
      `INSERT OR IGNORE INTO leaderboard_entries
       (submission_id, alias, waves_cleared, kills, elapsed_ms, character_id, difficulty_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      submission.submissionId, submission.alias, submission.wavesCleared, submission.kills,
      submission.elapsedMs, submission.characterId, submission.difficultyId, createdAt
    ).run();
    const saved = await env.DB.prepare(
      `SELECT submission_id, waves_cleared, kills, elapsed_ms, created_at, difficulty_id
       FROM leaderboard_entries WHERE submission_id = ?`
    ).bind(submission.submissionId).first();
    if (!saved) return publicError('Skor şu anda kaydedilemiyor.', 503, corsOrigin);
    const position = await env.DB.prepare(
      `SELECT COUNT(*) AS ahead FROM leaderboard_entries
       WHERE difficulty_id = ? AND (
         waves_cleared > ? OR
         (waves_cleared = ? AND kills > ?) OR
         (waves_cleared = ? AND kills = ? AND elapsed_ms < ?) OR
         (waves_cleared = ? AND kills = ? AND elapsed_ms = ? AND created_at < ?) OR
         (waves_cleared = ? AND kills = ? AND elapsed_ms = ? AND created_at = ? AND submission_id < ?)
       )`
    ).bind(
      saved.difficulty_id,
      saved.waves_cleared,
      saved.waves_cleared, saved.kills,
      saved.waves_cleared, saved.kills, saved.elapsed_ms,
      saved.waves_cleared, saved.kills, saved.elapsed_ms, saved.created_at,
      saved.waves_cleared, saved.kills, saved.elapsed_ms, saved.created_at, saved.submission_id
    ).first();
    return json({ accepted: true, rank: Number(position?.ahead || 0) + 1 }, insert?.meta?.changes ? 201 : 200, corsOrigin);
  } catch {
    return publicError('Skor şu anda kaydedilemiyor.', 503, corsOrigin);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsOrigin = originFor(request);
    if (corsOrigin === false) return publicError('Bu kaynak kullanılamıyor.', 403, null);
    if (url.pathname !== '/api/leaderboard') return publicError('Bulunamadı.', 404, corsOrigin);
    if (request.method === 'OPTIONS') {
      if (!corsOrigin) return publicError('Bu kaynak kullanılamıyor.', 403, null);
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': corsOrigin,
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'Content-Type',
          'access-control-max-age': '86400',
          'vary': 'Origin'
        }
      });
    }
    if (request.method === 'GET') return getLeaderboard(url, env, corsOrigin);
    if (request.method === 'POST') {
      if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        return publicError('JSON içerik türü gerekli.', 415, corsOrigin);
      }
      return submitScore(request, env, corsOrigin);
    }
    return publicError('Yöntem desteklenmiyor.', 405, corsOrigin);
  }
};

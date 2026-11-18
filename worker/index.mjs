import { DurableObject } from 'cloudflare:workers';

const MAX_VALID_SCORE = 10_000_000;
const MAX_VALID_DRUMSTICKS = 50_000;
const MAX_VALID_LEVEL = 30;

function sanitizePlayerId(raw) {
  const s = String(raw ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 64);
  return s.length >= 4 ? s : '';
}

function sanitizeNickname(raw, playerId) {
  const cleaned = String(raw ?? '')
    .replace(/[<>"'`&/\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12);
  if (cleaned.length >= 2) return cleaned;
  const suffix = playerId ? playerId.slice(-4).toUpperCase() : '0001';
  return `奶龙玩家#${suffix}`;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export class LeaderboardDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS player_records (
          player_id TEXT PRIMARY KEY,
          nickname TEXT NOT NULL,
          score INTEGER NOT NULL DEFAULT 0,
          drumsticks INTEGER NOT NULL DEFAULT 0,
          max_level INTEGER NOT NULL DEFAULT 1,
          time_sec INTEGER NOT NULL DEFAULT 0,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_records_score ON player_records (score DESC, updated_at ASC);
        CREATE INDEX IF NOT EXISTS idx_records_speed ON player_records (max_level DESC, time_sec ASC);
        CREATE INDEX IF NOT EXISTS idx_records_drums ON player_records (drumsticks DESC, score DESC);

        CREATE TABLE IF NOT EXISTS player_nicknames (
          player_id TEXT PRIMARY KEY,
          nickname TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
    });
  }

  buildSnapshot(playerId, type = 'score') {
    let orderClause = 'score DESC, updated_at ASC';
    if (type === 'speedrun') {
      orderClause = 'max_level DESC, time_sec ASC, score DESC';
    } else if (type === 'drumsticks') {
      orderClause = 'drumsticks DESC, score DESC, updated_at ASC';
    }

    const allRows = this.ctx.storage.sql
      .exec(
        `SELECT player_id, nickname, score, drumsticks, max_level, time_sec, updated_at
         FROM player_records
         WHERE score > 0
         ORDER BY ${orderClause}`
      )
      .toArray();

    let playerRank = null;
    let playerEntry = null;
    if (playerId) {
      const idx = allRows.findIndex((r) => String(r.player_id) === playerId);
      if (idx >= 0) {
        playerRank = idx + 1;
        const r = allRows[idx];
        playerEntry = {
          playerId: String(r.player_id),
          nickname: String(r.nickname),
          score: Number(r.score),
          drumsticks: Number(r.drumsticks),
          maxLevel: Number(r.max_level),
          timeSec: Number(r.time_sec),
          updatedAt: Number(r.updated_at),
        };
      }
    }

    const entries = allRows.slice(0, 10).map((row, idx) => ({
      rank: idx + 1,
      playerId: String(row.player_id),
      nickname: String(row.nickname),
      score: Number(row.score),
      drumsticks: Number(row.drumsticks),
      maxLevel: Number(row.max_level),
      timeSec: Number(row.time_sec),
      updatedAt: Number(row.updated_at),
    }));

    return {
      ok: true,
      type,
      topScore: entries[0]?.score ?? 0,
      championName: entries[0]?.nickname ?? '虚位以待',
      totalPlayers: allRows.length,
      playerRank,
      playerEntry,
      entries,
    };
  }

  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return jsonResponse({ ok: true });
    }

    const url = new URL(request.url);
    if (request.method === 'GET') {
      const pid = sanitizePlayerId(url.searchParams.get('playerId'));
      const rawType = url.searchParams.get('type') || 'score';
      const type = ['score', 'speedrun', 'drumsticks'].includes(rawType) ? rawType : 'score';
      return jsonResponse(this.buildSnapshot(pid, type));
    }

    if (request.method === 'POST') {
      let body = {};
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: '请求格式错误' }, 400);
      }

      const playerId = sanitizePlayerId(body.playerId);
      if (!playerId) {
        return jsonResponse({ ok: false, error: '无效的 playerId' }, 400);
      }
      const now = Date.now();

      if (body.action === 'set_nickname') {
        const rawNick = String(body.nickname ?? '').trim();
        if (rawNick.length < 2 || rawNick.length > 12) {
          return jsonResponse({ ok: false, error: '昵称长度需在 2 到 12 个字符之间' }, 400);
        }
        const cleaned = sanitizeNickname(rawNick, playerId);
        const conflict = this.ctx.storage.sql
          .exec(
            `SELECT player_id FROM player_nicknames WHERE nickname = ? COLLATE NOCASE AND player_id != ?`,
            cleaned,
            playerId
          )
          .toArray();
        if (conflict.length > 0) {
          return jsonResponse({ ok: false, error: '该昵称已被其他玩家使用，请换一个' }, 409);
        }

        this.ctx.storage.sql.exec(
          `INSERT INTO player_nicknames (player_id, nickname, updated_at)
           VALUES (?, ?, ?)
           ON CONFLICT(player_id) DO UPDATE SET nickname = excluded.nickname, updated_at = excluded.updated_at`,
          playerId,
          cleaned,
          now
        );
        this.ctx.storage.sql.exec(`UPDATE player_records SET nickname = ? WHERE player_id = ?`, cleaned, playerId);
        return jsonResponse({ ok: true, nickname: cleaned });
      }

      const score = Math.max(0, Math.min(MAX_VALID_SCORE, Math.floor(Number(body.score) || 0)));
      const drumsticks = Math.max(0, Math.min(MAX_VALID_DRUMSTICKS, Math.floor(Number(body.drumsticks) || 0)));
      const maxLevel = Math.max(1, Math.min(MAX_VALID_LEVEL, Math.floor(Number(body.maxLevel) || 1)));
      const timeSec = Math.max(1, Math.floor(Number(body.timeSec) || 1));

      let nickname = '';
      const existingNick = this.ctx.storage.sql
        .exec(`SELECT nickname FROM player_nicknames WHERE player_id = ?`, playerId)
        .toArray();
      if (existingNick.length > 0) {
        nickname = String(existingNick[0].nickname);
      }

      if (body.nickname && String(body.nickname).trim().length >= 2) {
        const candidate = sanitizeNickname(body.nickname, playerId);
        const conflict = this.ctx.storage.sql
          .exec(
            `SELECT player_id FROM player_nicknames WHERE nickname = ? COLLATE NOCASE AND player_id != ?`,
            candidate,
            playerId
          )
          .toArray();
        if (conflict.length === 0) {
          nickname = candidate;
          this.ctx.storage.sql.exec(
            `INSERT INTO player_nicknames (player_id, nickname, updated_at)
             VALUES (?, ?, ?)
             ON CONFLICT(player_id) DO UPDATE SET nickname = excluded.nickname, updated_at = excluded.updated_at`,
            playerId,
            nickname,
            now
          );
        }
      }

      if (!nickname) {
        nickname = sanitizeNickname('', playerId);
        this.ctx.storage.sql.exec(
          `INSERT INTO player_nicknames (player_id, nickname, updated_at)
           VALUES (?, ?, ?)
           ON CONFLICT(player_id) DO UPDATE SET nickname = excluded.nickname, updated_at = excluded.updated_at`,
          playerId,
          nickname,
          now
        );
      }

      if (score > 0) {
        const prevRows = this.ctx.storage.sql
          .exec(`SELECT score, drumsticks, max_level, time_sec FROM player_records WHERE player_id = ?`, playerId)
          .toArray();
        if (prevRows.length === 0) {
          this.ctx.storage.sql.exec(
            `INSERT INTO player_records (player_id, nickname, score, drumsticks, max_level, time_sec, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            playerId,
            nickname,
            score,
            drumsticks,
            maxLevel,
            timeSec,
            now
          );
        } else {
          const prev = prevRows[0];
          const nextScore = Math.max(Number(prev.score), score);
          const nextDrums = Math.max(Number(prev.drumsticks), drumsticks);
          let nextLevel = Number(prev.max_level);
          let nextTime = Number(prev.time_sec);
          if (maxLevel > nextLevel || (maxLevel === nextLevel && timeSec < nextTime)) {
            nextLevel = maxLevel;
            nextTime = timeSec;
          }
          this.ctx.storage.sql.exec(
            `UPDATE player_records
             SET nickname = ?, score = ?, drumsticks = ?, max_level = ?, time_sec = ?, updated_at = ?
             WHERE player_id = ?`,
            nickname,
            nextScore,
            nextDrums,
            nextLevel,
            nextTime,
            now,
            playerId
          );
        }
      }

      const reqType = ['score', 'speedrun', 'drumsticks'].includes(body.type) ? body.type : 'score';
      return jsonResponse(this.buildSnapshot(playerId, reqType));
    }

    return jsonResponse({ ok: false, error: 'Method Not Allowed' }, 405);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/leaderboard') {
      const id = env.LEADERBOARD_DO.idFromName('nailong-adventure-global-v1');
      const stub = env.LEADERBOARD_DO.get(id);
      return stub.fetch(request);
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Not Found', { status: 404 });
  },
};

/**
 * Cloudflare Pages Functions (`/api/leaderboard`) - 《奶龙大冒险：鸡腿保卫战》真实云端排行榜接口
 *
 * 支持：
 * - GET  `/api/leaderboard?playerId=<id>&type=score|speedrun|drumsticks`
 * - POST `/api/leaderboard` (`action: 'set_nickname'` 唯一昵称校验与绑定)
 * - POST `/api/leaderboard` (提交真实玩家闯关战绩：总得分、收集鸡腿数、最高通关数、总耗时)
 *
 * 存储层优先级：
 * 1. `env.LEADERBOARD_KV` (Cloudflare KV 绑定)
 * 2. `caches.default` (Cloudflare 边缘缓存持久化，零配置即用)
 * 3. 进程内存兜底
 * 绝不生成或注入任何虚假机器人数据，完全由真实玩家战绩驱动。
 */

const MAX_VALID_SCORE = 20_000_000;
const MAX_VALID_DRUMSTICKS = 80_000;
const MAX_VALID_LEVEL = 48;
const KV_KEY = 'nailong_adventure_leaderboard_v1';
const CACHE_URL = 'https://leaderboard.nailong-adventure.internal/store_v1';

let memoryStore = null;

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

function normalizeStore(raw) {
  if (raw && typeof raw === 'object') {
    return {
      players: Array.isArray(raw.players) ? raw.players : [],
      nicknames: raw.nicknames && typeof raw.nicknames === 'object' ? raw.nicknames : {},
    };
  }
  return { players: [], nicknames: {} };
}

async function loadStore(env) {
  if (memoryStore && (memoryStore.players.length > 0 || Object.keys(memoryStore.nicknames).length > 0)) {
    return memoryStore;
  }

  let raw = null;
  if (env && env.LEADERBOARD_KV) {
    try {
      raw = await env.LEADERBOARD_KV.get(KV_KEY, 'json');
    } catch {
      // ignore
    }
  }

  if (!raw && typeof caches !== 'undefined' && caches.default) {
    try {
      const cached = await caches.default.match(CACHE_URL);
      if (cached) {
        raw = await cached.json();
      }
    } catch {
      // ignore
    }
  }

  memoryStore = normalizeStore(raw);
  return memoryStore;
}

async function saveStore(env, store) {
  memoryStore = store;
  const payload = JSON.stringify(store);

  if (env && env.LEADERBOARD_KV) {
    try {
      await env.LEADERBOARD_KV.put(KV_KEY, payload);
    } catch {
      // ignore
    }
  }

  if (typeof caches !== 'undefined' && caches.default) {
    try {
      const resp = new Response(payload, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
      await caches.default.put(CACHE_URL, resp);
    } catch {
      // ignore
    }
  }
}

function sortPlayers(players, type) {
  const list = players.filter((p) => p && p.score > 0);
  if (type === 'speedrun') {
    list.sort((a, b) => {
      if (b.maxLevel !== a.maxLevel) return b.maxLevel - a.maxLevel;
      if (a.timeSec !== b.timeSec) return a.timeSec - b.timeSec;
      return b.score - a.score;
    });
  } else if (type === 'drumsticks') {
    list.sort((a, b) => b.drumsticks - a.drumsticks || b.score - a.score || a.updatedAt - b.updatedAt);
  } else {
    list.sort((a, b) => b.score - a.score || a.updatedAt - b.updatedAt);
  }
  return list;
}

function buildSnapshot(store, playerId, type = 'score') {
  const valid = sortPlayers(store.players, type);

  let playerRank = null;
  let playerEntry = null;
  if (playerId) {
    const idx = valid.findIndex((r) => r.playerId === playerId);
    if (idx >= 0) {
      playerRank = idx + 1;
      playerEntry = valid[idx];
    }
  }

  const entries = valid.slice(0, 10).map((r, i) => ({
    rank: i + 1,
    playerId: r.playerId,
    nickname: r.nickname,
    score: r.score,
    drumsticks: r.drumsticks,
    maxLevel: r.maxLevel,
    timeSec: r.timeSec,
    updatedAt: r.updatedAt,
  }));

  return {
    ok: true,
    type,
    topScore: entries[0]?.score ?? 0,
    championName: entries[0]?.nickname ?? '虚位以待',
    totalPlayers: valid.length,
    playerRank,
    playerEntry,
    entries,
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') {
    return jsonResponse({ ok: true });
  }

  const url = new URL(request.url);
  if (request.method === 'GET') {
    const pid = sanitizePlayerId(url.searchParams.get('playerId'));
    const rawType = url.searchParams.get('type') || 'score';
    const type = ['score', 'speedrun', 'drumsticks'].includes(rawType) ? rawType : 'score';
    const store = await loadStore(env);
    return jsonResponse(buildSnapshot(store, pid, type));
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

    const store = await loadStore(env);
    const now = Date.now();

    // 1. 设置昵称（带重名检测）
    if (body.action === 'set_nickname') {
      const rawNick = String(body.nickname ?? '').trim();
      if (rawNick.length < 2 || rawNick.length > 12) {
        return jsonResponse({ ok: false, error: '昵称长度需在 2 到 12 个字符之间' }, 400);
      }
      const cleaned = sanitizeNickname(rawNick, playerId);
      const lower = cleaned.toLowerCase();

      for (const [pId, pNick] of Object.entries(store.nicknames)) {
        if (pId !== playerId && String(pNick).toLowerCase() === lower) {
          return jsonResponse({ ok: false, error: '该昵称已被其他玩家使用，请换一个' }, 409);
        }
      }

      store.nicknames[playerId] = cleaned;
      for (const p of store.players) {
        if (p.playerId === playerId) {
          p.nickname = cleaned;
        }
      }
      await saveStore(env, store);
      return jsonResponse({ ok: true, nickname: cleaned });
    }

    // 2. 提交真实闯关战绩
    const score = Math.max(0, Math.min(MAX_VALID_SCORE, Math.floor(Number(body.score) || 0)));
    const drumsticks = Math.max(0, Math.min(MAX_VALID_DRUMSTICKS, Math.floor(Number(body.drumsticks) || 0)));
    const maxLevel = Math.max(1, Math.min(MAX_VALID_LEVEL, Math.floor(Number(body.maxLevel) || 1)));
    const timeSec = Math.max(1, Math.floor(Number(body.timeSec) || 1));

    let nickname = store.nicknames[playerId] || '';
    if (body.nickname && String(body.nickname).trim().length >= 2) {
      const candidate = sanitizeNickname(body.nickname, playerId);
      const lower = candidate.toLowerCase();
      let conflict = false;
      for (const [pId, pNick] of Object.entries(store.nicknames)) {
        if (pId !== playerId && String(pNick).toLowerCase() === lower) {
          conflict = true;
          break;
        }
      }
      if (!conflict) {
        nickname = candidate;
        store.nicknames[playerId] = candidate;
      }
    }
    if (!nickname) {
      nickname = sanitizeNickname('', playerId);
      store.nicknames[playerId] = nickname;
    }

    if (score > 0) {
      const idx = store.players.findIndex((p) => p.playerId === playerId);
      if (idx === -1) {
        store.players.push({
          playerId,
          nickname,
          score,
          drumsticks,
          maxLevel,
          timeSec,
          updatedAt: now,
        });
      } else {
        const prev = store.players[idx];
        prev.nickname = nickname;
        if (score >= prev.score) {
          prev.score = score;
          prev.updatedAt = now;
        }
        prev.drumsticks = Math.max(prev.drumsticks || 0, drumsticks);
        if (maxLevel > prev.maxLevel || (maxLevel === prev.maxLevel && timeSec < prev.timeSec)) {
          prev.maxLevel = maxLevel;
          prev.timeSec = timeSec;
        }
      }
      store.players = sortPlayers(store.players, 'score').slice(0, 200);
      await saveStore(env, store);
    }

    const reqType = ['score', 'speedrun', 'drumsticks'].includes(body.type) ? body.type : 'score';
    return jsonResponse(buildSnapshot(store, playerId, reqType));
  }

  return jsonResponse({ ok: false, error: 'Method Not Allowed' }, 405);
}

/**
 * 《奶龙大冒险：鸡腿保卫战》- Cloudflare Pages 云端排行榜与本地进度同步系统 (leaderboard.js)
 *
 * 特性：
 * 1. 严禁任何虚假机器人数据，排行榜 100% 由真实玩家通关成绩驱动
 * 2. 原生对接 Cloudflare Pages Functions / Workers (`/api/leaderboard`)，支持全球 Top 10 实时拉取、战绩上报与唯一昵称校验
 * 3. 本地开发环境自动回退至 localStorage 真实记录，部署至 Cloudflare Pages 后自动启用云端全球排行
 */

window.NailongAdventure = window.NailongAdventure || {};

(function (ns) {
  'use strict';

  const STORAGE_KEY_BOARD = 'nailong_adventure_real_board_v2';
  const STORAGE_KEY_PROGRESS = 'nailong_adventure_progress_v2';
  const STORAGE_KEY_PLAYER_ID = 'nailong_adventure_player_id_v1';

  const RANDOM_ADJECTIVES = ['干饭', '圆润', '追风', '黄金', '呆萌', '闪电', '破晓', '贪吃'];
  const RANDOM_NOUNS = ['奶龙', '大肚肚', '鸡腿侠', '小七伙伴', '冒险家', '守护者'];

  function formatDateFromTs(ts) {
    const d = ts ? new Date(ts) : new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function formatTimeMMSS(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }

  class LeaderboardManager {
    constructor() {
      this.playerId = this._initPlayerId();
      this.records = this._loadLocalRecords();
      this.progress = this._loadProgress();
      this.cloudMeta = {
        online: false,
        championName: '虚位以待',
        totalPlayers: 0,
        playerRank: null,
      };
    }

    _initPlayerId() {
      try {
        let pid = localStorage.getItem(STORAGE_KEY_PLAYER_ID);
        if (!pid || pid.length < 6) {
          pid = 'nl_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
          localStorage.setItem(STORAGE_KEY_PLAYER_ID, pid);
        }
        return pid;
      } catch (_e) {
        return 'nl_guest_' + Math.random().toString(36).slice(2, 9);
      }
    }

    _loadLocalRecords() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_BOARD);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (_e) {}
      return [];
    }

    _saveLocalRecords() {
      try {
        localStorage.setItem(STORAGE_KEY_BOARD, JSON.stringify(this.records));
      } catch (_e) {}
    }

    _loadProgress() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch (_e) {}
      const suffix = this.playerId.slice(-4).toUpperCase();
      return {
        nickname: `奶龙玩家#${suffix}`,
        unlockedLevel: 1,
        totalScore: 0,
        totalDrumsticks: 0,
        totalTimeSec: 0,
        levels: {},
      };
    }

    saveProgress() {
      try {
        localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(this.progress));
      } catch (_e) {}
    }

    generateRandomNickname() {
      const adj = RANDOM_ADJECTIVES[Math.floor(Math.random() * RANDOM_ADJECTIVES.length)];
      const noun = RANDOM_NOUNS[Math.floor(Math.random() * RANDOM_NOUNS.length)];
      const num = Math.floor(10 + Math.random() * 89);
      return `${adj}${noun}${num}`;
    }

    setNickname(name) {
      const clean = (name || '').replace(/[<>"'`&/\\]/g, '').trim().slice(0, 12) || this.generateRandomNickname();
      this.progress.nickname = clean;
      this.saveProgress();

      // 同步更新本地真实记录中的昵称
      for (const r of this.records) {
        if (r.playerId === this.playerId) {
          r.nickname = clean;
        }
      }
      this._saveLocalRecords();

      // 异步同步至 Cloudflare Pages `/api/leaderboard`
      this.syncNicknameToCloud(clean);
      return clean;
    }

    async syncNicknameToCloud(nickname) {
      if (typeof fetch === 'undefined') return { ok: false };
      try {
        const res = await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({
            action: 'set_nickname',
            playerId: this.playerId,
            nickname,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return { ok: false, error: errData.error || '昵称同步失败' };
        }
        const data = await res.json();
        if (data && data.ok && data.nickname) {
          this.progress.nickname = data.nickname;
          this.saveProgress();
        }
        return data;
      } catch (_e) {
        return { ok: false };
      }
    }

    getNickname() {
      return this.progress.nickname || '奶龙玩家';
    }

    getLevelStatus(levelId) {
      return (
        this.progress.levels[levelId] || {
          cleared: false,
          bestScore: 0,
          stars: 0,
          golden: [false, false, false],
          bestTime: null,
        }
      );
    }

    /**
     * 获取指定章节 (1~5) 当前已获得的星星总数（每章 6 关，满分 18 星）
     */
    getChapterStars(chapterId) {
      const startLvl = (chapterId - 1) * 6 + 1;
      const endLvl = chapterId * 6;
      let sum = 0;
      for (let i = startLvl; i <= endLvl; i++) {
        const st = this.progress.levels[i];
        if (st && st.stars) sum += st.stars;
      }
      return sum;
    }

    /**
     * 解锁下一章所需的当前章最低星数（每章 6 关满分 18 星，降低至 6 颗星即可轻松解锁下一章）
     */
    getRequiredStarsForNextChapter(_chapterId) {
      return 6;
    }

    /**
     * 判断指定章节 (1~8) 是否已解锁
     */
    isChapterUnlocked(chapterId) {
      if (chapterId <= 1) return true;
      for (let prevChap = 1; prevChap < chapterId; prevChap++) {
        const prevLastLevel = prevChap * 6;
        const lastCleared = Boolean(this.progress.levels[prevLastLevel]?.cleared);
        const chapStars = this.getChapterStars(prevChap);
        const reqStars = this.getRequiredStarsForNextChapter(prevChap);
        if (!lastCleared || chapStars < reqStars) {
          return false;
        }
      }
      return true;
    }

    /**
     * 判断指定关卡 (1~48) 是否已解锁：
     * 1. 第 1 关默认解锁
     * 2. 其余关卡必须满足：上一关 (levelId - 1) 已通关，且所属章节已达到星级要求解锁
     */
    isLevelUnlocked(levelId) {
      const totalLevels = ns.Levels ? ns.Levels.LEVEL_SPECS.length : 48;
      if (levelId <= 1) return true;
      if (levelId > totalLevels) return false;
      const chapterId = Math.ceil(levelId / 6);
      if (!this.isChapterUnlocked(chapterId)) return false;
      const prevCleared = Boolean(this.progress.levels[levelId - 1]?.cleared);
      return prevCleared;
    }

    /**
     * 获取当前玩家已解锁的最高关卡号
     */
    getHighestUnlockedLevel() {
      const totalLevels = ns.Levels ? ns.Levels.LEVEL_SPECS.length : 48;
      let highest = 1;
      for (let i = 1; i <= totalLevels; i++) {
        if (this.isLevelUnlocked(i)) {
          highest = i;
        } else {
          break;
        }
      }
      this.progress.unlockedLevel = highest;
      return highest;
    }

    getTotalStars() {
      const totalLevels = ns.Levels ? ns.Levels.LEVEL_SPECS.length : 48;
      let sum = 0;
      for (let i = 1; i <= totalLevels; i++) {
        const st = this.progress.levels[i];
        if (st && st.stars) sum += st.stars;
      }
      return sum;
    }

    recordLevelClear(levelId, levelScore, drumsticksCount, goldenArr, clearTimeSec) {
      const prev = this.getLevelStatus(levelId);
      const mergedGolden = [
        Boolean(prev.golden[0] || goldenArr[0]),
        Boolean(prev.golden[1] || goldenArr[1]),
        Boolean(prev.golden[2] || goldenArr[2]),
      ];
      const stars = mergedGolden.filter(Boolean).length;

      const scoreDelta = Math.max(0, levelScore - (prev.bestScore || 0));
      this.progress.levels[levelId] = {
        cleared: true,
        bestScore: Math.max(prev.bestScore || 0, levelScore),
        stars: Math.max(prev.stars || 0, stars),
        golden: mergedGolden,
        bestTime: prev.bestTime ? Math.min(prev.bestTime, clearTimeSec) : clearTimeSec,
      };

      this.progress.unlockedLevel = this.getHighestUnlockedLevel();
      this.progress.totalScore = (this.progress.totalScore || 0) + (prev.cleared ? scoreDelta : levelScore);
      this.progress.totalDrumsticks = (this.progress.totalDrumsticks || 0) + drumsticksCount;
      this.progress.totalTimeSec = (this.progress.totalTimeSec || 0) + Math.max(1, Math.round(clearTimeSec));
      this.saveProgress();

      this.submitCurrentPlayerRecord(levelId);
      return this.progress.levels[levelId];
    }

    submitCurrentPlayerRecord(latestLevelId = 1) {
      const nick = this.getNickname();
      const clearedLevels = Object.keys(this.progress.levels)
        .filter((k) => this.progress.levels[k].cleared)
        .map(Number);
      const maxCleared = Math.max(latestLevelId, ...clearedLevels, 1);
      const now = Date.now();

      const entry = {
        playerId: this.playerId,
        nickname: nick,
        score: Math.max(100, this.progress.totalScore || 0),
        drumsticks: Math.max(0, this.progress.totalDrumsticks || 0),
        maxLevel: maxCleared,
        timeSec: Math.max(1, this.progress.totalTimeSec || 10),
        updatedAt: now,
        date: formatDateFromTs(now),
      };

      const existingIdx = this.records.findIndex((r) => r.playerId === this.playerId);
      if (existingIdx >= 0) {
        const old = this.records[existingIdx];
        this.records[existingIdx] = {
          playerId: this.playerId,
          nickname: nick,
          score: Math.max(old.score, entry.score),
          drumsticks: Math.max(old.drumsticks, entry.drumsticks),
          maxLevel: Math.max(old.maxLevel, entry.maxLevel),
          timeSec: entry.maxLevel >= old.maxLevel ? entry.timeSec : old.timeSec,
          updatedAt: now,
          date: entry.date,
        };
      } else {
        this.records.push(entry);
      }

      this._saveLocalRecords();
      this.submitRecordToCloud(entry);
    }

    async submitRecordToCloud(entry) {
      if (typeof fetch === 'undefined') return null;
      try {
        const res = await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({
            playerId: this.playerId,
            nickname: entry.nickname,
            score: entry.score,
            drumsticks: entry.drumsticks,
            maxLevel: entry.maxLevel,
            timeSec: entry.timeSec,
          }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data && data.ok && Array.isArray(data.entries)) {
          this.cloudMeta = {
            online: true,
            championName: data.championName || '虚位以待',
            totalPlayers: data.totalPlayers || data.entries.length,
            playerRank: data.playerRank || null,
          };
          this.records = data.entries.map((r) => ({
            ...r,
            date: formatDateFromTs(r.updatedAt),
          }));
          this._saveLocalRecords();
        }
        return data;
      } catch (_e) {
        return null;
      }
    }

    async fetchCloudLeaderboard(mode = 'score') {
      if (typeof fetch === 'undefined') return this.getTop10(mode);
      try {
        const qPid = encodeURIComponent(this.playerId);
        const qType = encodeURIComponent(mode);
        const res = await fetch(`/api/leaderboard?playerId=${qPid}&type=${qType}`, {
          method: 'GET',
          cache: 'no-store',
        });
        if (!res.ok) return this.getTop10(mode);
        const data = await res.json();
        if (data && data.ok && Array.isArray(data.entries)) {
          this.cloudMeta = {
            online: true,
            championName: data.championName || '虚位以待',
            totalPlayers: data.totalPlayers || data.entries.length,
            playerRank: data.playerRank || null,
          };
          return data.entries.map((r, idx) => ({
            rank: r.rank || idx + 1,
            playerId: r.playerId,
            nickname: r.nickname,
            score: r.score,
            drumsticks: r.drumsticks || 0,
            maxLevel: r.maxLevel || 1,
            timeSec: r.timeSec || 0,
            formattedTime: formatTimeMMSS(r.timeSec),
            date: formatDateFromTs(r.updatedAt),
          }));
        }
      } catch (_e) {
        // 本地静态服务器未启用 Functions 时平滑回退到本地真实战绩
      }
      return this.getTop10(mode);
    }

    getTop10(mode = 'score') {
      const list = this.records.filter((r) => r && r.score > 0);
      if (mode === 'speedrun') {
        list.sort((a, b) => {
          if (b.maxLevel !== a.maxLevel) return b.maxLevel - a.maxLevel;
          return a.timeSec - b.timeSec;
        });
      } else if (mode === 'drumsticks') {
        list.sort((a, b) => b.drumsticks - a.drumsticks || b.score - a.score);
      } else {
        list.sort((a, b) => b.score - a.score);
      }
      return list.slice(0, 10).map((item, idx) => ({
        rank: idx + 1,
        ...item,
        formattedTime: formatTimeMMSS(item.timeSec),
        date: item.date || formatDateFromTs(item.updatedAt),
      }));
    }
  }

  ns.Leaderboard = new LeaderboardManager();
  ns.formatTimeMMSS = formatTimeMMSS;
})(window.NailongAdventure);

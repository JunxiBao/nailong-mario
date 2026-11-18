/**
 * 《奶龙大冒险：鸡腿保卫战》- 主控游戏循环与 UI 交互引擎 (main.js)
 *
 * 负责：
 * - 60 FPS 主渲染循环、平滑相机跟随、极简 HUD 实时同步
 * - 严格按关卡配置锁定天气（不可手动切换）
 * - 星级展示“有几颗星就显示几颗星”，去除冗余空心星占位
 * - 对接 Cloudflare Pages (`/api/leaderboard`) 真实全球排行榜
 */

window.NailongAdventure = window.NailongAdventure || {};

(function (ns) {
  'use strict';

  const VIEW_W = 960;
  const VIEW_H = 540;

  class GameController {
    constructor() {
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;

      this.state = 'menu'; // 'menu' | 'playing' | 'paused' | 'result'
      this.currentLevelId = 1;
      this.level = null;
      this.player = null;
      this.camera = { x: 0, y: 0 };

      this.levelScore = 0;
      this.levelDrumsticks = 0;
      this.levelGolden = [false, false, false];
      this.levelTimeSec = 0;
      this.globalTimeSec = 0;
      this.subtitleTimer = 0;
      this.leaderboardTab = 'score';

      this.input = {
        left: false,
        right: false,
        jumpHeld: false,
        jumpJustPressed: false,
        fireJustPressed: false,
      };

      this._init();
    }

    _init() {
      ns.Sprites.init();

      ns.Audio.onSubtitle = (text) => {
        const toast = document.getElementById('voice-subtitle-toast');
        if (toast) {
          toast.textContent = text;
          toast.classList.remove('hidden');
          this.subtitleTimer = 3.0;
        }
      };

      this._bindInputs();
      this._bindUI();

      const nickInput = document.getElementById('input-nickname');
      if (nickInput) {
        nickInput.value = ns.Leaderboard.getNickname();
      }
      this._refreshContinueButton();

      this.loadLevel(ns.Leaderboard.progress.unlockedLevel || 1, false);

      this.lastFrameTime = performance.now();
      requestAnimationFrame((ts) => this._loop(ts));
    }

    _refreshContinueButton() {
      const contSpan = document.getElementById('menu-continue-lvl');
      if (contSpan) {
        contSpan.textContent = String(ns.Leaderboard.getHighestUnlockedLevel());
      }
    }

    _bindInputs() {
      window.addEventListener('keydown', (e) => {
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

        const code = e.code;
        if (code === 'ArrowLeft' || code === 'KeyA') {
          this.input.left = true;
        } else if (code === 'ArrowRight' || code === 'KeyD') {
          this.input.right = true;
        } else if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space' || code === 'KeyK') {
          e.preventDefault();
          if (!this.input.jumpHeld) {
            this.input.jumpJustPressed = true;
          }
          this.input.jumpHeld = true;
        } else if (code === 'KeyJ' || code === 'KeyZ' || code === 'KeyX' || code === 'Enter') {
          this.input.fireJustPressed = true;
        } else if (code === 'KeyM') {
          this._toggleMute();
        } else if (code === 'KeyP' || code === 'Escape') {
          if (this.state === 'playing') {
            this.pauseGame();
          } else if (this.state === 'paused') {
            this.resumeGame();
          }
        }
      });

      window.addEventListener('keyup', (e) => {
        const code = e.code;
        if (code === 'ArrowLeft' || code === 'KeyA') {
          this.input.left = false;
        } else if (code === 'ArrowRight' || code === 'KeyD') {
          this.input.right = false;
        } else if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space' || code === 'KeyK') {
          this.input.jumpHeld = false;
        }
      });

      const bindHoldBtn = (id, onDown, onUp) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const start = (ev) => {
          ev.preventDefault();
          ns.Audio.unlock();
          onDown();
        };
        const end = (ev) => {
          ev.preventDefault();
          if (onUp) onUp();
        };
        btn.addEventListener('mousedown', start);
        btn.addEventListener('mouseup', end);
        btn.addEventListener('mouseleave', end);
        btn.addEventListener('touchstart', start, { passive: false });
        btn.addEventListener('touchend', end, { passive: false });
      };

      bindHoldBtn(
        'touch-left',
        () => (this.input.left = true),
        () => (this.input.left = false)
      );
      bindHoldBtn(
        'touch-right',
        () => (this.input.right = true),
        () => (this.input.right = false)
      );
      bindHoldBtn(
        'touch-jump',
        () => {
          this.input.jumpJustPressed = true;
          this.input.jumpHeld = true;
        },
        () => {
          this.input.jumpHeld = false;
        }
      );
      bindHoldBtn('touch-fire', () => {
        this.input.fireJustPressed = true;
      });
    }

    _bindUI() {
      const nickInput = document.getElementById('input-nickname');
      const nickHint = document.getElementById('nickname-hint');

      const applyNickname = async (raw) => {
        const clean = ns.Leaderboard.setNickname(raw);
        if (nickInput) nickInput.value = clean;
        const res = await ns.Leaderboard.syncNicknameToCloud(clean);
        if (nickHint) {
          if (res && res.error) {
            nickHint.textContent = res.error;
            nickHint.style.color = '#fca5a5';
          } else {
            nickHint.textContent = '已保存';
            nickHint.style.color = '#94a3b8';
          }
        }
      };

      if (nickInput) {
        nickInput.addEventListener('change', () => {
          applyNickname(nickInput.value);
        });
      }

      document.getElementById('btn-random-nick')?.addEventListener('click', () => {
        ns.Audio.unlock();
        const rnd = ns.Leaderboard.generateRandomNickname();
        applyNickname(rnd);
      });

      document.getElementById('btn-start-game')?.addEventListener('click', () => {
        ns.Audio.unlock();
        if (nickInput) ns.Leaderboard.setNickname(nickInput.value);
        const targetLvl = ns.Leaderboard.getHighestUnlockedLevel();
        this.startLevel(targetLvl);
      });

      const openMap = () => {
        ns.Audio.unlock();
        this._renderWorldMap();
        this._showOverlay('modal-map');
      };
      document.getElementById('btn-open-map')?.addEventListener('click', openMap);
      document.getElementById('btn-menu-map')?.addEventListener('click', openMap);
      document.getElementById('btn-pause-map')?.addEventListener('click', openMap);
      document.getElementById('btn-result-map')?.addEventListener('click', openMap);

      const openCodex = () => {
        ns.Audio.unlock();
        this._showOverlay('modal-codex');
      };
      document.getElementById('btn-open-codex')?.addEventListener('click', openCodex);
      document.getElementById('btn-menu-codex')?.addEventListener('click', openCodex);

      const openLb = () => {
        ns.Audio.unlock();
        this._showOverlay('modal-leaderboard');
        this._renderLeaderboard();
      };
      document.getElementById('btn-open-leaderboard')?.addEventListener('click', openLb);
      document.getElementById('btn-menu-leaderboard')?.addEventListener('click', openLb);

      document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.leaderboardTab = btn.getAttribute('data-tab') || 'score';
          this._renderLeaderboard();
        });
      });

      document.querySelectorAll('.btn-close-modal').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (this.state === 'playing') {
            this._hideAllOverlays();
          } else if (this.state === 'paused') {
            this._showOverlay('modal-pause');
          } else {
            this._showOverlay('modal-menu');
          }
        });
      });

      document.getElementById('btn-mute')?.addEventListener('click', () => {
        this._toggleMute();
      });

      document.getElementById('btn-pause')?.addEventListener('click', () => {
        if (this.state === 'playing') this.pauseGame();
        else if (this.state === 'paused') this.resumeGame();
      });

      document.getElementById('btn-resume')?.addEventListener('click', () => this.resumeGame());
      document.getElementById('btn-restart-level')?.addEventListener('click', () => this.startLevel(this.currentLevelId));
      document.getElementById('btn-pause-home')?.addEventListener('click', () => {
        this.state = 'menu';
        this._refreshContinueButton();
        this._showOverlay('modal-menu');
      });

      document.getElementById('btn-next-level')?.addEventListener('click', () => {
        const nextId = this.currentLevelId < 30 ? this.currentLevelId + 1 : 1;
        this.startLevel(nextId);
      });
      document.getElementById('btn-retry-level')?.addEventListener('click', () => {
        this.startLevel(this.currentLevelId);
      });
    }

    _toggleMute() {
      const muted = ns.Audio.toggleMute();
      const btn = document.getElementById('btn-mute');
      if (btn) {
        btn.textContent = muted ? '音效: 关' : '音效: 开';
      }
    }

    _hideAllOverlays() {
      document.querySelectorAll('.modal-overlay').forEach((el) => el.classList.add('hidden'));
    }

    _showOverlay(id) {
      this._hideAllOverlays();
      document.getElementById(id)?.classList.remove('hidden');
    }

    loadLevel(levelId, startPlaying = true) {
      this.currentLevelId = Math.min(30, Math.max(1, levelId));
      this.level = ns.Levels.buildLevel(this.currentLevelId);
      ns.Physics.reset();
      this.player = ns.Physics.createPlayer(96, this.level.groundY - 46);
      this.camera.x = 0;

      this.levelScore = 0;
      this.levelDrumsticks = 0;
      this.levelGolden = [false, false, false];
      this.levelTimeSec = 0;

      // 严格使用本关写死的固定天气
      ns.Weather.setWeather(this.level.weather, true);
      this._syncHUD();
      this._syncWeatherHUD();

      const tipEl = document.getElementById('level-tip-text');
      if (tipEl) {
        tipEl.textContent = `第 ${this.level.id} 关 · ${this.level.name} — ${this.level.tip}`;
      }

      if (startPlaying) {
        this.state = 'playing';
        this._hideAllOverlays();
        ns.Audio.startBgm(this.level.isBoss ? 'boss' : this.level.chapter);
        if (this.level.id === 1 || this.level.isBoss) {
          ns.Audio.playVoiceLine();
        }
      }
    }

    startLevel(levelId) {
      if (!ns.Leaderboard.isLevelUnlocked(levelId)) {
        return;
      }
      this.loadLevel(levelId, true);
    }

    pauseGame() {
      if (this.state !== 'playing') return;
      this.state = 'paused';
      const info = document.getElementById('pause-level-info');
      if (info && this.level) {
        info.textContent = `第 ${this.level.id} 关 · ${this.level.name}（${this.level.chapterInfo.name}）`;
      }
      this._showOverlay('modal-pause');
    }

    resumeGame() {
      if (this.state !== 'paused') return;
      this.state = 'playing';
      this._hideAllOverlays();
    }

    _handleLevelClear() {
      if (this.state === 'result') return;
      this.state = 'result';

      const timeBonus = Math.max(0, Math.round((180 - this.levelTimeSec) * 10));
      const hpBonus = this.player.hp * 300;
      this.levelScore += timeBonus + hpBonus;

      const record = ns.Leaderboard.recordLevelClear(
        this.level.id,
        this.levelScore,
        this.levelDrumsticks,
        this.levelGolden,
        this.levelTimeSec
      );
      this._refreshContinueButton();

      if (ns.Audio) {
        ns.Audio.playVictory();
        ns.Audio.playVoiceLine();
      }

      const starsCount = record.stars || 0;
      const nextLvlId = this.level.id + 1;
      const nextUnlocked = nextLvlId <= 30 && ns.Leaderboard.isLevelUnlocked(nextLvlId);
      const chapId = this.level.chapter;
      const chapStars = ns.Leaderboard.getChapterStars(chapId);
      const reqStars = ns.Leaderboard.getRequiredStarsForNextChapter(chapId);

      document.getElementById('result-title').textContent =
        this.level.id === 30 ? '全 30 关通关完成' : `第 ${this.level.id} 关完成`;
      // 有几颗星就显示几颗星，0颗星时不显示空心星
      document.getElementById('result-stars').textContent = starsCount > 0 ? '★'.repeat(starsCount) : '';

      if (this.level.id < 30 && !nextUnlocked) {
        document.getElementById('result-subtitle').textContent =
          `本章当前累计 ${chapStars} / ${reqStars} 星，需在本章获得满 ${reqStars} 颗星方可解锁下一章`;
      } else {
        document.getElementById('result-subtitle').textContent =
          starsCount === 3
            ? '已集齐本关全部 3 颗黄金大鸡腿，达成三星评价'
            : `本关获得 ${starsCount} 星，收集全部 3 颗黄金大鸡腿可达成三星`;
      }

      document.getElementById('result-score').textContent = String(this.levelScore);
      document.getElementById('result-drumsticks').textContent = String(this.levelDrumsticks);
      document.getElementById('result-golden').textContent = `${this.levelGolden.filter(Boolean).length} / 3`;
      document.getElementById('result-time').textContent = ns.formatTimeMMSS(this.levelTimeSec);

      const nextBtn = document.getElementById('btn-next-level');
      if (nextBtn) {
        if (this.level.id >= 30) {
          nextBtn.textContent = '查看排行榜';
          nextBtn.onclick = () => {
            this._showOverlay('modal-leaderboard');
            this._renderLeaderboard();
          };
        } else if (nextUnlocked) {
          nextBtn.textContent = `下一关（第 ${nextLvlId} 关）`;
          nextBtn.onclick = () => {
            this.startLevel(nextLvlId);
          };
        } else {
          nextBtn.textContent = `前往选关补齐本章星级（${chapStars} / ${reqStars}）`;
          nextBtn.onclick = () => {
            this._renderWorldMap();
            this._showOverlay('modal-map');
          };
        }
      }

      this._showOverlay('modal-result');
    }

    _handleGameOver() {
      if (this.state === 'result') return;
      this.state = 'result';
      if (ns.Audio) ns.Audio.playGameOver();

      document.getElementById('result-title').textContent = '闯关失败';
      document.getElementById('result-stars').textContent = '';
      document.getElementById('result-subtitle').textContent = '生命值耗尽，可顶开问号砖获取波波奶茶护盾与红辣椒火球';
      document.getElementById('result-score').textContent = String(this.levelScore);
      document.getElementById('result-drumsticks').textContent = String(this.levelDrumsticks);
      document.getElementById('result-golden').textContent = `${this.levelGolden.filter(Boolean).length} / 3`;
      document.getElementById('result-time').textContent = ns.formatTimeMMSS(this.levelTimeSec);

      const nextBtn = document.getElementById('btn-next-level');
      if (nextBtn) {
        nextBtn.textContent = '重新挑战本关';
        nextBtn.onclick = () => this.startLevel(this.currentLevelId);
      }

      this._showOverlay('modal-result');
    }

    _syncHUD() {
      if (!this.level || !this.player) return;
      document.getElementById('hud-level-title').textContent = `第 ${this.level.id} 关 · ${this.level.name}`;
      document.getElementById('hud-hearts').textContent = `${Math.max(0, this.player.hp)} / ${this.player.maxHp}`;

      const pill = document.getElementById('hud-power-badge');
      if (pill) {
        pill.className = 'state-tag';
        if (this.player.hasFire) {
          pill.textContent = '喷火 (J)';
          pill.classList.add('fire-active');
        } else if (this.player.isBig) {
          pill.textContent = '护盾';
          pill.classList.add('big-active');
        } else {
          pill.textContent = '标准';
        }
      }

      // 有几颗星就显示几颗实心星 ★，0 颗时显示 —
      const earnedStars = this.levelGolden.filter(Boolean).length;
      document.getElementById('hud-golden-stars').textContent =
        earnedStars > 0 ? '★'.repeat(earnedStars) : '—';

      document.getElementById('hud-drumsticks').textContent = String(this.levelDrumsticks);
      document.getElementById('hud-score').textContent = this.levelScore.toLocaleString();
      document.getElementById('hud-timer').textContent = ns.formatTimeMMSS(this.levelTimeSec);
    }

    _syncWeatherHUD() {
      const meta = ns.Weather.getMeta();
      const wText = document.getElementById('hud-weather-text');
      if (wText) {
        wText.textContent = meta.name;
      }
      const fDesc = document.getElementById('footer-weather-desc');
      if (fDesc) {
        fDesc.textContent = `本关天气：${meta.name} — ${meta.desc}`;
      }

      const windBanner = document.getElementById('wind-indicator');
      if (windBanner) {
        if (ns.Weather.current === 'windy') {
          windBanner.classList.remove('hidden');
          windBanner.textContent = ns.Weather.windDir >= 0 ? '顺风推力 →' : '← 逆风阻力';
        } else if (ns.Weather.current === 'snowy' && ns.Weather.coldMeter > 0.2) {
          windBanner.classList.remove('hidden');
          windBanner.textContent = `积雪减速 ${Math.round(ns.Weather.coldMeter * 100)}%`;
        } else {
          windBanner.classList.add('hidden');
        }
      }
    }

    _renderWorldMap() {
      const container = document.getElementById('world-map-chapters');
      if (!container) return;
      container.innerHTML = '';

      document.getElementById('map-total-stars').textContent = String(ns.Leaderboard.getTotalStars());

      for (let cId = 1; cId <= 5; cId++) {
        const ch = ns.Levels.CHAPTER_INFO[cId];
        const chapUnlocked = ns.Leaderboard.isChapterUnlocked(cId);
        const chapStars = ns.Leaderboard.getChapterStars(cId);
        const reqNext = ns.Leaderboard.getRequiredStarsForNextChapter(cId);

        let rightStatusText = `本章星级 ${chapStars} / 18`;
        if (cId < 5) {
          rightStatusText += ` · 满 ${reqNext} 星且通关第 ${cId * 6} 关解锁下一章`;
        }
        if (!chapUnlocked && cId > 1) {
          const prevStars = ns.Leaderboard.getChapterStars(cId - 1);
          const reqPrev = ns.Leaderboard.getRequiredStarsForNextChapter(cId - 1);
          rightStatusText = `未解锁 · 需第 ${cId - 1} 章达到 ${reqPrev} 星且通关第 ${(cId - 1) * 6} 关（当前第 ${cId - 1} 章：${prevStars} / ${reqPrev} 星）`;
        }

        const block = document.createElement('div');
        block.className = 'chapter-block';

        const header = document.createElement('div');
        header.className = 'chapter-block-header';
        header.innerHTML = `
          <span class="chapter-block-title">${ch.name}</span>
          <span class="chapter-block-desc" style="color:${chapUnlocked ? '#94a3b8' : '#fca5a5'}">${rightStatusText}</span>
        `;
        block.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'level-grid';

        for (let lvlId = ch.range[0]; lvlId <= ch.range[1]; lvlId++) {
          const spec = ns.Levels.LEVEL_SPECS[lvlId - 1];
          const unlocked = ns.Leaderboard.isLevelUnlocked(lvlId);
          const st = ns.Leaderboard.getLevelStatus(lvlId);
          const weatherMeta = ns.WEATHER_META[spec.weather.toLowerCase()] || ns.WEATHER_META.sunny;

          const btn = document.createElement('button');
          btn.className = `level-node-btn ${unlocked ? 'unlocked' : 'locked'} ${st.cleared ? 'cleared' : ''} ${spec.isBoss ? 'boss-node' : ''}`;

          // 有几颗星就显示几颗 ★，0 颗时不显示空心星
          const starStr = st.stars > 0 ? '★'.repeat(st.stars) : '';

          btn.innerHTML = `
            <div class="lvl-num">${unlocked ? '' : '未解锁 · '}第 ${lvlId} 关 · ${weatherMeta.name}</div>
            <div class="lvl-name">${spec.name}</div>
            <div class="lvl-stars">${starStr}</div>
          `;

          if (unlocked) {
            btn.addEventListener('click', () => {
              this.startLevel(lvlId);
            });
          }
          grid.appendChild(btn);
        }

        block.appendChild(grid);
        container.appendChild(block);
      }
    }

    async _renderLeaderboard() {
      const tbody = document.getElementById('leaderboard-tbody');
      const metaLine = document.getElementById('leaderboard-meta-line');
      if (!tbody) return;
      tbody.innerHTML = '<tr><td colspan="7" class="empty-row">正在同步排行榜数据...</td></tr>';

      const top10 = await ns.Leaderboard.fetchCloudLeaderboard(this.leaderboardTab);
      tbody.innerHTML = '';

      if (metaLine) {
        const meta = ns.Leaderboard.cloudMeta;
        const champ = top10[0]?.nickname || meta.championName || '虚位以待';
        const myRankStr = meta.playerRank ? ` · 我的排名：第 ${meta.playerRank} 名` : '';
        metaLine.textContent = `榜首：${champ}${myRankStr} · 仅收录真实玩家闯关战绩`;
      }

      if (top10.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="7" class="empty-row">暂无玩家上榜记录，通关任意关卡后将自动上传您的真实战绩</td></tr>';
        return;
      }

      for (const row of top10) {
        const tr = document.createElement('tr');
        const isMe = row.playerId === ns.Leaderboard.playerId;
        if (isMe) {
          tr.style.background = 'rgba(245, 158, 11, 0.08)';
        }
        tr.innerHTML = `
          <td><b>#${row.rank}</b></td>
          <td style="color:${isMe ? '#fbbf24' : '#f8fafc'};font-weight:600;">${row.nickname}${isMe ? ' (我)' : ''}</td>
          <td>${row.score.toLocaleString()}</td>
          <td>${row.drumsticks}</td>
          <td>第 ${row.maxLevel} 关</td>
          <td>${row.formattedTime}</td>
          <td style="color:#64748b;font-size:12px;">${row.date}</td>
        `;
        tbody.appendChild(tr);
      }
    }

    _renderShowcaseCanvases(timeSec) {
      const cCache = ns.Sprites.cache.codex;
      if (!cCache.nailong) return;

      const drawPair = (id1, id2, frames, speed) => {
        const frame = frames[Math.floor(timeSec * speed) % frames.length];
        for (const id of [id1, id2]) {
          const cv = document.getElementById(id);
          if (cv) {
            const ctx = cv.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, cv.width, cv.height);
            const bounce = Math.round(Math.sin(timeSec * 5) * 2);
            ctx.drawImage(frame, 0, bounce, cv.width, cv.height);
          }
        }
      };

      drawPair('menu-canvas-nailong', 'codex-canvas-nailong', cCache.nailong, 1.8);
      drawPair('menu-canvas-baobaolong', 'codex-canvas-baobaolong', cCache.baobaolong, 1.8);
      drawPair('menu-canvas-minion1', 'codex-canvas-minion1', cCache.minionTwin, 4.0);
      drawPair('menu-canvas-minion2', 'codex-canvas-minion2', cCache.minionCyclops, 4.0);
      drawPair('menu-canvas-xiaoqi', 'codex-canvas-xiaoqi', cCache.xiaoqi, 2.2);
    }

    _loop(timestamp) {
      const rawDt = (timestamp - this.lastFrameTime) / 1000;
      this.lastFrameTime = timestamp;
      const dt = Math.min(0.033, Math.max(0.001, rawDt));
      this.globalTimeSec += dt;

      if (this.subtitleTimer > 0) {
        this.subtitleTimer -= dt;
        if (this.subtitleTimer <= 0) {
          document.getElementById('voice-subtitle-toast')?.classList.add('hidden');
        }
      }

      if (this.state === 'playing' && this.level && this.player) {
        this.levelTimeSec += dt;

        ns.Weather.update(dt, this.player, this.camera, VIEW_W, VIEW_H, this.level.groundY);

        ns.Physics.update(dt, this.player, this.level, this.input, {
          onAddScore: (pts) => {
            this.levelScore += pts;
          },
          onCollectDrumstick: (pts, isGolden, goldenIdx) => {
            this.levelScore += pts;
            this.levelDrumsticks += 1;
            if (isGolden && goldenIdx >= 0 && goldenIdx < 3) {
              this.levelGolden[goldenIdx] = true;
            }
          },
          onLevelClear: () => {
            this._handleLevelClear();
          },
        });

        if (this.player.dead) {
          this._handleGameOver();
        }

        const targetCamX = Math.max(
          0,
          Math.min(this.level.worldW - VIEW_W, this.player.x - VIEW_W * 0.34)
        );
        this.camera.x += (targetCamX - this.camera.x) * Math.min(1, dt * 10);

        this._syncHUD();
        this._syncWeatherHUD();
      } else {
        ns.Weather.update(dt, null, this.camera, VIEW_W, VIEW_H, 468);
        this._renderShowcaseCanvases(this.globalTimeSec);
      }

      this._renderScene();
      requestAnimationFrame((ts) => this._loop(ts));
    }

    _renderScene() {
      if (!this.level) return;
      const ctx = this.ctx;
      const t = this.globalTimeSec;

      ns.Levels.renderParallaxBackground(ctx, this.level, this.camera, VIEW_W, VIEW_H, t);
      ns.Levels.renderDecorations(ctx, this.level, this.camera, VIEW_W, t);
      ns.Levels.renderTilesAndHazards(ctx, this.level, this.camera, VIEW_W, t);

      ctx.save();
      ctx.translate(-Math.round(this.camera.x), 0);
      for (const item of this.level.collectibles) {
        if (item.collected) continue;
        if (item.x + item.w < this.camera.x - 40 || item.x > this.camera.x + VIEW_W + 40) continue;
        ns.Sprites.drawCollectible(ctx, item, t);
      }

      for (const en of this.level.enemies) {
        if (en.dead) continue;
        if (en.x + en.w < this.camera.x - 80 || en.x > this.camera.x + VIEW_W + 80) continue;
        if (en.type === 'boss' || en.type === 'final_boss') {
          ns.Sprites.drawBaobaolong(ctx, en, t);
        } else {
          ns.Sprites.drawMinion(ctx, en, t);
        }
      }

      if (this.player) {
        ns.Sprites.drawNailong(ctx, this.player, t);
      }
      ctx.restore();

      ns.Physics.renderEffects(ctx, this.camera, t);

      if (this.player) {
        ns.Levels.renderForestFogOverlay(ctx, this.level, this.player, this.camera, VIEW_W, VIEW_H);
      }

      ns.Weather.render(ctx, this.camera, VIEW_W, VIEW_H, t);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    ns.Game = new GameController();
  });
})(window.NailongAdventure);

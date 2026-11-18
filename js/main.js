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
  "use strict";

  const VIEW_W = 960;
  const VIEW_H = 540;

  class GameController {
    constructor() {
      this.canvas = document.getElementById("game-canvas");
      this.ctx = this.canvas.getContext("2d");
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = "high";

      this.state = "menu"; // 'menu' | 'playing' | 'paused' | 'result'
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
      this.leaderboardTab = "score";

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
        const toast = document.getElementById("voice-subtitle-toast");
        if (toast) {
          toast.textContent = text;
          toast.classList.remove("hidden");
          this.subtitleTimer = 3.0;
        }
      };

      this._bindInputs();
      this._bindUI();

      const nickInput = document.getElementById("input-nickname");
      if (nickInput) {
        nickInput.value = ns.Leaderboard.getNickname();
      }
      this._refreshContinueButton();

      this.loadLevel(ns.Leaderboard.progress.unlockedLevel || 1, false);

      this.lastFrameTime = performance.now();
      requestAnimationFrame((ts) => this._loop(ts));
    }

    _refreshContinueButton() {
      const contSpan = document.getElementById("menu-continue-lvl");
      if (contSpan) {
        contSpan.textContent = String(ns.Leaderboard.getHighestUnlockedLevel());
      }
    }

    _bindInputs() {
      window.addEventListener("keydown", (e) => {
        if (
          document.activeElement &&
          document.activeElement.tagName === "INPUT"
        )
          return;
        const gameplayKeys = [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Space",
          "KeyA",
          "KeyD",
          "KeyW",
          "KeyK",
          "KeyJ",
          "KeyZ",
          "KeyX",
          "Enter",
        ];
        if (this.state !== "playing" && gameplayKeys.includes(e.code)) return;
        if (
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(
            e.code,
          )
        )
          e.preventDefault();

        const code = e.code;
        if (code === "ArrowLeft" || code === "KeyA") {
          this.input.left = true;
        } else if (code === "ArrowRight" || code === "KeyD") {
          this.input.right = true;
        } else if (
          code === "ArrowUp" ||
          code === "KeyW" ||
          code === "Space" ||
          code === "KeyK"
        ) {
          e.preventDefault();
          if (!this.input.jumpHeld) {
            this.input.jumpJustPressed = true;
          }
          this.input.jumpHeld = true;
        } else if (
          code === "KeyJ" ||
          code === "KeyZ" ||
          code === "KeyX" ||
          code === "Enter"
        ) {
          this.input.fireJustPressed = true;
        } else if (code === "KeyM") {
          this._toggleMute();
        } else if (code === "KeyP" || code === "Escape") {
          if (this.state === "playing") {
            this.pauseGame();
          } else if (this.state === "paused") {
            this.resumeGame();
          } else if (this.state === "menu") {
            this._showOverlay("modal-menu");
          }
        }
      });

      window.addEventListener("keyup", (e) => {
        const code = e.code;
        if (code === "ArrowLeft" || code === "KeyA") {
          this.input.left = false;
        } else if (code === "ArrowRight" || code === "KeyD") {
          this.input.right = false;
        } else if (
          code === "ArrowUp" ||
          code === "KeyW" ||
          code === "Space" ||
          code === "KeyK"
        ) {
          this.input.jumpHeld = false;
        }
      });

      window.addEventListener("blur", () => {
        this._clearInputs();
        if (this.state === "playing") this.pauseGame();
      });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          this._clearInputs();
          if (this.state === "playing") this.pauseGame();
        }
      });

      // 移动端丝滑多指触控系统：支持左拇指在方向键区域左右平滑滑动变向，右拇指同时按跳跃/喷火互不干扰！
      const dpadZone = document.getElementById("mobile-dpad-zone");
      const leftBtn = document.getElementById("touch-left");
      const rightBtn = document.getElementById("touch-right");
      const jumpBtn = document.getElementById("touch-jump");
      const fireBtn = document.getElementById("touch-fire");

      const updateDpadFromTouches = (e) => {
        if (!dpadZone || !leftBtn || !rightBtn) return;
        const rect = dpadZone.getBoundingClientRect();
        const midX = rect.left + rect.width * 0.5;
        let hasLeft = false;
        let hasRight = false;

        for (let i = 0; i < e.touches.length; i++) {
          const t = e.touches[i];
          if (
            t.clientX >= rect.left - 36 &&
            t.clientX <= rect.right + 36 &&
            t.clientY >= rect.top - 42 &&
            t.clientY <= rect.bottom + 42
          ) {
            if (t.clientX < midX) hasLeft = true;
            else hasRight = true;
          }
        }
        this.input.left = hasLeft;
        this.input.right = hasRight;
        leftBtn.classList.toggle("touch-pressed", hasLeft);
        rightBtn.classList.toggle("touch-pressed", hasRight);
      };

      if (dpadZone) {
        dpadZone.addEventListener(
          "touchstart",
          (e) => {
            e.preventDefault();
            ns.Audio.unlock();
            updateDpadFromTouches(e);
          },
          { passive: false },
        );
        dpadZone.addEventListener(
          "touchmove",
          (e) => {
            e.preventDefault();
            updateDpadFromTouches(e);
          },
          { passive: false },
        );
        const endDpad = (e) => {
          e.preventDefault();
          updateDpadFromTouches(e);
        };
        dpadZone.addEventListener("touchend", endDpad, { passive: false });
        dpadZone.addEventListener("touchcancel", endDpad, { passive: false });
      }

      const bindHoldBtn = (btn, onDown, onUp) => {
        if (!btn) return;
        const start = (ev) => {
          ev.preventDefault();
          ns.Audio.unlock();
          btn.classList.add("touch-pressed");
          onDown();
        };
        const end = (ev) => {
          ev.preventDefault();
          btn.classList.remove("touch-pressed");
          if (onUp) onUp();
        };
        btn.addEventListener("mousedown", start);
        btn.addEventListener("mouseup", end);
        btn.addEventListener("mouseleave", end);
        btn.addEventListener("touchstart", start, { passive: false });
        btn.addEventListener("touchend", end, { passive: false });
        btn.addEventListener("touchcancel", end, { passive: false });
      };

      // 桌面端鼠标点击左/右按钮回退兼容
      if (leftBtn) {
        leftBtn.addEventListener("mousedown", () => {
          ns.Audio.unlock();
          this.input.left = true;
          leftBtn.classList.add("touch-pressed");
        });
        const stopLeft = () => {
          this.input.left = false;
          leftBtn.classList.remove("touch-pressed");
        };
        leftBtn.addEventListener("mouseup", stopLeft);
        leftBtn.addEventListener("mouseleave", stopLeft);
      }
      if (rightBtn) {
        rightBtn.addEventListener("mousedown", () => {
          ns.Audio.unlock();
          this.input.right = true;
          rightBtn.classList.add("touch-pressed");
        });
        const stopRight = () => {
          this.input.right = false;
          rightBtn.classList.remove("touch-pressed");
        };
        rightBtn.addEventListener("mouseup", stopRight);
        rightBtn.addEventListener("mouseleave", stopRight);
      }

      bindHoldBtn(
        jumpBtn,
        () => {
          this.input.jumpJustPressed = true;
          this.input.jumpHeld = true;
        },
        () => {
          this.input.jumpHeld = false;
        },
      );
      bindHoldBtn(fireBtn, () => {
        this.input.fireJustPressed = true;
      });

      // 阻止移动端双击缩放或长按弹出系统菜单
      document.addEventListener("contextmenu", (e) => {
        if (
          e.target &&
          (e.target.tagName === "BUTTON" || e.target.tagName === "CANVAS")
        ) {
          e.preventDefault();
        }
      });
    }

    _bindUI() {
      const nickInput = document.getElementById("input-nickname");
      const nickHint = document.getElementById("nickname-hint");

      const applyNickname = async (raw) => {
        const clean = ns.Leaderboard.setNickname(raw);
        if (nickInput) nickInput.value = clean;
        const res = await ns.Leaderboard.syncNicknameToCloud(clean);
        if (nickHint) {
          if (res && res.error) {
            nickHint.textContent = res.error;
            nickHint.style.color = "#b66e56";
          } else {
            nickHint.textContent = "已保存";
            nickHint.style.color = "#8c9b79";
          }
        }
      };

      if (nickInput) {
        nickInput.addEventListener("change", () => {
          applyNickname(nickInput.value);
        });
      }

      document
        .getElementById("btn-random-nick")
        ?.addEventListener("click", () => {
          ns.Audio.unlock();
          const rnd = ns.Leaderboard.generateRandomNickname();
          applyNickname(rnd);
        });

      document
        .getElementById("btn-start-game")
        ?.addEventListener("click", () => {
          ns.Audio.unlock();
          if (nickInput) ns.Leaderboard.setNickname(nickInput.value);
          const targetLvl = ns.Leaderboard.getHighestUnlockedLevel();
          this.startLevel(targetLvl);
        });

      const openMap = () => {
        ns.Audio.unlock();
        this._renderWorldMap();
        this._showOverlay("modal-map");
      };
      document
        .getElementById("btn-open-map")
        ?.addEventListener("click", openMap);
      document
        .getElementById("btn-menu-map")
        ?.addEventListener("click", openMap);
      document
        .getElementById("btn-pause-map")
        ?.addEventListener("click", openMap);
      document
        .getElementById("btn-result-map")
        ?.addEventListener("click", openMap);

      const openCodex = () => {
        ns.Audio.unlock();
        this._showOverlay("modal-codex");
      };
      document
        .getElementById("btn-open-codex")
        ?.addEventListener("click", openCodex);
      document
        .getElementById("btn-menu-codex")
        ?.addEventListener("click", openCodex);
      document
        .getElementById("btn-hud-brand")
        ?.addEventListener("click", openCodex);

      const openLb = () => {
        ns.Audio.unlock();
        this._showOverlay("modal-leaderboard");
        this._renderLeaderboard();
      };
      document
        .getElementById("btn-open-leaderboard")
        ?.addEventListener("click", openLb);
      document
        .getElementById("btn-menu-leaderboard")
        ?.addEventListener("click", openLb);

      document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          document
            .querySelectorAll(".tab-btn")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.leaderboardTab = btn.getAttribute("data-tab") || "score";
          this._renderLeaderboard();
        });
      });

      document.querySelectorAll(".btn-close-modal").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (this.returnToGame) {
            this.resumeGame();
          } else if (this.state === "playing") {
            this._hideAllOverlays();
          } else if (this.state === "paused") {
            this._showOverlay("modal-pause");
          } else if (this.state === "result") {
            this._showOverlay("modal-result");
          } else {
            this._showOverlay("modal-menu");
          }
        });
      });

      document.getElementById("btn-mute")?.addEventListener("click", () => {
        this._toggleMute();
      });

      document
        .getElementById("btn-fullscreen")
        ?.addEventListener("click", () => {
          this._toggleFullscreen();
        });

      document.getElementById("btn-pause")?.addEventListener("click", () => {
        if (this.state === "playing") this.pauseGame();
        else if (this.state === "paused") this.resumeGame();
      });

      document
        .getElementById("btn-resume")
        ?.addEventListener("click", () => this.resumeGame());
      document
        .getElementById("btn-restart-level")
        ?.addEventListener("click", () => this.startLevel(this.currentLevelId));
      document
        .getElementById("btn-pause-home")
        ?.addEventListener("click", () => {
          this.state = "menu";
          this._refreshContinueButton();
          this._showOverlay("modal-menu");
        });

      document
        .getElementById("btn-retry-level")
        ?.addEventListener("click", () => {
          this.startLevel(this.currentLevelId);
        });
    }

    _toggleMute() {
      const muted = ns.Audio.toggleMute();
      const btn = document.getElementById("btn-mute");
      if (btn) {
        btn.setAttribute("aria-pressed", String(muted));
        btn.setAttribute("aria-label", muted ? "开启音效" : "关闭音效");
        btn.title = muted ? "音效已关闭 · M" : "音效已开启 · M";
      }
    }

    _toggleFullscreen() {
      const doc = document;
      const elem = document.documentElement;
      if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
        if (elem.requestFullscreen) {
          elem.requestFullscreen().catch(() => {});
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen();
        }
      } else {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        }
      }
    }

    _clearInputs() {
      Object.keys(this.input).forEach((key) => {
        this.input[key] = false;
      });
      document
        .querySelectorAll(".touch-pressed")
        .forEach((el) => el.classList.remove("touch-pressed"));
    }

    _syncShell() {
      document
        .getElementById("app-wrapper")
        ?.classList.toggle("is-menu", this.state === "menu");
      const pauseBtn = document.getElementById("btn-pause");
      if (pauseBtn) {
        pauseBtn.setAttribute(
          "aria-label",
          this.state === "paused" ? "继续游戏" : "暂停游戏",
        );
        const icon = pauseBtn.querySelector("use");
        if (icon)
          icon.setAttribute(
            "href",
            this.state === "paused" ? "#i-play" : "#i-pause",
          );
      }
    }

    _hideAllOverlays() {
      document
        .querySelectorAll(".modal-overlay")
        .forEach((el) => el.classList.add("hidden"));
      this.returnToGame = false;
      this._syncShell();
    }

    _showOverlay(id) {
      const wasPlaying = this.state === "playing";
      const returnToGame = wasPlaying || this.returnToGame;
      if (wasPlaying) this.state = "paused";
      this._clearInputs();
      this._hideAllOverlays();
      this.returnToGame = returnToGame;
      document.getElementById(id)?.classList.remove("hidden");
    }

    loadLevel(levelId, startPlaying = true) {
      const totalLevels = ns.Levels.LEVEL_SPECS.length;
      this.currentLevelId = Math.min(totalLevels, Math.max(1, levelId));
      this.level = ns.Levels.buildLevel(this.currentLevelId);
      ns.Physics.reset();
      this.player = ns.Physics.createPlayer(96, this.level.groundY - 46);
      this.camera.x = 0;

      this.levelScore = 0;
      this.levelDrumsticks = 0;
      this.levelGolden = [false, false, false];
      this.levelTimeSec = 0;
      this._clearInputs();

      // 严格使用本关写死的固定天气
      ns.Weather.setWeather(this.level.weather, true);
      this._syncHUD();
      this._syncWeatherHUD();

      const tipEl = document.getElementById("level-tip-text");
      if (tipEl) {
        tipEl.textContent = `第 ${this.level.id} 关 · ${this.level.name} — ${this.level.tip}`;
      }

      const worldStamp = document.querySelector(".world-stamp");
      if (worldStamp) {
        worldStamp.querySelector("small").textContent =
          `下一站 · WORLD ${String(this.level.chapter).padStart(2, "0")}`;
        worldStamp.querySelector("b").textContent = this.level.name;
      }

      if (startPlaying) {
        this.state = "playing";
        this._hideAllOverlays();
        ns.Audio.startBgm(this.level.isBoss ? "boss" : this.level.chapter);
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
      if (this.state !== "playing") return;
      this.state = "paused";
      const info = document.getElementById("pause-level-info");
      if (info && this.level) {
        info.textContent = `第 ${this.level.id} 关 · ${this.level.name}（${this.level.chapterInfo.name}）`;
      }
      this._showOverlay("modal-pause");
    }

    resumeGame() {
      if (this.state !== "paused") return;
      this.state = "playing";
      this._hideAllOverlays();
    }

    _handleLevelClear() {
      if (this.state === "result") return;
      this.state = "result";

      const timeBonus = Math.max(0, Math.round((180 - this.levelTimeSec) * 10));
      const hpBonus = this.player.hp * 300;
      this.levelScore += timeBonus + hpBonus;

      const record = ns.Leaderboard.recordLevelClear(
        this.level.id,
        this.levelScore,
        this.levelDrumsticks,
        this.levelGolden,
        this.levelTimeSec,
      );
      this._refreshContinueButton();

      if (ns.Audio) {
        ns.Audio.playVictory();
        ns.Audio.playVoiceLine();
      }

      const totalLevels = ns.Levels.LEVEL_SPECS.length;
      const starsCount = record.stars || 0;
      const nextLvlId = this.level.id + 1;
      const nextUnlocked =
        nextLvlId <= totalLevels && ns.Leaderboard.isLevelUnlocked(nextLvlId);
      const chapId = this.level.chapter;
      const chapStars = ns.Leaderboard.getChapterStars(chapId);
      const reqStars = ns.Leaderboard.getRequiredStarsForNextChapter(chapId);

      document.getElementById("result-title").textContent =
        this.level.id === totalLevels
          ? `全 ${totalLevels} 关通关完成`
          : `第 ${this.level.id} 关完成`;
      // 有几颗星就显示几颗星，0颗星时不显示空心星
      document.getElementById("result-stars").textContent =
        starsCount > 0 ? "★".repeat(starsCount) : "";

      if (this.level.id < totalLevels && !nextUnlocked) {
        document.getElementById("result-subtitle").textContent =
          `本章当前累计 ${chapStars} / ${reqStars} 星，需在本章获得满 ${reqStars} 颗星方可解锁下一章`;
      } else {
        document.getElementById("result-subtitle").textContent =
          starsCount === 3
            ? "已集齐本关全部 3 颗黄金大鸡腿，达成三星评价"
            : `本关获得 ${starsCount} 星，收集全部 3 颗黄金大鸡腿可达成三星`;
      }

      document.getElementById("result-score").textContent = String(
        this.levelScore,
      );
      document.getElementById("result-drumsticks").textContent = String(
        this.levelDrumsticks,
      );
      document.getElementById("result-golden").textContent =
        `${this.levelGolden.filter(Boolean).length} / 3`;
      document.getElementById("result-time").textContent = ns.formatTimeMMSS(
        this.levelTimeSec,
      );

      const nextBtn = document.getElementById("btn-next-level");
      const retryBtn = document.getElementById("btn-retry-level");
      if (retryBtn) {
        retryBtn.classList.remove("hidden");
      }
      if (nextBtn) {
        if (this.level.id >= totalLevels) {
          nextBtn.textContent = "查看排行榜";
          nextBtn.onclick = () => {
            this._showOverlay("modal-leaderboard");
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
            this._showOverlay("modal-map");
          };
        }
      }

      this._showOverlay("modal-result");
    }

    _handleGameOver() {
      if (this.state === "result") return;
      this.state = "result";
      if (ns.Audio) ns.Audio.playGameOver();

      const failedLevelId = this.level ? this.level.id : this.currentLevelId;

      document.getElementById("result-title").textContent = "闯关失败";
      document.getElementById("result-stars").textContent = "";
      document.getElementById("result-subtitle").textContent =
        "生命值耗尽，可顶开问号砖获取波波奶茶护盾、蜜桃回血果与红辣椒火球";
      document.getElementById("result-score").textContent = String(
        this.levelScore,
      );
      document.getElementById("result-drumsticks").textContent = String(
        this.levelDrumsticks,
      );
      document.getElementById("result-golden").textContent =
        `${this.levelGolden.filter(Boolean).length} / 3`;
      document.getElementById("result-time").textContent = ns.formatTimeMMSS(
        this.levelTimeSec,
      );

      const nextBtn = document.getElementById("btn-next-level");
      const retryBtn = document.getElementById("btn-retry-level");
      if (retryBtn) {
        retryBtn.classList.add("hidden");
      }
      if (nextBtn) {
        nextBtn.textContent = `重新挑战本关（第 ${failedLevelId} 关）`;
        nextBtn.onclick = () => this.loadLevel(failedLevelId, true);
      }

      this._showOverlay("modal-result");
    }

    _syncHUD() {
      if (!this.level || !this.player) return;
      document.getElementById("hud-level-title").textContent =
        `第 ${this.level.id} 关 · ${this.level.name}`;
      document.getElementById("hud-hearts").textContent =
        `${Math.max(0, this.player.hp)} / ${this.player.maxHp}`;

      const pill = document.getElementById("hud-power-badge");
      if (pill) {
        pill.className = "state-tag";
        if (this.player.hasFire) {
          pill.textContent = "喷火 (J)";
          pill.classList.add("fire-active");
        } else if (this.player.isBig) {
          pill.textContent = "护盾";
          pill.classList.add("big-active");
        } else {
          pill.textContent = "标准";
        }
      }

      const atkBadge = document.getElementById("hud-atk-badge");
      if (atkBadge) {
        if (this.player.atkBoostTimer > 0) {
          atkBadge.classList.remove("hidden");
          atkBadge.textContent = `⚡伤害x2 (${Math.ceil(this.player.atkBoostTimer)}s)`;
        } else {
          atkBadge.classList.add("hidden");
        }
      }

      // 有几颗星就显示几颗实心星 ★，0 颗时显示 —
      const earnedStars = this.levelGolden.filter(Boolean).length;
      document.getElementById("hud-golden-stars").textContent =
        earnedStars > 0 ? "★".repeat(earnedStars) : "—";

      document.getElementById("hud-drumsticks").textContent = String(
        this.levelDrumsticks,
      );
      document.getElementById("hud-score").textContent =
        this.levelScore.toLocaleString();
      document.getElementById("hud-timer").textContent = ns.formatTimeMMSS(
        this.levelTimeSec,
      );
    }

    _syncWeatherHUD() {
      const meta = ns.Weather.getMeta();
      const wText = document.getElementById("hud-weather-text");
      if (wText) {
        wText.textContent = meta.name;
      }
      const fDesc = document.getElementById("footer-weather-desc");
      if (fDesc) {
        fDesc.textContent = `本关天气：${meta.name} — ${meta.desc}`;
      }

      const windBanner = document.getElementById("wind-indicator");
      if (windBanner) {
        if (ns.Weather.current === "windy") {
          windBanner.classList.remove("hidden");
          windBanner.textContent =
            ns.Weather.windDir >= 0 ? "顺风推力 →" : "← 逆风阻力";
        } else if (
          ns.Weather.current === "snowy" &&
          ns.Weather.coldMeter > 0.2
        ) {
          windBanner.classList.remove("hidden");
          windBanner.textContent = `积雪减速 ${Math.round(ns.Weather.coldMeter * 100)}%`;
        } else {
          windBanner.classList.add("hidden");
        }
      }
    }

    _renderWorldMap() {
      const container = document.getElementById("world-map-chapters");
      if (!container) return;
      container.innerHTML = "";

      document.getElementById("map-total-stars").textContent = String(
        ns.Leaderboard.getTotalStars(),
      );

      const chapterIds = Object.keys(ns.Levels.CHAPTER_INFO).map(Number);
      const totalChapters = chapterIds.length;

      for (const cId of chapterIds) {
        const ch = ns.Levels.CHAPTER_INFO[cId];
        const chapUnlocked = ns.Leaderboard.isChapterUnlocked(cId);
        const chapStars = ns.Leaderboard.getChapterStars(cId);
        const reqNext = ns.Leaderboard.getRequiredStarsForNextChapter(cId);

        let rightStatusText = `本章星级 ${chapStars} / 18`;
        if (cId < totalChapters) {
          rightStatusText += ` · 满 ${reqNext} 星且通关第 ${cId * 6} 关解锁下一章`;
        }
        if (!chapUnlocked && cId > 1) {
          const prevStars = ns.Leaderboard.getChapterStars(cId - 1);
          const reqPrev = ns.Leaderboard.getRequiredStarsForNextChapter(
            cId - 1,
          );
          rightStatusText = `未解锁 · 需第 ${cId - 1} 章达到 ${reqPrev} 星且通关第 ${(cId - 1) * 6} 关（当前第 ${cId - 1} 章：${prevStars} / ${reqPrev} 星）`;
        }

        const block = document.createElement("div");
        block.className = "chapter-block";

        const header = document.createElement("div");
        header.className = "chapter-block-header";
        header.innerHTML = `
          <span class="chapter-block-title">${ch.name}</span>
          <span class="chapter-block-desc" style="color:${chapUnlocked ? "#64748b" : "#e11d48"}">${rightStatusText}</span>
        `;
        block.appendChild(header);

        const grid = document.createElement("div");
        grid.className = "level-grid";

        for (let lvlId = ch.range[0]; lvlId <= ch.range[1]; lvlId++) {
          const spec = ns.Levels.LEVEL_SPECS[lvlId - 1];
          const unlocked = ns.Leaderboard.isLevelUnlocked(lvlId);
          const st = ns.Leaderboard.getLevelStatus(lvlId);
          const weatherMeta =
            ns.WEATHER_META[spec.weather.toLowerCase()] ||
            ns.WEATHER_META.sunny;

          const btn = document.createElement("button");
          btn.className = `level-node-btn ${unlocked ? "unlocked" : "locked"} ${st.cleared ? "cleared" : ""} ${spec.isBoss ? "boss-node" : ""}`;

          // 有几颗星就显示几颗 ★，0 颗时不显示空心星
          const starStr = st.stars > 0 ? "★".repeat(st.stars) : "";

          btn.innerHTML = `
            <div class="lvl-num">${unlocked ? "" : "未解锁 · "}第 ${lvlId} 关 · ${weatherMeta.name}</div>
            <div class="lvl-name">${spec.name}</div>
            <div class="lvl-stars">${starStr}</div>
          `;

          if (unlocked) {
            btn.addEventListener("click", () => {
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
      const tbody = document.getElementById("leaderboard-tbody");
      const metaLine = document.getElementById("leaderboard-meta-line");
      if (!tbody) return;
      tbody.innerHTML =
        '<tr><td colspan="7" class="empty-row">正在同步排行榜数据...</td></tr>';

      const top10 = await ns.Leaderboard.fetchCloudLeaderboard(
        this.leaderboardTab,
      );
      tbody.innerHTML = "";

      if (metaLine) {
        const meta = ns.Leaderboard.cloudMeta;
        const champ = top10[0]?.nickname || meta.championName || "虚位以待";
        const myRankStr = meta.playerRank
          ? ` · 我的排名：第 ${meta.playerRank} 名`
          : "";
        metaLine.textContent = `榜首：${champ}${myRankStr} · 仅收录真实玩家闯关战绩`;
      }

      if (top10.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="7" class="empty-row">暂无玩家上榜记录，通关任意关卡后将自动上传您的真实战绩</td></tr>';
        return;
      }

      for (const row of top10) {
        const tr = document.createElement("tr");
        const isMe = row.playerId === ns.Leaderboard.playerId;
        if (isMe) {
          tr.style.background = "rgba(245, 158, 11, 0.14)";
        }
        tr.innerHTML = `
          <td><b>#${row.rank}</b></td>
          <td style="color:${isMe ? "#d97706" : "#1e293b"};font-weight:700;">${row.nickname}${isMe ? " (我)" : ""}</td>
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
      if (document.getElementById("modal-codex")?.classList.contains("hidden"))
        return;
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
        timeSec = 0;
      const cCache = ns.Sprites.cache.codex;
      if (!cCache.nailong) return;
      ns.MenuArt?.renderArsenal(timeSec);

      const drawPair = (id1, id2, frames, speed) => {
        const frame = frames[Math.floor(timeSec * speed) % frames.length];
        for (const id of [id1, id2]) {
          const cv = document.getElementById(id);
          if (cv) {
            const ctx = cv.getContext("2d");
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.clearRect(0, 0, cv.width, cv.height);
            const bounce = Math.round(Math.sin(timeSec * 5) * 2);
            ctx.drawImage(frame, 0, bounce, cv.width, cv.height);
          }
        }
      };

      drawPair(
        "menu-canvas-nailong",
        "codex-canvas-nailong",
        cCache.nailong,
        1.8,
      );
      drawPair(
        "menu-canvas-baobaolong",
        "codex-canvas-baobaolong",
        cCache.baobaolong,
        1.8,
      );
      drawPair(
        "menu-canvas-minion1",
        "codex-canvas-minion1",
        cCache.minionTwin,
        4.0,
      );
      drawPair(
        "menu-canvas-minion2",
        "codex-canvas-minion2",
        cCache.minionCyclops,
        4.0,
      );
      drawPair("menu-canvas-xiaoqi", "codex-canvas-xiaoqi", cCache.xiaoqi, 2.2);
    }

    _renderHudAvatar(timeSec) {
      const cv = document.getElementById("hud-avatar-canvas");
      const cCache = ns.Sprites.cache.codex;
      if (!cv || !cCache.nailong) return;
      const ctx = cv.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, cv.width, cv.height);
      const frame =
        this.player && this.player.hasFire
          ? ns.Sprites.cache.nailong.fire.right.idle[
              Math.floor(timeSec * 3) % 2
            ]
          : cCache.nailong[Math.floor(timeSec * 2) % 2];
      ctx.drawImage(frame, 0, 1, cv.width, cv.height);
    }

    _loop(timestamp) {
      const rawDt = (timestamp - this.lastFrameTime) / 1000;
      this.lastFrameTime = timestamp;
      const dt = Math.min(0.033, Math.max(0.001, rawDt));
      this.globalTimeSec += dt;

      if (this.subtitleTimer > 0) {
        this.subtitleTimer -= dt;
        if (this.subtitleTimer <= 0) {
          document
            .getElementById("voice-subtitle-toast")
            ?.classList.add("hidden");
        }
      }

      if (this.state === "playing" && this.level && this.player) {
        this.levelTimeSec += dt;

        ns.Weather.update(
          dt,
          this.player,
          this.camera,
          VIEW_W,
          VIEW_H,
          this.level.groundY,
        );

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
          Math.min(this.level.worldW - VIEW_W, this.player.x - VIEW_W * 0.34),
        );
        this.camera.x += (targetCamX - this.camera.x) * Math.min(1, dt * 10);

        this._syncHUD();
        this._syncWeatherHUD();
        this._renderHudAvatar(this.globalTimeSec);
      } else {
        ns.Weather.update(dt, null, this.camera, VIEW_W, VIEW_H, 468);
        this._renderShowcaseCanvases(this.globalTimeSec);
        this._renderHudAvatar(this.globalTimeSec);
      }

      if (
        this.state === "menu" &&
        !document.getElementById("modal-menu").classList.contains("hidden")
      ) {
        ns.MenuArt?.render(this.globalTimeSec);
      }
      this._renderScene();
      requestAnimationFrame((ts) => this._loop(ts));
    }

    _renderScene() {
      if (!this.level) return;
      const ctx = this.ctx;
      const t = this.globalTimeSec;

      ns.Levels.renderParallaxBackground(
        ctx,
        this.level,
        this.camera,
        VIEW_W,
        VIEW_H,
        t,
      );
      ns.Levels.renderDecorations(ctx, this.level, this.camera, VIEW_W, t);
      ns.Levels.renderTilesAndHazards(ctx, this.level, this.camera, VIEW_W, t);

      ctx.save();
      ctx.translate(-Math.round(this.camera.x), 0);
      for (const item of this.level.collectibles) {
        if (item.collected) continue;
        if (
          item.x + item.w < this.camera.x - 40 ||
          item.x > this.camera.x + VIEW_W + 40
        )
          continue;
        ns.Sprites.drawCollectible(ctx, item, t);
      }

      for (const en of this.level.enemies) {
        if (en.dead) continue;
        if (
          en.x + en.w < this.camera.x - 80 ||
          en.x > this.camera.x + VIEW_W + 80
        )
          continue;
        if (en.type === "boss" || en.type === "final_boss") {
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
        ns.Levels.renderForestFogOverlay(
          ctx,
          this.level,
          this.player,
          this.camera,
          VIEW_W,
          VIEW_H,
        );
      }

      ns.Weather.render(ctx, this.camera, VIEW_W, VIEW_H, t);
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    ns.Game = new GameController();
  });
})(window.NailongAdventure);

/**
 * 《奶龙大冒险：鸡腿保卫战》- 动态天气与物理联动系统 (weather.js)
 *
 * 五大天气不仅具备高密度像素粒子视觉，还直接影响物理手感与战术玩法：
 * 1. sunny (晴天)：标准物理，视野清晰，暖阳微光粒子，鸡腿得分 +10%
 * 2. rainy (雨天)：斜向像素雨滴 + 地面水花溅射；地面略微湿滑（惯性增加），火球射程缩短 35%
 * 3. windy (大风天)：落叶/沙尘水平疾吹；周期性顺风/逆风推力，空中跳跃水平位移受风力显著影响
 * 4. snowy (暴雪天)：密集像素雪花；地面结冰湿滑，静止过久叠加寒冷减速，拥有红辣椒喷火形态可完全免疫寒冷！
 * 5. thunderstorm (雷暴天)：乌云闪电照亮全屏 + 8-bit 雷鸣；周期性在玩家附近生成地面落雷预警区，1.3秒后劈下高压像素闪电！
 */

window.NailongAdventure = window.NailongAdventure || {};

(function (ns) {
  'use strict';

  const WEATHER_META = {
    sunny: {
      id: 'sunny',
      name: '晴朗',
      desc: '标准物理 · 鸡腿得分 +10%',
      frictionMult: 1.0,
      accelMult: 1.0,
      fireballRangeMult: 1.0,
      scoreMult: 1.1,
    },
    rainy: {
      id: 'rainy',
      name: '大雨',
      desc: '地面微滑 · 火球射程缩短',
      frictionMult: 0.58,
      accelMult: 0.85,
      fireballRangeMult: 0.62,
      scoreMult: 1.0,
    },
    windy: {
      id: 'windy',
      name: '强风',
      desc: '周期性顺/逆风推力 · 空中位移受风向影响',
      frictionMult: 0.92,
      accelMult: 0.95,
      fireballRangeMult: 1.1,
      scoreMult: 1.0,
    },
    snowy: {
      id: 'snowy',
      name: '暴雪',
      desc: '地面结冰湿滑 · 久站减速（吃辣椒免疫）',
      frictionMult: 0.42,
      accelMult: 0.78,
      fireballRangeMult: 0.85,
      scoreMult: 1.0,
    },
    thunderstorm: {
      id: 'thunderstorm',
      name: '雷暴',
      desc: '注意躲避地面落雷预警区',
      frictionMult: 0.65,
      accelMult: 0.88,
      fireballRangeMult: 0.78,
      scoreMult: 1.15,
    },
  };

  class WeatherSystem {
    constructor() {
      this.current = 'sunny';
      this.windDir = 1; // +1 顺风向右, -1 逆风向左
      this.windStrength = 0; // 当前风速 px/s^2
      this.windPhaseTimer = 0;
      this.coldMeter = 0; // 暴雪天寒冷累积 (0 ~ 1)
      this.flashAlpha = 0; // 雷暴天全屏闪电亮度
      this.particles = [];
      this.splashes = [];
      this.lightningStrikes = []; // { x, y, w, warningTimer, strikeTimer, hitDone }
      this.strikeCooldown = 4.0;
      this._initParticles(960, 540);
    }

    _initParticles(viewW, viewH) {
      this.particles = [];
      for (let i = 0; i < 85; i++) {
        this.particles.push({
          x: Math.random() * viewW,
          y: Math.random() * viewH,
          size: 2 + Math.floor(Math.random() * 4),
          speedX: (Math.random() - 0.5) * 30,
          speedY: 40 + Math.random() * 120,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    setWeather(type, resetTimers = true) {
      if (!WEATHER_META[type]) type = 'sunny';
      this.current = type;
      if (resetTimers) {
        this.coldMeter = 0;
        this.flashAlpha = 0;
        this.lightningStrikes = [];
        this.strikeCooldown = 3.2;
        this.windPhaseTimer = 0;
      }
    }

    getMeta() {
      return WEATHER_META[this.current] || WEATHER_META.sunny;
    }

    /**
     * 每帧更新关卡固定天气物理参数、风力、寒冷值、落雷预警与粒子
     */
    update(dt, player, camera, viewW, viewH, groundY = 460) {
      // 1. 大风天物理：周期性顺风 / 逆风交替
      if (this.current === 'windy') {
        this.windPhaseTimer += dt;
        // 每 6.5 秒切换一次顺逆风向
        this.windDir = Math.sin(this.windPhaseTimer * 0.48) >= 0 ? 1 : -1;
        const gust = 0.65 + 0.35 * Math.sin(this.windPhaseTimer * 2.1);
        this.windStrength = this.windDir * 195 * gust;
      } else if (this.current === 'thunderstorm') {
        this.windDir = -1;
        this.windStrength = -50;
      } else {
        this.windStrength = 0;
      }

      // 2. 暴雪天寒冷机制：未移动过久动作略微变慢，吃辣椒可完全免疫！
      if (this.current === 'snowy' && player) {
        if (player.hasFire) {
          this.coldMeter = 0;
        } else if (Math.abs(player.vx) < 25 && player.onGround) {
          this.coldMeter = Math.min(1, this.coldMeter + dt * 0.22);
        } else {
          this.coldMeter = Math.max(0, this.coldMeter - dt * 0.52);
        }
      } else {
        this.coldMeter = Math.max(0, this.coldMeter - dt * 0.8);
      }

      // 3. 雷暴天落雷预警与劈击逻辑
      if (this.flashAlpha > 0) {
        this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2.4);
      }

      if (this.current === 'thunderstorm' && player) {
        this.strikeCooldown -= dt;
        if (this.strikeCooldown <= 0) {
          this.strikeCooldown = 4.4 + Math.random() * 2.2;
          // 在奶龙前方或附近生成地面落雷预警区
          const targetX = player.x + (Math.random() * 220 - 65);
          this.lightningStrikes.push({
            x: Math.max(64, targetX),
            w: 42,
            warningTimer: 1.5, // 1.5秒地面闪烁红区预警
            strikeTimer: 0.3, // 闪电持续时间
            hitDone: false,
          });
        }
      }

      for (let i = this.lightningStrikes.length - 1; i >= 0; i--) {
        const st = this.lightningStrikes[i];
        if (st.warningTimer > 0) {
          st.warningTimer -= dt;
          if (st.warningTimer <= 0) {
            // 触发雷击！全屏闪白 + 8-bit 雷鸣音效
            this.flashAlpha = 0.78;
            if (ns.Audio) ns.Audio.playThunder();
          }
        } else {
          st.strikeTimer -= dt;
          if (!st.hitDone && player && st.strikeTimer > 0.08) {
            const px = player.x + player.w * 0.5;
            if (Math.abs(px - st.x) < st.w * 0.65) {
              st.hitDone = true;
              if (player.onHitByHazard) {
                player.onHitByHazard('被雷暴闪电劈中啦！注意躲避地面红色预警光柱！');
              }
            }
          }
          if (st.strikeTimer <= 0) {
            this.lightningStrikes.splice(i, 1);
          }
        }
      }

      // 4. 更新屏幕空间粒子与地面水花
      for (const p of this.particles) {
        p.phase += dt * 3;
        if (this.current === 'sunny') {
          p.x += Math.sin(p.phase) * 14 * dt;
          p.y -= 18 * dt;
        } else if (this.current === 'rainy' || this.current === 'thunderstorm') {
          p.x -= (this.current === 'thunderstorm' ? 140 : 85) * dt;
          p.y += (390 + p.size * 45) * dt;
          if (p.y >= viewH - 68) {
            if (this.splashes.length < 36) {
              this.splashes.push({ x: p.x, y: viewH - 64 + Math.random() * 14, timer: 0.16 });
            }
            p.y = -10;
            p.x = Math.random() * (viewW + 140);
          }
        } else if (this.current === 'windy') {
          p.x += this.windDir * (260 + p.size * 35) * dt;
          p.y += (28 + Math.sin(p.phase * 2) * 35) * dt;
        } else if (this.current === 'snowy') {
          p.x += (Math.sin(p.phase) * 32 - 22) * dt;
          p.y += (65 + p.size * 18) * dt;
        }

        if (p.x < -20) p.x = viewW + 15;
        if (p.x > viewW + 20) p.x = -15;
        if (p.y < -20) p.y = viewH + 10;
        if (p.y > viewH + 20) p.y = -10;
      }

      for (let i = this.splashes.length - 1; i >= 0; i--) {
        this.splashes[i].timer -= dt;
        if (this.splashes[i].timer <= 0) {
          this.splashes.splice(i, 1);
        }
      }
    }

    /**
     * 绘制世界空间落雷预警与屏幕空间像素天气粒子
     */
    render(ctx, camera, viewW, viewH, timeSec) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;

      // 1. 世界空间：绘制雷暴天地面落雷预警区与劈下的像素闪电柱
      for (const st of this.lightningStrikes) {
        const sx = Math.round(st.x - camera.x);
        if (sx < -80 || sx > viewW + 80) continue;

        if (st.warningTimer > 0) {
          // 地面闪烁红色预警区 + 感叹号标志
          const blink = Math.floor(timeSec * 14) % 2 === 0;
          ctx.fillStyle = blink ? 'rgba(255, 59, 48, 0.38)' : 'rgba(255, 204, 0, 0.22)';
          ctx.fillRect(sx - st.w * 0.5, 0, st.w, viewH);

          ctx.fillStyle = '#FF3B30';
          ctx.fillRect(sx - st.w * 0.5, viewH - 76, st.w, 6);
          ctx.fillStyle = '#FFEA00';
          ctx.font = 'bold 16px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('⚡当心落雷!', sx, 92);
        } else {
          // 劈下的锯齿状像素闪电光柱
          ctx.fillStyle = 'rgba(255, 245, 157, 0.85)';
          let curX = sx;
          for (let y = 0; y < viewH; y += 24) {
            const nextOff = ((y / 24) % 2 === 0 ? 1 : -1) * 10;
            ctx.fillRect(curX - 8, y, 16, 26);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(curX - 4, y, 8, 26);
            ctx.fillStyle = 'rgba(255, 245, 157, 0.85)';
            curX = sx + nextOff;
          }
        }
      }

      // 2. 屏幕空间粒子渲染
      if (this.current === 'sunny') {
        for (let i = 0; i < 28; i++) {
          const p = this.particles[i];
          ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 249, 196, 0.55)' : 'rgba(255, 213, 79, 0.45)';
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        }
      } else if (this.current === 'rainy' || this.current === 'thunderstorm') {
        ctx.fillStyle = this.current === 'thunderstorm' ? 'rgba(144, 202, 249, 0.78)' : 'rgba(129, 212, 250, 0.72)';
        for (const p of this.particles) {
          const rx = Math.round(p.x);
          const ry = Math.round(p.y);
          // 斜向像素雨丝
          ctx.fillRect(rx, ry, 2, 7);
          ctx.fillRect(rx - 2, ry + 6, 2, 6);
        }
        // 地面像素水花溅射
        ctx.fillStyle = 'rgba(225, 245, 254, 0.85)';
        for (const sp of this.splashes) {
          const sx = Math.round(sp.x);
          const sy = Math.round(sp.y);
          ctx.fillRect(sx - 4, sy - 2, 2, 2);
          ctx.fillRect(sx + 3, sy - 3, 2, 2);
          ctx.fillRect(sx - 2, sy, 5, 2);
        }
      } else if (this.current === 'windy') {
        for (let i = 0; i < 55; i++) {
          const p = this.particles[i];
          const px = Math.round(p.x);
          const py = Math.round(p.y);
          if (i % 3 === 0) {
            // 疾风气流条纹
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.fillRect(px, py, 18, 2);
          } else {
            // 飞舞的像素树叶/花瓣
            ctx.fillStyle = i % 2 === 0 ? '#8BC34A' : '#FFB74D';
            ctx.fillRect(px, py, 5, 3);
            ctx.fillRect(px + 1, py - 1, 3, 5);
          }
        }
      } else if (this.current === 'snowy') {
        for (const p of this.particles) {
          const px = Math.round(p.x);
          const py = Math.round(p.y);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(px, py, p.size, p.size);
          if (p.size >= 4) {
            ctx.fillStyle = '#E1F5FE';
            ctx.fillRect(px - 1, py + 1, p.size + 2, p.size - 2);
          }
        }
        // 如果玩家累积了寒冷值，在画面边缘渲染冰霜提示
        if (this.coldMeter > 0.15) {
          ctx.strokeStyle = `rgba(129, 212, 250, ${(this.coldMeter * 0.55).toFixed(2)})`;
          ctx.lineWidth = 10;
          ctx.strokeRect(5, 5, viewW - 10, viewH - 10);
        }
      }

      // 3. 雷暴全屏闪电白光特效
      if (this.flashAlpha > 0.01) {
        ctx.fillStyle = `rgba(255, 255, 240, ${this.flashAlpha.toFixed(2)})`;
        ctx.fillRect(0, 0, viewW, viewH);
      }

      ctx.restore();
    }
  }

  ns.Weather = new WeatherSystem();
  ns.WEATHER_META = WEATHER_META;
})(window.NailongAdventure);

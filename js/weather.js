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
        this.windStrength = this.windDir * 240 * gust;
      } else if (this.current === 'thunderstorm') {
        this.windDir = -1;
        this.windStrength = -65;
      } else {
        this.windStrength = 0;
      }

      // 2. 暴雪天寒冷机制：未移动过久动作略微变慢，吃辣椒可完全免疫！
      if (this.current === 'snowy' && player) {
        if (player.hasFire) {
          this.coldMeter = 0;
        } else if (Math.abs(player.vx) < 25 && player.onGround) {
          this.coldMeter = Math.min(1, this.coldMeter + dt * 0.28);
        } else {
          this.coldMeter = Math.max(0, this.coldMeter - dt * 0.45);
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
          this.strikeCooldown = 3.6 + Math.random() * 2.2;
          // 在奶龙前方或附近生成地面落雷预警区
          const targetX = player.x + (Math.random() * 220 - 70);
          this.lightningStrikes.push({
            x: Math.max(64, targetX),
            w: 44,
            warningTimer: 1.35, // 1.35秒地面闪烁红区预警
            strikeTimer: 0.32, // 闪电持续时间
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
     * Soft weather particles stay subordinate to the playable world. Lightning
     * retains a clear coral warning column and a bright, readable strike.
     */
    render(ctx, camera, viewW, viewH, timeSec) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.lineCap = 'round';

      for (const st of this.lightningStrikes) {
        const sx = st.x - camera.x;
        if (sx < -80 || sx > viewW + 80) continue;
        if (st.warningTimer > 0) {
          const pulse = .65 + Math.sin(timeSec * 16) * .25;
          const warning = ctx.createLinearGradient(0, 100, 0, viewH - 65);
          warning.addColorStop(0, 'rgba(236,142,117,0)');
          warning.addColorStop(.7, `rgba(236,142,117,${.07 * pulse})`);
          warning.addColorStop(1, `rgba(236,142,117,${.32 * pulse})`);
          ctx.fillStyle = warning;
          ctx.fillRect(sx - st.w * .5, 110, st.w, viewH - 175);
          ctx.strokeStyle = `rgba(210,104,86,${pulse})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();ctx.moveTo(sx-st.w*.5,viewH-75);ctx.lineTo(sx-st.w*.5,viewH-160);ctx.moveTo(sx+st.w*.5,viewH-75);ctx.lineTo(sx+st.w*.5,viewH-160);ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath();ctx.ellipse(sx,viewH-69,st.w*.6,5,0,0,Math.PI*2);ctx.fillStyle=`rgba(220,116,90,${pulse})`;ctx.fill();
          ctx.beginPath();ctx.arc(sx,viewH-110,12,0,Math.PI*2);ctx.fillStyle='#F4D6B1';ctx.fill();ctx.strokeStyle='#CC826C';ctx.lineWidth=1.5;ctx.stroke();
          ctx.fillStyle='#A35E51';ctx.font='900 17px Trebuchet MS, sans-serif';ctx.textAlign='center';ctx.fillText('!',sx,viewH-104);
        } else {
          const points = [];
          for(let y=0;y<=viewH-65;y+=28) points.push([sx+Math.sin(y*.27+st.x)*13,y]);
          points.push([sx,viewH-66]);
          const bolt = (color, width) => {
            ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.beginPath();
            points.forEach((point,i)=>{if(i===0)ctx.moveTo(point[0],point[1]);else ctx.lineTo(point[0],point[1]);});ctx.stroke();
          };
          bolt('rgba(252,224,155,.17)',25);
          bolt('rgba(255,226,154,.55)',12);
          bolt('#FFE8B2',6);
          bolt('#FFFEEC',2.4);
          ctx.beginPath();ctx.ellipse(sx,viewH-66,34,9,0,0,Math.PI*2);ctx.fillStyle='rgba(255,239,188,.7)';ctx.fill();
        }
      }

      if (this.current === 'sunny') {
        for (let i = 0; i < 22; i++) {
          const p = this.particles[i];
          const alpha = .22 + Math.sin(p.phase) * .13;
          ctx.fillStyle = i % 2 === 0 ? `rgba(255,247,212,${alpha})` : `rgba(253,226,157,${alpha})`;
          ctx.beginPath();ctx.arc(p.x,p.y,p.size*.42,0,Math.PI*2);ctx.fill();
          if(i%7===0){ctx.strokeStyle='rgba(255,251,219,.38)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x-3,p.y);ctx.lineTo(p.x+3,p.y);ctx.moveTo(p.x,p.y-3);ctx.lineTo(p.x,p.y+3);ctx.stroke();}
        }
      } else if (this.current === 'rainy' || this.current === 'thunderstorm') {
        ctx.lineWidth = 1.2;
        for (const p of this.particles) {
          ctx.strokeStyle=p.size>3?'rgba(220,241,231,.49)':'rgba(213,236,232,.28)';
          ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-3,p.y+8+p.size);ctx.stroke();
        }
        ctx.strokeStyle='rgba(231,248,234,.65)';ctx.lineWidth=1;
        for (const sp of this.splashes) {
          const size=1+(1-sp.timer/.16)*5;
          ctx.beginPath();ctx.ellipse(sp.x,sp.y,size,size*.26,0,0,Math.PI*2);ctx.stroke();
          ctx.beginPath();ctx.moveTo(sp.x-3,sp.y-2);ctx.lineTo(sp.x-4,sp.y-4);ctx.moveTo(sp.x+3,sp.y-2);ctx.lineTo(sp.x+4,sp.y-5);ctx.stroke();
        }
      } else if (this.current === 'windy') {
        for (let i = 0; i < 44; i++) {
          const p=this.particles[i];
          if(i%3===0){
            ctx.strokeStyle='rgba(251,250,226,.29)';ctx.lineWidth=1;
            ctx.beginPath();ctx.moveTo(p.x-15,p.y+2);ctx.quadraticCurveTo(p.x,p.y-3,p.x+18,p.y);ctx.stroke();
          }else{
            ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.phase*.7);
            ctx.beginPath();ctx.moveTo(-4,0);ctx.quadraticCurveTo(1,-5,5,0);ctx.quadraticCurveTo(0,4,-4,0);ctx.fillStyle=i%2?'#C4B67E':'#9EBE8F';ctx.globalAlpha=.62;ctx.fill();
            ctx.strokeStyle='rgba(91,125,79,.4)';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(-3,0);ctx.lineTo(4,0);ctx.stroke();ctx.restore();
          }
        }
      } else if (this.current === 'snowy') {
        for (const p of this.particles) {
          ctx.fillStyle=p.size>3?'rgba(255,255,245,.85)':'rgba(246,255,251,.48)';
          ctx.beginPath();ctx.arc(p.x,p.y,p.size*.46,0,Math.PI*2);ctx.fill();
          if(p.size>=5){ctx.strokeStyle='rgba(250,255,250,.5)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(p.x-3,p.y);ctx.lineTo(p.x+3,p.y);ctx.moveTo(p.x,p.y-3);ctx.lineTo(p.x,p.y+3);ctx.stroke();}
        }
        if (this.coldMeter > .15) {
          const frost=ctx.createRadialGradient(viewW*.5,viewH*.5,viewH*.32,viewW*.5,viewH*.5,viewW*.57);
          frost.addColorStop(0,'rgba(218,240,237,0)');frost.addColorStop(1,`rgba(201,235,236,${this.coldMeter*.53})`);
          ctx.fillStyle=frost;ctx.fillRect(0,0,viewW,viewH);
        }
      }
      if (this.flashAlpha > .01) {
        ctx.fillStyle=`rgba(255,250,224,${(this.flashAlpha*.75).toFixed(2)})`;
        ctx.fillRect(0,0,viewW,viewH);
      }
      ctx.restore();
    }

  }

  ns.Weather = new WeatherSystem();
  ns.WEATHER_META = WEATHER_META;
})(window.NailongAdventure);

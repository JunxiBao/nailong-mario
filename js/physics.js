/**
 * 《奶龙大冒险：鸡腿保卫战》- 丝滑平台跳跃物理引擎与交互逻辑 (physics.js)
 *
 * 核心特性：
 * 1. 可变跳跃高度（轻按小跳、长按大跳）+ 土狼时间 (Coyote Time 0.11s) + 跳跃预输入 (Input Buffering 0.12s)
 * 2. 地形与天气深度耦合：低摩擦力冰面滑行、沙漠流沙下沉、幽灵木桥消失重现、大风天顺逆风空中推力、暴雪寒冷减速（吃辣椒免疫）
 * 3. 经典马里奥式砖块交互：? 惊喜砖块顶出烤鸡腿/变大奶茶药水/喷火红辣椒，可破坏砖块碎裂飞散
 * 4. 连击踩踏系统：空中连续踩踏触发 Combo x2 / x4 / x8 翻倍加分与浮动飘字
 * 5. 暴暴龙 AI 与第 30 关终极熔岩机甲三阶段 Boss 战
 */

window.NailongAdventure = window.NailongAdventure || {};

(function (ns) {
  'use strict';

  const GRAVITY = 1200;
  const MAX_FALL_SPEED = 680;
  const BASE_RUN_SPEED = 252;
  const JUMP_VELOCITY = -565;
  const COYOTE_DURATION = 0.11;
  const JUMP_BUFFER_DURATION = 0.12;
  const MAX_VISUAL_PARTICLES = 280;
  const TAU = Math.PI * 2;

  function circlePath(ctx, x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.1, radius), 0, TAU);
  }

  function polygonPath(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
  }

  function sparklePath(ctx, radius, inner = 0.24) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const size = i % 2 === 0 ? radius : radius * inner;
      const x = Math.cos(angle) * size;
      const y = Math.sin(angle) * size;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function aabbOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  class PhysicsWorld {
    constructor() {
      this.fireballs = [];
      this.enemyProjectiles = [];
      this.particles = [];
      this.floatingTexts = [];
      this.impacts = [];
    }

    reset() {
      this.fireballs = [];
      this.enemyProjectiles = [];
      this.particles = [];
      this.floatingTexts = [];
      this.impacts = [];
    }

    spawnFloatingText(x, y, text, color = '#FFEB3B', size = 15) {
      this.floatingTexts.push({
        x,
        y,
        vy: -55,
        text,
        color,
        size,
        life: 0.95,
        maxLife: 0.95,
      });
    }

    spawnBurstParticles(x, y, color, count = 10, speed = 150) {
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const spd = speed * (0.5 + Math.random() * 0.7);
        const life = 0.38 + Math.random() * 0.3;
        this._addParticle({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 60,
          size: 2 + Math.random() * 2.6,
          color,
          life,
          maxLife: life,
          shape: i % 4 === 0 ? 'star' : i % 3 === 0 ? 'shard' : 'spark',
          rotation: ang,
          spin: (Math.random() - 0.5) * 12,
          gravity: 360,
        });
      }
    }

    _addParticle(particle) {
      // A fixed visual budget keeps long boss fights steady on mobile devices.
      if (this.particles.length >= MAX_VISUAL_PARTICLES) this.particles.shift();
      this.particles.push(particle);
    }

    spawnImpact(x, y, color = '#FFAA32', size = 24, smoke = false) {
      if (this.impacts.length >= 24) this.impacts.shift();
      this.impacts.push({ x, y, color, size, life: 0.36, maxLife: 0.36 });
      if (!smoke) return;
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * TAU;
        const life = 0.38 + Math.random() * 0.16;
        this._addParticle({
          x: x + Math.cos(angle) * 5,
          y: y + Math.sin(angle) * 4,
          vx: Math.cos(angle) * 38,
          vy: -30 + Math.sin(angle) * 24,
          size: 5 + Math.random() * 4,
          color: '#8E7DA6',
          life,
          maxLife: life,
          shape: 'smoke',
          gravity: -25,
        });
      }
    }

    _emitProjectileTrail(projectile, dt, color, isFire = false) {
      projectile.trailTimer = (projectile.trailTimer || 0) - dt;
      if (projectile.trailTimer > 0) return;
      projectile.trailTimer = isFire ? 0.035 : 0.055;
      const life = isFire ? 0.22 : 0.28;
      this._addParticle({
        x: projectile.x + projectile.w * 0.5,
        y: projectile.y + projectile.h * 0.5,
        vx: -projectile.vx * 0.07,
        vy: -18 + Math.random() * 16,
        size: isFire ? 3.6 : 2.8,
        color,
        life,
        maxLife: life,
        gravity: -35,
        shape: 'ember',
      });
    }

    createPlayer(startX = 96, startY = 360) {
      const self = this;
      return {
        x: startX,
        y: startY,
        w: 34,
        h: 44,
        vx: 0,
        vy: 0,
        facing: 1,
        onGround: false,
        surfaceType: 'normal',
        inQuicksand: false,
        coyoteTimer: 0,
        jumpBufferTimer: 0,
        jumpHeld: false,
        hp: 5,
        maxHp: 5,
        isBig: false, // 变大奶茶药水护盾（抵挡一次伤害）
        hasFire: false, // 红辣椒喷火形态
        atkBoostTimer: 0, // 狂暴龙晶双倍伤害计时器
        fireCooldown: 0,
        invincibleTimer: 0,
        hurtTimer: 0,
        happyTimer: 0,
        attackTimer: 0,
        airCombo: 0,
        squashX: 0,
        squashY: 0,
        safeX: startX,
        safeY: startY,
        onHitByHazard: (reason) => {
          self.damagePlayer(this.activePlayer, reason);
        },
      };
    }

    shootPlayerFireball(player, weatherMeta) {
      if (!player.hasFire || player.fireCooldown > 0) return false;
      player.fireCooldown = 0.28;
      player.attackTimer = 0.24;
      const rangeMult = weatherMeta ? weatherMeta.fireballRangeMult : 1.0;

      this.fireballs.push({
        x: player.facing >= 0 ? player.x + player.w + 2 : player.x - 16,
        y: player.y + player.h * 0.36,
        w: player.atkBoostTimer > 0 ? 18 : 14,
        h: player.atkBoostTimer > 0 ? 18 : 14,
        vx: player.facing * (player.atkBoostTimer > 0 ? 480 : 430),
        vy: 80,
        bounces: 0,
        dmg: player.atkBoostTimer > 0 ? 2 : 1,
        life: 1.35 * rangeMult,
      });
      this.spawnImpact(player.facing >= 0 ? player.x + player.w + 8 : player.x - 8,
        player.y + player.h * 0.36 + 7, '#FFD66B', 14);
      if (ns.Audio) ns.Audio.playFireball();
      return true;
    }

    damagePlayer(player, reason = '') {
      if (!player || player.invincibleTimer > 0 || player.dead) return;
      if (ns.Audio) ns.Audio.playHurt();

      if (player.hasFire) {
        player.hasFire = false;
        player.invincibleTimer = 1.5;
        player.hurtTimer = 0.4;
        this.spawnFloatingText(player.x, player.y - 12, '辣椒护体抵消伤害!', '#FF9800', 14);
        this.spawnBurstParticles(player.x + 17, player.y + 22, '#FF5722', 12);
        this.spawnImpact(player.x + 17, player.y + 22, '#FFB452', 34);
        return;
      }

      if (player.isBig) {
        player.isBig = false;
        player.invincibleTimer = 1.5;
        player.hurtTimer = 0.4;
        this.spawnFloatingText(player.x, player.y - 12, '奶茶护盾抵挡伤害!', '#4ADE80', 14);
        this.spawnBurstParticles(player.x + 17, player.y + 22, '#52E09B', 12);
        this.spawnImpact(player.x + 17, player.y + 22, '#9CF8CB', 34);
        return;
      }

      player.hp = Math.max(0, player.hp - 1);
      player.invincibleTimer = 1.65;
      player.hurtTimer = 0.45;
      player.vy = -260;
      player.vx = -player.facing * 140;
      this.spawnBurstParticles(player.x + 17, player.y + 22, '#EF4444', 14);
      this.spawnImpact(player.x + 17, player.y + 22, '#FF9294', 28);
      if (reason) {
        this.spawnFloatingText(player.x, player.y - 16, reason, '#FCA5A5', 13);
      }

      if (player.hp <= 0) {
        player.dead = true;
      }
    }

    /**
     * 主物理步进更新 (60 FPS 固定时间步长)
     */
    update(dt, player, level, input, stateCallbacks) {
      this.activePlayer = player;
      const weather = ns.Weather;
      const wMeta = weather.getMeta();

      // 1. 计时器衰减
      if (player.coyoteTimer > 0) player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
      if (player.jumpBufferTimer > 0) player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);
      if (player.invincibleTimer > 0) player.invincibleTimer = Math.max(0, player.invincibleTimer - dt);
      if (player.hurtTimer > 0) player.hurtTimer = Math.max(0, player.hurtTimer - dt);
      if (player.happyTimer > 0) player.happyTimer = Math.max(0, player.happyTimer - dt);
      if (player.attackTimer > 0) player.attackTimer = Math.max(0, player.attackTimer - dt);
      if (player.fireCooldown > 0) player.fireCooldown = Math.max(0, player.fireCooldown - dt);
      if (player.atkBoostTimer > 0) player.atkBoostTimer = Math.max(0, player.atkBoostTimer - dt);

      player.squashX *= Math.pow(0.08, dt);
      player.squashY *= Math.pow(0.08, dt);

      // 2. 更新移动平台与幽灵木桥状态
      for (const mp of level.movingPlatforms) {
        const prevX = mp.x;
        const prevY = mp.y;
        mp.phase += dt * mp.speed;
        mp.x = mp.startX + Math.sin(mp.phase) * mp.ampX;
        mp.y = mp.startY + Math.cos(mp.phase) * mp.ampY;
        mp.dx = mp.x - prevX;
        mp.dy = mp.y - prevY;
      }

      for (const t of level.tiles) {
        if (t.bumpOffset && t.bumpOffset < 0) {
          t.bumpOffset = Math.min(0, t.bumpOffset + dt * 65);
        }
        if (t.type === 'ghost_bridge') {
          if (t.state === 'shaking') {
            t.timer -= dt;
            if (t.timer <= 0) {
              t.state = 'gone';
              t.timer = 2.2;
            }
          } else if (t.state === 'gone') {
            t.timer -= dt;
            if (t.timer <= 0) {
              t.state = 'solid';
            }
          }
        }
      }

      // 3. 玩家水平移动物理（融合冰面惯性、天气摩擦、大风推力、暴雪寒冷、流沙减速）
      const isIceSurface = player.surfaceType === 'ice' || level.isIce;
      const surfaceFriction = isIceSurface ? 0.22 : 1.0;
      const totalFriction = surfaceFriction * wMeta.frictionMult;
      const coldPenalty = weather.current === 'snowy' && !player.hasFire ? 1 - weather.coldMeter * 0.28 : 1.0;
      const quicksandPenalty = player.inQuicksand ? 0.52 : 1.0;
      const maxSpeed = BASE_RUN_SPEED * coldPenalty * quicksandPenalty;

      const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (moveDir !== 0) {
        player.facing = moveDir;
        const accel = (player.onGround ? 1550 : 1080) * wMeta.accelMult * (isIceSurface ? 0.48 : 1.0);
        player.vx += moveDir * accel * dt;
        if (Math.abs(player.vx) > maxSpeed) {
          player.vx = moveDir * maxSpeed;
        }
      } else {
        // 刹车阻尼（冰面与雨雪天保留丝滑惯性滑行）
        const decel = (player.onGround ? 1420 : 480) * totalFriction;
        if (Math.abs(player.vx) <= decel * dt) {
          player.vx = 0;
        } else {
          player.vx -= Math.sign(player.vx) * decel * dt;
        }
      }

      // 大风天顺风/逆风推力（空中受风力影响更显著）
      let windOffsetVx = 0;
      if (Math.abs(weather.windStrength) > 1) {
        windOffsetVx = weather.windStrength * (player.onGround ? 0.22 : 0.48);
      }

      // 4. 跳跃预输入、土狼时间与可变跳跃高度
      if (input.jumpJustPressed) {
        player.jumpBufferTimer = JUMP_BUFFER_DURATION;
        input.jumpJustPressed = false;
      }

      if (player.jumpBufferTimer > 0 && (player.onGround || player.coyoteTimer > 0 || player.inQuicksand)) {
        player.vy = player.inQuicksand ? JUMP_VELOCITY * 0.88 : JUMP_VELOCITY;
        player.onGround = false;
        player.inQuicksand = false;
        player.coyoteTimer = 0;
        player.jumpBufferTimer = 0;
        player.squashX = -0.14;
        player.squashY = 0.16;
        if (ns.Audio) ns.Audio.playJump(player.isBig);
      }

      // 轻按松开跳跃键立即截断上升速度（实现轻按小跳、长按大跳）
      if (!input.jumpHeld && player.vy < -185) {
        player.vy *= 0.54;
      }

      // 喷火技能触发 (J / Z / X)
      if (input.fireJustPressed) {
        input.fireJustPressed = false;
        this.shootPlayerFireball(player, wMeta);
      }

      // 5. 水平位移与固体砖块碰撞（记录 prevX，防止流沙下沉或大风天误触发整块地板侧向瞬移！）
      const prevX = player.x;
      const prevRight = player.x + player.w;
      const totalVx = player.vx + windOffsetVx;
      player.x += totalVx * dt;
      if (player.x < 0) {
        player.x = 0;
        player.vx = 0;
      }
      if (player.x + player.w > level.worldW) {
        player.x = level.worldW - player.w;
        player.vx = 0;
      }

      for (const t of level.tiles) {
        if (t.broken || t.type === 'cloud_platform' || t.type === 'quicksand') continue;
        if (t.type === 'ghost_bridge' && t.state === 'gone') continue;
        // 仅当奶龙身体确实处于墙体高度范围内（而非站在平地上或轻微陷入流沙）时才做横向阻挡
        if (player.y + player.h <= t.y + 8 || player.y >= t.y + t.h - 4) continue;
        if (aabbOverlap(player, t)) {
          if (totalVx > 0 && prevRight <= t.x + 14) {
            player.x = t.x - player.w;
            player.vx = 0;
          } else if (totalVx < 0 && prevX >= t.x + t.w - 14) {
            player.x = t.x + t.w;
            player.vx = 0;
          }
        }
      }

      // 6. 垂直重力与地面/顶砖块碰撞
      const prevBottom = player.y + player.h;
      const wasOnGround = player.onGround;
      player.vy = Math.min(MAX_FALL_SPEED, player.vy + GRAVITY * dt);
      player.y += player.vy * dt;

      player.onGround = false;
      player.inQuicksand = false;

      // 先优先处理普通坚实地面，再处理流沙，避免跨交界处时陷入相邻砖块下方
      let landedSolid = false;
      for (const t of level.tiles) {
        if (t.broken || t.type === 'quicksand') continue;
        if (t.type === 'ghost_bridge' && t.state === 'gone') continue;

        // 单向云朵平台：仅从上方落下时站立
        if (t.type === 'cloud_platform') {
          if (player.vy >= 0 && prevBottom <= t.y + 12 && aabbOverlap(player, t)) {
            player.y = t.y - player.h;
            player.vy = 0;
            player.onGround = true;
            player.surfaceType = 'normal';
            landedSolid = true;
          }
          continue;
        }

        if (!aabbOverlap(player, t)) continue;

        if (player.vy >= 0 && prevBottom <= t.y + 22) {
          player.y = t.y - player.h;
          player.vy = 0;
          player.onGround = true;
          landedSolid = true;
          player.surfaceType = t.type === 'ice' ? 'ice' : 'normal';
          if (t.type === 'ghost_bridge' && t.state === 'solid') {
            t.state = 'shaking';
            t.timer = 0.85;
          }
          if (t.type === 'normal' || t.type === 'ice') {
            player.safeX = player.x;
            player.safeY = t.y - player.h - 2;
          }
        } else if (player.vy < 0 && player.y >= t.y + t.h - 18) {
          // 从下方顶击砖块！
          player.y = t.y + t.h;
          player.vy = 45;
          this._handleBlockBump(t, level, player, stateCallbacks);
        }
      }

      if (!landedSolid) {
        for (const t of level.tiles) {
          if (t.type !== 'quicksand') continue;
          if (!aabbOverlap(player, t)) continue;
          if (player.vy >= -20 && prevBottom <= t.y + 28) {
            // 第二章沙漠流沙河：缓慢下沉，若站立过久陷到 9px 深，触发流沙泉涌击退（不扣血）！
            player.inQuicksand = true;
            player.onGround = true;
            player.vy = 18;
            if (player.y + player.h > t.y + 9) {
              player.y = t.y - player.h - 4;
              player.vy = -440;
              player.vx = -210;
              player.onGround = false;
              player.inQuicksand = false;
              if (ns.Audio) ns.Audio.playSpring();
              this.spawnBurstParticles(player.x + 17, t.y, '#FDE047', 10, 150);
              this.spawnFloatingText(player.x, t.y - 16, '🏜️流沙漩涡把你弹退啦!(不扣血)', '#F59E0B', 14);
            }
          }
        }
      }

      // 移动平台站立检测
      for (const mp of level.movingPlatforms) {
        if (player.vy >= 0 && prevBottom <= mp.y + 14 && aabbOverlap(player, mp)) {
          player.y = mp.y - player.h;
          player.x += mp.dx || 0;
          player.vy = 0;
          player.onGround = true;
          player.surfaceType = 'normal';
        }
      }

      if (player.onGround) {
        player.coyoteTimer = COYOTE_DURATION;
        player.airCombo = 0;
        if (!wasOnGround) {
          player.squashX = 0.14;
          player.squashY = -0.12;
        }
      } else if (wasOnGround) {
        player.coyoteTimer = COYOTE_DURATION;
      }

      // 掉入深渊安全救援机制（第二章沙漠河流改为水流击退回岸上且不扣血；其余章节深谷扣1格心救援）
      if (player.y > level.groundY + 75) {
        if (level.chapter === 2) {
          player.x = Math.max(24, player.safeX - 18);
          player.y = player.safeY - 24;
          player.vx = -220;
          player.vy = -440;
          player.onGround = false;
          if (ns.Audio) ns.Audio.playSpring();
          this.spawnBurstParticles(player.x + 17, level.groundY, '#38BDF8', 14, 170);
          this.spawnFloatingText(player.x, player.y - 14, '🌊沙漠河水湍急！把你冲回岸上啦(不扣血)!', '#38BDF8', 14);
        } else if (player.y > level.groundY + 120) {
          this.damagePlayer(player, '掉进深谷啦！小七拉了你一把！');
          if (!player.dead) {
            player.x = player.safeX;
            player.y = player.safeY - 16;
            player.vx = 0;
            player.vy = -180;
          }
        }
      }

      // 7. 收集物（烤鸡腿、黄金超级鸡腿、红辣椒、变大奶茶药水）更新与拾取
      for (const item of level.collectibles) {
        if (item.collected) continue;
        if (item.vy !== undefined) {
          item.vy = Math.min(360, item.vy + 780 * dt);
          item.y += item.vy * dt;
          if (item.y >= item.targetY) {
            item.y = item.targetY;
            delete item.vy;
          }
        }
        if (aabbOverlap(player, item)) {
          item.collected = true;
          player.happyTimer = 0.45;
          if (item.type === 'drumstick') {
            const pts = Math.round(100 * wMeta.scoreMult);
            stateCallbacks.onCollectDrumstick(pts, false, -1);
            this.spawnFloatingText(item.x, item.y, `🍗+${pts}`, '#FFD700', 15);
            this.spawnBurstParticles(item.x + 15, item.y + 15, '#FFB300', 8);
            if (ns.Audio) ns.Audio.playDrumstick(false);
          } else if (item.type === 'golden_drumstick') {
            const pts = Math.round(500 * wMeta.scoreMult);
            stateCallbacks.onCollectDrumstick(pts, true, item.goldenIndex);
            this.spawnFloatingText(item.x, item.y - 10, `🌟黄金大鸡腿 +${pts}!`, '#FFF176', 17);
            this.spawnBurstParticles(item.x + 18, item.y + 18, '#FFD700', 18, 200);
            if (ns.Audio) {
              ns.Audio.playDrumstick(true);
              ns.Audio.playVoiceLine();
            }
          } else if (item.type === 'chili') {
            player.hasFire = true;
            stateCallbacks.onAddScore(300);
            this.spawnFloatingText(item.x, item.y - 10, '🌶️红辣椒喷火形态!(按J/Z吐火球)', '#FF5722', 16);
            this.spawnBurstParticles(item.x + 16, item.y + 16, '#FF5722', 16);
            if (ns.Audio) ns.Audio.playPowerup();
          } else if (item.type === 'potion') {
            player.isBig = true;
            player.hp = Math.min(player.maxHp, player.hp + 1);
            stateCallbacks.onAddScore(300);
            this.spawnFloatingText(item.x, item.y - 10, '🧋波波奶茶护盾+生命恢复!', '#10B981', 16);
            this.spawnBurstParticles(item.x + 16, item.y + 16, '#4ADE80', 16);
            if (ns.Audio) ns.Audio.playPowerup();
          } else if (item.type === 'heart') {
            const oldHp = player.hp;
            player.hp = Math.min(player.maxHp, player.hp + 2);
            const healed = player.hp - oldHp;
            stateCallbacks.onAddScore(350);
            this.spawnFloatingText(
              item.x,
              item.y - 10,
              healed > 0 ? `💖蜜桃回血果 +${healed} HP!` : '💖满血奖励 +350分!',
              '#F43F5E',
              16
            );
            this.spawnBurstParticles(item.x + 16, item.y + 16, '#FB7185', 16);
            if (ns.Audio) ns.Audio.playPowerup();
          } else if (item.type === 'atk_gem') {
            player.atkBoostTimer = 10.0;
            player.hasFire = true;
            stateCallbacks.onAddScore(400);
            this.spawnFloatingText(item.x, item.y - 10, '⚡狂暴龙晶: 攻击伤害x2 (10秒)!', '#F59E0B', 16);
            this.spawnBurstParticles(item.x + 16, item.y + 16, '#FBBF24', 18);
            if (ns.Audio) ns.Audio.playPowerup();
          }
        }
      }

      // 8. 章节机关与陷阱交互（弹簧蘑菇、布丁垫、仙人掌、埋伏树丛、坠落冰锥、岩浆、旋转火棒）
      for (const hz of level.hazards) {
        if (hz.bounceAnim > 0) hz.bounceAnim = Math.max(0, hz.bounceAnim - dt * 4);

        if (hz.type === 'spring' || hz.type === 'pudding') {
          if (aabbOverlap(player, hz)) {
            player.vy = hz.type === 'pudding' ? -780 : -760;
            player.onGround = false;
            hz.bounceAnim = 1.0;
            player.squashX = -0.18;
            player.squashY = 0.22;
            if (ns.Audio) ns.Audio.playSpring();
            this.spawnFloatingText(hz.x, hz.y - 10, 'DUANG~ 超级高跳!', '#FDE047', 14);
          }
        } else if (hz.type === 'cactus') {
          if (aabbOverlap(player, hz)) {
            this.damagePlayer(player, '扎到沙漠仙人掌刺啦！');
          }
        } else if (hz.type === 'desert_river') {
          if (aabbOverlap(player, hz)) {
            // 沙漠河流：不扣血，触发向上+向岸边的弹性水流击退！
            player.vy = -490;
            player.vx = -240;
            player.onGround = false;
            player.squashX = -0.15;
            player.squashY = 0.18;
            if (ns.Audio) ns.Audio.playSpring();
            this.spawnBurstParticles(player.x + 17, hz.y + 4, '#38BDF8', 12, 160);
            this.spawnFloatingText(player.x, hz.y - 14, '🌊沙漠河水击退!(不扣血)', '#38BDF8', 14);
          }
        } else if (hz.type === 'lava') {
          if (aabbOverlap(player, hz)) {
            this.damagePlayer(player, '烫到熔岩啦！快跳上平台！');
            player.vy = -460;
          }
        } else if (hz.type === 'ambush_bush') {
          if (!hz.triggered && Math.abs(player.x - hz.x) < 135) {
            hz.triggered = true;
            this.spawnFloatingText(hz.x, hz.y - 16, '👾小紫兵树丛突袭!', '#E879F9', 14);
            this.spawnBurstParticles(hz.x + 24, hz.y + 16, '#10B981', 10);
            const bushGroundY = hz.y + hz.h;
            level.enemies.push({
              type: 'minion',
              x: hz.x + 6,
              y: bushGroundY - 38,
              groundTopY: bushGroundY,
              w: 34,
              h: 38,
              vx: player.x < hz.x ? -115 : 115,
              vy: -260,
              hp: 1,
              maxHp: 1,
              patrolMin: hz.x - 140,
              patrolMax: hz.x + 140,
              attackCooldown: 1.0,
              jumpCooldown: 1.8,
              aggro: true,
              squashed: false,
              squashTimer: 0,
            });
          }
        } else if (hz.type === 'icicle') {
          if (hz.state === 'idle' && Math.abs(player.x + player.w * 0.5 - (hz.x + hz.w * 0.5)) < 82) {
            hz.state = 'shaking';
            hz.timer = 0.42;
          } else if (hz.state === 'shaking') {
            hz.timer -= dt;
            if (hz.timer <= 0) {
              hz.state = 'falling';
              hz.vy = 60;
            }
          } else if (hz.state === 'falling') {
            hz.vy += 920 * dt;
            hz.y += hz.vy * dt;
            if (aabbOverlap(player, hz)) {
              this.damagePlayer(player, '被坠落冰锥砸中啦！');
              hz.y = hz.startY;
              hz.state = 'idle';
              hz.vy = 0;
            } else if (hz.y > level.groundY) {
              this.spawnBurstParticles(hz.x + 12, level.groundY, '#BAE6FD', 8);
              hz.y = hz.startY;
              hz.state = 'idle';
              hz.vy = 0;
            }
          }
        } else if (hz.type === 'firebar') {
          hz.angle += hz.speed * dt;
          for (let r = 16; r <= hz.length; r += 16) {
            const fx = hz.x + Math.cos(hz.angle) * r - 6;
            const fy = hz.y + Math.sin(hz.angle) * r - 6;
            if (aabbOverlap(player, { x: fx, y: fy, w: 12, h: 12 })) {
              this.damagePlayer(player, '碰到旋转火棒啦！');
              break;
            }
          }
        }
      }

      // 9. 更新奶龙喷出的火球（视觉拖尾与碰撞体独立）
      for (let i = this.fireballs.length - 1; i >= 0; i--) {
        const fb = this.fireballs[i];
        fb.life -= dt;
        fb.vy += 980 * dt;
        fb.x += fb.vx * dt;
        fb.y += fb.vy * dt;
        this._emitProjectileTrail(fb, dt, fb.dmg > 1 ? '#FFE8A3' : '#FFB34D', true);

        // 地面弹跳
        for (const t of level.tiles) {
          if (t.broken) continue;
          if (aabbOverlap(fb, t)) {
            if (fb.vy > 0 && fb.y + fb.h - fb.vy * dt <= t.y + 10) {
              fb.y = t.y - fb.h;
              fb.vy = -250;
              fb.bounces++;
              this.spawnImpact(fb.x + fb.w * 0.5, fb.y + fb.h, '#FFC66B', 12);
            } else {
              fb.life = 0;
            }
          }
        }

        // 命中敌人检测
        for (const en of level.enemies) {
          if (en.dead || en.squashed) continue;
          if (aabbOverlap(fb, en)) {
            fb.life = 0;
            this._damageEnemy(en, fb.dmg || 1, player, stateCallbacks, true);
            break;
          }
        }

        if (fb.life <= 0 || fb.bounces > 4) {
          this.spawnBurstParticles(fb.x + fb.w * 0.5, fb.y + fb.h * 0.5, '#FF9A36', 7, 105);
          this.spawnImpact(fb.x + fb.w * 0.5, fb.y + fb.h * 0.5, '#FFBC59', 22);
          this.fireballs.splice(i, 1);
        }
      }

      // 10. 更新小紫兵与暴暴龙 AI、地面砖块碰撞及主动攻击交互
      for (let i = level.enemies.length - 1; i >= 0; i--) {
        const en = level.enemies[i];
        if (en.squashed) {
          en.squashTimer -= dt;
          if (en.squashTimer <= 0) {
            level.enemies.splice(i, 1);
          }
          continue;
        }
        if (en.dead) {
          level.enemies.splice(i, 1);
          continue;
        }

        if (en.hurtTimer > 0) en.hurtTimer = Math.max(0, en.hurtTimer - dt);
        if (en.attackTimer > 0) en.attackTimer = Math.max(0, en.attackTimer - dt);

        // 精确计算敌人脚下当前地面砖块高度（彻底杜绝小紫兵陷入凸起高台内部！）
        let supportY = en.groundTopY || level.groundY;
        const enCenterX = en.x + en.w * 0.5;
        for (const t of level.tiles) {
          if (t.broken || t.type === 'question' || t.type === 'brick' || t.type === 'cloud_platform') continue;
          if (t.type === 'ghost_bridge' && t.state === 'gone') continue;
          if (enCenterX >= t.x - 4 && enCenterX <= t.x + t.w + 4) {
            if (t.y < supportY) {
              supportY = t.y;
            }
          }
        }

        en.vy = Math.min(500, (en.vy || 0) + GRAVITY * dt);
        en.y += en.vy * dt;
        if (en.y + en.h >= supportY) {
          en.y = supportY - en.h;
          en.vy = 0;
          en.onGround = true;
        } else {
          en.onGround = false;
        }

        const distToPlayerX = Math.abs(player.x - en.x);
        const distToPlayerY = Math.abs(player.y - en.y);
        const dirToPlayer = player.x < en.x ? -1 : 1;

        // 小紫兵主动索敌与主动攻击 AI（投掷紫晶小炸弹 / 弹簧飞扑 + 能量刺）
        if (en.type === 'minion' || en.type === 'minion_helmet') {
          en.aggro = distToPlayerX < 350 && distToPlayerY < 150;

          if (en.aggro) {
            // 朝向奶龙加速逼近
            en.vx = dirToPlayer * Math.abs(en.vx);
            en.attackCooldown = (en.attackCooldown ?? 0.45) - dt;
            if (en.attackCooldown <= 0) {
              en.attackCooldown = en.type === 'minion_helmet' ? 1.55 : 1.75;
              en.attackTimer = 0.4;

              if (en.type === 'minion_helmet') {
                // 独眼弹簧铁帽小紫兵：弹簧突袭起跳 + 发射水平紫晶尖刺弹！
                if (en.onGround) en.vy = -330;
                this.enemyProjectiles.push({
                  kind: 'bolt',
                  x: dirToPlayer > 0 ? en.x + en.w : en.x - 14,
                  y: en.y + en.h * 0.45,
                  w: 14,
                  h: 10,
                  vx: dirToPlayer * 235,
                  vy: 0,
                  hasGravity: false,
                  life: 1.9,
                });
                this.spawnFloatingText(en.x, en.y - 12, '👾铁帽尖刺射击!', '#F472B6', 12);
              } else {
                // 双丸头带小紫兵：小跳并向奶龙投掷抛物线紫晶小炸弹 (bomb)！
                if (en.onGround) en.vy = -210;
                const throwVx = dirToPlayer * Math.min(240, Math.max(110, distToPlayerX * 0.85));
                this.enemyProjectiles.push({
                  kind: 'bomb',
                  x: en.x + en.w * 0.5 - 7,
                  y: en.y + 4,
                  w: 14,
                  h: 14,
                  vx: throwVx,
                  vy: -310,
                  hasGravity: true,
                  bounces: 0,
                  groundY: supportY,
                  life: 2.2,
                });
                this.spawnFloatingText(en.x, en.y - 12, '💣紫兵投弹!', '#C084FC', 12);
              }
            }
          }
        }

        // 巡逻与冲锋移动
        const speedMult = en.charging ? 1.85 : en.isRage ? 1.4 : en.aggro ? 1.35 : 1.0;
        en.x += en.vx * speedMult * dt;
        if (en.x <= en.patrolMin) {
          en.x = en.patrolMin;
          en.vx = Math.abs(en.vx);
          en.charging = false;
        } else if (en.x + en.w >= en.patrolMax) {
          en.x = en.patrolMax - en.w;
          en.vx = -Math.abs(en.vx);
          en.charging = false;
        }

        // 暴暴龙专属技能：周期性蓄力冲撞 + 发射紫色能量球 + 第30关终极机甲三阶段模式
        if (en.type === 'boss' || en.type === 'final_boss') {
          if (en.hp <= Math.ceil(en.maxHp * 0.5)) {
            en.isRage = true;
          }
          if (distToPlayerX < 500) {
            en.shootCooldown -= dt;
            if (en.shootCooldown <= 0) {
              en.shootCooldown = en.isRage ? 1.65 : 2.3;
              en.attackTimer = 0.45;
              en.vx = dirToPlayer * Math.abs(en.vx);
              if (ns.Audio) ns.Audio.playBossAttack();

              // 发射紫色等离子能量球（终极Boss狂暴阶段发射扇形双弹/三连弹！）
              const angles =
                en.type === 'final_boss' && en.isRage
                  ? level.chapter >= 8
                    ? [-0.24, 0, 0.2]
                    : [-0.18, 0.05]
                  : [0];
              for (const ang of angles) {
                this.enemyProjectiles.push({
                  kind: 'plasma',
                  x: dirToPlayer > 0 ? en.x + en.w : en.x - 16,
                  y: en.y + en.h * 0.42,
                  w: 16,
                  h: 16,
                  vx: Math.cos(ang) * dirToPlayer * ((en.isRage ? 275 : 230) + Math.max(0, level.chapter - 5) * 18),
                  vy: Math.sin(ang) * 220,
                  hasGravity: false,
                  life: 2.6,
                });
              }
            }

            en.chargeCooldown -= dt;
            if (en.chargeCooldown <= 0) {
              en.chargeCooldown = en.isRage ? 3.2 : 4.4;
              en.charging = true;
              en.vx = dirToPlayer * Math.abs(en.vx);
              if (en.type === 'final_boss' && en.onGround) {
                // 终极机甲高空喷气跳跃泰山压顶！
                en.vy = -420;
              }
              this.spawnFloatingText(en.x, en.y - 14, '⚡暴暴龙冲撞!', '#C084FC', 14);
            }
          }
        }

        // 与奶龙碰撞检测：从上方踩踏 vs 侧面受击
        if (aabbOverlap(player, en)) {
          const isStomp = player.vy > 0 && prevBottom <= en.y + Math.max(20, en.h * 0.52);
          if (isStomp) {
            if (en.type === 'minion_helmet') {
              // 独眼弹簧铁帽小紫兵不可直接用脚踩碎，会弹开奶龙并提示使用火球！
              player.vy = -380;
              this.damagePlayer(player, '铁帽尖刺扎脚！请用红辣椒火球(J/Z)击败它！');
            } else {
              // 踩踏成功！触发连击翻倍与弹起（若处于狂暴龙晶状态，踩踏伤害 x2！）
              player.airCombo = (player.airCombo || 0) + 1;
              const comboMult = Math.min(8, Math.pow(2, player.airCombo - 1));
              const stompDmg = player.atkBoostTimer > 0 ? 2 : 1;
              player.vy = input.jumpHeld ? -510 : -420;
              player.squashX = -0.15;
              player.squashY = 0.18;
              this._damageEnemy(en, stompDmg, player, stateCallbacks, false, comboMult);
            }
          } else if (en.hurtTimer <= 0) {
            this.damagePlayer(player, en.type.includes('minion') ? '被小紫兵主动冲撞咬伤啦！' : '被暴暴龙猛烈撞击！');
          }
        }
      }

      // 11. 更新敌人发射的紫晶小炸弹、尖刺弹与暴暴龙等离子能量球
      for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
        const proj = this.enemyProjectiles[i];
        proj.life -= dt;
        if (proj.hasGravity) {
          proj.vy += 760 * dt;
          if (proj.y + proj.h >= (proj.groundY || level.groundY)) {
            proj.y = (proj.groundY || level.groundY) - proj.h;
            proj.vy = -190;
            proj.bounces = (proj.bounces || 0) + 1;
            if (proj.bounces >= 2) {
              proj.life = 0;
            } else {
              this.spawnImpact(proj.x + proj.w * 0.5, proj.y + proj.h, '#CC91F4', 12);
            }
          }
        }
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        this._emitProjectileTrail(proj, dt, proj.kind === 'bolt' ? '#F9A8D4' : '#CB8AFF');

        // 奶龙喷出的火球可以在空中击毁敌人的炸弹/能量球！
        for (const fb of this.fireballs) {
          if (aabbOverlap(fb, proj)) {
            fb.life = 0;
            proj.life = 0;
            this.spawnBurstParticles(proj.x + proj.w * 0.5, proj.y + proj.h * 0.5, '#FFD083', 7, 120);
            break;
          }
        }

        if (proj.life > 0 && aabbOverlap(player, proj)) {
          proj.life = 0;
          const msg =
            proj.kind === 'bomb'
              ? '被小紫兵投掷的紫晶炸弹炸伤啦！'
              : proj.kind === 'bolt'
              ? '被独眼小紫兵的尖刺弹击中！'
              : '被暴暴龙紫色能量球击中！';
          this.damagePlayer(player, msg);
        }
        if (proj.life <= 0) {
          const impactColor = proj.kind === 'bolt' ? '#F79ACD' : '#C292FF';
          this.spawnBurstParticles(proj.x + proj.w * 0.5, proj.y + proj.h * 0.5,
            impactColor, proj.kind === 'bomb' ? 12 : 7, proj.kind === 'bomb' ? 165 : 115);
          this.spawnImpact(proj.x + proj.w * 0.5, proj.y + proj.h * 0.5,
            impactColor, proj.kind === 'bomb' ? 36 : 24, proj.kind === 'bomb');
          this.enemyProjectiles.splice(i, 1);
        }
      }

      // 12. 更新粒子与浮动文字
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.life -= dt;
        pt.vy += (pt.gravity === undefined ? 420 : pt.gravity) * dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.rotation = (pt.rotation || 0) + (pt.spin || 0) * dt;
        if (pt.life <= 0) this.particles.splice(i, 1);
      }

      for (let i = this.impacts.length - 1; i >= 0; i--) {
        this.impacts[i].life -= dt;
        if (this.impacts[i].life <= 0) this.impacts.splice(i, 1);
      }

      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.life -= dt;
        ft.y += ft.vy * dt;
        if (ft.life <= 0) this.floatingTexts.splice(i, 1);
      }

      // 13. 检查通关条件（若是Boss关需击败Boss后触碰终点旗帜，普通关直接触碰终点旗帜）
      if (Math.abs(player.x + player.w * 0.5 - level.goalX) < 38) {
        const bossAlive = level.enemies.some((e) => (e.type === 'boss' || e.type === 'final_boss') && !e.dead && e.hp > 0);
        if (level.isBoss && bossAlive) {
          this.spawnFloatingText(level.goalX - 40, player.y - 20, '⚠️先击败暴暴龙才能夺回旗帜!', '#FCA5A5', 14);
          player.x = level.goalX - 42 - player.w;
        } else {
          stateCallbacks.onLevelClear();
        }
      }
    }

    _handleBlockBump(tile, level, player, stateCallbacks) {
      tile.bumpOffset = -8;
      if (tile.type === 'question' && !tile.bumped) {
        tile.bumped = true;
        const itemType = tile.item || 'drumstick';
        if (ns.Audio) ns.Audio.playBlockBump(true);
        level.collectibles.push({
          x: tile.x + 2,
          y: tile.y - 34,
          targetY: tile.y - 36,
          vy: -210,
          w: 32,
          h: 32,
          type: itemType,
          collected: false,
        });
      } else if (tile.type === 'brick') {
        if (tile.item) {
          const itemType = tile.item;
          tile.item = null;
          if (ns.Audio) ns.Audio.playBlockBump(true);
          level.collectibles.push({
            x: tile.x + 2,
            y: tile.y - 34,
            targetY: tile.y - 36,
            vy: -200,
            w: 32,
            h: 32,
            type: itemType,
            collected: false,
          });
        } else {
          // 顶碎可破坏砖块！
          tile.broken = true;
          stateCallbacks.onAddScore(50);
          if (ns.Audio) ns.Audio.playBrickBreak();
          this.spawnBurstParticles(tile.x + 18, tile.y + 18, level.chapterInfo.brickColor, 10, 180);
        }
      } else {
        if (ns.Audio) ns.Audio.playBlockBump(false);
      }
    }

    _damageEnemy(en, dmg, player, stateCallbacks, byFireball = false, comboMult = 1) {
      en.hp -= dmg;
      en.hurtTimer = 0.45;
      this.spawnImpact(en.x + en.w * 0.5, byFireball ? en.y + en.h * 0.45 : en.y + 5,
        byFireball ? '#FFD178' : '#B6F0FF', en.type.includes('boss') ? 38 : 25);
      if (ns.Audio) ns.Audio.playStomp(player.airCombo || 1);

      if (en.hp <= 0) {
        const baseScore = en.type === 'final_boss' ? 3000 : en.type === 'boss' ? 1000 : 100;
        const totalPts = baseScore * comboMult;
        stateCallbacks.onAddScore(totalPts);

        const comboLabel = comboMult > 1 ? ` COMBO x${comboMult}!` : '';
        this.spawnFloatingText(
          en.x,
          en.y - 12,
          `+${totalPts}${comboLabel}`,
          comboMult >= 4 ? '#F43F5E' : comboMult >= 2 ? '#38BDF8' : '#FFF176',
          comboMult > 1 ? 17 : 15
        );
        this.spawnBurstParticles(en.x + en.w * 0.5, en.y + en.h * 0.5, '#C084FC', 14, 170);

        if (en.type === 'minion' && !byFireball) {
          en.squashed = true;
          en.squashTimer = 0.45;
        } else {
          en.dead = true;
        }
      } else {
        // Boss 受击反馈
        const pts = 200 * comboMult;
        stateCallbacks.onAddScore(pts);
        this.spawnFloatingText(en.x, en.y - 16, `💥暴暴龙受击 -${dmg} HP! (+${pts})`, '#38BDF8', 15);
        this.spawnBurstParticles(en.x + en.w * 0.5, en.y + 20, '#38BDF8', 12, 160);
      }
    }

    _drawGlow(ctx, radius, color) {
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      glow.addColorStop(0, color);
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      circlePath(ctx, 0, 0, radius);
      ctx.fill();
    }

    _drawFireball(ctx, fb, timeSec) {
      const radius = fb.w * 0.54;
      const flicker = Math.sin(timeSec * 30 + fb.x * 0.05);
      ctx.rotate(Math.atan2(fb.vy * 0.45, fb.vx));
      this._drawGlow(ctx, radius * 3.2, 'rgba(255,153,48,0.28)');

      // Curved flame tongues follow the velocity without enlarging the hit box.
      const flame = ctx.createLinearGradient(-radius * 3, 0, radius, 0);
      flame.addColorStop(0, 'rgba(255,91,38,0)');
      flame.addColorStop(0.48, '#FF7C24');
      flame.addColorStop(1, '#FFE797');
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(radius * 0.3, -radius * 0.8);
      ctx.quadraticCurveTo(-radius * 0.8, -radius * 1.2, -radius * 2.7, -radius * (0.3 + flicker * 0.13));
      ctx.quadraticCurveTo(-radius * 1.6, radius * 0.15, -radius * 2.05, radius * 0.65);
      ctx.quadraticCurveTo(-radius * 0.6, radius * 0.4, -radius * 1.3, radius * 1.1);
      ctx.quadraticCurveTo(-radius * 0.1, radius * 0.65, radius * 0.65, radius * 0.5);
      ctx.closePath();
      ctx.fill();

      const body = ctx.createRadialGradient(-radius * 0.3, -radius * 0.42, 0, 0, 0, radius);
      body.addColorStop(0, '#FFFFE8');
      body.addColorStop(0.32, '#FFF39C');
      body.addColorStop(0.68, fb.dmg > 1 ? '#FFD34B' : '#FFC34E');
      body.addColorStop(1, '#F07824');
      circlePath(ctx, 0, 0, radius);
      ctx.fillStyle = body;
      ctx.fill();
      ctx.strokeStyle = '#B95127';
      ctx.lineWidth = 1.25;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-radius * 0.04, -radius * 0.07, radius * 0.68, Math.PI * 1.05, Math.PI * 1.65);
      ctx.strokeStyle = '#FFFCE9';
      ctx.lineWidth = 1.75;
      ctx.stroke();
      if (fb.dmg > 1) {
        ctx.rotate(-timeSec * 4);
        ctx.translate(radius * 0.9, -radius * 0.7);
        sparklePath(ctx, 4);
        ctx.fillStyle = '#FFFCE2';
        ctx.fill();
      }
    }

    _drawBomb(ctx, proj, timeSec) {
      const radius = proj.w * 0.62;
      ctx.rotate(Math.sin(timeSec * 8 + proj.x * 0.03) * 0.2);
      this._drawGlow(ctx, radius * 2.2, 'rgba(173,102,255,0.13)');

      // The curved wick, brass collar and faceted glass read clearly at 14 px.
      ctx.beginPath();
      ctx.moveTo(1, -radius + 1);
      ctx.bezierCurveTo(0, -radius - 7, 8, -radius - 2, 7, -radius - 8);
      ctx.strokeStyle = '#482E54';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = '#E7BC7C';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      const body = ctx.createRadialGradient(-3, -4, 0, 0, 0, radius * 1.1);
      body.addColorStop(0, '#E2BAFF');
      body.addColorStop(0.35, '#A76BE4');
      body.addColorStop(0.75, '#7041AD');
      body.addColorStop(1, '#42256B');
      polygonPath(ctx, [[-radius * 0.5, -radius * 0.87], [radius * 0.42, -radius * 0.88],
        [radius * 0.94, -radius * 0.35], [radius, radius * 0.4], [radius * 0.45, radius],
        [-radius * 0.4, radius], [-radius * 0.97, radius * 0.43], [-radius, -radius * 0.35]]);
      ctx.fillStyle = body;
      ctx.fill();
      ctx.strokeStyle = '#352448';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      polygonPath(ctx, [[-radius * 0.82, -radius * 0.3], [-radius * 0.42, -radius * 0.76],
        [radius * 0.28, -radius * 0.75], [0, -radius * 0.26]]);
      ctx.fillStyle = 'rgba(246,222,255,0.55)';
      ctx.fill();
      polygonPath(ctx, [[radius * 0.8, -radius * 0.15], [radius * 0.81, radius * 0.35],
        [radius * 0.35, radius * 0.8], [radius * 0.35, radius * 0.2]]);
      ctx.fillStyle = 'rgba(39,15,80,0.28)';
      ctx.fill();

      ctx.fillStyle = '#74D9D5';
      ctx.fillRect(-4, -radius - 1, 8, 3.5);
      ctx.fillStyle = '#D8FFF0';
      ctx.fillRect(-3, -radius - 1, 5, 1);
      ctx.save();
      ctx.translate(0, 2);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#F8CBFF';
      ctx.fillRect(-2.2, -2.2, 4.4, 4.4);
      ctx.restore();
      ctx.translate(7, -radius - 8);
      ctx.rotate(timeSec * 5);
      sparklePath(ctx, 3.6 + Math.sin(timeSec * 29) * 0.8);
      ctx.fillStyle = '#FFC552';
      ctx.fill();
      circlePath(ctx, 0, 0, 1.5);
      ctx.fillStyle = '#FFF9CD';
      ctx.fill();
    }

    _drawBolt(ctx, proj, timeSec) {
      ctx.rotate(Math.atan2(proj.vy, proj.vx));
      this._drawGlow(ctx, 19, 'rgba(249,114,195,0.2)');
      ctx.strokeStyle = 'rgba(246,153,211,0.65)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-11 - i * 2, (i - 1) * 3);
        ctx.lineTo(-7, (i - 1) * 2);
        ctx.stroke();
      }
      polygonPath(ctx, [[-7, -4.5], [1, -5.2], [10, 0], [1, 5.2], [-7, 4.5], [-4, 0]]);
      const body = ctx.createLinearGradient(0, -5, 0, 5);
      body.addColorStop(0, '#F8D9FF');
      body.addColorStop(0.4, '#D18BF0');
      body.addColorStop(0.6, '#9B4DC4');
      body.addColorStop(1, '#632C81');
      ctx.fillStyle = body;
      ctx.fill();
      ctx.strokeStyle = '#4B2D62';
      ctx.lineWidth = 1.25;
      ctx.stroke();
      polygonPath(ctx, [[-3, -3.8], [8, 0], [-3, -0.7]]);
      ctx.fillStyle = '#F5DEFF';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.lineTo(7, 0);
      ctx.strokeStyle = '#F4A5E7';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#466B7B';
      ctx.fillRect(-7, -4.4, 3, 8.8);
      ctx.fillStyle = '#A3E5E9';
      ctx.fillRect(-6.5, -3.5, 1.6, 5.5);
      if (Math.sin(timeSec * 20) > 0.4) {
        circlePath(ctx, 0, -2.2, 1.15);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }
    }

    _drawPlasma(ctx, proj, timeSec) {
      const radius = proj.w * 0.56;
      const pulse = 1 + Math.sin(timeSec * 12 + proj.x * 0.04) * 0.06;
      ctx.scale(pulse, pulse);
      this._drawGlow(ctx, radius * 3, 'rgba(176,104,255,0.34)');
      ctx.save();
      ctx.rotate(timeSec * 3);
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.7, radius * 0.56, -0.45, 0, TAU);
      ctx.strokeStyle = 'rgba(209,173,255,0.7)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      const body = ctx.createRadialGradient(-radius * 0.25, -radius * 0.32, 0, 0, 0, radius);
      body.addColorStop(0, '#FFFFFF');
      body.addColorStop(0.23, '#F7DFFF');
      body.addColorStop(0.55, '#CF94FF');
      body.addColorStop(0.82, '#9245DB');
      body.addColorStop(1, '#562491');
      circlePath(ctx, 0, 0, radius);
      ctx.fillStyle = body;
      ctx.fill();
      ctx.strokeStyle = '#6C399D';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.save();
      ctx.rotate(-timeSec * 4);
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.2, 0.3, 2.2);
      ctx.strokeStyle = '#EDC6FF';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.2, 3.6, 5.3);
      ctx.strokeStyle = '#B5E7FF';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.restore();
      polygonPath(ctx, [[-1, -6], [3, -1.5], [0.6, -0.4], [2, 5], [-3.5, 0.4], [-1, -0.7]]);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }

    /** Soft light, rounded volume and crystal facets share the world palette. */
    renderEffects(ctx, camera, timeSec) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const viewWidth = ctx.canvas.width;
      const viewHeight = ctx.canvas.height;
      const visible = (x, y, margin = 48) =>
        x > -margin && x < viewWidth + margin && y > -margin && y < viewHeight + margin;

      // Trails and smoke sit behind the projectile bodies and the impact flashes.
      for (const pt of this.particles) {
        const sx = pt.x - camera.x;
        if (!visible(sx, pt.y)) continue;
        const ratio = Math.max(0, pt.life / (pt.maxLife || 0.65));
        const size = pt.size * (pt.shape === 'smoke' ? 1.8 - ratio * 0.8 : 0.45 + ratio * 0.55);
        ctx.save();
        ctx.translate(sx, pt.y);
        ctx.globalAlpha = Math.min(1, ratio * 1.5) * (pt.shape === 'smoke' ? 0.22 : 1);
        ctx.fillStyle = pt.color;
        ctx.strokeStyle = pt.color;
        if (pt.shape === 'spark') {
          const length = Math.min(9, Math.hypot(pt.vx, pt.vy) * 0.028);
          const angle = Math.atan2(pt.vy, pt.vx);
          ctx.rotate(angle);
          ctx.lineWidth = Math.max(1, size * 0.7);
          ctx.beginPath();
          ctx.moveTo(-length, 0);
          ctx.lineTo(0, 0);
          ctx.stroke();
          circlePath(ctx, 0, 0, size * 0.42);
          ctx.fillStyle = '#FFF4D9';
          ctx.fill();
        } else if (pt.shape === 'star') {
          ctx.rotate(pt.rotation);
          sparklePath(ctx, size * 1.5);
          ctx.fill();
        } else if (pt.shape === 'shard') {
          ctx.rotate(pt.rotation);
          polygonPath(ctx, [[-size, 0], [0, -size * 1.4], [size * 0.8, 0], [0, size]]);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(-size * 0.5, 0);
          ctx.strokeStyle = 'rgba(255,255,255,0.65)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else {
          circlePath(ctx, 0, 0, size);
          ctx.fill();
        }
        ctx.restore();
      }

      for (const impact of this.impacts) {
        const sx = impact.x - camera.x;
        if (!visible(sx, impact.y, impact.size + 8)) continue;
        const progress = 1 - impact.life / impact.maxLife;
        const ease = 1 - Math.pow(1 - progress, 3);
        ctx.save();
        ctx.translate(sx, impact.y);
        ctx.globalAlpha = (1 - progress) * 0.8;
        circlePath(ctx, 0, 0, impact.size * (0.2 + ease * 0.8));
        ctx.strokeStyle = impact.color;
        ctx.lineWidth = Math.max(0.6, 3 * (1 - progress));
        ctx.stroke();
        if (progress < 0.46) {
          ctx.globalAlpha = (1 - progress / 0.46) * 0.95;
          ctx.rotate(Math.PI / 4);
          sparklePath(ctx, impact.size * (0.5 + progress * 0.4), 0.3);
          ctx.fillStyle = '#FFF6DD';
          ctx.fill();
          ctx.scale(0.55, 0.55);
          ctx.rotate(Math.PI / 4);
          sparklePath(ctx, impact.size * 0.8);
          ctx.fillStyle = impact.color;
          ctx.fill();
        }
        ctx.restore();
      }

      for (const fb of this.fireballs) {
        if (!visible(fb.x - camera.x, fb.y)) continue;
        ctx.save();
        ctx.translate(fb.x + fb.w * 0.5 - camera.x, fb.y + fb.h * 0.5);
        this._drawFireball(ctx, fb, timeSec);
        ctx.restore();
      }

      for (const proj of this.enemyProjectiles) {
        if (!visible(proj.x - camera.x, proj.y)) continue;
        ctx.save();
        ctx.translate(proj.x + proj.w * 0.5 - camera.x, proj.y + proj.h * 0.5);
        if (proj.kind === 'bomb') this._drawBomb(ctx, proj, timeSec);
        else if (proj.kind === 'bolt') this._drawBolt(ctx, proj, timeSec);
        else this._drawPlasma(ctx, proj, timeSec);
        ctx.restore();
      }

      for (const ft of this.floatingTexts) {
        const sx = ft.x - camera.x;
        if (!visible(sx, ft.y, 240)) continue;
        const entrance = Math.min(1, (ft.maxLife - ft.life) / 0.12);
        ctx.save();
        ctx.translate(sx, ft.y);
        ctx.scale(0.88 + entrance * 0.12, 0.88 + entrance * 0.12);
        ctx.globalAlpha = Math.min(1, ft.life / 0.24);
        ctx.font = `800 ${ft.size}px "Nunito", "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = 'rgba(40,29,51,0.8)';
        ctx.strokeText(ft.text, 0, 0);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, 0, 0);
        ctx.restore();
      }

      ctx.restore();
    }

  }

  ns.Physics = new PhysicsWorld();
})(window.NailongAdventure);

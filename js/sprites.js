/**
 * 《奶龙大冒险：鸡腿保卫战》- 柔光玩具材质与高清角色精灵引擎 (sprites.js)
 *
 * 严格依据本地参考图库 (images/奶龙, images/暴暴龙, images/小紫兵, images/小七) 进行 3D-SDF 体积像素建模：
 * 1. 奶龙 (Nailong)：光滑圆润的明黄色包子头（无虚假头角）、翠绿色虹膜大眼、奶油白大肚皮（带跑步物理弹性晃动）、粉色肉垫+3颗棕色小爪子、短小摇摆尾巴。
 * 2. 暴暴龙 (Baobaolong)：锯齿状碎裂奶油蛋壳帽、天蓝/冰蓝色皮肤、眉心两颗深蓝小圆点眉、凶狠冰青色杏眼、背部蓝色小恶魔蝠翼、冰薄荷色肚皮、3颗白爪，以及第30关终极熔岩机甲形态。
 * 3. 小紫兵 (Little Purple Minions)：
 *    - 普通型（双丸头带小紫兵，还原 Unknown copy.jpeg）：粉紫色麻薯脸、左右双团紫色爆炸云朵发髻、青色"bomb"发带、双颗黄绿眼白大黑眼珠、一字粉嘴、牛仔背带裤。
 *    - 装甲/弹簧头盔型（独眼小紫兵，还原 Unknown.jpeg）：粉紫色麻薯脸、中央巨大独眼（黄绿眼白）、米白圆帽+青色"bomb"帽圈+头顶与两侧紫发球+金属弹簧尖刺（不可直接踩踏，需喷火球击败）。
 * 4. 小七 (Xiao Qi，还原小七/images.jpeg)：蓬松黑发+标志性头顶单根弯曲呆毛、栗色眼睛、珊瑚橙T恤（黄领口+胸前黄色小恶魔角印花）、深灰短裤。
 * 5. 核心收集物与道具：焦脆烤鸡腿、黄金超级大鸡腿、变大波波奶茶药水、喷火红辣椒、惊喜问号砖等。
 */

window.NailongAdventure = window.NailongAdventure || {};

(function (ns) {
  'use strict';

  // ============================================================================
  // 1. 3D-SDF 基础数学与正交光线步进渲染器
  // ============================================================================
  function smin(a, b, k) {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  }

  function sdSphere(px, py, pz, cx, cy, cz, r) {
    const dx = px - cx;
    const dy = py - cy;
    const dz = pz - cz;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
  }

  function sdEllipsoid(px, py, pz, cx, cy, cz, rx, ry, rz) {
    const kx = (px - cx) / rx;
    const ky = (py - cy) / ry;
    const kz = (pz - cz) / rz;
    const k0 = Math.sqrt(kx * kx + ky * ky + kz * kz);
    if (k0 < 1e-6) return -Math.min(rx, ry, rz);
    const k1 = Math.sqrt((kx / rx) * (kx / rx) + (ky / ry) * (ky / ry) + (kz / rz) * (kz / rz));
    return (k0 * (k0 - 1.0)) / k1;
  }

  function sdCapsule(px, py, pz, ax, ay, az, bx, by, bz, r) {
    const pax = px - ax, pay = py - ay, paz = pz - az;
    const bax = bx - ax, bay = by - ay, baz = bz - az;
    const denom = bax * bax + bay * bay + baz * baz || 1;
    const h = Math.min(1, Math.max(0, (pax * bax + pay * bay + paz * baz) / denom));
    const dx = pax - bax * h;
    const dy = pay - bay * h;
    const dz = paz - baz * h;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
  }

  function quantizeRamp(shade, ramp) {
    // 连续插值保留饱满色彩，避免低分辨率色阶和抖动噪点。
    const t = Math.max(0, Math.min(1, shade)) * (ramp.length - 1);
    const lo = Math.floor(t);
    const hi = Math.min(ramp.length - 1, lo + 1);
    const f = t - lo;
    return [
      ramp[lo][0] + (ramp[hi][0] - ramp[lo][0]) * f,
      ramp[lo][1] + (ramp[hi][1] - ramp[lo][1]) * f,
      ramp[lo][2] + (ramp[hi][2] - ramp[lo][2]) * f,
    ];
  }

  function addOutlinePass(rgba, w, h, rgb) {
    const copy = new Uint8ClampedArray(rgba);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        if (copy[idx + 3] > 0) continue;
        if (
          copy[((y - 1) * w + x) * 4 + 3] > 0 ||
          copy[((y + 1) * w + x) * 4 + 3] > 0 ||
          copy[(y * w + x - 1) * 4 + 3] > 0 ||
          copy[(y * w + x + 1) * 4 + 3] > 0
        ) {
          rgba[idx] = rgb[0];
          rgba[idx + 1] = rgb[1];
          rgba[idx + 2] = rgb[2];
          rgba[idx + 3] = 150;
        }
      }
    }
  }

  function createOffscreenCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    return { canvas: c, ctx };
  }

  function rgbaToCanvas(w, h, rgba) {
    const { canvas, ctx } = createOffscreenCanvas(w, h);
    const imgData = new ImageData(rgba, w, h);
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  function flipCanvasHorizontal(srcCanvas) {
    const { canvas, ctx } = createOffscreenCanvas(srcCanvas.width, srcCanvas.height);
    ctx.translate(srcCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(srcCanvas, 0, 0);
    return canvas;
  }

  /**
   * 缓存式 3D-SDF 渲染：柔和主光、天空补光、奶油高光与轻轮廓。
   */
  function renderSdfCanvas(w, h, worldHalf, sceneFn, colorFn, outlineRgb = [116, 75, 32]) {
    const rgba = new Uint8ClampedArray(w * h * 4);
    const lx = -0.36, ly = -0.52, lz = 0.77;

    for (let py = 0; py < h; py++) {
      const wy = (((py + 0.5) / h) * 2 - 1) * worldHalf;
      for (let px = 0; px < w; px++) {
        const wx = (((px + 0.5) / w) * 2 - 1) * worldHalf;

        let z = 28;
        let d = sceneFn(wx, wy, z);
        // 像素在 2D 投影外围较远时直接跳过光线步进
        if (d > 26) continue;

        let hit = false;
        for (let step = 0; step < 26; step++) {
          if (d < 0.14) {
            hit = true;
            break;
          }
          z -= Math.max(0.5, d * 0.92);
          if (z < -20) break;
          d = sceneFn(wx, wy, z);
        }
        if (!hit) continue;

        const eps = 0.19;
        const nx = sceneFn(wx + eps, wy, z) - d;
        const ny = sceneFn(wx, wy + eps, z) - d;
        const nz = sceneFn(wx, wy, z + eps) - d;
        const len = Math.hypot(nx, ny, nz) || 1;
        const unx = nx / len;
        const uny = ny / len;
        const unz = nz / len;

        const ndotl = Math.max(0, unx * lx + uny * ly + unz * lz);
        const rim = Math.pow(1 - Math.max(0, unz), 2.3) * 0.1;
        const skyFill = Math.max(0, -uny) * 0.09;
        const shade = Math.min(1, Math.max(0, ndotl * 0.66 + 0.22 + skyFill + rim));
        const halfDot = Math.max(0, unx * -0.195 + uny * -0.282 + unz * 0.94);
        const gloss = Math.pow(halfDot, 25) * 0.17;

        const rgb = colorFn(wx, wy, z, unx, uny, unz, shade, px, py);
        if (!rgb) continue;
        const idx = (py * w + px) * 4;
        rgba[idx] = rgb[0] + (255 - rgb[0]) * gloss;
        rgba[idx + 1] = rgb[1] + (255 - rgb[1]) * gloss;
        rgba[idx + 2] = rgb[2] + (255 - rgb[2]) * gloss;
        rgba[idx + 3] = 255;
      }
    }

    addOutlinePass(rgba, w, h, outlineRgb);
    return rgbaToCanvas(w, h, rgba);
  }

  // ============================================================================
  // 2. 权威色板定义 (严格对齐奶龙 IP 原图色彩)
  // ============================================================================
  const NAILONG_YELLOW_RAMP = [
    [197, 115, 22],
    [230, 155, 23],
    [251, 194, 31],
    [255, 216, 55],
    [255, 237, 116],
  ];

  // 吃到红辣椒后的喷火形态奶龙色板（全身泛红金火焰色）
  const NAILONG_FIRE_RAMP = [
    [172, 42, 18],
    [216, 72, 24],
    [248, 112, 34],
    [255, 156, 56],
    [255, 218, 112],
  ];

  const NAILONG_CREAM_RAMP = [
    [235, 188, 128],
    [246, 212, 162],
    [255, 234, 194],
    [255, 245, 218],
    [255, 252, 238],
  ];

  const CLAW_BROWN_RAMP = [
    [54, 36, 22],
    [78, 52, 32],
    [104, 72, 44],
    [128, 90, 56],
    [152, 110, 72],
  ];

  const PAW_PINK_RAMP = [
    [214, 120, 126],
    [235, 145, 150],
    [248, 168, 172],
    [255, 190, 194],
    [255, 212, 216],
  ];

  // 暴暴龙：真实原图天蓝/冰蓝色 + 狂暴形态深紫能量色板
  const BOMBLOONG_BLUE_RAMP = [
    [28, 96, 142],
    [48, 138, 192],
    [78, 184, 232],
    [108, 208, 248],
    [162, 232, 255],
  ];

  const BOMBLOONG_RAGE_RAMP = [
    [54, 22, 108],
    [82, 38, 152],
    [118, 62, 202],
    [154, 98, 238],
    [204, 158, 255],
  ];

  const EGGSHELL_RAMP = [
    [196, 166, 138],
    [222, 194, 166],
    [242, 220, 196],
    [252, 238, 220],
    [255, 248, 238],
  ];

  const ICE_BELLY_RAMP = [
    [168, 218, 228],
    [198, 236, 244],
    [222, 248, 252],
    [238, 253, 255],
    [250, 255, 255],
  ];

  // 小紫兵色板（还原小紫兵/Unknown.jpeg 与 Unknown copy.jpeg）
  const LILAC_SKIN_RAMP = [
    [164, 104, 156],
    [198, 136, 188],
    [230, 170, 218],
    [246, 196, 234],
    [255, 220, 246],
  ];

  const VIOLET_PUFF_RAMP = [
    [92, 42, 176],
    [124, 66, 214],
    [162, 98, 248],
    [192, 138, 255],
    [224, 186, 255],
  ];

  const TEAL_BAND_RAMP = [
    [24, 98, 128],
    [40, 134, 168],
    [62, 172, 204],
    [94, 202, 228],
    [152, 232, 248],
  ];

  const DENIM_OVERALLS_RAMP = [
    [24, 78, 112],
    [36, 108, 148],
    [52, 138, 182],
    [78, 166, 206],
    [122, 196, 228],
  ];

  // ============================================================================
  // 3. 奶龙 (Nailong) 3D-SDF 多姿态动画帧生成器
  //    支持姿态: 'idle', 'run', 'jump', 'happy', 'attack', 'hurt'
  //    默认朝右（3/4 侧向立体视角，完美契合横版闯关，朝左自动镜像）
  // ============================================================================
  function buildNailongSprite(pose, phase = 0, isFireMode = false, size = 64) {
    const half = 36;
    const isRun = pose === 'run';
    const isJump = pose === 'jump';
    const isHappy = pose === 'happy';
    const isAttack = pose === 'attack';
    const isHurt = pose === 'hurt';

    // 跑步时大肚皮与身体的物理弹性上下律动
    const runAngle = (phase / 4) * Math.PI * 2;
    const bob = isRun
      ? Math.sin(runAngle * 2) * 1.6
      : isJump
      ? -2.0
      : phase % 2 === 1
      ? -1.0
      : 0;

    // 3/4 朝右偏角偏移（让横版奔跑更有方向感，同时清晰展示正前方大肚肚与双眸）
    const lookX = 2.2;
    const headTilt = isHappy ? 0.07 : isRun ? 0.05 : -0.03;
    const bellyJiggle = isRun
      ? Math.cos(runAngle * 2) * 1.4
      : isHappy || isAttack
      ? 1.5
      : phase % 2 === 1
      ? 0.5
      : 0;

    const bodyRamp = isFireMode ? NAILONG_FIRE_RAMP : NAILONG_YELLOW_RAMP;

    const evalParts = (x, y, z) => {
      const dyNeck = y - (-4 + bob);
      const hx = (x - lookX * 0.5) * Math.cos(headTilt) - dyNeck * Math.sin(headTilt);
      const hy = -4 + bob + (x - lookX * 0.5) * Math.sin(headTilt) + dyNeck * Math.cos(headTilt);

      // 1. 标志性光滑圆润梨形/包子大头（严格按原图：无任何头角，脸颊丰满Q弹）
      const dome = sdEllipsoid(hx, hy, z, 0, -18.0 + bob, 1.8, 15.8, 13.2, 14.2);
      const cheekL = sdEllipsoid(hx, hy, z, -6.8, -10.2 + bob, 4.2, 11.6, 9.4, 11.2);
      const cheekR = sdEllipsoid(hx, hy, z, 7.4, -10.2 + bob, 4.4, 11.8, 9.4, 11.2);
      const jaw = sdEllipsoid(hx, hy, z, 0.5, -9.4 + bob, 5.6, 12.6, 8.6, 11.0);
      let dHead = smin(dome, smin(cheekL, cheekR, 5.8), 6.2);
      dHead = smin(dHead, jaw, 4.8);

      // 2. 胖乎乎梨形躯干 + 弹性晃动的奶油白大肚皮
      const chest = sdEllipsoid(x, y, z, 0, 4.5 + bob, 1.5, 13.2, 11.5, 12.0);
      const belly = sdEllipsoid(
        x,
        y,
        z,
        1.2,
        14.8 + bob + bellyJiggle * 0.4,
        5.4 + Math.abs(bellyJiggle) * 0.4,
        16.4 + bellyJiggle * 0.8,
        14.5 - bellyJiggle * 0.4,
        15.8 + bellyJiggle * 0.6
      );
      const dTorso = smin(chest, belly, 6.5);

      // 3. 身后短粗可爱的摇摆恐龙尾巴（位于身体左侧后方）
      const tailWag = isRun ? Math.sin(runAngle) * 2.5 : phase % 2 === 1 ? 1.8 : -0.8;
      const dTail = smin(
        sdCapsule(x, y, z, -11, 20.5 + bob, -3, -23.5, 16.0 + bob + tailWag, -5, 4.8),
        sdSphere(x, y, z, -25.8, 14.5 + bob + tailWag, -5, 2.6),
        2.4
      );

      // 4. 短粗可爱的小手 + 粉色肉垫 + 3颗棕色爪子
      let dArmL, dArmR;
      const pawPads = [];
      const claws = [];

      if (isAttack) {
        // 喷火/张大嘴姿态（还原 123.jpeg 双爪欢呼高举，露出粉肉垫与3颗棕爪！）
        dArmL = sdCapsule(x, y, z, -12.5, 5 + bob, 2, -21.5, -5.5 + bob, 8, 4.8);
        dArmR = sdCapsule(x, y, z, 12.5, 5 + bob, 2, 21.5, -5.5 + bob, 8, 4.8);
        pawPads.push([-21.5, -5.0 + bob, 12.2, 3.1, 2.6], [21.5, -5.0 + bob, 12.2, 3.1, 2.6]);
        for (const [side, cx] of [
          [-1, -21.5],
          [1, 21.5],
        ]) {
          claws.push(
            [cx - 3.0 * side, -9.2 + bob, 10.5, 1.35],
            [cx, -10.2 + bob, 10.8, 1.4],
            [cx + 3.0 * side, -9.0 + bob, 10.5, 1.35]
          );
        }
      } else if (isHappy) {
        // 吃到鸡腿捧脸卖萌（还原 Unknown 2.jpeg）
        const wave = phase % 2 === 1 ? -1.2 : 0.8;
        dArmL = sdCapsule(x, y, z, -12, 6 + bob, 3, -15.5, -2.5 + bob + wave, 11, 4.5);
        dArmR = sdCapsule(x, y, z, 12, 6 + bob, 3, 15.5, -2.5 + bob - wave, 11, 4.5);
        claws.push(
          [-14.5, -6.8 + bob + wave, 12.5, 1.2],
          [-16.8, -6.2 + bob + wave, 12.2, 1.2],
          [14.5, -6.8 + bob - wave, 12.5, 1.2],
          [16.8, -6.2 + bob - wave, 12.2, 1.2]
        );
      } else if (isJump) {
        // 跳跃时小手张开保持平衡
        dArmL = sdCapsule(x, y, z, -13, 3 + bob, 2, -23, -4 + bob, 5, 4.5);
        dArmR = sdCapsule(x, y, z, 13, 3 + bob, 2, 23, -4 + bob, 5, 4.5);
        pawPads.push([-22.5, -4.0 + bob, 9.2, 2.6, 2.2], [22.5, -4.0 + bob, 9.2, 2.6, 2.2]);
      } else if (isRun) {
        // 奔跑时前后摆臂
        const swing = Math.sin(runAngle) * 5.5;
        dArmL = sdCapsule(x, y, z, -12.5, 5.5 + bob, 2, -18.5 + swing * 0.5, 12.5 + bob - swing, 8, 4.5);
        dArmR = sdCapsule(x, y, z, 12.5, 5.5 + bob, 2, 18.5 - swing * 0.5, 12.5 + bob + swing, 8, 4.5);
      } else if (isHurt) {
        // 受击/委屈叉腰（还原 images copy.jpeg）
        dArmL = sdCapsule(x, y, z, -13, 5 + bob, 2, -16.5, 16 + bob, 9, 4.5);
        dArmR = sdCapsule(x, y, z, 13, 5 + bob, 2, 17.5, 17 + bob, 7, 4.5);
      } else {
        // 待机招手（还原 Unknown.jpeg）
        const wv = phase % 2 === 1 ? -1.6 : 0.6;
        dArmL = sdCapsule(x, y, z, -12.5, 5.5 + bob, 2, -19.5, 2.5 + bob + wv, 10, 4.6);
        dArmR = sdCapsule(x, y, z, 12.5, 5.5 + bob, 2, 18.5, 16.5 + bob, 6, 4.4);
        pawPads.push([-19.2, 3.2 + bob + wv, 14.0, 2.6, 2.2]);
        claws.push(
          [-22.2, 0.2 + bob + wv, 12.2, 1.25],
          [-20.2, -1.2 + bob + wv, 12.5, 1.25],
          [-17.8, -0.8 + bob + wv, 12.5, 1.2]
        );
      }

      // 5. 小短腿与脚掌（跳跃蹬起 / 奔跑迈步 / 站立）
      let dLegL, dLegR;
      if (isJump) {
        // 跳跃时小短腿蹬起，露出粉嫩脚底肉垫
        dLegL = sdEllipsoid(x, y, z, -12.5, 25.5 + bob, 9, 6.0, 5.0, 6.2);
        dLegR = sdEllipsoid(x, y, z, 12.5, 25.5 + bob, 9, 6.0, 5.0, 6.2);
        pawPads.push([-12.5, 26.2 + bob, 14.5, 3.2, 2.6], [12.5, 26.2 + bob, 14.5, 3.2, 2.6]);
        for (const lx of [-12.5, 12.5]) {
          claws.push(
            [lx - 3.0, 20.8 + bob, 12.2, 1.3],
            [lx, 20.2 + bob, 12.5, 1.3],
            [lx + 3.0, 20.8 + bob, 12.2, 1.3]
          );
        }
      } else if (isRun) {
        // 4帧跑步迈步循环
        const strideL = Math.sin(runAngle) * 5.2;
        const liftL = Math.max(0, -Math.cos(runAngle)) * 3.8;
        const strideR = -strideL;
        const liftR = Math.max(0, Math.cos(runAngle)) * 3.8;

        dLegL = smin(
          sdCapsule(x, y, z, -8.0, 22 + bob, 2, -8.5 + strideL, 29.5 - liftL, 4, 5.4),
          sdEllipsoid(x, y, z, -8.5 + strideL, 31.0 - liftL, 6.0, 5.8, 3.0, 6.2),
          2.2
        );
        dLegR = smin(
          sdCapsule(x, y, z, 8.0, 22 + bob, 2, 8.5 + strideR, 29.5 - liftR, 4, 5.4),
          sdEllipsoid(x, y, z, 8.5 + strideR, 31.0 - liftR, 6.0, 5.8, 3.0, 6.2),
          2.2
        );
        for (const [lx, ly] of [
          [-8.5 + strideL, 32.0 - liftL],
          [8.5 + strideR, 32.0 - liftR],
        ]) {
          claws.push([lx - 3.2, ly, 11.4, 1.3], [lx, ly + 0.2, 11.8, 1.35], [lx + 3.2, ly, 11.4, 1.3]);
        }
      } else {
        dLegL = smin(
          sdCapsule(x, y, z, -8.5, 22 + bob, 2, -9.2, 29.5, 3, 5.6),
          sdEllipsoid(x, y, z, -9.5, 31.2, 5.2, 6.0, 3.2, 6.5),
          2.5
        );
        dLegR = smin(
          sdCapsule(x, y, z, 8.5, 22 + bob, 2, 9.2, 29.5, 3, 5.6),
          sdEllipsoid(x, y, z, 9.5, 31.2, 5.2, 6.0, 3.2, 6.5),
          2.5
        );
        for (const lx of [-9.5, 9.5]) {
          claws.push([lx - 3.4, 32.2, 11.2, 1.35], [lx, 32.4, 11.6, 1.4], [lx + 3.4, 32.2, 11.2, 1.35]);
        }
      }

      let dBody = smin(dTorso, dTail, 3.0);
      dBody = smin(dBody, smin(dArmL, dArmR, 2.0), 3.2);
      dBody = smin(dBody, smin(dLegL, dLegR, 2.0), 3.2);
      const dSkin = smin(dHead, dBody, 1.6);

      let dClawMin = 999;
      for (const [cx, cy, cz, cr] of claws) {
        dClawMin = Math.min(dClawMin, sdSphere(x, y, z, cx, cy, cz, cr));
      }

      let dPadMin = 999;
      for (const [px0, py0, pz0, prx, pry] of pawPads) {
        dPadMin = Math.min(dPadMin, sdEllipsoid(x, y, z, px0, py0, pz0, prx, pry, 1.8));
      }

      const dTotal = Math.min(dSkin, dClawMin, dPadMin);
      return { dTotal, dHead, dBody, dSkin, dClawMin, dPadMin, hx, hy };
    };

    return renderSdfCanvas(
      size,
      size,
      half,
      (x, y, z) => evalParts(x, y, z).dTotal,
      (wx, wy, wz, _nx, _ny, _nz, shade) => {
        const p = evalParts(wx, wy, wz);
        if (p.dClawMin <= p.dSkin + 0.15 && p.dClawMin < 0.38) {
          return quantizeRamp(shade, CLAW_BROWN_RAMP);
        }
        if (p.dPadMin < 0.45) {
          return quantizeRamp(Math.max(0.55, shade), PAW_PINK_RAMP);
        }

        const hx = p.hx - lookX * 0.4;
        const hy = p.hy - bob;

        // 头部五官细节
        if (p.dHead < p.dBody + 0.8 && wz > 4) {
          for (const side of [-1, 1]) {
            const ex = (hx - side * 6.5) / 4.1;
            const ey = (hy - -15.6) / 4.3;
            const r2 = ex * ex + ey * ey;

            if (isHappy) {
              // 吃到鸡腿开心眯眼 ^ ^
              const arcY = -15.2 + Math.pow(hx - side * 6.5, 2) * 0.14;
              if (Math.abs(hx - side * 6.5) < 3.8 && Math.abs(hy - arcY) < 1.1) {
                return [43, 28, 20];
              }
            } else if (r2 <= 1.0) {
              if (isHurt && ey < -0.16) {
                return quantizeRamp(shade * 0.92, bodyRamp);
              }
              if (isHurt && Math.abs(ey - -0.14) < 0.16) {
                return [56, 36, 22];
              }
              // 翠绿色虹膜 + 黑色瞳孔 + 双白高光点（严格还原奶龙原图！）
              const ix = ex - 0.1; // 眼神朝右前方看
              const iy = ey - 0.04;
              const ir = Math.hypot(ix, iy);
              if (Math.hypot(ix + 0.24, iy + 0.28) < 0.23) return [255, 255, 255];
              if (Math.hypot(ix - 0.22, iy - 0.26) < 0.13) return [220, 255, 228];
              if (ir < 0.48) return [20, 16, 15];
              if (ir < 0.79) {
                return iy > 0.15 ? [72, 212, 102] : [32, 146, 62];
              }
              if (r2 > 0.86) return [120, 78, 32];
              return [255, 255, 255];
            }
          }

          // 脸颊红晕
          if (
            !isHurt &&
            (Math.hypot((hx + 10.8) / 2.8, (hy - -10.8) / 1.9) < 1 ||
              Math.hypot((hx - 10.8) / 2.8, (hy - -10.8) / 1.9) < 1)
          ) {
            return shade > 0.5 ? [255, 162, 142] : [242, 136, 118];
          }

          // 嘴巴造型
          if (isAttack) {
            // 张大嘴喷火/馋嘴（还原 123.jpeg）
            const mx = hx / 9.0;
            const my = (hy - -6.2) / 5.2;
            if (mx * mx + my * my <= 1.0 && hy > -10.8) {
              if (hy < -9.2 && Math.abs(hx) < 7.6) return [255, 253, 248];
              if (hy > -2.0 && Math.abs(hx) < 6.6) return [248, 245, 240];
              const ty = hy - -4.2;
              if (Math.hypot(hx / 5.6, ty / 2.9) <= 1.0) {
                return ty < -0.5 ? [232, 86, 112] : [252, 128, 150];
              }
              return [102, 20, 36];
            }
          } else if (isHurt) {
            const poutY = -9.2 + hx * hx * 0.085;
            if (Math.abs(hx) < 3.4 && Math.abs(hy - poutY) < 0.8) {
              return [128, 62, 18];
            }
          } else {
            // 呆萌开心笑容（还原 Unknown.jpeg）
            const mx = hx / 6.2;
            const my = (hy - -8.0) / 3.2;
            if (hy >= -9.8 && mx * mx + my * my <= 1.0) {
              if (hy < -8.5) return [255, 255, 255];
              if (hy > -6.4 && Math.abs(hx) < 4.2) return [245, 118, 140];
              return [96, 20, 36];
            }
          }
        }

        // 标志性圆滚滚奶油白色大肚皮 (#FFF8DC)
        const bx = (wx - 1.2) / (11.6 + Math.abs(bellyJiggle) * 0.4);
        const by = (wy - (15.2 + bob + bellyJiggle * 0.3)) / (11.8 - bellyJiggle * 0.2);
        const bDist = bx * bx + by * by;
        if (wz > 4 && p.dBody < p.dHead && bDist <= 1.0) {
          if (bDist > 0.84) {
            return quantizeRamp(shade, [
              [228, 158, 68],
              [244, 188, 104],
              [252, 214, 142],
              [255, 232, 174],
              [255, 244, 202],
            ]);
          }
          return quantizeRamp(shade, NAILONG_CREAM_RAMP);
        }

        let finalShade = shade;
        if (p.dBody < p.dHead && p.dHead < 2.6 && wy < 2) {
          finalShade *= 0.72;
        }
        return quantizeRamp(finalShade, bodyRamp);
      }
    );
  }

  // ============================================================================
  // 4. 暴暴龙 (Baobaolong) 3D-SDF 多姿态模型
  //    严格还原 images/暴暴龙：碎蛋壳帽 + 天蓝皮肤 + 眉心双圆点 + 凶狠冰青眼 + 背部小蝠翼 + 冰薄荷肚皮
  //    支持普通/小Boss形态 与 狂暴紫焰形态 (isRage)
  // ============================================================================
  function buildBaobaolongSprite(pose = 'patrol', phase = 0, isRage = false, size = 68) {
    const half = 34;
    const isAttack = pose === 'attack';
    const isHurt = pose === 'hurt';
    const hover = phase % 2 === 1 ? -1.4 : 0;
    const wingFlap = phase % 2 === 1 ? -2.2 : 1.2;
    const stride = pose === 'patrol' ? (phase % 2 === 0 ? 2.5 : -2.5) : 0;
    const skinRamp = isRage ? BOMBLOONG_RAGE_RAMP : BOMBLOONG_BLUE_RAMP;

    // 5折锯齿碎裂奶油蛋壳帽边缘（还原 images copy 3.jpeg）
    const shellEdgeY = (x) => {
      const zig = Math.abs((((x + 16.5) / 6.2) % 2) - 1) * 4.4;
      return -15.6 + hover + x * x * 0.012 + zig;
    };

    const evalParts = (x, y, z) => {
      const headTop = sdEllipsoid(x, y, z, 0, -13.8 + hover, 2, 15.2, 14.2, 14.0);
      const cheeks = sdEllipsoid(x, y, z, 0, -6.2 + hover, 4.2, 16.8, 9.8, 14.2);
      const body = sdEllipsoid(x, y, z, 0, 9.8 + hover, 3.5, 17.2, 15.5, 15.5);
      const dCore = smin(smin(headTop, cheeks, 5.2), body, 5.8);

      const armRaise = isAttack ? -6.5 : 0;
      const dArmL = sdCapsule(x, y, z, -15.0, 4.5 + hover, 2, -21.8, 14.2 + hover + armRaise, 6, 5.0);
      const dArmR = sdCapsule(x, y, z, 15.0, 4.5 + hover, 2, 21.8, 14.2 + hover - armRaise * 0.5, 6, 5.0);
      const dLegL = sdCapsule(x, y, z, -8.5, 20 + hover, 2, -9.0 + stride, 27.5 + hover, 3, 5.5);
      const dLegR = sdCapsule(x, y, z, 8.5, 20 + hover, 2, 9.0 - stride, 27.5 + hover, 3, 5.5);

      // 背部扇形恶魔小蝠翼（还原 images copy 3.jpeg & copy 2.jpeg）
      let dWing = 999;
      for (const side of [-1, 1]) {
        const wxRel = Math.abs(x) - 13.0;
        if (wxRel > -3) {
          const archY = -1.5 + hover + wingFlap * (wxRel / 13) + wxRel * 0.25;
          const wThick = Math.max(1.2, 5.5 - wxRel * 0.28);
          const scallop = Math.abs(((wxRel / 5.2) % 2) - 1) * 2.2;
          if (Math.abs(x) < 28.5 && y > archY - 3.5 && y < archY + wThick - scallop * 0.6) {
            dWing = Math.min(dWing, sdEllipsoid(x, y, z, side * 19.5, 2.5 + hover + wingFlap * 0.5, -5, 9.5, 6.2, 2.2));
          }
        }
      }

      // 脚趾 3 颗奶油白利爪
      let dClaws = 999;
      for (const [lx, sOff] of [
        [-9.0, stride],
        [9.0, -stride],
      ]) {
        for (const dx of [-3.0, 0, 3.0]) {
          dClaws = Math.min(dClaws, sdSphere(x, y, z, lx + sOff + dx, 29.8 + hover, 8.2, 1.3));
        }
      }

      const dBlue = smin(dCore, smin(smin(dArmL, dArmR, 2), smin(dLegL, dLegR, 2), 2), 3.0);
      const dTotal = Math.min(dBlue, dWing, dClaws);
      return { dTotal, dBlue, dWing, dClaws };
    };

    return renderSdfCanvas(
      size,
      size,
      half,
      (x, y, z) => evalParts(x, y, z).dTotal,
      (wx, wy, wz, _nx, _ny, _nz, shade) => {
        const p = evalParts(wx, wy, wz);
        if (p.dClaws < 0.35) return quantizeRamp(Math.max(0.5, shade), EGGSHELL_RAMP);
        if (p.dWing < p.dBlue - 0.15) {
          return quantizeRamp(shade * 0.8, skinRamp);
        }
        // 头顶碎裂奶油蛋壳帽
        if (wy < shellEdgeY(wx) && p.dBlue < 0.5) {
          return quantizeRamp(shade, EGGSHELL_RAMP);
        }

        const hy = wy - hover;
        let finalShade = shade;
        const distBelowShell = wy - shellEdgeY(wx);
        if (distBelowShell >= 0 && distBelowShell < 1.5 && wz > 4) {
          finalShade *= 0.58;
        }

        if (wz > 5) {
          // 暴暴龙标志性眉心两颗深色小点眉（还原 images.jpeg）
          if (
            Math.hypot((wx + 2.8) / 0.95, (hy - -9.8) / 1.35) < 1 ||
            Math.hypot((wx - 2.8) / 0.95, (hy - -9.8) / 1.35) < 1
          ) {
            return [22, 52, 92];
          }

          // 凶狠杏眼 + 冰青色虹膜
          for (const side of [-1, 1]) {
            const ex = (wx - side * 6.8) / 4.3;
            const ey = (hy - -7.0) / 3.2;
            const browCut = hy < -9.6 + (1 - Math.abs(wx) / 11) * (isAttack ? 2.2 : 1.0);
            if (!browCut && ex * ex + ey * ey <= 1.0) {
              if (isHurt) {
                const dx = Math.abs(Math.abs(wx - side * 6.8) - Math.abs(hy - -7.0));
                return dx < 0.95 ? [20, 48, 82] : [235, 250, 255];
              }
              const ir = Math.hypot(ex + side * 0.12, ey);
              if (Math.hypot(ex + 0.22, ey + 0.25) < 0.24) return [255, 255, 255];
              if (ir < 0.44) return [16, 26, 38];
              if (ir < 0.78) return isRage ? [255, 92, 220] : ey > 0 ? [112, 232, 255] : [32, 152, 214];
              return [255, 255, 255];
            }
          }

          // 嘴巴（坏笑尖牙 vs 咆哮满口尖牙 images copy.jpeg）
          if (isAttack || isHurt) {
            const mx = wx / 5.4;
            const my = (hy - -1.2) / 4.0;
            if (mx * mx + my * my <= 1.0) {
              const toothWave = Math.abs((((wx + 6) * 1.4) % 2) - 1);
              if (hy < -3.6 + toothWave * 1.1) return [255, 255, 255];
              if (hy > 1.4 - toothWave * 0.9) return [255, 255, 255];
              return hy > -0.2 ? [178, 46, 68] : [68, 16, 28];
            }
          } else {
            const smileY = -2.4 - wx * wx * 0.035 + wx * -0.05;
            if (Math.abs(wx) < 4.5 && Math.abs(hy - smileY) < 0.75) {
              return [26, 74, 114];
            }
            if (wx > 2.0 && wx < 3.8 && hy > smileY && hy < smileY + 1.9) {
              return [255, 255, 255];
            }
          }
        }

        // 冰薄荷色圆肚皮（还原 images copy 3.jpeg）
        const bx = wx / 10.8;
        const by = (hy - 11.2) / 10.2;
        if (wz > 5 && hy > 1.5 && bx * bx + by * by <= 1.0) {
          return quantizeRamp(finalShade, ICE_BELLY_RAMP);
        }

        return quantizeRamp(finalShade, skinRamp);
      },
      [22, 42, 72]
    );
  }

  // ============================================================================
  // 5. 小紫兵 (Little Purple Minions) 3D-SDF 模型
  //    完整收录两款官方原图造型：
  //    - variant='twin' (双丸头带小紫兵，还原 Unknown copy.jpeg)：可踩扁消灭
  //    - variant='cyclops' (独眼铁帽弹簧小紫兵，还原 Unknown.jpeg)：头顶带弹簧尖刺，需喷火球击败
  // ============================================================================
  function buildMinionSprite(variant = 'twin', phase = 0, isSquashed = false, size = 48) {
    const half = 24;
    const isCyclops = variant === 'cyclops';
    const bob = isSquashed ? 6.0 : phase % 2 === 1 ? -1.0 : 0;
    const stride = isSquashed ? 0 : phase % 2 === 0 ? 2.4 : -2.4;

    const evalMinion = (x, y0, z) => {
      // 如果被踩扁，垂直方向压缩，水平方向压宽；独眼铁帽型整体微下移留出顶部弹簧尖刺空间
      const yShift = isCyclops && !isSquashed ? 2.5 : 0;
      const y = isSquashed ? (y0 - 10) * 1.85 + 2 : y0 - bob - yShift;
      const sx = isSquashed ? x * 0.78 : x;

      // 紫色蓬松云朵发球
      let dPuffs = 999;
      for (const side of [-1, 1]) {
        const p1 = sdSphere(sx, y, z, side * 12.4, -8.5, 0.5, 4.2);
        const p2 = sdSphere(sx, y, z, side * 14.5, -4.8, 0.8, 4.0);
        const p3 = sdSphere(sx, y, z, side * 13.0, -1.2, 0.8, 3.6);
        dPuffs = Math.min(dPuffs, smin(smin(p1, p2, 1.6), p3, 1.6));
      }
      if (isCyclops) {
        // 独眼小紫兵头顶还有一团紫色云朵发球（还原 Unknown.jpeg）
        const topPuff = smin(
          sdSphere(sx, y, z, -2.8, -14.8, 0.8, 3.4),
          smin(sdSphere(sx, y, z, 0, -15.4, 1.0, 3.6), sdSphere(sx, y, z, 2.8, -14.8, 0.8, 3.4), 1.4),
          1.4
        );
        dPuffs = Math.min(dPuffs, topPuff);
      }

      // 头部与发带/圆帽 + 粉紫麻薯方圆脸
      const dCrown = sdEllipsoid(sx, y, z, 0, -7.2, 1.5, 10.6, 6.2, 10.2);
      const dBand = sdEllipsoid(sx, y, z, 0, -4.6, 2.8, 12.2, 3.8, 11.6);
      const dFace = sdEllipsoid(sx, y, z, 0, 2.0, 2.5, 11.8, 8.2, 11.2);
      const dHead = smin(dCrown, smin(dBand, dFace, 2.2), 2.0);

      // 牛仔背带裤圆滚滚身体 + 短小快跑腿 + 小手
      const dTorso = sdEllipsoid(sx, y, z, 0, 11.8, 2.0, 9.6, 6.5, 8.8);
      const dArmL = sdCapsule(sx, y, z, -8.5, 9.0, 2, -14.5, 14.5 - stride * 0.4, 4, 2.2);
      const dArmR = sdCapsule(sx, y, z, 8.5, 9.0, 2, 14.5, 14.5 + stride * 0.4, 4, 2.2);
      const dLegL = sdCapsule(sx, y, z, -4.2, 16.5, 2, -4.5 + stride, 20.2, 3, 2.8);
      const dLegR = sdCapsule(sx, y, z, 4.2, 16.5, 2, 4.5 - stride, 20.2, 3, 2.8);

      // 独眼铁帽变种：头顶带有醒目的银色弹簧圈+鲜红警示尖刺（提示玩家不可直接踩踏）
      let dSpike = 999;
      if (isCyclops && !isSquashed) {
        const coneR = Math.max(0.4, (y - -24.5) * 0.56);
        const inCone = Math.max(Math.hypot(sx, z - 2.5) - coneR, Math.abs(y - -20.5) - 4.0);
        const ring = sdEllipsoid(sx, y, z, 0, -17.0, 2.5, 4.6, 1.6, 4.6);
        dSpike = Math.min(inCone, ring);
      }

      const dBody = smin(dHead, smin(dTorso, smin(smin(dArmL, dArmR, 1.5), smin(dLegL, dLegR, 1.5), 1.5), 2.0), 1.8);
      const dTotal = Math.min(dPuffs, dBody, dSpike);
      return { dTotal, dPuffs, dSpike, sx, y };
    };

    return renderSdfCanvas(
      size,
      size,
      half,
      (x, y, z) => evalMinion(x, y, z).dTotal,
      (wx, wy, wz, _nx, _ny, _nz, shade) => {
        const p = evalMinion(wx, wy, wz);
        const sx = p.sx;
        const y = p.y;

        // 顶部弹簧金属尖刺（仅独眼装甲小紫兵）
        if (isCyclops && p.dSpike <= p.dTotal + 0.25 && y < -14.5) {
          if (y < -17.2) {
            return shade > 0.55 ? [255, 92, 92] : [214, 32, 42];
          }
          return shade > 0.5 ? [238, 244, 252] : [132, 148, 168];
        }

        // 紫色云朵发髻
        if (p.dPuffs < p.dTotal + 0.25 && (Math.abs(sx) > 9.8 || y < -13.2) && y < 2.0) {
          return quantizeRamp(shade, VIOLET_PUFF_RAMP);
        }

        const bandTopY = -7.6 + sx * sx * 0.014;
        const bandBotY = -2.4 + sx * sx * 0.01;

        // 头顶区域：双丸型露出紫色中分头发，独眼型戴米白圆顶帽（还原 Unknown.jpeg）
        if (y < bandTopY) {
          if (isCyclops) {
            return quantizeRamp(shade, EGGSHELL_RAMP);
          }
          if (Math.abs(sx) < 0.55) return [82, 38, 156];
          return quantizeRamp(shade, VIOLET_PUFF_RAMP);
        }

        // 青蓝色 "bomb" 运动发带
        if (y >= bandTopY && y <= bandBotY && Math.abs(sx) < 12.6) {
          if (wz > 5 && Math.abs(sx - (isCyclops ? 4.5 : -5.0)) < 2.8 && Math.abs(y - -5.0) < 0.8) {
            if (Math.floor((sx + 10) * 1.2) % 2 === 0) return [245, 250, 232];
          }
          return quantizeRamp(shade, TEAL_BAND_RAMP);
        }

        // 牛仔背带裤 + 银色纽扣
        if (y >= 8.5) {
          if (isCyclops) {
            // 还原 Unknown.jpeg：右侧单肩背带 + 左胸折角翻领！
            const rightStrap = sx >= 3.2 && sx <= 6.2 && y >= 8.2;
            const foldedBib = sx >= -5.5 && sx <= 6.2 && y >= 11.2 - (sx + 5.5) * 0.22;
            if (rightStrap || foldedBib) {
              if (wz > 4 && Math.hypot(sx - 4.6, y - 10.6) < 1.3) return [238, 242, 248];
              if (wz > 4 && sx < 2.5 && y < 13.2 - sx * 0.3) return [212, 226, 236]; // 浅色翻领内衬
              return quantizeRamp(shade, DENIM_OVERALLS_RAMP);
            }
          } else {
            // 还原 Unknown copy.jpeg：对称双肩牛仔背带裤 + 双银扣
            const onStrapL = sx >= -6.4 && sx <= -3.6 && y >= 8.2;
            const onStrapR = sx >= 3.6 && sx <= 6.4 && y >= 8.2;
            const onBib = Math.abs(sx) <= 6.4 && y >= 10.2;
            if (onStrapL || onStrapR || onBib || y >= 14.2) {
              if (
                wz > 4 &&
                (Math.hypot(sx + 4.8, y - 10.6) < 1.3 || Math.hypot(sx - 4.8, y - 10.6) < 1.3)
              ) {
                return [238, 242, 248];
              }
              return quantizeRamp(shade, DENIM_OVERALLS_RAMP);
            }
          }
          return quantizeRamp(shade * 0.92, LILAC_SKIN_RAMP);
        }

        // 脸部大眼（黄绿眼白 + 大黑眼珠）与一字粉嘴
        if (wz > 4) {
          if (isCyclops) {
            // 独眼小紫兵：中央单颗大横椭圆眼（还原 Unknown.jpeg）
            const ex = sx / 5.4;
            const ey = (y - 1.4) / 3.6;
            const r2 = ex * ex + ey * ey;
            if (r2 <= 1.0) {
              if (r2 > 0.84) return [96, 56, 108];
              const pr = Math.hypot(sx / 2.6, (y - 1.4) / 2.6);
              if (Math.hypot(sx - 0.9, y - 1.4 + 0.9) < 0.85) return [255, 255, 255];
              if (pr <= 1.0) return [20, 16, 26];
              return y < 1.4 ? [204, 202, 74] : [234, 232, 98];
            }
          } else {
            // 双丸小紫兵：左右两颗圆大眼（还原 Unknown copy.jpeg）
            for (const side of [-1, 1]) {
              const cx = side * 4.8;
              const cy = 1.6;
              const ex = (sx - cx) / 3.5;
              const ey = (y - cy) / 3.5;
              const r2 = ex * ex + ey * ey;
              if (r2 <= 1.0) {
                if (r2 > 0.82) return [96, 56, 108];
                const pr = Math.hypot((sx - cx) / 2.2, (y - cy) / 2.2);
                if (Math.hypot(sx - cx + 0.8, y - cy + 0.8) < 0.85) return [255, 255, 255];
                if (pr <= 1.0) return [20, 16, 26];
                return y < cy ? [204, 202, 74] : [234, 232, 98];
              }
            }
          }

          // 标志性水平一字粉红小嘴
          if (Math.abs(sx) < 3.6 && Math.abs(y - 6.4) < 0.65) {
            return [188, 62, 88];
          }
        }

        return quantizeRamp(shade, LILAC_SKIN_RAMP);
      },
      [46, 24, 68]
    );
  }

  // ============================================================================
  // 6. 天才少年小七 (Xiao Qi) 3D-SDF 模型（关底旗帜伙伴 & 角色图鉴）
  //    严格还原 images/小七/images.jpeg：黑发单根呆毛 + 珊瑚橙T恤（黄领口与小恶魔角印花）+ 灰短裤
  // ============================================================================
  function buildXiaoQiSprite(cheering = false, phase = 0, size = 64) {
    const half = 32;
    const bob = phase % 2 === 1 ? -0.9 : 0;

    const HAIR_BLACK_RAMP = [
      [18, 16, 18],
      [32, 28, 32],
      [48, 43, 47],
      [68, 62, 68],
      [92, 84, 92],
    ];
    const SKIN_PEACH_RAMP = [
      [212, 152, 122],
      [232, 178, 148],
      [248, 202, 174],
      [255, 220, 196],
      [255, 234, 216],
    ];
    const TEE_CORAL_RAMP = [
      [184, 68, 36],
      [216, 88, 48],
      [244, 114, 68],
      [255, 138, 88],
      [255, 166, 122],
    ];
    const SHORTS_GREY_RAMP = [
      [36, 38, 42],
      [52, 55, 60],
      [70, 74, 80],
      [90, 95, 102],
      [112, 118, 126],
    ];

    const evalParts = (x, y, z) => {
      const dFace = sdEllipsoid(x, y, z, 0, -10.5 + bob, 3.5, 10.6, 10.2, 10.0);
      const dHairCap = sdEllipsoid(x, y, z, 0, -14.8 + bob, 2.5, 12.2, 9.8, 11.2);
      const dTempleL = sdCapsule(x, y, z, -9.8, -16 + bob, 3, -10.4, -10.5 + bob, 4, 2.1);
      const dTempleR = sdCapsule(x, y, z, 9.8, -16 + bob, 3, 10.4, -10.5 + bob, 4, 2.1);
      // 标志性头顶单根弯曲呆毛
      const dAhoge = smin(
        sdCapsule(x, y, z, 0, -23 + bob, 2, 2.2, -28.5 + bob, 2, 1.5),
        sdCapsule(x, y, z, 2.2, -28.5 + bob, 2, -0.5, -30.5 + bob, 2, 1.0),
        1.2
      );
      const dHair = smin(smin(dHairCap, smin(dTempleL, dTempleR, 1.5), 2.2), dAhoge, 1.8);

      const dShirt = sdCapsule(x, y, z, 0, 2 + bob, 2, 0, 12.5 + bob, 2, 8.6);
      const dSleeveL = sdCapsule(x, y, z, -7, 2.5 + bob, 2, -11.2, 7.5 + bob, 3.5, 3.2);
      const dSleeveR = sdCapsule(x, y, z, 7, 2.5 + bob, 2, 11.2, 7.5 + bob, 3.5, 3.2);
      const dTee = smin(dShirt, smin(dSleeveL, dSleeveR, 1.5), 2.2);

      const dArmL = !cheering
        ? sdCapsule(x, y, z, -10.5, 8 + bob, 4, 3.5, 9 + bob, 9, 2.2)
        : sdCapsule(x, y, z, -10.5, 7 + bob, 4, -15.5, 0 + bob, 7, 2.3);
      const dArmR = !cheering
        ? sdCapsule(x, y, z, 10.5, 8 + bob, 4, 2.2, -1.8 + bob, 11, 2.2)
        : sdCapsule(x, y, z, 10.5, 7 + bob, 4, 15.5, -2 + bob, 7, 2.3);

      const dWaist = sdEllipsoid(x, y, z, 0, 15.8 + bob, 2, 8.4, 4.2, 7.2);
      const dShortL = sdCapsule(x, y, z, -4.0, 16 + bob, 2, -4.8, 22.5, 2, 4.1);
      const dShortR = sdCapsule(x, y, z, 4.0, 16 + bob, 2, 4.8, 22.5, 2, 4.1);
      const dShorts = smin(dWaist, smin(dShortL, dShortR, 1.8), 2.0);

      const dLegL = sdCapsule(x, y, z, -4.8, 22.5, 2, -5.2, 28.8, 2.5, 2.1);
      const dLegR = sdCapsule(x, y, z, 4.8, 22.5, 2, 5.2, 28.8, 2.5, 2.1);

      const dSkin = Math.min(dFace, dArmL, dArmR, dLegL, dLegR);
      const dTotal = Math.min(dHair, dSkin, dTee, dShorts);
      return { dTotal, dHair, dFace, dSkin, dTee, dShorts };
    };

    return renderSdfCanvas(
      size,
      size,
      half,
      (x, y, z) => evalParts(x, y, z).dTotal,
      (wx, wy, wz, _nx, _ny, _nz, shade) => {
        const p = evalParts(wx, wy, wz);
        const hy = wy - bob;
        const bangLine = -14.2 + Math.sin(wx * 0.85) * 1.4 - Math.abs(wx) * 0.08;
        if (p.dHair <= p.dTotal + 0.15 && (hy < bangLine || Math.abs(wx) > 9.2)) {
          return quantizeRamp(shade, HAIR_BLACK_RAMP);
        }
        if (p.dTee <= p.dTotal + 0.15) {
          if (hy >= 15.6) return quantizeRamp(shade, SHORTS_GREY_RAMP);
          if (hy < 0.8 && Math.abs(wx) < 5.2) return quantizeRamp(shade, NAILONG_YELLOW_RAMP);
          if (Math.abs(wx) > 9.4 && hy > 5.8 && hy < 8.4) return quantizeRamp(shade, NAILONG_YELLOW_RAMP);
          const gx = Math.abs(wx);
          const gy = hy - 6.8;
          if (wz > 6 && ((gx < 3.2 && Math.abs(gy) < 2.2) || (gx > 1.8 && gx < 3.6 && gy > -3.5 && gy < -1.5))) {
            return quantizeRamp(shade, NAILONG_YELLOW_RAMP);
          }
          return quantizeRamp(shade, TEE_CORAL_RAMP);
        }
        if (p.dShorts <= p.dTotal + 0.15 && hy >= 14.5 && hy <= 24.5) {
          return quantizeRamp(shade, SHORTS_GREY_RAMP);
        }
        if (p.dFace <= p.dSkin + 0.2 && hy < 0 && wz > 6) {
          for (const side of [-1, 1]) {
            if (Math.abs(wx - side * 4.5) < 2.4 && Math.abs(hy - -12.6) < 0.55) {
              return [36, 30, 30];
            }
            const ex = (wx - side * 4.5) / 2.5;
            const ey = (hy - -9.8) / 2.5;
            if (ex * ex + ey * ey <= 1.0) {
              const ir = Math.hypot(ex, ey);
              if (Math.hypot(ex + 0.25, ey + 0.25) < 0.26) return [255, 255, 255];
              if (ir < 0.45) return [28, 18, 14];
              if (ir < 0.78) return [112, 62, 34];
              return [255, 255, 255];
            }
          }
          if (Math.abs(wx) < 2.0 && Math.abs(hy - -4.5) < 0.6) {
            return [196, 88, 78];
          }
        }
        return quantizeRamp(shade, SKIN_PEACH_RAMP);
      },
      [32, 24, 22]
    );
  }

  // ============================================================================
  // 7. 核心收集物与道具 3D-SDF 像素模型 (大鸡腿、黄金鸡腿、红辣椒、变大奶茶药水)
  // ============================================================================
  // 道具在设计坐标 80 × 80 上绘制，缓存为高分辨率图像；游戏碰撞和尺寸保持原样。
  function paintToyIcon(size, painter) {
    const { canvas, ctx } = createOffscreenCanvas(size, size);
    ctx.scale(size / 80, size / 80);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    painter(ctx);
    return canvas;
  }

  function toyGradient(ctx, x0, y0, x1, y1, stops) {
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
    return gradient;
  }

  function buildDrumstickSprite(isGolden = false, size = 96) {
    return paintToyIcon(size, (ctx) => {
      ctx.save();
      ctx.translate(40, 40);
      ctx.rotate(-0.67);
      // 奶油色双骨节与完整骨柄。
      ctx.beginPath();
      ctx.moveTo(-5, 5);
      ctx.lineTo(-5, 24);
      ctx.bezierCurveTo(-17, 24, -16, 38, -7, 36);
      ctx.quadraticCurveTo(0, 33, 6, 36);
      ctx.bezierCurveTo(16, 38, 17, 24, 5, 24);
      ctx.lineTo(5, 5);
      ctx.closePath();
      ctx.fillStyle = toyGradient(ctx, -8, 12, 12, 33, [[0, '#ffffff'], [.48, '#fff7de'], [1, '#d6bd91']]);
      ctx.strokeStyle = '#a77a43';
      ctx.lineWidth = 1.8;
      ctx.fill(); ctx.stroke();
      // 梨形烤肉，浅色上缘与深色焦糖底部。
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.bezierCurveTo(-18, -32, -25, -18, -21, -5);
      ctx.bezierCurveTo(-18, 6, -9, 15, 0, 17);
      ctx.bezierCurveTo(10, 15, 19, 5, 22, -6);
      ctx.bezierCurveTo(26, -21, 17, -32, 0, -32);
      ctx.closePath();
      ctx.fillStyle = toyGradient(ctx, -14, -26, 17, 15, isGolden
        ? [[0, '#fff7b7'], [.28, '#ffe46a'], [.63, '#f3ad27'], [1, '#c17711']]
        : [[0, '#ffd589'], [.28, '#f9a84b'], [.62, '#d37328'], [1, '#9d4b1f']]);
      ctx.strokeStyle = isGolden ? '#b37b22' : '#934b24';
      ctx.lineWidth = 2;
      ctx.fill(); ctx.stroke();
      // 细腻、弯曲的烤纹，避免黑色像素斑点。
      ctx.strokeStyle = isGolden ? 'rgba(174,111,17,.55)' : 'rgba(135,60,24,.5)';
      ctx.lineWidth = 2.4;
      [-13, -4, 5].forEach((y) => {
        ctx.beginPath(); ctx.moveTo(-9, y - 4); ctx.quadraticCurveTo(-2, y - 1, 7, y + 1); ctx.stroke();
      });
      ctx.beginPath(); ctx.moveTo(-11, -23); ctx.bezierCurveTo(-17, -19, -18, -13, -16, -8);
      ctx.strokeStyle = 'rgba(255,255,240,.7)'; ctx.lineWidth = 4.2; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-6, -26, 3, 1.4, -.35, 0, Math.PI * 2);
      ctx.fillStyle = '#fff9de'; ctx.fill();
      ctx.restore();
    });
  }

  function buildChiliSprite(size = 96) {
    return paintToyIcon(size, (ctx) => {
      // 单一流畅外轮廓：饱满根部自然收成上翘的小尖角。
      ctx.beginPath();
      ctx.moveTo(34, 20);
      ctx.bezierCurveTo(15, 25, 19, 49, 36, 61);
      ctx.bezierCurveTo(47, 69, 57, 69, 66, 62);
      ctx.bezierCurveTo(54, 62, 49, 51, 48, 40);
      ctx.bezierCurveTo(47, 26, 44, 20, 34, 20);
      ctx.closePath();
      ctx.fillStyle = toyGradient(ctx, 22, 25, 51, 62, [[0, '#ffb7a1'], [.22, '#ff645b'], [.64, '#e83846'], [1, '#b91f43']]);
      ctx.strokeStyle = '#a63b45'; ctx.lineWidth = 1.8; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(29, 30); ctx.bezierCurveTo(24, 39, 32, 50, 38, 53);
      ctx.strokeStyle = 'rgba(255,244,225,.74)'; ctx.lineWidth = 4.4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(42, 57); ctx.quadraticCurveTo(47, 62, 52, 63);
      ctx.strokeStyle = 'rgba(255,139,139,.7)'; ctx.lineWidth = 1.7; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(27, 23); ctx.quadraticCurveTo(34, 14, 44, 22);
      ctx.lineTo(47, 28); ctx.quadraticCurveTo(41, 26, 38, 28);
      ctx.lineTo(33, 25); ctx.lineTo(27, 27); ctx.closePath();
      ctx.fillStyle = toyGradient(ctx, 29, 15, 43, 29, [[0, '#a1e984'], [.48, '#5eae62'], [1, '#297e58']]);
      ctx.strokeStyle = '#3a8054'; ctx.lineWidth = 1.6; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(36, 21); ctx.bezierCurveTo(36, 13, 42, 11, 46, 12);
      ctx.strokeStyle = '#3a8054'; ctx.lineWidth = 6; ctx.stroke();
      ctx.strokeStyle = '#a2dc86'; ctx.lineWidth = 2.4; ctx.stroke();
    });
  }

  function buildPotionSprite(size = 96) {
    return paintToyIcon(size, (ctx) => {
      // 杯身先画出透亮边框，再绘制奶盖、薄荷饮料与珍珠。
      ctx.beginPath(); ctx.moveTo(21, 25); ctx.lineTo(27, 68);
      ctx.quadraticCurveTo(40, 75, 53, 68); ctx.lineTo(59, 25); ctx.closePath();
      ctx.fillStyle = toyGradient(ctx, 22, 25, 57, 64, [[0, '#f8fff9'], [.35, '#d9faeb'], [.75, '#b1e5d5'], [1, '#83bcad']]);
      ctx.strokeStyle = '#7ca99f'; ctx.lineWidth = 1.8; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(24, 36); ctx.quadraticCurveTo(41, 41, 56, 36);
      ctx.lineTo(52, 66); ctx.quadraticCurveTo(40, 71, 28, 66); ctx.closePath();
      ctx.fillStyle = toyGradient(ctx, 26, 40, 53, 66, [[0, '#9cebd0'], [.55, '#55c2a8'], [1, '#2b927e']]); ctx.fill();
      [[32, 61, 2.8], [39, 64, 3], [46, 61, 2.7], [36, 57, 2.5], [46, 56, 2.2]].forEach(([x, y, r]) => {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = toyGradient(ctx, x-r, y-r, x+r, y+r, [[0, '#9a775b'], [.4, '#674c3d'], [1, '#382f2b']]); ctx.fill();
        ctx.beginPath(); ctx.arc(x-.7, y-.8, .7, 0, Math.PI*2); ctx.fillStyle = '#d7b893'; ctx.fill();
      });
      // 小小奶龙标志，保持道具作为“变大奶茶”的识别性。
      ctx.beginPath(); ctx.ellipse(40, 48, 8, 6.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#fff7dc'; ctx.fill();
      ctx.fillStyle = '#947552';
      [37.3,42.7].forEach((x) => { ctx.beginPath(); ctx.arc(x,46.5,.9,0,Math.PI*2); ctx.fill(); });
      ctx.beginPath(); ctx.arc(40,48,2,0,Math.PI); ctx.strokeStyle='#c18b63'; ctx.lineWidth=1; ctx.stroke();
      // 弯折吸管与奶油杯盖。
      ctx.beginPath(); ctx.moveTo(45, 24); ctx.lineTo(47, 10); ctx.lineTo(57, 7);
      ctx.strokeStyle = '#bc6172'; ctx.lineWidth = 5.8; ctx.stroke();
      ctx.strokeStyle = '#ffb2ba'; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(40, 23, 19, 7, 0, Math.PI, Math.PI * 2);
      ctx.lineTo(59,26); ctx.lineTo(21,26); ctx.closePath();
      ctx.fillStyle = toyGradient(ctx, 30, 15, 43, 29, [[0, '#ffffff'], [.6, '#fffae9'], [1, '#d9e6d8']]);
      ctx.strokeStyle = '#7ca99f'; ctx.lineWidth = 1.5; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(40, 26, 21, 4.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = toyGradient(ctx, 25, 23, 45, 30, [[0, '#effff9'], [1, '#99d7c0']]); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(27, 34); ctx.lineTo(30.5, 55);
      ctx.strokeStyle='rgba(255,255,255,.8)'; ctx.lineWidth=3; ctx.stroke();
    });
  }

  function buildHeartSprite(size = 96) {
    return paintToyIcon(size, (ctx) => {
      ctx.beginPath(); ctx.moveTo(40, 68);
      ctx.bezierCurveTo(35, 63, 13, 47, 13, 31);
      ctx.bezierCurveTo(13, 11, 32, 10, 40, 24);
      ctx.bezierCurveTo(48, 10, 67, 11, 67, 31);
      ctx.bezierCurveTo(67, 47, 45, 63, 40, 68); ctx.closePath();
      ctx.fillStyle = toyGradient(ctx, 21, 18, 58, 62, [[0, '#ffd2d1'], [.25, '#ff8e9d'], [.62, '#ee5579'], [1, '#be365f']]);
      ctx.strokeStyle = '#b84a68'; ctx.lineWidth=1.7; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(24, 23); ctx.bezierCurveTo(18, 25, 18, 32, 21, 36);
      ctx.strokeStyle='rgba(255,255,249,.88)'; ctx.lineWidth=5; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(29,21,2.8,1.7,-.3,0,Math.PI*2); ctx.fillStyle='#fffaf1'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(44, 59); ctx.quadraticCurveTo(57, 49, 60, 40);
      ctx.strokeStyle='rgba(255,178,187,.6)'; ctx.lineWidth=1.7; ctx.stroke();
    });
  }

  function buildAtkGemSprite(size = 96) {
    return paintToyIcon(size, (ctx) => {
      // 明确的多面切割宝石与中央闪电，让攻击增益一眼可辨。
      ctx.beginPath(); ctx.moveTo(22, 17); ctx.lineTo(58,17); ctx.lineTo(71,33);
      ctx.lineTo(40,70); ctx.lineTo(9,33); ctx.closePath();
      ctx.fillStyle='#e9a42d'; ctx.strokeStyle='#bc8737'; ctx.lineWidth=1.8; ctx.fill(); ctx.stroke();
      const facet = (points, fill) => {
        ctx.beginPath(); points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.closePath();ctx.fillStyle=fill;ctx.fill();
      };
      facet([[22,17],[32,17],[24,33],[9,33]], '#ffe7a0');
      facet([[32,17],[48,17],[56,33],[24,33]], '#fff3c2');
      facet([[48,17],[58,17],[71,33],[56,33]], '#ffd374');
      facet([[9,33],[24,33],[40,70]], '#eeb13d');
      facet([[56,33],[71,33],[40,70]], '#d98d26');
      facet([[24,33],[56,33],[40,70]], toyGradient(ctx,29,32,48,65,[[0,'#ffd85b'],[1,'#efa128']]));
      ctx.beginPath(); ctx.moveTo(9,33);ctx.lineTo(71,33);
      ctx.strokeStyle='rgba(255,255,231,.75)'; ctx.lineWidth=1;ctx.stroke();
      ctx.beginPath();ctx.moveTo(41,25);ctx.lineTo(30,43);ctx.lineTo(38,43);
      ctx.lineTo(36,57);ctx.lineTo(51,37);ctx.lineTo(43,37);ctx.lineTo(47,25);ctx.closePath();
      ctx.fillStyle='#fffdf0';ctx.strokeStyle='rgba(194,127,29,.3)';ctx.lineWidth=1;ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.moveTo(22,22);ctx.lineTo(17,29);ctx.strokeStyle='#fffdf0';ctx.lineWidth=2.5;ctx.stroke();
    });
  }

  // ============================================================================
  // 8. 精灵缓存管理器与实时绘制接口 (SpriteEngine)
  // ============================================================================
  const cache = {
    initialized: false,
    nailong: {
      normal: { right: {}, left: {} },
      fire: { right: {}, left: {} },
    },
    baobaolong: {
      normal: { right: {}, left: {} },
      rage: { right: {}, left: {} },
    },
    minion: {
      twin: { right: [], left: [], squashed: null },
      cyclops: { right: [], left: [], squashed: null },
    },
    xiaoqi: {
      idle: [],
      cheer: [],
    },
    items: {
      drumstick: null,
      goldenDrumstick: null,
      chili: null,
      potion: null,
      heart: null,
      atkGem: null,
    },
    codex: {},
  };

  // 动画首次使用时生成，避免首次打开菜单时同步计算所有形态。
  // 结果仍然是普通 Canvas；镜像帧复用右侧缓存，无逐帧光线步进。
  function lazyFrame(frames, index, build) {
    Object.defineProperty(frames, index, {
      configurable: true,
      enumerable: true,
      get() {
        const sprite = build();
        Object.defineProperty(frames, index, { value: sprite, configurable: true, enumerable: true });
        return sprite;
      },
    });
  }

  function initSprites() {
    if (cache.initialized) return;
    cache.initialized = true;

    // 1. 生成奶龙多帧精灵图 (idle x2, run x4, jump x2, happy x2, attack x2, hurt x2)
    const poses = [
      { name: 'idle', count: 2 },
      { name: 'run', count: 4 },
      { name: 'jump', count: 2 },
      { name: 'happy', count: 2 },
      { name: 'attack', count: 2 },
      { name: 'hurt', count: 2 },
    ];

    for (const p of poses) {
      cache.nailong.normal.right[p.name] = [];
      cache.nailong.normal.left[p.name] = [];
      cache.nailong.fire.right[p.name] = [];
      cache.nailong.fire.left[p.name] = [];

      for (let i = 0; i < p.count; i++) {
        lazyFrame(cache.nailong.normal.right[p.name], i, () => buildNailongSprite(p.name, i, false, 112));
        lazyFrame(cache.nailong.normal.left[p.name], i, () => flipCanvasHorizontal(cache.nailong.normal.right[p.name][i]));
        lazyFrame(cache.nailong.fire.right[p.name], i, () => buildNailongSprite(p.name, i, true, 112));
        lazyFrame(cache.nailong.fire.left[p.name], i, () => flipCanvasHorizontal(cache.nailong.fire.right[p.name][i]));
      }
    }

    // 2. 生成暴暴龙多帧精灵图 (patrol x2, attack x2, hurt x2)
    for (const pose of ['patrol', 'attack', 'hurt']) {
      cache.baobaolong.normal.right[pose] = [];
      cache.baobaolong.normal.left[pose] = [];
      cache.baobaolong.rage.right[pose] = [];
      cache.baobaolong.rage.left[pose] = [];

      for (let i = 0; i < 2; i++) {
        // 暴暴龙正面微偏左，翻转作为朝右，原图作为朝左
        lazyFrame(cache.baobaolong.normal.left[pose], i, () => buildBaobaolongSprite(pose, i, false, 112));
        lazyFrame(cache.baobaolong.normal.right[pose], i, () => flipCanvasHorizontal(cache.baobaolong.normal.left[pose][i]));
        lazyFrame(cache.baobaolong.rage.left[pose], i, () => buildBaobaolongSprite(pose, i, true, 112));
        lazyFrame(cache.baobaolong.rage.right[pose], i, () => flipCanvasHorizontal(cache.baobaolong.rage.left[pose][i]));
      }
    }

    // 3. 生成小紫兵双变体精灵图 (双丸头带型 & 独眼弹簧铁帽型)
    for (const variant of ['twin', 'cyclops']) {
      for (let i = 0; i < 2; i++) {
        lazyFrame(cache.minion[variant].left, i, () => buildMinionSprite(variant, i, false, 96));
        lazyFrame(cache.minion[variant].right, i, () => flipCanvasHorizontal(cache.minion[variant].left[i]));
      }
      Object.defineProperty(cache.minion[variant], 'squashed', {
        configurable: true,
        get() {
          const sprite = buildMinionSprite(variant, 0, true, 96);
          Object.defineProperty(cache.minion[variant], 'squashed', { value: sprite, configurable: true });
          return sprite;
        },
      });
    }

    // 4. 生成小七精灵图
    for (let i = 0; i < 2; i++) {
      lazyFrame(cache.xiaoqi.idle, i, () => buildXiaoQiSprite(false, i, 112));
      lazyFrame(cache.xiaoqi.cheer, i, () => buildXiaoQiSprite(true, i, 112));
    }

    // 5. 生成核心收集物与道具精灵图
    cache.items.drumstick = buildDrumstickSprite(false);
    cache.items.goldenDrumstick = buildDrumstickSprite(true);
    cache.items.chili = buildChiliSprite();
    cache.items.potion = buildPotionSprite();
    cache.items.heart = buildHeartSprite();
    cache.items.atkGem = buildAtkGemSprite();

    // 6. 菜单与图鉴使用 160px 展示帧，放大后仍保留柔润边缘和清晰表情。
    cache.codex.nailong = [
      buildNailongSprite('idle', 0, false, 320),
      cache.nailong.normal.right.attack[1],
      cache.nailong.normal.right.happy[0],
      cache.nailong.fire.right.run[1],
    ];
    cache.codex.baobaolong = [
      buildBaobaolongSprite('patrol', 0, false, 160),
      cache.baobaolong.normal.left.attack[1],
      cache.baobaolong.rage.left.attack[0],
      cache.baobaolong.normal.left.hurt[1],
    ];
    cache.codex.minionTwin = [buildMinionSprite('twin', 0, false, 160), cache.minion.twin.left[1]];
    cache.codex.minionCyclops = [buildMinionSprite('cyclops', 0, false, 160), cache.minion.cyclops.left[1]];
    cache.codex.xiaoqi = [buildXiaoQiSprite(false, 0, 160), cache.xiaoqi.cheer[1]];
  }

  // ============================================================================
  // 9. 游戏内角色与机关像素绘制函数
  // ============================================================================
  function drawNailong(ctx, player, timeSec) {
    initSprites();
    const modeKey = player.hasFire ? 'fire' : 'normal';
    const dirKey = player.facing >= 0 ? 'right' : 'left';
    let pose = 'idle';

    if (player.hurtTimer > 0) {
      pose = 'hurt';
    } else if (player.attackTimer > 0) {
      pose = 'attack';
    } else if (player.happyTimer > 0) {
      pose = 'happy';
    } else if (!player.onGround) {
      pose = 'jump';
    } else if (Math.abs(player.vx) > 18) {
      pose = 'run';
    }

    const frames = cache.nailong[modeKey][dirKey][pose] || cache.nailong[modeKey][dirKey].idle;
    const fps = pose === 'run' ? 11 : pose === 'happy' || pose === 'attack' ? 8 : 3.5;
    const frameIdx = Math.floor(timeSec * fps) % frames.length;
    const sprite = frames[frameIdx];

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 受伤无敌帧闪烁
    if (player.invincibleTimer > 0 && Math.floor(timeSec * 20) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // 跑步与跳跃落地时的弹性挤压拉伸 (Squash & Stretch)
    const runSquash =
      pose === 'run' ? Math.sin(timeSec * 22) * 0.045 : !player.onGround ? -0.05 : Math.sin(timeSec * 5) * 0.02;
    const scaleMult = player.isBig ? 1.25 : 1.0;
    const baseSize = 54 * scaleMult;
    const drawW = Math.round(baseSize * (1 + runSquash + (player.squashX || 0)));
    const drawH = Math.round(baseSize * (1 - runSquash * 0.8 + (player.squashY || 0)));

    const cx = Math.round(player.x + player.w * 0.5);
    const bottomY = Math.round(player.y + player.h + 4);

    // 变大形态/辣椒形态光环特效
    if (player.hasFire) {
      ctx.fillStyle = 'rgba(255, 87, 34, 0.22)';
      ctx.beginPath();
      ctx.arc(cx, bottomY - drawH * 0.48, drawW * 0.48, 0, Math.PI * 2);
      ctx.fill();
    } else if (player.isBig) {
      ctx.fillStyle = 'rgba(255, 235, 59, 0.2)';
      ctx.beginPath();
      ctx.arc(cx, bottomY - drawH * 0.48, drawW * 0.48, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.drawImage(sprite, Math.round(cx - drawW * 0.5), Math.round(bottomY - drawH), drawW, drawH);

    // 吃到大鸡腿时的“开心眯眼+喷小火苗/爱心”像素特效
    if (player.happyTimer > 0) {
      const puffX = player.facing >= 0 ? cx + drawW * 0.36 : cx - drawW * 0.36;
      const puffY = bottomY - drawH * 0.68 - Math.sin(timeSec * 15) * 4;
      ctx.fillStyle = '#FF5722';
      ctx.fillRect(puffX - 4, puffY - 4, 8, 8);
      ctx.fillStyle = '#FFEB3B';
      ctx.fillRect(puffX - 2, puffY - 2, 4, 4);
    }

    ctx.restore();
  }

  function drawBaobaolong(ctx, enemy, timeSec) {
    initSprites();
    const isRage = enemy.isRage || (enemy.maxHp >= 6 && enemy.hp <= Math.ceil(enemy.maxHp * 0.5));
    const modeKey = isRage ? 'rage' : 'normal';
    const dirKey = enemy.vx >= 0 ? 'right' : 'left';
    const pose = enemy.hurtTimer > 0 ? 'hurt' : enemy.attackTimer > 0 || enemy.charging ? 'attack' : 'patrol';

    const frames = cache.baobaolong[modeKey][dirKey][pose];
    const frameIdx = Math.floor(timeSec * (enemy.charging ? 10 : 5)) % frames.length;
    const sprite = frames[frameIdx];

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const cx = Math.round(enemy.x + enemy.w * 0.5);
    const bottomY = Math.round(enemy.y + enemy.h + 4);
    const isFinalBoss = enemy.type === 'final_boss';
    const drawSize = isFinalBoss ? 86 : enemy.type === 'boss' ? 74 : 60;

    // 如果处于蓄力/狂暴状态，绘制紫色能量气场
    if (enemy.charging || isRage) {
      const pulse = Math.sin(timeSec * 16) * 4;
      ctx.strokeStyle = isRage ? '#E040FB' : '#7C4DFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        Math.round(cx - drawSize * 0.45 - pulse * 0.5),
        Math.round(bottomY - drawSize * 0.92 - pulse * 0.5),
        Math.round(drawSize * 0.9 + pulse),
        Math.round(drawSize * 0.88 + pulse)
      );
    }

    // 第30关终极Boss：绘制暴暴龙的熔岩毁灭机甲底座与双联装能量炮！
    if (isFinalBoss) {
      const mx = Math.round(cx - 44);
      const my = Math.round(bottomY - 44);
      // 暴暴龙坐在机甲驾驶舱上方
      ctx.drawImage(sprite, Math.round(cx - 38), Math.round(bottomY - 94), 76, 76);

      // 暗黑装甲底座
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(mx, my, 88, 36);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.strokeRect(mx, my, 88, 36);

      // 警示黄黑条纹与熔岩核心炉
      ctx.fillStyle = '#F59E0B';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(mx + 6 + i * 20, my + 28, 10, 5);
      }
      ctx.fillStyle = isRage ? '#E040FB' : '#FF3D00';
      ctx.fillRect(cx - 12, my + 8, 24, 14);
      ctx.fillStyle = '#FFF59D';
      ctx.fillRect(cx - 6, my + 11, 12, 8);

      // 两侧重型能量炮管
      ctx.fillStyle = '#475569';
      ctx.fillRect(mx - 10, my + 10, 12, 12);
      ctx.fillRect(mx + 86, my + 10, 12, 12);

      // 底部喷射尾焰
      const jetH = 6 + (Math.floor(timeSec * 20) % 6);
      ctx.fillStyle = '#FF5722';
      ctx.fillRect(mx + 12, my + 36, 16, jetH);
      ctx.fillRect(mx + 60, my + 36, 16, jetH);
    } else {
      ctx.drawImage(sprite, Math.round(cx - drawSize * 0.5), Math.round(bottomY - drawSize), drawSize, drawSize);
    }

    // Boss 血条显示
    if (enemy.maxHp > 1) {
      const bw = isFinalBoss ? 76 : 52;
      const bh = 7;
      const bx = Math.round(cx - bw * 0.5);
      const by = Math.round(bottomY - (isFinalBoss ? 104 : drawSize + 10));
      ctx.fillStyle = '#1E1B2E';
      ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.fillStyle = isRage ? '#E040FB' : '#EF4444';
      ctx.fillRect(bx, by, Math.max(0, Math.round((enemy.hp / enemy.maxHp) * bw)), bh);
    }

    ctx.restore();
  }

  function drawMinion(ctx, enemy, timeSec) {
    initSprites();
    const variant = enemy.type === 'minion_helmet' ? 'cyclops' : 'twin';
    const dirKey = enemy.vx >= 0 ? 'right' : 'left';
    const sprite = enemy.squashed
      ? cache.minion[variant].squashed
      : cache.minion[variant][dirKey][Math.floor(timeSec * (enemy.aggro ? 12 : 8)) % 2];

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const cx = Math.round(enemy.x + enemy.w * 0.5);
    const bottomY = Math.round(enemy.y + enemy.h + 2);
    const drawSize = 44;
    ctx.drawImage(sprite, Math.round(cx - drawSize * 0.5), Math.round(bottomY - drawSize), drawSize, drawSize);

    // 主动索敌警戒/投弹提示感叹号
    if (enemy.aggro && !enemy.squashed) {
      const ay = Math.round(bottomY - drawSize - 10 + Math.sin(timeSec * 16) * 2);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(cx - 2, ay - 9, 4, 6);
      ctx.fillRect(cx - 2, ay - 1, 4, 3);
    }
    ctx.restore();
  }

  function drawXiaoQi(ctx, x, y, cheering, timeSec) {
    initSprites();
    const frames = cheering ? cache.xiaoqi.cheer : cache.xiaoqi.idle;
    const sprite = frames[Math.floor(timeSec * 4) % frames.length];
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sprite, Math.round(x - 28), Math.round(y - 56), 56, 56);
    ctx.restore();
  }

  function drawCollectible(ctx, item, timeSec) {
    initSprites();
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const bob = Math.sin(timeSec * 5 + item.x * 0.05) * 4;
    const cx = Math.round(item.x + item.w * 0.5);
    const cy = Math.round(item.y + item.h * 0.5 + bob);

    if (item.type === 'golden_drumstick') {
      // 黄金超级鸡腿闪光粒子光环
      const pulse = Math.sin(timeSec * 8) * 3;
      ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
      ctx.beginPath();
      ctx.arc(cx, cy, 18 + pulse, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 4; i++) {
        const ang = timeSec * 3 + (i * Math.PI) / 2;
        const px = Math.round(cx + Math.cos(ang) * 16);
        const py = Math.round(cy + Math.sin(ang) * 16);
        ctx.fillStyle = i % 2 === 0 ? '#FFF59D' : '#FFD700';
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
      ctx.drawImage(cache.items.goldenDrumstick, cx - 18, cy - 18, 36, 36);
    } else if (item.type === 'drumstick') {
      // 普通焦脆烤鸡腿 + 闪光像素点
      if (Math.floor(timeSec * 6 + item.x) % 3 === 0) {
        ctx.fillStyle = '#FFF59D';
        ctx.fillRect(cx + 10, cy - 12, 3, 3);
      }
      ctx.drawImage(cache.items.drumstick, cx - 15, cy - 15, 30, 30);
    } else if (item.type === 'chili') {
      ctx.drawImage(cache.items.chili, cx - 16, cy - 16, 32, 32);
    } else if (item.type === 'potion') {
      ctx.drawImage(cache.items.potion, cx - 16, cy - 16, 32, 32);
    } else if (item.type === 'heart') {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.22)';
      ctx.beginPath();
      ctx.arc(cx, cy, 17 + Math.sin(timeSec * 8) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(cache.items.heart, cx - 16, cy - 16, 32, 32);
    } else if (item.type === 'atk_gem') {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.beginPath();
      ctx.arc(cx, cy, 17 + Math.sin(timeSec * 8) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(cache.items.atkGem, cx - 16, cy - 16, 32, 32);
    }
    ctx.restore();
  }

  ns.Sprites = {
    init: initSprites,
    cache,
    drawNailong,
    drawBaobaolong,
    drawMinion,
    drawXiaoQi,
    drawCollectible,
    buildNailongSprite,
    buildBaobaolongSprite,
    buildMinionSprite,
    buildXiaoQiSprite,
  };
})(window.NailongAdventure);

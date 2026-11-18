/**
 * 《奶龙大冒险：鸡腿保卫战》- 五大章节与 30 关完整关卡配置及场景绘制系统 (levels.js)
 *
 * 包含：
 * - 第一章（1~6关）：阳光青草平原 (Sunny Grassland) —— 蓝天白云、向日葵、红白蘑菇、教学引导、第6关初遇暴暴龙
 * - 第二章（7~12关）：甜蜜糖果沙漠 (Candy & Caramel Desert) —— 饼干沙丘、棒棒糖、巧克力砖、流沙下沉陷阱、弹跳布丁、仙人掌刺
 * - 第三章（13~18关）：迷雾幽暗森林 (Misty Twilight Forest) —— 参天古树、发光蘑菇、萤火虫、迷雾光圈视野、消失幽灵木桥、树丛突袭小紫兵
 * - 第四章（19~24关）：极寒冰雪山巅 (Frosty Ice Peaks) —— 雪山极光、晶莹冰块、低摩擦力滑行冰面、头顶坠落冰锥陷阱
 * - 第五章（25~30关）：暴暴龙熔岩城堡 (Baobaolong's Lava Fortress) —— 暗黑石砖、翻滚岩浆池、铁链火把、旋转火棒、升降平台、第30关终极机甲暴暴龙多阶段Boss战！
 */

window.NailongAdventure = window.NailongAdventure || {};

(function (ns) {
  'use strict';

  const TILE_SIZE = 36;

  const CHAPTER_INFO = {
    1: {
      id: 1,
      name: '第一章：阳光青草平原',
      enName: 'Sunny Grassland',
      range: [1, 6],
      themeColor: '#4ADE80',
      skyTop: '#38BDF8',
      skyBot: '#BAE6FD',
      groundTop: '#4ADE80',
      groundBody: '#854D0E',
      brickColor: '#D97706',
      desc: '蓝天白云与向日葵花海，学习二段可变跳跃、顶问号砖与红辣椒喷火！',
    },
    2: {
      id: 2,
      name: '第二章：甜蜜糖果沙漠',
      enName: 'Candy & Caramel Desert',
      range: [7, 12],
      themeColor: '#FBBF24',
      skyTop: '#FB923C',
      skyBot: '#FEF08A',
      groundTop: '#FDE047',
      groundBody: '#B45309',
      brickColor: '#78350F',
      desc: '金黄饼干沙丘与巧克力砖块，小心会下沉的焦糖流沙与仙人掌尖刺，利用布丁垫高跳！',
    },
    3: {
      id: 3,
      name: '第三章：迷雾幽暗森林',
      enName: 'Misty Twilight Forest',
      range: [13, 18],
      themeColor: '#A855F7',
      skyTop: '#0F172A',
      skyBot: '#312E81',
      groundTop: '#10B981',
      groundBody: '#1E293B',
      brickColor: '#4C1D95',
      desc: '萤火虫与发光蘑菇交织的暮光密林，克服受限视野、踏过会消失的幽灵木桥、提防树丛突袭！',
    },
    4: {
      id: 4,
      name: '第四章：极寒冰雪山巅',
      enName: 'Frosty Ice Peaks',
      range: [19, 24],
      themeColor: '#38BDF8',
      skyTop: '#0284C7',
      skyBot: '#E0F2FE',
      groundTop: '#E0F2FE',
      groundBody: '#0369A1',
      brickColor: '#38BDF8',
      desc: '极光闪耀的晶莹冰峰，掌控低摩擦力冰面惯性滑行，躲避头顶震动坠落的冰锥陷阱！',
    },
    5: {
      id: 5,
      name: '第五章：暴暴龙熔岩城堡',
      enName: "Baobaolong's Lava Fortress",
      range: [25, 30],
      themeColor: '#EF4444',
      skyTop: '#18181B',
      skyBot: '#7F1D1D',
      groundTop: '#52525B',
      groundBody: '#27272A',
      brickColor: '#991B1B',
      desc: '深入暴暴龙的暗黑熔岩要塞，穿越旋转火棒与翻滚岩浆池，在第30关决战终极熔岩机甲暴暴龙！',
    },
  };

  // 30 关完整元数据配置表
  const LEVEL_SPECS = [
    // 第一章：阳光青草平原 (1 - 6)
    { id: 1, chapter: 1, name: '初入青草地', weather: 'sunny', lengthTiles: 72, tip: '按 A/D 或方向键移动，轻按/长按 W/空格 实现高低跳跃！顶开 ? 砖块拿烤鸡腿！' },
    { id: 2, chapter: 1, name: '向日葵高台', weather: 'sunny', lengthTiles: 78, tip: '连续踩踏小紫兵不落地可触发 Combo x2/x4/x8 翻倍加分！收集3个黄金大鸡腿获三星！' },
    { id: 3, chapter: 1, name: '微风蘑菇谷', weather: 'windy', lengthTiles: 82, tip: '大风天会有顺风/逆风推力！顶出【红辣椒】后按 J 或 Z 键可吐出像素火球！' },
    { id: 4, chapter: 1, name: '春雨云朵桥', weather: 'rainy', lengthTiles: 86, tip: '雨天地面略滑，利用弹簧蘑菇跳上高空隐藏云朵通道，奖励大量烤鸡腿！' },
    { id: 5, chapter: 1, name: '蜜蜂花田阵', weather: 'sunny', lengthTiles: 90, tip: '注意头顶带金属尖刺的独眼小紫兵不可直接踩踏，请用辣椒火球击败或跳过它！' },
    { id: 6, chapter: 1, name: '平原守卫：初遇暴暴龙', weather: 'sunny', lengthTiles: 84, isBoss: true, bossHp: 3, tip: '【小Boss战】暴暴龙出现！躲避它的冲撞与能量球，踩踏头部 3 次或用火球击败它！' },

    // 第二章：甜蜜糖果沙漠 (7 - 12)
    { id: 7, chapter: 2, name: '焦糖饼干沙丘', weather: 'sunny', lengthTiles: 88, tip: '踏入糖果沙漠！踩在焦糖流沙上会缓慢下沉，快连按跳跃键脱身！' },
    { id: 8, chapter: 2, name: '弹跳布丁绿洲', weather: 'sunny', lengthTiles: 92, tip: '粉嫩的果冻布丁平台拥有超强弹力，借助它飞跃仙人掌尖刺阵！' },
    { id: 9, chapter: 2, name: '狂风沙尘暴', weather: 'windy', lengthTiles: 95, tip: '沙漠强风来袭！逆风起跳要留足提前量，顺风大跳可直达高空黄金鸡腿台！' },
    { id: 10, chapter: 2, name: '巧克力迷宫', weather: 'sunny', lengthTiles: 98, tip: '击碎多层巧克力砖块寻找隐藏的【变大波波奶茶】与秘密鸡腿宝库！' },
    { id: 11, chapter: 2, name: '烈日流沙河', weather: 'windy', lengthTiles: 102, tip: '流沙河与移动云朵交替出现，保持节奏切勿久留！' },
    { id: 12, chapter: 2, name: '沙漠霸主：暴暴龙突袭', weather: 'windy', lengthTiles: 90, isBoss: true, bossHp: 4, tip: '【章节Boss战】暴暴龙在流沙与布丁竞技场发起冲锋，利用布丁垫高跳反击！' },

    // 第三章：迷雾幽暗森林 (13 - 18)
    { id: 13, chapter: 3, name: '萤火暮光林', weather: 'rainy', lengthTiles: 94, hasFog: true, tip: '进入迷雾森林，视野受限！吃下红辣椒或靠近发光蘑菇可照亮周围视野！' },
    { id: 14, chapter: 3, name: '幽灵木桥涧', weather: 'rainy', lengthTiles: 98, hasFog: true, tip: '紫色幽灵木桥踩上 0.9 秒后会暂时消失，看准时机快速通过！' },
    { id: 15, chapter: 3, name: '古树灌木伏击', weather: 'windy', lengthTiles: 102, hasFog: true, tip: '当心晃动的深绿树丛！靠近时会有埋伏的小紫兵从树丛里窜出突袭！' },
    { id: 16, chapter: 3, name: '雷鸣蘑菇夜', weather: 'thunderstorm', lengthTiles: 105, hasFog: true, tip: '雷暴天气！闪电会瞬间照亮森林，但千万避开地面的红色落雷预警光柱！' },
    { id: 17, chapter: 3, name: '迷失幻影径', weather: 'thunderstorm', lengthTiles: 108, hasFog: true, tip: '幽灵桥与树丛伏兵交错，善用土狼时间与预输入跳跃丝滑闯关！' },
    { id: 18, chapter: 3, name: '密林暗影：雷霆暴暴龙', weather: 'thunderstorm', lengthTiles: 94, hasFog: true, isBoss: true, bossHp: 5, tip: '【章节Boss战】在雷暴与幽灵桥竞技场迎战暴暴龙，借闪电亮光精准踩击！' },

    // 第四章：极寒冰雪山巅 (19 - 24)
    { id: 19, chapter: 4, name: '极光滑冰场', weather: 'snowy', lengthTiles: 96, isIce: true, tip: '冰面摩擦力极低，刹车会有惯性滑行！吃下红辣椒可免疫暴雪寒冷减速！' },
    { id: 20, chapter: 4, name: '冰锥惊魂谷', weather: 'snowy', lengthTiles: 100, isIce: true, tip: '抬头看！经过悬挂的尖锐冰锥下方时，冰锥会震动坠落，快速冲刺通过！' },
    { id: 21, chapter: 4, name: '暴风雪浮冰', weather: 'windy', lengthTiles: 104, isIce: true, tip: '寒风配合滑溜冰面，在移动浮冰上稳住重心收集黄金鸡腿！' },
    { id: 22, chapter: 4, name: '寒晶秘密洞窟', weather: 'snowy', lengthTiles: 108, isIce: true, tip: '冰川高处藏着秘密补给平台，用弹簧垫飞跃连续冰锥区！' },
    { id: 23, chapter: 4, name: '绝顶冰封脊', weather: 'snowy', lengthTiles: 112, isIce: true, tip: '登顶前的严酷考验：冰面滑行 + 坠落冰锥 + 装甲小紫兵军团！' },
    { id: 24, chapter: 4, name: '冰巅对决：急冻暴暴龙', weather: 'snowy', lengthTiles: 96, isIce: true, isBoss: true, bossHp: 6, tip: '【章节Boss战】冰面上的暴暴龙冲撞速度更快，注意头顶还会震落冰锥！' },

    // 第五章：暴暴龙熔岩城堡 (25 - 30)
    { id: 25, chapter: 5, name: '熔岩吊桥门', weather: 'Sunny', lengthTiles: 102, tip: '闯入暴暴龙熔岩要塞！小心翻滚的像素岩浆池与周期性喷涌的火柱！' },
    { id: 26, chapter: 5, name: '烈焰旋转回廊', weather: 'thunderstorm', lengthTiles: 106, tip: '观察旋转火棒的顺时针轨迹，跟随空隙稳步跳跃前进！' },
    { id: 27, chapter: 5, name: '升降铁链熔炉', weather: 'rainy', lengthTiles: 110, tip: '搭乘上下升降的合金平台跨越宽阔岩浆海，切勿贪刀！' },
    { id: 28, chapter: 5, name: '狂雷赤焰长廊', weather: 'thunderstorm', lengthTiles: 114, tip: '雷暴与旋转火棒双重封锁，备好波波奶茶护盾与红辣椒火球开路！' },
    { id: 29, chapter: 5, name: '王座前哨战', weather: 'thunderstorm', lengthTiles: 118, tip: '最后的试炼关卡！突破精英紫兵防线，直抵暴暴龙机甲王座！' },
    { id: 30, chapter: 5, name: '终极决战：狂暴机甲暴暴龙', weather: 'thunderstorm', lengthTiles: 96, isBoss: true, isFinalBoss: true, bossHp: 10, tip: '【终极Boss战】暴暴龙驾驶熔岩毁灭机甲！拥有散射能量弹、喷气震地与半血狂暴紫焰三阶段模式，击败它夺回全部大鸡腿！' },
  ];

  // 伪随机数发生器（确保每一关地形固定、可背板、30关各具特色且100%可通关）
  function createSeededRng(seed) {
    let s = (seed * 9301 + 49297) % 233280;
    return function () {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  /**
   * 根据关卡编号 (1~30) 构建完整的关卡世界实体数据
   */
  function buildLevel(levelId) {
    const spec = LEVEL_SPECS[Math.min(LEVEL_SPECS.length - 1, Math.max(0, levelId - 1))];
    const chapter = CHAPTER_INFO[spec.chapter];
    const rng = createSeededRng(levelId * 137 + spec.chapter * 31);

    const groundY = 13 * TILE_SIZE; // 468px (画布高度 540px，底部2行厚地面)
    const lengthTiles = spec.lengthTiles;
    const worldW = lengthTiles * TILE_SIZE;

    const tiles = []; // 地形与砖块: { x, y, w, h, type, item, bumped, broken, timer, maxTimer }
    const collectibles = []; // 鸡腿与道具: { x, y, w, h, type, goldenIndex, collected, vx, vy }
    const enemies = []; // 小紫兵与暴暴龙: { x, y, w, h, type, vx, vy, hp, maxHp, patrolMin, patrolMax, ... }
    const movingPlatforms = []; // 移动云朵/升降平台: { x, y, w, h, startX, startY, ampX, ampY, speed, phase }
    const hazards = []; // 尖刺/岩浆/旋转火棒/坠落冰锥/喷火机关/伏击草丛
    const decorations = []; // 向日葵/棒棒糖/发光蘑菇/火把铁链等章节视觉装饰

    // 辅助函数：添加地面切片
    const addGroundColumn = (tx, surfaceType = 'normal', heightTiles = 2) => {
      const topY = groundY - (heightTiles - 2) * TILE_SIZE;
      tiles.push({
        tx,
        x: tx * TILE_SIZE,
        y: topY,
        w: TILE_SIZE,
        h: heightTiles * TILE_SIZE,
        type: surfaceType, // 'normal' | 'ice' | 'quicksand'
      });
    };

    // 1. 生成主路径地面、章节特色机关与安全跳台
    const bossArenaStart = spec.isBoss ? lengthTiles - 26 : lengthTiles - 10;
    // 预计算 3 颗黄金超级大鸡腿所在的横坐标区块，避免普通砖块组或 Boss 补给砖与云朵阶梯重合
    const goldenSpots = [
      Math.floor(lengthTiles * 0.24),
      Math.floor(lengthTiles * 0.48),
      spec.isBoss ? bossArenaStart - 6 : Math.floor(lengthTiles * 0.74),
    ];
    const isNearGoldenSpot = (tileX) => goldenSpots.some((g) => Math.abs(tileX - g) <= 4);
    let tx = 0;

    while (tx < lengthTiles) {
      // 出生安全区 (0 ~ 9) 与 关底/Boss竞技场安全区 (bossArenaStart ~ lengthTiles)
      if (tx < 10 || tx >= bossArenaStart) {
        const surf = spec.isIce ? 'ice' : 'normal';
        addGroundColumn(tx, surf, 2);
        if (tx % 4 === 2 && tx < bossArenaStart) {
          if (spec.chapter === 1 && tx % 8 !== 2) {
            hazards.push({
              type: 'spring',
              x: tx * TILE_SIZE + 2,
              y: groundY - 22,
              w: 32,
              h: 22,
              bounceAnim: 0,
            });
          } else {
            decorations.push({ x: tx * TILE_SIZE, y: groundY, chapter: spec.chapter, kind: tx % 8 === 2 ? 'A' : 'B' });
          }
        }
        tx++;
        continue;
      }

      // 决定当前区块类型：平台砖块组、流沙段、幽灵木桥段、岩浆升降台段、地面阶梯
      const roll = rng();

      if (spec.chapter === 2 && roll < 0.24 && tx < bossArenaStart - 6) {
        // 第二章特色：焦糖流沙陷阱段 (3~4格宽) + 弹跳布丁
        const qsLen = 3 + Math.floor(rng() * 2);
        for (let i = 0; i < qsLen; i++) {
          addGroundColumn(tx + i, 'quicksand', 2);
          if (i === 1) {
            collectibles.push({
              x: (tx + i) * TILE_SIZE + 3,
              y: groundY - 82,
              w: 30,
              h: 30,
              type: 'drumstick',
              collected: false,
            });
          }
        }
        // 流沙前放一个弹跳布丁垫帮助玩家爽快飞跃
        hazards.push({
          type: 'pudding',
          x: (tx - 1) * TILE_SIZE + 2,
          y: groundY - 22,
          w: 32,
          h: 22,
          bounceAnim: 0,
        });
        tx += qsLen;
      } else if (spec.chapter === 3 && roll < 0.25 && tx < bossArenaStart - 6) {
        // 第三章特色：会消失的幽灵木桥跨越深涧 (3格宽)
        const bridgeLen = 3;
        for (let i = 0; i < bridgeLen; i++) {
          tiles.push({
            tx: tx + i,
            x: (tx + i) * TILE_SIZE,
            y: groundY,
            w: TILE_SIZE,
            h: 22,
            type: 'ghost_bridge',
            state: 'solid', // 'solid' | 'shaking' | 'gone'
            timer: 0,
          });
          collectibles.push({
            x: (tx + i) * TILE_SIZE + 3,
            y: groundY - 46,
            w: 30,
            h: 30,
            type: 'drumstick',
            collected: false,
          });
        }
        tx += bridgeLen;
      } else if (roll < 0.18 && tx < bossArenaStart - 6) {
        // 峡谷/岩浆池 + 移动云朵或升降平台（最大跨度 3~4 格，绝不卡死）
        const gapLen = spec.chapter === 5 ? 4 : 3;
        if (spec.chapter === 5) {
          hazards.push({
            type: 'lava',
            x: tx * TILE_SIZE,
            y: groundY + 12,
            w: gapLen * TILE_SIZE,
            h: TILE_SIZE * 2 - 12,
          });
          // 岩浆池上方配置升降/水平移动铁板平台
          movingPlatforms.push({
            x: (tx + 0.5) * TILE_SIZE,
            y: groundY - 24,
            w: TILE_SIZE * 2.2,
            h: 18,
            startX: (tx + 0.5) * TILE_SIZE,
            startY: groundY - 24,
            ampX: gapLen >= 4 ? 26 : 0,
            ampY: 38,
            speed: 2.2,
            phase: tx * 0.5,
            theme: 'lava',
          });
        } else if ( gapLen >= 3 ) {
          movingPlatforms.push({
            x: (tx + 0.4) * TILE_SIZE,
            y: groundY - 18,
            w: TILE_SIZE * 2.0,
            h: 18,
            startX: (tx + 0.4) * TILE_SIZE,
            startY: groundY - 18,
            ampX: 22,
            ampY: 0,
            speed: 2.0,
            phase: tx * 0.4,
            theme: 'cloud',
          });
        }
        tx += gapLen;
      } else {
        // 标准连续地面段 (5 ~ 8 格)
        const segLen = 5 + Math.floor(rng() * 4);
        const isRaised = rng() < 0.28 && tx > 12;
        const hTiles = isRaised ? 3 : 2;
        const surf = spec.isIce ? 'ice' : 'normal';
        const segTopY = groundY - (hTiles - 2) * TILE_SIZE;

        for (let i = 0; i < segLen && tx + i < bossArenaStart; i++) {
          const curTx = tx + i;
          addGroundColumn(curTx, surf, hTiles);

          // 放置章节装饰物或弹力蘑菇（放在段落首格 i===0，避开上方砖块列）
          if (i === 0 && !isNearGoldenSpot(curTx)) {
            if ((spec.chapter === 1 || spec.chapter === 3) && curTx % 2 !== 0) {
              // 所有蘑菇统一为真实可弹跳的弹簧蘑菇！
              hazards.push({
                type: 'spring',
                x: curTx * TILE_SIZE + 2,
                y: segTopY - 22,
                w: 32,
                h: 22,
                bounceAnim: 0,
              });
            } else {
              decorations.push({
                x: curTx * TILE_SIZE,
                y: segTopY,
                chapter: spec.chapter,
                kind: 'A',
              });
            }
          }
        }

        // 决定本段机关/敌人类型
        const midTx = tx + Math.floor(segLen * 0.5);
        const hazardRoll = rng();
        const hasFirebarOnSeg = spec.chapter === 5 && hazardRoll < 0.45 && midTx < bossArenaStart - 2;

        // 在该地面段上方生成经典马里奥式交互砖块组（避开黄金鸡腿云台区与旋转火棒底座，杜绝任何方块重合！）
        if (
          segLen >= 5 &&
          tx + 4 < bossArenaStart &&
          !hasFirebarOnSeg &&
          !goldenSpots.some((g) => g >= tx - 2 && g <= tx + segLen + 2)
        ) {
          const blockY = segTopY - Math.round(TILE_SIZE * 2.5);
          const bStart = tx + 1;
          const bCount = 3 + (rng() > 0.5 ? 1 : 0);
          for (let b = 0; b < bCount; b++) {
            const isSurprise = b === 1 || (b === 2 && bCount === 4 && rng() > 0.35);
            let itemKind = 'drumstick';
            if (isSurprise) {
              const rItem = rng();
              if (tx < 24 && b === 1) {
                itemKind = 'chili';
              } else if (rItem < 0.28) {
                itemKind = 'chili';
              } else if (rItem < 0.54) {
                itemKind = 'atk_gem';
              } else if (rItem < 0.78) {
                itemKind = 'heart';
              } else {
                itemKind = 'potion';
              }
            }
            tiles.push({
              tx: bStart + b,
              x: (bStart + b) * TILE_SIZE,
              y: Math.round(blockY),
              w: TILE_SIZE,
              h: TILE_SIZE,
              type: isSurprise ? 'question' : 'brick',
              item: isSurprise
                ? itemKind
                : rng() < 0.42
                ? rng() < 0.35
                  ? 'heart'
                  : rng() < 0.65
                  ? 'atk_gem'
                  : 'drumstick'
                : null,
              bumped: false,
              bumpOffset: 0,
            });
          }

          // 砖块上方的烤鸡腿收集线
          for (let c = 0; c < bCount; c++) {
            collectibles.push({
              x: (bStart + c) * TILE_SIZE + 3,
              y: Math.round(blockY - 38),
              w: 30,
              h: 30,
              type: 'drumstick',
              collected: false,
            });
          }
        }

        // 放置弹簧蘑菇 / 章节特色陷阱 / 主动攻击巡逻小紫兵
        if (midTx < bossArenaStart - 2) {
          if (spec.chapter === 2 && hazardRoll < 0.36) {
            hazards.push({
              type: 'cactus',
              x: midTx * TILE_SIZE + 4,
              y: segTopY - 30,
              w: 28,
              h: 30,
            });
          } else if (spec.chapter === 3 && hazardRoll < 0.42) {
            hazards.push({
              type: 'ambush_bush',
              x: midTx * TILE_SIZE - 6,
              y: segTopY - 34,
              w: 48,
              h: 34,
              triggered: false,
            });
          } else if (spec.chapter === 4 && hazardRoll < 0.45 && !isNearGoldenSpot(midTx)) {
            const icicleY = segTopY - Math.round(TILE_SIZE * 4.2);
            tiles.push({
              tx: midTx,
              x: midTx * TILE_SIZE,
              y: Math.round(icicleY - TILE_SIZE),
              w: TILE_SIZE,
              h: TILE_SIZE,
              type: 'ice',
            });
            hazards.push({
              type: 'icicle',
              x: midTx * TILE_SIZE + 6,
              y: Math.round(icicleY),
              startY: Math.round(icicleY),
              w: 24,
              h: 38,
              state: 'idle',
              timer: 0,
              vy: 0,
            });
          } else if (hasFirebarOnSeg) {
            const pivotX = midTx * TILE_SIZE + TILE_SIZE * 0.5;
            const pivotY = segTopY - TILE_SIZE * 1.5;
            tiles.push({
              tx: midTx,
              x: midTx * TILE_SIZE,
              y: Math.round(pivotY - TILE_SIZE * 0.5),
              w: TILE_SIZE,
              h: TILE_SIZE,
              type: 'steel',
            });
            hazards.push({
              type: 'firebar',
              x: pivotX,
              y: pivotY,
              length: 76,
              angle: rng() * Math.PI * 2,
              speed: (levelId >= 28 ? 2.4 : 1.8) * (rng() > 0.5 ? 1 : -1),
            });
          } else {
            const isHelmet = (levelId >= 1 && tx > 36 && rng() < 0.35) || (levelId >= 3 && rng() < 0.3 + spec.chapter * 0.05);
            const minX = (tx + 0.3) * TILE_SIZE;
            const maxX = Math.min(bossArenaStart - 1, tx + segLen - 0.3) * TILE_SIZE;
            if (maxX - minX >= TILE_SIZE * 2) {
              enemies.push({
                type: isHelmet ? 'minion_helmet' : 'minion',
                x: midTx * TILE_SIZE,
                y: segTopY - 38,
                groundTopY: segTopY,
                w: 34,
                h: 38,
                vx: (isHelmet ? 78 : 68) * (rng() > 0.5 ? 1 : -1),
                vy: 0,
                hp: 1,
                maxHp: 1,
                patrolMin: minX,
                patrolMax: maxX,
                attackCooldown: 0.35 + rng() * 0.35,
                jumpCooldown: 1.2 + rng() * 0.8,
                aggro: false,
                squashed: false,
                squashTimer: 0,
              });
            }
          }
        }

        tx += segLen;
      }
    }

    // 2. 放置 3 颗【黄金超级大鸡腿】(配备双层阶梯云台与高弹力弹簧蘑菇，清理周边空中砖块确保零重合！)
    goldenSpots.forEach((gtx, idx) => {
      const gx = gtx * TILE_SIZE;
      // 清理 [gtx - 4, gtx + 3] 区间内任何可能冲突的空中砖块、普通鸡腿与地面装饰蘑菇/向日葵
      const minClearX = (gtx - 4) * TILE_SIZE;
      const maxClearX = (gtx + 3) * TILE_SIZE;
      for (let i = tiles.length - 1; i >= 0; i--) {
        const t = tiles[i];
        if (
          (t.type === 'question' || t.type === 'brick' || t.type === 'cloud_platform') &&
          t.x + t.w > minClearX &&
          t.x < maxClearX
        ) {
          tiles.splice(i, 1);
        }
      }
      for (let i = decorations.length - 1; i >= 0; i--) {
        const d = decorations[i];
        if (d.x + 36 > minClearX && d.x < maxClearX) {
          decorations.splice(i, 1);
        }
      }
      for (let i = collectibles.length - 1; i >= 0; i--) {
        const c = collectibles[i];
        if (c.type === 'drumstick' && c.x + c.w > minClearX && c.x < maxClearX && c.y < groundY - 60) {
          collectibles.splice(i, 1);
        }
      }

      // 查找 gtx 处的实际地面高度作为阶梯基准高度
      let localGroundY = groundY;
      for (const t of tiles) {
        if ((t.type === 'normal' || t.type === 'ice' || t.type === 'quicksand') && Math.abs(t.tx - gtx) <= 3) {
          if (t.y < localGroundY) localGroundY = t.y;
        }
      }

      if (idx === 1) {
        // 第 2 颗黄金鸡腿：中段隐藏高空云朵秘境 —— 撤掉中层跳板，必须踩下方【弹力蘑菇】一跃冲天才能上去！
        hazards.push({
          type: 'spring',
          x: (gtx - 1) * TILE_SIZE + 2,
          y: localGroundY - 22,
          w: 32,
          h: 22,
          bounceAnim: 0,
        });
        const highY = Math.round(localGroundY - TILE_SIZE * 4.8);
        for (let k = -1; k <= 2; k++) {
          tiles.push({
            tx: gtx + k,
            x: (gtx + k) * TILE_SIZE,
            y: highY,
            w: TILE_SIZE,
            h: 20,
            type: 'cloud_platform',
            mushroomOnly: true,
          });
          if (k === -1) {
            collectibles.push({
              x: (gtx + k) * TILE_SIZE + 2,
              y: highY - 38,
              w: 32,
              h: 32,
              type: 'atk_gem',
              collected: false,
            });
          } else if (k === 2) {
            collectibles.push({
              x: (gtx + k) * TILE_SIZE + 2,
              y: highY - 38,
              w: 32,
              h: 32,
              type: 'heart',
              collected: false,
            });
          } else if (k !== 0) {
            collectibles.push({
              x: (gtx + k) * TILE_SIZE + 3,
              y: highY - 38,
              w: 30,
              h: 30,
              type: 'drumstick',
              collected: false,
            });
          }
        }
        collectibles.push({
          x: gx,
          y: highY - 42,
          w: 36,
          h: 36,
          type: 'golden_drumstick',
          goldenIndex: idx,
          collected: false,
        });
      } else if (idx === 2) {
        // 第 3 颗黄金鸡腿：关底前高空黄金云台 —— 必须借助下方【弹力蘑菇】弹射才能跳上去！
        hazards.push({
          type: 'spring',
          x: (gtx - 1) * TILE_SIZE + 2,
          y: localGroundY - 22,
          w: 32,
          h: 22,
          bounceAnim: 0,
        });
        const highStepY = Math.round(localGroundY - TILE_SIZE * 4.6);
        tiles.push({
          tx: gtx,
          x: gx - 12,
          y: highStepY,
          w: TILE_SIZE * 2 + 24,
          h: 20,
          type: 'cloud_platform',
          mushroomOnly: true,
        });
        collectibles.push({
          x: gx + 18,
          y: highStepY - 42,
          w: 36,
          h: 36,
          type: 'golden_drumstick',
          goldenIndex: idx,
          collected: false,
        });
      } else {
        // 第 1 颗黄金鸡腿：双层阶梯云朵平台（第1阶 2.2 格高，第2阶 4.0 格高，零砖块重叠！）
        const step1Y = Math.round(localGroundY - TILE_SIZE * 2.2);
        const step2Y = Math.round(localGroundY - TILE_SIZE * 4.0);
        tiles.push({
          tx: gtx - 2,
          x: (gtx - 2) * TILE_SIZE,
          y: step1Y,
          w: TILE_SIZE * 2,
          h: 20,
          type: 'cloud_platform',
        });
        tiles.push({
          tx: gtx,
          x: gx,
          y: step2Y,
          w: TILE_SIZE * 2,
          h: 20,
          type: 'cloud_platform',
        });
        collectibles.push({
          x: gx + 18,
          y: step2Y - 42,
          w: 36,
          h: 36,
          type: 'golden_drumstick',
          goldenIndex: idx,
          collected: false,
        });
      }
    });

    // 3. 关底守卫与 Boss 配置（普通关终点前也有精英暴暴龙或紫兵小队主动发射能量弹守卫！）
    if (spec.isBoss) {
      const arenaLeft = (bossArenaStart + 2) * TILE_SIZE;
      const arenaRight = (lengthTiles - 6) * TILE_SIZE;
      tiles.push({
        tx: bossArenaStart + 1,
        x: (bossArenaStart + 1) * TILE_SIZE,
        y: Math.round(groundY - TILE_SIZE * 2.5),
        w: TILE_SIZE,
        h: TILE_SIZE,
        type: 'question',
        item: 'chili',
        bumped: false,
        bumpOffset: 0,
      });
      hazards.push({
        type: 'spring',
        x: arenaLeft + 12,
        y: groundY - 22,
        w: 32,
        h: 22,
        bounceAnim: 0,
      });
      hazards.push({
        type: 'spring',
        x: arenaRight - 36,
        y: groundY - 22,
        w: 32,
        h: 22,
        bounceAnim: 0,
      });

      enemies.push({
        type: spec.isFinalBoss ? 'final_boss' : 'boss',
        name: spec.isFinalBoss ? '毁灭机甲·狂暴暴暴龙' : '暴暴龙队长',
        x: Math.round((arenaLeft + arenaRight) * 0.55),
        y: groundY - (spec.isFinalBoss ? 86 : 64),
        groundTopY: groundY,
        w: spec.isFinalBoss ? 72 : 54,
        h: spec.isFinalBoss ? 86 : 64,
        vx: -95,
        vy: 0,
        hp: spec.bossHp || 3,
        maxHp: spec.bossHp || 3,
        patrolMin: arenaLeft + 48,
        patrolMax: arenaRight - 48,
        shootCooldown: 1.8,
        chargeCooldown: 3.8,
        charging: false,
        hurtTimer: 0,
        attackTimer: 0,
        isRage: false,
      });
    } else {
      // 每一关关底前均设有暴暴龙先锋守卫（主动发射紫色能量球与冲撞攻击！）
      const guardTx = lengthTiles - 14;
      enemies.push({
        type: 'boss',
        name: '暴暴龙先锋',
        x: guardTx * TILE_SIZE,
        y: groundY - 60,
        groundTopY: groundY,
        w: 50,
        h: 60,
        vx: -82,
        vy: 0,
        hp: levelId === 1 ? 2 : 2 + Math.floor(spec.chapter * 0.5),
        maxHp: levelId === 1 ? 2 : 2 + Math.floor(spec.chapter * 0.5),
        patrolMin: (guardTx - 6) * TILE_SIZE,
        patrolMax: (guardTx + 4) * TILE_SIZE,
        shootCooldown: 2.2,
        chargeCooldown: 4.2,
        charging: false,
        hurtTimer: 0,
        attackTimer: 0,
        isRage: false,
      });
    }

    // 4. 关底终点旗杆与小七伙伴迎接区
    const goalX = (lengthTiles - 4) * TILE_SIZE;

    return {
      id: spec.id,
      name: spec.name,
      chapter: spec.chapter,
      chapterInfo: chapter,
      weather: spec.weather.toLowerCase(),
      tip: spec.tip,
      hasFog: Boolean(spec.hasFog),
      isIce: Boolean(spec.isIce),
      isBoss: Boolean(spec.isBoss),
      isFinalBoss: Boolean(spec.isFinalBoss),
      worldW,
      groundY,
      goalX,
      tiles,
      collectibles,
      enemies,
      movingPlatforms,
      hazards,
      decorations,
    };
  }

  // ============================================================================
  // 章节视差背景、像素地形砖块、机关与小七终点旗帜绘制器
  // ============================================================================
  function renderParallaxBackground(ctx, level, camera, viewW, viewH, timeSec) {
    const ch = level.chapterInfo;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. 天空渐变
    const grad = ctx.createLinearGradient(0, 0, 0, viewH);
    grad.addColorStop(0, ch.skyTop);
    grad.addColorStop(1, ch.skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewW, viewH);

    const camX = camera.x;

    // 2. 远景层 (视差系数 0.18)：各章节标志性天际线与天体
    if (level.chapter === 1) {
      // 第一章：像素暖阳 + 蓬松白云 + 翠绿远山
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(viewW - 140, 48, 56, 56);
      ctx.fillStyle = '#FDE047';
      ctx.fillRect(viewW - 132, 56, 40, 40);

      for (let i = 0; i < 7; i++) {
        const cx = ((i * 220 - camX * 0.15) % (viewW + 220) + (viewW + 220)) % (viewW + 220) - 100;
        const cy = 62 + (i % 3) * 34;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(Math.round(cx), cy, 68, 22);
        ctx.fillRect(Math.round(cx + 12), cy - 10, 44, 14);
      }
      for (let i = 0; i < 6; i++) {
        const hx = ((i * 260 - camX * 0.25) % (viewW + 260) + (viewW + 260)) % (viewW + 260) - 130;
        ctx.fillStyle = '#86EFAC';
        ctx.beginPath();
        ctx.arc(hx + 90, viewH - 60, 120, Math.PI, 0);
        ctx.fill();
      }
    } else if (level.chapter === 2) {
      // 第二章：糖果沙漠饼干金字塔 + 巨型螺旋棒棒糖远景
      for (let i = 0; i < 5; i++) {
        const px = ((i * 280 - camX * 0.22) % (viewW + 280) + (viewW + 280)) % (viewW + 280) - 120;
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.moveTo(px, viewH - 64);
        ctx.lineTo(px + 95, viewH - 210);
        ctx.lineTo(px + 190, viewH - 64);
        ctx.fill();

        // 远景巨型棒棒糖
        const lx = Math.round(px + 210);
        ctx.fillStyle = '#FFFBEB';
        ctx.fillRect(lx - 3, viewH - 180, 6, 116);
        ctx.fillStyle = i % 2 === 0 ? '#EC4899' : '#38BDF8';
        ctx.beginPath();
        ctx.arc(lx, viewH - 190, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(lx, viewH - 190, 14, 0, Math.PI * 1.5);
        ctx.stroke();
      }
    } else if (level.chapter === 3) {
      // 第三章：幽暗森林层叠参天古树剪影 + 漂浮发光萤火虫
      for (let i = 0; i < 8; i++) {
        const tx = ((i * 180 - camX * 0.2) % (viewW + 180) + (viewW + 180)) % (viewW + 180) - 80;
        ctx.fillStyle = '#1E1B4B';
        ctx.fillRect(Math.round(tx + 28), 80, 34, viewH - 120);
        ctx.fillStyle = '#312E81';
        ctx.fillRect(Math.round(tx - 10), 40, 110, 90);
      }
      // 萤火虫微光粒子
      for (let i = 0; i < 18; i++) {
        const fx = ((i * 95 + Math.sin(timeSec * 2 + i) * 24 - camX * 0.35) % viewW + viewW) % viewW;
        const fy = 110 + ((i * 53) % 280) + Math.cos(timeSec * 3 + i) * 12;
        ctx.fillStyle = i % 2 === 0 ? '#A3E635' : '#FEF08A';
        ctx.fillRect(Math.round(fx), Math.round(fy), 4, 4);
      }
    } else if (level.chapter === 4) {
      // 第四章：极寒冰雪山巅 —— 梦幻极光丝带 + 皑皑雪峰
      for (let band = 0; band < 3; band++) {
        ctx.fillStyle = band === 0 ? 'rgba(52, 211, 153, 0.24)' : band === 1 ? 'rgba(56, 189, 248, 0.22)' : 'rgba(168, 85, 247, 0.18)';
        for (let x = 0; x < viewW; x += 24) {
          const ay = 55 + band * 28 + Math.sin(x * 0.015 + timeSec * 1.5 + band) * 18;
          ctx.fillRect(x, Math.round(ay), 24, 22);
        }
      }
      for (let i = 0; i < 6; i++) {
        const mx = ((i * 250 - camX * 0.22) % (viewW + 250) + (viewW + 250)) % (viewW + 250) - 100;
        ctx.fillStyle = '#7DD3FC';
        ctx.beginPath();
        ctx.moveTo(mx, viewH - 64);
        ctx.lineTo(mx + 110, viewH - 250);
        ctx.lineTo(mx + 220, viewH - 64);
        ctx.fill();
        // 雪顶高光
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(mx + 72, viewH - 180);
        ctx.lineTo(mx + 110, viewH - 250);
        ctx.lineTo(mx + 148, viewH - 180);
        ctx.fill();
      }
    } else {
      // 第五章：暴暴龙熔岩城堡 —— 暗黑石柱、铁链与燃烧火把
      for (let i = 0; i < 7; i++) {
        const px = Math.round(((i * 210 - camX * 0.25) % (viewW + 210) + (viewW + 210)) % (viewW + 210) - 80);
        ctx.fillStyle = '#27272A';
        ctx.fillRect(px, 60, 48, viewH - 120);
        // 悬挂铁链
        ctx.fillStyle = '#52525B';
        for (let cy = 0; cy < 150; cy += 14) {
          ctx.fillRect(px + 85, cy, 6, 10);
        }
        // 壁挂像素火把
        const flicker = Math.floor(timeSec * 12 + i) % 3;
        ctx.fillStyle = '#78350F';
        ctx.fillRect(px + 18, 190, 10, 24);
        ctx.fillStyle = flicker === 0 ? '#EF4444' : flicker === 1 ? '#F97316' : '#FACC15';
        ctx.fillRect(px + 14, 174 - flicker * 2, 18, 16);
      }
    }

    ctx.restore();
  }

  function renderDecorations(ctx, level, camera, viewW, timeSec) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const dec of level.decorations) {
      const sx = Math.round(dec.x - camera.x);
      if (sx < -60 || sx > viewW + 60) continue;
      const sy = Math.round(dec.y);

      if (dec.chapter === 1) {
        if (dec.kind === 'A') {
          // 像素向日葵（高度适中，不与上方空中平台重叠）
          ctx.fillStyle = '#15803D';
          ctx.fillRect(sx + 15, sy - 28, 4, 28);
          ctx.fillStyle = '#FACC15';
          ctx.fillRect(sx + 7, sy - 42, 20, 20);
          ctx.fillStyle = '#78350F';
          ctx.fillRect(sx + 12, sy - 37, 10, 10);
        } else {
          // 经典红白波点蘑菇装饰
          ctx.fillStyle = '#FDE68A';
          ctx.fillRect(sx + 11, sy - 16, 12, 16);
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(sx + 4, sy - 28, 26, 14);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(sx + 8, sy - 25, 5, 5);
          ctx.fillRect(sx + 19, sy - 24, 5, 5);
        }
      } else if (dec.chapter === 2) {
        // 棒棒糖装饰与饼干柱
        ctx.fillStyle = '#FFFBEB';
        ctx.fillRect(sx + 15, sy - 38, 4, 38);
        ctx.fillStyle = dec.kind === 'A' ? '#F43F5E' : '#A855F7';
        ctx.fillRect(sx + 6, sy - 54, 22, 22);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(sx + 11, sy - 49, 12, 12);
      } else if (dec.chapter === 3) {
        // 发光荧光蘑菇
        const glow = Math.sin(timeSec * 4 + dec.x) * 3;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.beginPath();
        ctx.arc(sx + 16, sy - 18, 20 + glow, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#CBD5E1';
        ctx.fillRect(sx + 13, sy - 16, 7, 16);
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(sx + 5, sy - 26, 22, 12);
      } else if (dec.chapter === 4) {
        // 晶莹冰晶簇
        ctx.fillStyle = '#BAE6FD';
        ctx.fillRect(sx + 12, sy - 30, 8, 30);
        ctx.fillStyle = '#E0F2FE';
        ctx.fillRect(sx + 4, sy - 20, 6, 20);
        ctx.fillRect(sx + 22, sy - 24, 6, 24);
      } else {
        // 熔岩城堡骷髅火盆
        ctx.fillStyle = '#3F3F46';
        ctx.fillRect(sx + 6, sy - 18, 22, 18);
        ctx.fillStyle = '#F97316';
        ctx.fillRect(sx + 9, sy - 28 - (Math.floor(timeSec * 10) % 4), 16, 12);
      }
    }
    ctx.restore();
  }

  function renderTilesAndHazards(ctx, level, camera, viewW, timeSec) {
    const ch = level.chapterInfo;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. 绘制地形与交互砖块
    for (const t of level.tiles) {
      if (t.broken) continue;
      if (t.type === 'ghost_bridge' && t.state === 'gone') continue;

      const sx = Math.round(t.x - camera.x);
      if (sx + t.w < -20 || sx > viewW + 20) continue;
      const shakeX = t.type === 'ghost_bridge' && t.state === 'shaking' ? (Math.floor(timeSec * 40) % 2 === 0 ? -2 : 2) : 0;
      const sy = Math.round(t.y + (t.bumpOffset || 0));

      if (t.type === 'normal' || t.type === 'ice' || t.type === 'quicksand') {
        if (t.type === 'quicksand') {
          // 第二章流沙陷阱：金黄流动波纹
          const wave = Math.floor(timeSec * 12) % 6;
          ctx.fillStyle = '#D97706';
          ctx.fillRect(sx, sy, t.w, t.h);
          ctx.fillStyle = '#FDE047';
          ctx.fillRect(sx, sy, t.w, 10);
          ctx.fillStyle = '#92400E';
          ctx.fillRect(sx + wave * 4, sy + 14, 12, 4);
          ctx.fillRect(sx + ((wave * 4 + 16) % 28), sy + 28, 12, 4);
        } else if (t.type === 'ice') {
          // 第四章晶莹低摩擦冰面
          ctx.fillStyle = '#0284C7';
          ctx.fillRect(sx, sy, t.w, t.h);
          ctx.fillStyle = '#BAE6FD';
          ctx.fillRect(sx, sy, t.w, 10);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(sx + 4, sy + 2, 14, 4);
          ctx.fillRect(sx + 8, sy + 18, 6, 18);
        } else {
          // 章节标准地面
          ctx.fillStyle = ch.groundBody;
          ctx.fillRect(sx, sy, t.w, t.h);
          ctx.fillStyle = ch.groundTop;
          ctx.fillRect(sx, sy, t.w, 10);
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(sx + 6, sy + 18, 8, 8);
          ctx.fillRect(sx + 22, sy + 32, 8, 8);
        }
      } else if (t.type === 'question') {
        // 经典 ? 惊喜砖块（未顶开时金黄闪烁，顶开后变为暗铜铆钉砖）
        ctx.fillStyle = t.bumped ? '#78716C' : '#F59E0B';
        ctx.fillRect(sx, sy, t.w, t.h);
        ctx.strokeStyle = '#292524';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1, sy + 1, t.w - 2, t.h - 2);
        if (!t.bumped) {
          ctx.fillStyle = '#FEF08A';
          ctx.fillRect(sx + 3, sy + 3, t.w - 6, 4);
          ctx.fillStyle = '#78350F';
          ctx.font = 'bold 20px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('?', sx + t.w * 0.5, sy + 25);
        } else {
          ctx.fillStyle = '#44403C';
          ctx.fillRect(sx + 5, sy + 5, 4, 4);
          ctx.fillRect(sx + t.w - 9, sy + 5, 4, 4);
        }
      } else if (t.type === 'brick') {
        // 可破坏像素砖块
        ctx.fillStyle = ch.brickColor;
        ctx.fillRect(sx, sy, t.w, t.h);
        ctx.strokeStyle = '#1C1917';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1, sy + 1, t.w - 2, t.h - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(sx + 3, sy + 3, t.w - 6, 4);
        ctx.fillStyle = '#1C1917';
        ctx.fillRect(sx, sy + Math.floor(t.h * 0.5), t.w, 2);
        ctx.fillRect(sx + Math.floor(t.w * 0.5), sy, 2, Math.floor(t.h * 0.5));
      } else if (t.type === 'cloud_platform') {
        // 蓬松云朵单向/高空平台（若为蘑菇专属高台，绘制醒目金黄边框）
        ctx.fillStyle = t.mushroomOnly ? '#FEF9C3' : '#FFFFFF';
        ctx.fillRect(sx + 2, sy, t.w - 4, t.h);
        ctx.fillStyle = t.mushroomOnly ? '#FDE047' : '#E0F2FE';
        ctx.fillRect(sx + 4, sy + t.h - 6, t.w - 8, 6);
        ctx.strokeStyle = t.mushroomOnly ? '#F59E0B' : '#38BDF8';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 2, sy, t.w - 4, t.h);
      } else if (t.type === 'ghost_bridge') {
        // 第三章会消失的幽灵木桥
        ctx.fillStyle = t.state === 'shaking' ? 'rgba(216, 180, 254, 0.7)' : 'rgba(139, 92, 246, 0.9)';
        ctx.fillRect(sx + shakeX, sy, t.w - 2, t.h);
        ctx.fillStyle = '#F3E8FF';
        ctx.fillRect(sx + shakeX + 4, sy + 3, t.w - 10, 4);
      } else if (t.type === 'steel') {
        ctx.fillStyle = '#52525B';
        ctx.fillRect(sx, sy, t.w, t.h);
        ctx.strokeStyle = '#18181B';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1, sy + 1, t.w - 2, t.h - 2);
      }
    }

    // 2. 绘制移动云朵与升降平台
    for (const mp of level.movingPlatforms) {
      const sx = Math.round(mp.x - camera.x);
      if (sx + mp.w < -20 || sx > viewW + 20) continue;
      const sy = Math.round(mp.y);
      if (mp.theme === 'lava') {
        ctx.fillStyle = '#475569';
        ctx.fillRect(sx, sy, mp.w, mp.h);
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(sx + 4, sy + 3, mp.w - 8, 4);
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, sy, mp.w, mp.h);
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(sx, sy, mp.w, mp.h);
        ctx.fillStyle = '#BAE6FD';
        ctx.fillRect(sx + 4, sy + mp.h - 5, mp.w - 8, 5);
        ctx.strokeStyle = '#0284C7';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, sy, mp.w, mp.h);
      }
    }

    // 3. 绘制章节机关与陷阱 (弹簧蘑菇、弹跳布丁、仙人掌、埋伏树丛、冰锥、岩浆池、旋转火棒)
    for (const hz of level.hazards) {
      const sx = Math.round(hz.x - camera.x);
      if (sx < -120 || sx > viewW + 120) continue;
      const sy = Math.round(hz.y);

      if (hz.type === 'spring') {
        // 经典红白弹簧蘑菇垫
        const compress = hz.bounceAnim > 0 ? 6 : 0;
        ctx.fillStyle = '#E2E8F0';
        ctx.fillRect(sx + 10, sy + 10 + compress, 12, 12 - compress);
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(sx, sy + compress, hz.w, 11);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(sx + 5, sy + 2 + compress, 6, 6);
        ctx.fillRect(sx + 21, sy + 2 + compress, 6, 6);
      } else if (hz.type === 'pudding') {
        // 第二章高弹力焦糖布丁垫
        const compress = hz.bounceAnim > 0 ? 5 : 0;
        ctx.fillStyle = '#FDE047';
        ctx.fillRect(sx + 2, sy + 6 + compress, hz.w - 4, hz.h - 6 - compress);
        ctx.fillStyle = '#78350F';
        ctx.fillRect(sx, sy + compress, hz.w, 8);
      } else if (hz.type === 'cactus') {
        // 沙漠仙人掌尖刺
        ctx.fillStyle = '#15803D';
        ctx.fillRect(sx + 8, sy, 12, hz.h);
        ctx.fillRect(sx, sy + 8, 28, 7);
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(sx + 12, sy - 3, 4, 4);
        ctx.fillRect(sx + 2, sy + 5, 3, 3);
        ctx.fillRect(sx + 23, sy + 5, 3, 3);
      } else if (hz.type === 'ambush_bush') {
        // 第三章突袭树丛（未触发前微微晃动）
        const rustle = !hz.triggered ? Math.sin(timeSec * 16 + hz.x) * 2 : 0;
        ctx.fillStyle = '#065F46';
        ctx.fillRect(sx + rustle, sy + 8, hz.w, hz.h - 8);
        ctx.fillStyle = '#10B981';
        ctx.fillRect(sx + 6 + rustle, sy, hz.w - 12, 14);
        if (!hz.triggered) {
          // 露出小紫兵发光的黄绿小眼睛提示玩家
          ctx.fillStyle = '#EAEA62';
          ctx.fillRect(sx + 16 + rustle, sy + 14, 5, 5);
          ctx.fillRect(sx + 27 + rustle, sy + 14, 5, 5);
        }
      } else if (hz.type === 'icicle') {
        // 第四章坠落冰锥陷阱
        const shake = hz.state === 'shaking' ? (Math.floor(timeSec * 45) % 2 === 0 ? -2 : 2) : 0;
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.moveTo(sx + shake, sy);
        ctx.lineTo(sx + hz.w + shake, sy);
        ctx.lineTo(sx + hz.w * 0.5 + shake, sy + hz.h);
        ctx.fill();
        ctx.fillStyle = '#E0F2FE';
        ctx.fillRect(sx + 6 + shake, sy + 2, 5, 16);
      } else if (hz.type === 'lava') {
        // 第五章翻滚像素岩浆池
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(sx, sy, hz.w, hz.h);
        ctx.fillStyle = '#FACC15';
        for (let lx = 0; lx < hz.w; lx += 18) {
          const waveY = Math.sin(timeSec * 8 + lx * 0.1) * 4;
          ctx.fillRect(sx + lx, Math.round(sy + waveY), 12, 8);
        }
      } else if (hz.type === 'firebar') {
        // 第五章旋转火棒机关
        for (let r = 0; r <= hz.length; r += 16) {
          const fx = Math.round(sx + Math.cos(hz.angle) * r);
          const fy = Math.round(sy + Math.sin(hz.angle) * r);
          ctx.fillStyle = '#FF5722';
          ctx.fillRect(fx - 7, fy - 7, 14, 14);
          ctx.fillStyle = '#FFEB3B';
          ctx.fillRect(fx - 4, fy - 4, 8, 8);
        }
      }
    }

    // 4. 绘制终点鸡腿旗杆与伙伴小七！
    const gx = Math.round(level.goalX - camera.x);
    if (gx > -100 && gx < viewW + 100) {
      const gy = level.groundY;
      // 底座与旗杆
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(gx - 16, gy - 16, 32, 16);
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(gx - 3, gy - 210, 6, 194);
      // 顶部黄金圆球与奶龙大鸡腿胜利旗帜
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(gx, gy - 216, 10, 0, Math.PI * 2);
      ctx.fill();

      const wave = Math.sin(timeSec * 6) * 3;
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(gx + 3, gy - 204 + wave * 0.5, 54, 34);
      ctx.fillStyle = '#FEF08A';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('🍗GOAL', gx + 8, gy - 183 + wave * 0.5);

      // 小七在终点旗杆旁挥手迎接奶龙！
      if (ns.Sprites && ns.Sprites.drawXiaoQi) {
        ns.Sprites.drawXiaoQi(ctx, gx + 48, gy + 4, true, timeSec);
      }
    }

    ctx.restore();
  }

  /**
   * 第三章迷雾幽暗森林：绘制受限视野微弱光圈效果（吃辣椒或发光蘑菇可扩大光圈）
   */
  function renderForestFogOverlay(ctx, level, player, camera, viewW, viewH) {
    if (!level.hasFog) return;
    ctx.save();
    const px = Math.round(player.x + player.w * 0.5 - camera.x);
    const py = Math.round(player.y + player.h * 0.5);
    const radius = player.hasFire ? 275 : 195;

    const grad = ctx.createRadialGradient(px, py, radius * 0.35, px, py, radius);
    grad.addColorStop(0, 'rgba(10, 12, 28, 0.0)');
    grad.addColorStop(0.7, 'rgba(10, 12, 28, 0.48)');
    grad.addColorStop(1, 'rgba(8, 10, 24, 0.84)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.restore();
  }

  ns.Levels = {
    TILE_SIZE,
    CHAPTER_INFO,
    LEVEL_SPECS,
    buildLevel,
    renderParallaxBackground,
    renderDecorations,
    renderTilesAndHazards,
    renderForestFogOverlay,
  };
})(window.NailongAdventure);

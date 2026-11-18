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
      desc: '深入暴暴龙的暗黑熔岩要塞，穿越旋转火棒与翻滚岩浆池，迎战重装熔岩机甲暴暴龙！',
    },
    6: {
      id: 6,
      name: '第六章：赛博霓虹机械城',
      enName: 'Cyber Neon Metropolis',
      range: [31, 36],
      themeColor: '#06B6D4',
      skyTop: '#090D16',
      skyBot: '#1E1B4B',
      groundTop: '#22D3EE',
      groundBody: '#1E293B',
      brickColor: '#0284C7',
      desc: '高速激光网格与霓虹机械浮台交织的未来都市，突破双重旋转激光与高敏铁帽紫兵防线！',
    },
    7: {
      id: 7,
      name: '第七章：云端雷霆神殿',
      enName: 'Thunder Sky Sanctuary',
      range: [37, 42],
      themeColor: '#F59E0B',
      skyTop: '#1E1B4B',
      skyBot: '#4C1D95',
      groundTop: '#FDE047',
      groundBody: '#475569',
      brickColor: '#D97706',
      desc: '悬浮于万米雷云之上的黄金神殿，在狂风、高频天雷与极速消失的幻影浮桥间极限穿梭！',
    },
    8: {
      id: 8,
      name: '第八章：星际虚空终焉要塞',
      enName: 'Cosmic Void Citadel',
      range: [43, 48],
      themeColor: '#EC4899',
      skyTop: '#030712',
      skyBot: '#3B0764',
      groundTop: '#E879F9',
      groundBody: '#1F2937',
      brickColor: '#86198F',
      desc: '跨越全机关复合的星际虚空黑洞矩阵，在第48关迎战16血三阶段【宇宙毁灭机甲·暴暴龙大帝】！',
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
    { id: 29, chapter: 5, name: '王座前哨战', weather: 'thunderstorm', lengthTiles: 118, tip: '突破熔岩要塞防线，直抵暴暴龙机甲王座！' },
    { id: 30, chapter: 5, name: '熔岩决战：重装机甲暴暴龙', weather: 'thunderstorm', lengthTiles: 96, isBoss: true, isFinalBoss: true, bossHp: 9, tip: '【第五章Boss战】暴暴龙启动熔岩重装机甲！击败它开启通往赛博机械城的时空传送门！' },

    // 第六章：赛博霓虹机械城 (31 - 36) —— 高速旋转激光、冰滑赛博装甲板、密集铁帽紫兵
    { id: 31, chapter: 6, name: '霓虹数据大道', weather: 'rainy', lengthTiles: 118, tip: '进入第六章赛博机械城！酸雨让金属路面湿滑，小心高速巡逻的铁帽紫兵！' },
    { id: 32, chapter: 6, name: '激光矩阵回廊', weather: 'windy', lengthTiles: 122, tip: '高能旋转激光棒速度大幅提升！善用狂暴龙晶双倍火球清扫前方障碍！' },
    { id: 33, chapter: 6, name: '超导磁悬浮桥', weather: 'snowy', lengthTiles: 125, isIce: true, tip: '超导冷却路面摩擦力极低，配合弹簧蘑菇精准跃上高空黄金鸡腿台！' },
    { id: 34, chapter: 6, name: '全息迷雾机房', weather: 'thunderstorm', lengthTiles: 128, hasFog: true, tip: '全息黑客迷雾遮蔽视野，同时提防电磁落雷与暗处突袭的装甲紫兵！' },
    { id: 35, chapter: 6, name: '核心反应堆长廊', weather: 'thunderstorm', lengthTiles: 132, tip: '连续升降合金台与高速旋转火棒交错，考验极限微操！' },
    { id: 36, chapter: 6, name: '机械城主：赛博机甲暴暴龙', weather: 'thunderstorm', lengthTiles: 100, isBoss: true, isFinalBoss: true, bossHp: 11, tip: '【第六章Boss战】11血赛博超频机甲暴暴龙！弹幕与冲撞速度提升30%，拾取狂暴龙晶反击！' },

    // 第七章：云端雷霆神殿 (37 - 42) —— 狂风+天雷+极速幽灵桥+坠落冰锥复合高难关卡
    { id: 37, chapter: 7, name: '万米雷云阶梯', weather: 'windy', lengthTiles: 128, tip: '踏入第七章云端雷霆神殿！高空罡风强劲，注意空中跳跃提前量！' },
    { id: 38, chapter: 7, name: '幻影浮桥圣殿', weather: 'thunderstorm', lengthTiles: 132, tip: '神殿幽灵浮桥与天雷预警同时触发，切勿在同一块浮桥上停留超过0.7秒！' },
    { id: 39, chapter: 7, name: '罡风天雷走廊', weather: 'windy', lengthTiles: 136, isIce: true, tip: '光滑云母石面 + 高空强风 + 悬空坠落冰柱，步步惊心！' },
    { id: 40, chapter: 7, name: '雷神试炼密室', weather: 'thunderstorm', lengthTiles: 140, hasFog: true, tip: '雷云夜幕笼罩神殿，借助红辣椒光圈与闪电亮光穿越连续机关区！' },
    { id: 41, chapter: 7, name: '苍穹圣域之巅', weather: 'thunderstorm', lengthTiles: 144, tip: '通往星际虚空前的最高密度紫兵精英防线，保持连击 Combo！' },
    { id: 42, chapter: 7, name: '神殿裁决：雷神机甲暴暴龙', weather: 'thunderstorm', lengthTiles: 104, isBoss: true, isFinalBoss: true, bossHp: 13, tip: '【第七章Boss战】13血雷神机甲暴暴龙！在雷暴与高空竞技场展开巅峰对决！' },

    // 第八章：星际虚空终焉要塞 (43 - 48) —— 全章节地狱难度复合机关 + 终极16血大帝决战
    { id: 43, chapter: 8, name: '星际折跃边缘', weather: 'windy', lengthTiles: 138, isIce: true, tip: '最终章：星际虚空要塞！低摩擦星舰甲板与虚空强风双重考验！' },
    { id: 44, chapter: 8, name: '黑洞引力裂谷', weather: 'thunderstorm', lengthTiles: 142, hasFog: true, tip: '虚空暗雾与高频能量火棒封锁，看准升降平台节奏一气呵成！' },
    { id: 45, chapter: 8, name: '新星爆裂回廊', weather: 'thunderstorm', lengthTiles: 146, tip: '超长距离高难关卡！合理储备波波奶茶护盾、蜜桃回血果与狂暴龙晶！' },
    { id: 46, chapter: 8, name: '零度星尘绝壁', weather: 'snowy', lengthTiles: 150, isIce: true, tip: '极寒星尘冰面 + 密集坠落陨冰 + 反向旋转双火棒，硬核平台跳跃试炼！' },
    { id: 47, chapter: 8, name: '帝国舰桥前哨', weather: 'thunderstorm', lengthTiles: 155, hasFog: true, tip: '决战前的最长远征（155格）！突破双暴暴龙先锋的联合封锁！' },
    { id: 48, chapter: 8, name: '终焉决战：宇宙机甲暴暴龙大帝', weather: 'thunderstorm', lengthTiles: 108, isBoss: true, isFinalBoss: true, bossHp: 16, tip: '【全游戏终极Boss战】16血宇宙毁灭机甲·暴暴龙大帝！高频三连扇形等离子炮+狂暴泰山压顶，夺回宇宙终极金鸡腿！' },
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
      } else if ((spec.chapter === 3 || spec.chapter >= 7) && roll < (spec.chapter >= 7 ? 0.28 : 0.25) && tx < bossArenaStart - 6) {
        // 第三/七/八章特色：会消失的幽灵/幻影浮桥跨越深涧 (3~4格宽)
        const bridgeLen = spec.chapter >= 7 ? 4 : 3;
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
      } else if (roll < (spec.chapter >= 6 ? 0.24 : 0.18) && tx < bossArenaStart - 6) {
        // 峡谷/糖浆河/岩浆池/虚空裂谷 + 移动云朵或升降平台（最大跨度 3~4 格，绝不卡死）
        const gapLen = spec.chapter >= 5 ? 4 : 3;
        if (spec.chapter === 2) {
          // 第二章沙漠河流（焦糖蜜河）：踩入不扣血，触发高弹击退效果！
          hazards.push({
            type: 'desert_river',
            x: tx * TILE_SIZE,
            y: groundY + 10,
            w: gapLen * TILE_SIZE,
            h: TILE_SIZE * 2 - 10,
          });
        }
        if (spec.chapter >= 5) {
          hazards.push({
            type: 'lava',
            x: tx * TILE_SIZE,
            y: groundY + 12,
            w: gapLen * TILE_SIZE,
            h: TILE_SIZE * 2 - 12,
          });
          // 岩浆池/高能反应堆上方配置升降/水平移动铁板平台（高章节移动速度更快）
          movingPlatforms.push({
            x: (tx + 0.5) * TILE_SIZE,
            y: groundY - 24,
            w: TILE_SIZE * (spec.chapter >= 7 ? 1.9 : 2.2),
            h: 18,
            startX: (tx + 0.5) * TILE_SIZE,
            startY: groundY - 24,
            ampX: gapLen >= 4 ? (spec.chapter >= 6 ? 34 : 26) : 0,
            ampY: spec.chapter >= 6 ? 46 : 38,
            speed: 2.2 + Math.max(0, spec.chapter - 5) * 0.35,
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

        // 决定本段机关/敌人类型（第6~8章复合高难机关概率与速度随关卡递增！）
        const midTx = tx + Math.floor(segLen * 0.5);
        const hazardRoll = rng();
        const hasFirebarOnSeg =
          spec.chapter >= 5 &&
          hazardRoll < (spec.chapter >= 6 ? 0.52 : 0.45) &&
          midTx < bossArenaStart - 2;

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
          } else if ((spec.chapter === 4 || spec.chapter >= 7) && hazardRoll < 0.48 && !isNearGoldenSpot(midTx)) {
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
            const barSpeed = (1.8 + Math.max(0, levelId - 25) * 0.08) * (rng() > 0.5 ? 1 : -1);
            hazards.push({
              type: 'firebar',
              x: pivotX,
              y: pivotY,
              length: spec.chapter >= 6 ? 86 : 76,
              angle: rng() * Math.PI * 2,
              speed: barSpeed,
            });
            // 第7~8章高难特色：双十字交叉旋转火棒！
            if (spec.chapter >= 7) {
              hazards.push({
                type: 'firebar',
                x: pivotX,
                y: pivotY,
                length: 84,
                angle: rng() * Math.PI * 2 + Math.PI,
                speed: barSpeed,
              });
            }
          } else {
            const isHelmet =
              (levelId >= 1 && tx > 36 && rng() < 0.35) ||
              (levelId >= 3 && rng() < Math.min(0.82, 0.28 + spec.chapter * 0.07));
            const minX = (tx + 0.3) * TILE_SIZE;
            const maxX = Math.min(bossArenaStart - 1, tx + segLen - 0.3) * TILE_SIZE;
            if (maxX - minX >= TILE_SIZE * 2) {
              const spdBoost = 1 + Math.max(0, spec.chapter - 1) * 0.08;
              const cdFactor = Math.max(0.55, 1 - (spec.chapter - 1) * 0.06);
              enemies.push({
                type: isHelmet ? 'minion_helmet' : 'minion',
                x: midTx * TILE_SIZE,
                y: segTopY - 38,
                groundTopY: segTopY,
                w: 34,
                h: 38,
                vx: Math.round((isHelmet ? 78 : 68) * spdBoost) * (rng() > 0.5 ? 1 : -1),
                vy: 0,
                hp: spec.chapter >= 7 && isHelmet ? 2 : 1,
                maxHp: spec.chapter >= 7 && isHelmet ? 2 : 1,
                patrolMin: minX,
                patrolMax: maxX,
                attackCooldown: (0.35 + rng() * 0.35) * cdFactor,
                jumpCooldown: (1.2 + rng() * 0.8) * cdFactor,
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
      // 每一关关底前均设有暴暴龙先锋守卫（第7~8章关底升级为双暴暴龙先锋夹击！）
      const guardTx = lengthTiles - 14;
      const guardHp = levelId === 1 ? 2 : 2 + Math.floor(spec.chapter * 0.65);
      enemies.push({
        type: 'boss',
        name: '暴暴龙先锋',
        x: guardTx * TILE_SIZE,
        y: groundY - 60,
        groundTopY: groundY,
        w: 50,
        h: 60,
        vx: -(82 + spec.chapter * 5),
        vy: 0,
        hp: guardHp,
        maxHp: guardHp,
        patrolMin: (guardTx - 6) * TILE_SIZE,
        patrolMax: (guardTx + 4) * TILE_SIZE,
        shootCooldown: Math.max(1.2, 2.2 - spec.chapter * 0.1),
        chargeCooldown: Math.max(2.6, 4.2 - spec.chapter * 0.15),
        charging: false,
        hurtTimer: 0,
        attackTimer: 0,
        isRage: spec.chapter >= 7,
      });

      if (spec.chapter >= 7) {
        const subGuardTx = lengthTiles - 22;
        enemies.push({
          type: 'boss',
          name: '暴暴龙暗影副官',
          x: subGuardTx * TILE_SIZE,
          y: groundY - 60,
          groundTopY: groundY,
          w: 50,
          h: 60,
          vx: 88 + spec.chapter * 5,
          vy: 0,
          hp: Math.max(3, guardHp - 1),
          maxHp: Math.max(3, guardHp - 1),
          patrolMin: (subGuardTx - 5) * TILE_SIZE,
          patrolMax: (subGuardTx + 5) * TILE_SIZE,
          shootCooldown: 1.65,
          chargeCooldown: 3.4,
          charging: false,
          hurtTimer: 0,
          attackTimer: 0,
          isRage: false,
        });
      }
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
  // Illustrated world rendering. Static scenery and tile materials are cached;
  // the collision geometry above stays the source of truth for every platform.
  // ============================================================================
  const WORLD_PALETTES = {
    1: { sky: ['#B5E5E1', '#F7F3D9'], hill: ['#BEDCC3', '#91C3A2', '#6BA98B'], earth: ['#B58A61', '#856449'], turf: '#93CA79', edge: '#568A60', light: '#D5EDAB', ink: '#486D58' },
    2: { sky: ['#F6BCA8', '#FFF1CC'], hill: ['#F5D29E', '#E7B87D', '#D99D71'], earth: ['#C48A62', '#946048'], turf: '#F7D891', edge: '#B78B53', light: '#FFF1C3', ink: '#87604C' },
    3: { sky: ['#203D50', '#77988F'], hill: ['#466C72', '#315C61', '#244D50'], earth: ['#556B5B', '#354C45'], turf: '#70AD92', edge: '#365F58', light: '#ACD8B0', ink: '#253D44' },
    4: { sky: ['#B5DCEB', '#F3F5EB'], hill: ['#C9E5E8', '#A3CCD6', '#83AFBF'], earth: ['#8DBAC9', '#5E91AD'], turf: '#F0F8EE', edge: '#75A5BB', light: '#FFFFFF', ink: '#517D96' },
    5: { sky: ['#343544', '#AC7165'], hill: ['#695568', '#554455', '#463C4D'], earth: ['#6C6068', '#474352'], turf: '#A19693', edge: '#514753', light: '#C5B2A2', ink: '#413A49' },
    6: { sky: ['#20314C', '#557A86'], hill: ['#486075', '#334F67', '#293E57'], earth: ['#4C6472', '#304555'], turf: '#83D5CE', edge: '#386878', light: '#B8F1DB', ink: '#263F55' },
    7: { sky: ['#8482B3', '#F1DEDC'], hill: ['#D2BEDC', '#B1A6CF', '#9697BF'], earth: ['#AEA9BC', '#777E9A'], turf: '#F6DFA7', edge: '#B59A70', light: '#FFF1CC', ink: '#776B8B' },
    8: { sky: ['#1A233D', '#695379'], hill: ['#5C567D', '#43486D', '#353E60'], earth: ['#646580', '#42465F'], turf: '#D6A5DC', edge: '#806796', light: '#F2D3E6', ink: '#393C5A' },
  };
  const sceneryCache = new Map();
  const materialCache = new Map();

  function rounded(ctx, x, y, w, h, r, fill, stroke, lineWidth = 1.5) {
    r = Math.max(0, Math.min(r, w * 0.5, h * 0.5));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }

  function ellipse(ctx, x, y, rx, ry, fill) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function makeSurface(w, h, scale = 1) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * scale);
    canvas.height = Math.ceil(h * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    return { canvas, ctx };
  }

  function cloud(ctx, x, y, size, color, shade) {
    ellipse(ctx, x, y + size * 0.17, size, size * 0.28, shade || color);
    ellipse(ctx, x - size * 0.45, y, size * 0.52, size * 0.29, color);
    ellipse(ctx, x + size * 0.14, y - size * 0.11, size * 0.55, size * 0.39, color);
    ellipse(ctx, x + size * 0.58, y + size * 0.06, size * 0.43, size * 0.24, color);
  }

  function tree(ctx, x, baseY, scale, color, trunk) {
    rounded(ctx, x - 6 * scale, baseY - 75 * scale, 12 * scale, 78 * scale, 6 * scale, trunk);
    ctx.strokeStyle = trunk;
    ctx.lineWidth = 5 * scale;
    ctx.beginPath();
    ctx.moveTo(x, baseY - 42 * scale);
    ctx.lineTo(x - 24 * scale, baseY - 68 * scale);
    ctx.moveTo(x, baseY - 51 * scale);
    ctx.lineTo(x + 23 * scale, baseY - 84 * scale);
    ctx.stroke();
    ellipse(ctx, x - 21 * scale, baseY - 81 * scale, 32 * scale, 30 * scale, color);
    ellipse(ctx, x + 20 * scale, baseY - 95 * scale, 35 * scale, 34 * scale, color);
    ellipse(ctx, x - 2 * scale, baseY - 111 * scale, 34 * scale, 35 * scale, color);
    ellipse(ctx, x + 34 * scale, baseY - 74 * scale, 25 * scale, 27 * scale, color);
    ellipse(ctx, x - 17 * scale, baseY - 117 * scale, 19 * scale, 10 * scale, 'rgba(255,255,231,.1)');
  }

  function makeScenery(level, viewW, viewH) {
    const key = `${level.chapter}:${viewW}:${viewH}`;
    if (sceneryCache.has(key)) return sceneryCache.get(key);
    // Keep only the active chapter's large canvases in memory.
    sceneryCache.clear();
    const p = WORLD_PALETTES[level.chapter];
    const width = 1440;
    const sky = makeSurface(viewW, viewH);
    const skyGradient = sky.ctx.createLinearGradient(0, 0, 0, viewH);
    skyGradient.addColorStop(0, p.sky[0]);
    skyGradient.addColorStop(1, p.sky[1]);
    sky.ctx.fillStyle = skyGradient;
    sky.ctx.fillRect(0, 0, viewW, viewH);
    const lightX = viewW * 0.82;
    const lightY = viewH * 0.2;
    const halo = sky.ctx.createRadialGradient(lightX, lightY, 6, lightX, lightY, 170);
    halo.addColorStop(0, level.chapter > 4 ? 'rgba(255,219,177,.17)' : 'rgba(255,250,216,.7)');
    halo.addColorStop(1, 'rgba(255,245,216,0)');
    sky.ctx.fillStyle = halo;
    sky.ctx.fillRect(0, 0, viewW, viewH);
    if ([1, 2, 4].includes(level.chapter)) {
      ellipse(sky.ctx, lightX, lightY, 33, 33, '#FFF2B9');
      ellipse(sky.ctx, lightX - 8, lightY - 9, 19, 15, 'rgba(255,255,235,.45)');
      if (level.chapter === 1) {
        sky.ctx.fillStyle = '#B3A35F';
        ellipse(sky.ctx, lightX - 9, lightY + 1, 1.8, 2.4, '#B3A35F');
        ellipse(sky.ctx, lightX + 9, lightY + 1, 1.8, 2.4, '#B3A35F');
        sky.ctx.strokeStyle = '#B3A35F';
        sky.ctx.lineWidth = 1.3;
        sky.ctx.beginPath(); sky.ctx.arc(lightX, lightY + 2, 5, .2, Math.PI - .2); sky.ctx.stroke();
      }
    }
    if ([3, 6, 7, 8].includes(level.chapter)) {
      for (let i = 0; i < 42; i++) {
        const x = (i * 151 + 41) % viewW;
        const y = 35 + (i * 71) % Math.round(viewH * .47);
        ellipse(sky.ctx, x, y, i % 7 === 0 ? 1.7 : .8, i % 7 === 0 ? 1.7 : .8, 'rgba(255,249,221,.6)');
      }
      if (level.chapter === 3 || level.chapter === 7) {
        ellipse(sky.ctx, lightX, lightY, 28, 28, '#F8EBC8');
        ellipse(sky.ctx, lightX + 11, lightY - 7, 26, 26, p.sky[0]);
      }
    }
    const layers = [];
    for (let depth = 0; depth < 3; depth++) {
      const surface = makeSurface(width, viewH);
      const ctx = surface.ctx;
      const base = viewH - 35 + depth * 8;
      const ridge = viewH - 150 + depth * 36;
      ctx.fillStyle = p.hill[depth];
      ctx.beginPath(); ctx.moveTo(0, base);
      for (let x = 0; x <= width; x += 30) {
        const y = ridge + Math.sin(x / width * Math.PI * 4 + depth) * (43 - depth * 10) + Math.cos(x / width * Math.PI * 8) * 16;
        if (x === 0) ctx.lineTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineTo(width, viewH); ctx.lineTo(0, viewH); ctx.fill();
      if ([1, 3].includes(level.chapter)) {
        for (let i = 0; i < 12; i++) {
          const x = i * 136 + (depth % 2) * 58;
          const s = level.chapter === 3 ? 1.5 + depth * .24 + (i % 3) * .17 : .55 + depth * .12 + (i % 3) * .12;
          const y = level.chapter === 3 ? base - 8 : ridge + 34 + Math.sin(i * 1.8) * 20;
          for (const shift of [-width, 0, width]) tree(ctx, x + shift, y, s, p.hill[depth], depth === 2 ? '#557C68' : p.hill[Math.max(0, depth - 1)]);
        }
      } else if (level.chapter === 2) {
        for (let i = 0; i < 5; i++) {
          const x = i * 310 + 90 + depth * 50;
          const y = base - 45;
          if (depth === 1) {
            rounded(ctx, x - 4, y - 120, 8, 120, 4, '#F9E8C1');
            ellipse(ctx, x, y - 124, 30, 30, i % 2 ? '#CC929F' : '#A7C6BA');
            ctx.strokeStyle = '#FBE7D4'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.arc(x, y - 124, 19, .1, Math.PI * 1.8); ctx.stroke();
          } else {
            rounded(ctx, x - 30, y - 80 - i % 3 * 15, 60, 110, 22, p.hill[depth]);
          }
        }
      } else if (level.chapter === 4) {
        for (let i = 0; i < 7; i++) {
          const x = i * 240 - 80 + depth * 40;
          const peak = ridge - 120 + i % 2 * 45;
          ctx.fillStyle = p.hill[depth];
          ctx.beginPath();ctx.moveTo(x - 80, base);ctx.lineTo(x + 95, peak);ctx.lineTo(x + 270, base);ctx.fill();
          ctx.fillStyle = depth === 0 ? '#ECF5EF' : '#D7EAE8';
          ctx.beginPath();ctx.moveTo(x + 43, peak + 79);ctx.lineTo(x + 95, peak);ctx.lineTo(x + 151, peak + 84);ctx.lineTo(x + 117, peak + 68);ctx.lineTo(x + 97, peak + 89);ctx.lineTo(x + 74, peak + 64);ctx.fill();
        }
      } else if (level.chapter === 5) {
        for (let i = 0; i < 8; i++) {
          const x = i * 200 + depth * 70;
          const y = 140 + i % 3 * 35 + depth * 55;
          rounded(ctx, x, y, 104, base - y, 18, p.hill[depth]);
          for (let b = 0; b < 3; b++) rounded(ctx, x + b * 37 - 2, y - 12, 31, 29, 5, p.hill[depth]);
          rounded(ctx, x + 37, y + 38, 26, 47, 13, 'rgba(255,175,120,.12)');
        }
      } else if (level.chapter === 6) {
        for (let i = 0; i < 12; i++) {
          const x = i * 133 + depth * 49;
          const height = 110 + i % 4 * 39 + (2 - depth) * 30;
          rounded(ctx, x, base - height, 75, height, 9, p.hill[depth]);
          rounded(ctx, x + 18, base - height - 16, 39, 22, 5, p.hill[depth]);
          ctx.fillStyle = depth === 1 ? 'rgba(174,235,220,.32)' : 'rgba(210,202,219,.18)';
          for (let y = base - height + 20; y < base - 20; y += 24) { ctx.fillRect(x + 14, y, 16, 6); ctx.fillRect(x + 44, y, 16, 6); }
        }
      } else if (level.chapter === 7) {
        if (depth === 0) {
          for (let i = 0; i < 6; i++) {
            const x = i * 260 + 60;
            rounded(ctx, x, 190, 31, 240, 9, '#CCBED2');
            rounded(ctx, x - 8, 184, 47, 15, 5, '#E0CBBE');
            rounded(ctx, x - 8, 420, 47, 18, 5, '#D5BEB1');
            rounded(ctx, x - 20, 170, 190, 17, 8, '#D8C5D2');
          }
        }
        for (let i = 0; i < 9; i++) cloud(ctx, i * 180 + 45, ridge + 35 + i % 2 * 24, 105, depth === 2 ? '#E7DDE5' : p.hill[depth], '#C6BBD5');
      } else if (level.chapter === 8) {
        for (let i = 0; i < 7; i++) {
          const x = i * 230 + depth * 90;
          const y = ridge - 45 + i % 3 * 30;
          ctx.fillStyle = p.hill[depth];
          ctx.beginPath();ctx.moveTo(x - 45,y);ctx.lineTo(x + 65,y - 10);ctx.lineTo(x + 48,y + 27);ctx.lineTo(x + 2,y + 58);ctx.lineTo(x - 26,y + 27);ctx.fill();
          rounded(ctx,x-45,y-5,110,10,5,depth === 0 ? '#9C83AF' : '#76698E');
          if (depth === 0) {ctx.strokeStyle='#8974A6';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(x+12,y-88,42,60,.35,0,Math.PI*2);ctx.stroke();}
        }
      }
      layers.push(surface.canvas);
    }
    const result = { sky: sky.canvas, layers, width };
    sceneryCache.set(key, result);
    return result;
  }

  function renderParallaxBackground(ctx, level, camera, viewW, viewH, timeSec) {
    const scene = makeScenery(level, viewW, viewH);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(scene.sky, 0, 0);
    if ([1, 2, 4, 7].includes(level.chapter)) {
      for (let i = 0; i < 6; i++) {
        const span = viewW + 240;
        const x = ((i * 237 - camera.x * .1 + timeSec * (i % 2 ? 2 : 1)) % span + span) % span - 120;
        cloud(ctx, x, 95 + i % 3 * 48, 47 + i % 3 * 13, 'rgba(255,255,243,.75)', 'rgba(243,250,234,.3)');
      }
    }
    scene.layers.forEach((layer, i) => {
      const offset = ((camera.x * [.12, .23, .38][i]) % scene.width + scene.width) % scene.width;
      for (let x = -offset; x < viewW; x += scene.width) ctx.drawImage(layer, Math.round(x), 0);
    });
    if (level.chapter === 3 || level.chapter === 8) {
      for (let i = 0; i < 15; i++) {
        const x = ((i * 103 - camera.x * .3 + Math.sin(timeSec + i) * 15) % viewW + viewW) % viewW;
        const y = 130 + i * 53 % 260 + Math.cos(timeSec * 1.3 + i) * 9;
        ellipse(ctx, x, y, 7, 7, 'rgba(202,240,179,.05)');
        ellipse(ctx, x, y, 1.7, 1.7, level.chapter === 3 ? '#D9F2AD' : '#EDC8F0');
      }
    }
    if (level.chapter === 8) {
      ctx.save();ctx.translate(viewW*.81,viewH*.21);ctx.rotate(-.3);
      ellipse(ctx,0,0,40,40,'#30304E');
      ctx.strokeStyle='rgba(223,175,218,.6)';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,0,66,16,0,0,Math.PI*2);ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function flower(ctx, x, y, color, size = 1) {
    ctx.strokeStyle = '#6C9D6A';ctx.lineWidth=2*size;
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x-3*size,y-10*size,x,y-24*size);ctx.stroke();
    ellipse(ctx,x-5*size,y-9*size,5*size,2.5*size,'#8ABB78');
    for(let i=0;i<6;i++){const a=i*Math.PI/3;ellipse(ctx,x+Math.cos(a)*6*size,y-25*size+Math.sin(a)*6*size,4*size,4*size,color);}
    ellipse(ctx,x,y-25*size,3.8*size,3.8*size,'#B17A4F');
    ellipse(ctx,x-1*size,y-26*size,1.1*size,1.1*size,'#F9DEA5');
  }

  function mushroom(ctx, x, y, w, h, capColor, glowing = false) {
    if(glowing) ellipse(ctx,x+w*.5,y+h*.4,w*.9,h*1.1,'rgba(160,228,218,.1)');
    rounded(ctx,x+w*.34,y+h*.35,w*.32,h*.65,4,'#F4E6C7','#BEA88C',1);
    ellipse(ctx,x+w*.5,y+h*.44,w*.51,h*.13,'#BA8268');
    ctx.beginPath();ctx.moveTo(x,y+h*.43);ctx.bezierCurveTo(x+w*.02,y-h*.15,x+w*.96,y-h*.15,x+w,y+h*.43);ctx.quadraticCurveTo(x+w*.5,y+h*.61,x,y+h*.43);ctx.fillStyle=capColor;ctx.fill();
    ellipse(ctx,x+w*.27,y+h*.2,w*.09,h*.07,'#FFF1D8');
    ellipse(ctx,x+w*.66,y+h*.15,w*.11,h*.08,'#FFF1D8');
    ellipse(ctx,x+w*.8,y+h*.36,w*.055,h*.04,'#FFF1D8');
    ellipse(ctx,x+w*.28,y+h*.08,w*.13,h*.025,'rgba(255,255,255,.3)');
  }

  function crystal(ctx,x,y,w,h,color) {
    ctx.beginPath();ctx.moveTo(x+w*.5,y);ctx.lineTo(x+w,y+h*.28);ctx.lineTo(x+w*.8,y+h);ctx.lineTo(x+w*.18,y+h);ctx.lineTo(x,y+h*.28);ctx.closePath();ctx.fillStyle=color;ctx.fill();
    ctx.beginPath();ctx.moveTo(x+w*.5,y+2);ctx.lineTo(x+w*.52,y+h*.89);ctx.lineTo(x+w*.18,y+h*.89);ctx.lineTo(x+w*.18,y+h*.29);ctx.closePath();ctx.fillStyle='rgba(255,255,255,.43)';ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=1;ctx.stroke();
  }

  function renderDecorations(ctx, level, camera, viewW, timeSec) {
    ctx.save();ctx.imageSmoothingEnabled=true;
    for(const dec of level.decorations){
      const x=dec.x-camera.x; if(x < -80 || x > viewW+80) continue;
      const y=dec.y;
      ctx.save();ctx.translate(x+17,y);ctx.rotate(Math.sin(timeSec*1.7+dec.x*.01)*.025);
      if(dec.chapter===1){
        if(dec.kind==='A'){flower(ctx,0,0,'#F5D47B',1.14);flower(ctx,17,0,'#F6E9CF',.62);}
        else {mushroom(ctx,-14,-27,28,27,'#DE8978');mushroom(ctx,10,-16,18,16,'#EBAD85');}
        ctx.strokeStyle='#7DAA6A';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-25,0);ctx.quadraticCurveTo(-26,-9,-30,-12);ctx.moveTo(-23,0);ctx.quadraticCurveTo(-17,-8,-18,-14);ctx.stroke();
      }else if(dec.chapter===2){
        rounded(ctx,-3,-45,6,45,3,'#FFF1D9','#CFB48F',1);
        ellipse(ctx,0,-45,15,15,dec.kind==='A'?'#E69F9F':'#ACA3C9');
        ctx.strokeStyle='#FFF0D5';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-45,10,.2,Math.PI*1.8);ctx.arc(0,-45,4,Math.PI*1.8,.2,true);ctx.stroke();
        rounded(ctx,12,-13,15,13,5,'#E0B37C','#BF8C61',1);ellipse(ctx,16,-9,1.5,1.5,'#A67B59');ellipse(ctx,23,-4,1.5,1.5,'#A67B59');
      }else if(dec.chapter===3){mushroom(ctx,-15,-30,30,30,'#84C9BF',true);mushroom(ctx,11,-18,19,18,'#A6ACD9',true);
      }else if(dec.chapter===4){crystal(ctx,-8,-39,15,39,'#A8D7DE');crystal(ctx,-23,-24,13,24,'#C1E3E5');crystal(ctx,11,-29,13,29,'#A9C7DF');
      }else if(dec.chapter===6){
        rounded(ctx,-4,-38,8,38,3,'#405D6C');rounded(ctx,-17,-49,34,18,6,'#69BDBA','#355B6B',2);rounded(ctx,-12,-45,24,9,3,'#BDEADB');
        ctx.strokeStyle='#63918E';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,-41);ctx.lineTo(6,-41);ctx.lineTo(1,-45);ctx.moveTo(6,-41);ctx.lineTo(1,-37);ctx.stroke();
      }else if(dec.chapter===7){rounded(ctx,-10,-30,20,30,4,'#D5C6B0','#A79A91',1);rounded(ctx,-14,-31,28,8,3,'#F2D8A3');crystal(ctx,-6,-50,12,23,'#BAA4D7');
      }else if(dec.chapter===8){crystal(ctx,-11,-44,21,44,'#B692CD');crystal(ctx,10,-25,13,25,'#DAA7CE');ellipse(ctx,0,-23,25,34,'rgba(210,166,220,.05)');
      }else {rounded(ctx,-13,-20,26,20,6,'#6C646D','#494454',1.5);drawFlame(ctx,0,-23,11,20,timeSec+dec.x);}
      ctx.restore();
    }
    ctx.restore();
  }

  function getTileMaterial(t, chapter) {
    const variant = (t.tx || 0) % 3;
    const key=`${chapter}:${t.type}:${t.w}:${t.h}:${variant}:${!!t.bumped}:${!!t.mushroomOnly}`;
    if(materialCache.has(key)) return materialCache.get(key);
    const surface=makeSurface(t.w+4,t.h+6,2),ctx=surface.ctx,p=WORLD_PALETTES[chapter],w=t.w,h=t.h;
    ctx.translate(2,2);
    if(['normal','ice','quicksand'].includes(t.type)){
      const isIce=t.type==='ice',isSand=t.type==='quicksand';
      const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,isIce?'#9DCCD9':isSand?'#E3AF6D':p.earth[0]);g.addColorStop(1,isIce?'#689BAF':isSand?'#BC8559':p.earth[1]);
      ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
      ctx.fillStyle='rgba(56,54,47,.07)';ctx.fillRect(0,13,w,4);
      for(let i=0;i<5;i++){
        const x=(i*17+variant*7+6)%w,y=24+(i*23+variant*13)%Math.max(12,h-29);
        ellipse(ctx,x,y,3.5+i%2,2.2,i%2?'rgba(255,231,188,.2)':'rgba(67,58,52,.16)');
      }
      ctx.fillStyle=isIce?'#ECF7F2':isSand?'#F5D790':p.turf;ctx.fillRect(0,0,w,10);
      ctx.fillStyle=isIce?'#C7E7E8':isSand?'#DEB577':p.edge;ctx.fillRect(0,10,w,3);
      if(!isIce&&!isSand){
        for(let i=0;i<3;i++){const x=i*13+variant*3-2;rounded(ctx,x,6,8,11+i%2*3,4,p.turf);}
        ctx.fillStyle=p.light;ctx.fillRect(0,0,w,2.5);
        ctx.strokeStyle=p.light;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(7,6);ctx.lineTo(9,3);ctx.moveTo(22,5);ctx.lineTo(24,3);ctx.stroke();
      }else if(isIce){
        ctx.strokeStyle='rgba(242,255,252,.65)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(8,19);ctx.lineTo(20,31);ctx.moveTo(18,18);ctx.lineTo(30,30);ctx.stroke();
        ctx.strokeStyle='rgba(230,255,249,.3)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,54);ctx.lineTo(17,43);ctx.lineTo(27,50);ctx.lineTo(36,41);ctx.stroke();
      }
    }else if(t.type==='question'){
      rounded(ctx,1,3,w-2,h-3,8,t.bumped?'#9F9B86':'#CFA052',p.ink,1.5);
      rounded(ctx,1,0,w-2,h-5,8,t.bumped?'#BEB9A0':'#F3D47D',t.bumped?'#878E78':'#AF8A51',1.5);
      rounded(ctx,5,3,w-10,4,2,t.bumped?'#D1CEB5':'#FFF0B6');
      if(!t.bumped){ctx.fillStyle='#926E3C';ctx.font='900 25px Trebuchet MS, sans-serif';ctx.textAlign='center';ctx.fillText('?',w*.5,h*.75);}
      else {ellipse(ctx,8,10,2,2,'#888E79');ellipse(ctx,w-8,h-12,2,2,'#888E79');}
    }else if(t.type==='brick'){
      const brick=chapter===2?'#A77C68':chapter>4?'#79858B':'#D1A780';
      rounded(ctx,1,1,w-2,h-2,5,brick,p.ink,1.3);
      ctx.strokeStyle='rgba(70,73,61,.48)';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(2,h*.5);ctx.lineTo(w-2,h*.5);ctx.moveTo(w*.5,2);ctx.lineTo(w*.5,h*.5);ctx.moveTo(w*.25,h*.5);ctx.lineTo(w*.25,h-2);ctx.stroke();
      ctx.strokeStyle='rgba(255,246,218,.45)';ctx.beginPath();ctx.moveTo(5,5);ctx.lineTo(w-6,5);ctx.moveTo(4,h*.5+4);ctx.lineTo(w*.25-3,h*.5+4);ctx.stroke();
    }else if(t.type==='cloud_platform'){
      const cream=t.mushroomOnly;
      rounded(ctx,1,2,w-2,h-3,9,cream?'#F0DFA0':'#BED9D4',cream?'#B89B57':'#88B6AD',1.4);
      rounded(ctx,1,0,w-2,h-6,8,cream?'#FFF0C1':'#FFFEF0');
      for(let i=0;i<Math.floor(w/17);i++) ellipse(ctx,12+i*17,5,9,5,cream?'#FFF3CA':'#FFFEF1');
      rounded(ctx,9,h-6,w-18,2,1,cream?'#D8BE75':'#96C5B9');
    }else if(t.type==='ghost_bridge'){
      rounded(ctx,1,1,w-3,h-2,5,'#AAA1C7','#746A96',1.3);
      rounded(ctx,4,3,w-10,3,1.5,'#DED5EB');
      ctx.strokeStyle='#8B82AE';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w*.6,8);ctx.lineTo(w*.6,h-3);ctx.moveTo(6,h-6);ctx.lineTo(w*.4,h-6);ctx.stroke();
    }else if(t.type==='steel'){
      rounded(ctx,1,1,w-2,h-2,6,'#7F9297','#435E6A',1.5);
      rounded(ctx,4,3,w-8,4,2,'#B9CCCA');
      rounded(ctx,7,11,w-14,h-17,3,'#607F87');
      for(const x of [6,w-6])for(const y of [7,h-7])ellipse(ctx,x,y,1.5,1.5,'#D9E0C9');
    }
    materialCache.set(key,surface.canvas);
    return surface.canvas;
  }

  function drawFlame(ctx,x,y,w,h,timeSec){
    const sway=Math.sin(timeSec*9)*w*.15;
    ctx.beginPath();ctx.moveTo(x,y-h);ctx.bezierCurveTo(x+w*.15+sway,y-h*.3,x+w,y-h*.4,x+w*.5,y);ctx.bezierCurveTo(x-w*.4,y+h*.4,x-w*.8,y-h*.25,x,y-h);ctx.fillStyle='#EE9970';ctx.fill();
    ctx.beginPath();ctx.moveTo(x,y-h*.57);ctx.bezierCurveTo(x+w*.7,y-h*.08,x+w*.15,y+h*.24,x-w*.2,y);ctx.quadraticCurveTo(x-w*.3,y-h*.3,x,y-h*.57);ctx.fillStyle='#FFE2A0';ctx.fill();
  }

  function renderTilesAndHazards(ctx, level, camera, viewW, timeSec) {
    ctx.save();ctx.imageSmoothingEnabled=true;
    for(const t of level.tiles){
      if(t.broken||(t.type==='ghost_bridge'&&t.state==='gone'))continue;
      let x=Math.round(t.x-camera.x);if(x+t.w < -20 || x > viewW+20)continue;
      const y=Math.round(t.y+(t.bumpOffset||0));
      if(t.type==='ghost_bridge'&&t.state==='shaking')x+=Math.sin(timeSec*48)*2;
      ctx.globalAlpha=t.type==='ghost_bridge'?(t.state==='shaking'?.58+Math.sin(timeSec*28)*.2:.88):1;
      const material=getTileMaterial(t,level.chapter);
      ctx.drawImage(material,x-2,y-2,t.w+4,t.h+6);
      ctx.globalAlpha=1;
      if(t.type==='quicksand'){
        ctx.strokeStyle='rgba(160,109,68,.55)';ctx.lineWidth=1.2;
        for(let i=0;i<2;i++){const offset=(timeSec*12+i*15)%29;ctx.beginPath();ctx.ellipse(x+offset+2,y+5+i*4,6,1.8,0,0,Math.PI);ctx.stroke();}
      }
    }
    for(const mp of level.movingPlatforms){
      const x=Math.round(mp.x-camera.x),y=Math.round(mp.y);if(x+mp.w < -30 || x > viewW+30)continue;
      if(mp.theme==='lava'){
        ellipse(ctx,x+mp.w*.5,y+mp.h+4,mp.w*.35,4,'rgba(35,42,48,.12)');
        rounded(ctx,x,y,mp.w,mp.h,7,'#6F8790','#3D606C',1.8);
        rounded(ctx,x+4,y+2,mp.w-8,5,2.5,'#CBD5B5');
        for(let i=0;i<3;i++)rounded(ctx,x+12+i*21,y+mp.h-6,13,3,1.5,'#E5B37B');
        rounded(ctx,x+mp.w*.27,y+mp.h,mp.w*.46,5,2,'#557580');
      }else{
        rounded(ctx,x,y,mp.w,mp.h,9,'#C2DBD2','#88B2A8',1.4);rounded(ctx,x,y,mp.w,mp.h-5,8,'#FFFDF0');
        for(let i=0;i<mp.w/24;i++)ellipse(ctx,x+12+i*23,y+4,13,7,'#FFFDF0');
        rounded(ctx,x+12,y+mp.h-6,mp.w-24,2,1,'#A6CDC0');
      }
    }
    for(const hz of level.hazards){
      const x=Math.round(hz.x-camera.x),y=Math.round(hz.y);
      const reach=hz.type==='firebar'?hz.length+20:(hz.w||0);
      if(x+reach < -40 || x-reach > viewW+40)continue;
      if(hz.type==='spring'){
        const compress=hz.bounceAnim>0?6:0;
        ellipse(ctx,x+hz.w*.5,y+hz.h+1,hz.w*.48,3,'rgba(50,73,52,.13)');
        rounded(ctx,x+8,y+hz.h-4,hz.w-16,4,2,'#A99978');
        ctx.strokeStyle='#9C987D';ctx.lineWidth=2;ctx.beginPath();
        ctx.moveTo(x+11,y+hz.h-4);for(let i=0;i<3;i++)ctx.lineTo(x+(i%2?11:21),y+hz.h-7-i*(3-compress*.3));ctx.stroke();
        mushroom(ctx,x,y+compress,hz.w,hz.h-compress-1,'#DC8774');
      }else if(hz.type==='pudding'){
        const c=hz.bounceAnim>0?5:0;
        ellipse(ctx,x+hz.w*.5,y+hz.h,hz.w*.54,3,'#C6A075');
        rounded(ctx,x+2,y+4+c,hz.w-4,hz.h-5-c,8,'#F4D58C','#B99562',1.2);
        ellipse(ctx,x+hz.w*.5,y+6+c,hz.w*.48,5,'#BD8761');
        ellipse(ctx,x+hz.w*.43,y+4+c,hz.w*.28,2,'#D9A177');
        rounded(ctx,x+6,y+11+c,4,5,2,'#FFEAB3');
      }else if(hz.type==='cactus'){
        rounded(ctx,x+8,y+1,12,hz.h-1,6,'#7FA779','#4F7A59',1.5);
        ctx.strokeStyle='#669361';ctx.lineWidth=8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x+10,y+18);ctx.lineTo(x+3,y+18);ctx.lineTo(x+3,y+9);ctx.moveTo(x+18,y+23);ctx.lineTo(x+25,y+23);ctx.lineTo(x+25,y+13);ctx.stroke();
        ctx.strokeStyle='#B5D296';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(x+13,y+7);ctx.lineTo(x+13,y+hz.h-6);ctx.stroke();
        for(let i=0;i<5;i++){const yy=y+6+i*5;ctx.strokeStyle='#EAE3B9';ctx.beginPath();ctx.moveTo(x+8,yy);ctx.lineTo(x+5,yy-2);ctx.moveTo(x+19,yy+2);ctx.lineTo(x+22,yy);ctx.stroke();}
        flower(ctx,x+14,y+9,'#EDBCBD',.4);
      }else if(hz.type==='ambush_bush'){
        const rustle=hz.triggered?0:Math.sin(timeSec*13+hz.x)*1.2;
        ellipse(ctx,x+hz.w*.5+rustle,y+hz.h-8,hz.w*.53,12,'#3C765F');
        ellipse(ctx,x+12+rustle,y+18,14,13,'#578E6A');ellipse(ctx,x+29+rustle,y+12,17,14,'#629D76');ellipse(ctx,x+42+rustle,y+23,12,10,'#4A855F');
        ellipse(ctx,x+25+rustle,y+4,9,2.5,'rgba(188,220,147,.22)');
        if(!hz.triggered){ellipse(ctx,x+19+rustle,y+21,3,3,'#F1DF99');ellipse(ctx,x+30+rustle,y+21,3,3,'#F1DF99');ellipse(ctx,x+20+rustle,y+21,1.3,2,'#394F48');ellipse(ctx,x+31+rustle,y+21,1.3,2,'#394F48');}
      }else if(hz.type==='icicle'){
        const shake=hz.state==='shaking'?Math.sin(timeSec*50)*2:0;
        ctx.beginPath();ctx.moveTo(x+shake,y);ctx.lineTo(x+hz.w+shake,y);ctx.lineTo(x+hz.w*.5+shake,y+hz.h);ctx.closePath();ctx.fillStyle='#A4D3DE';ctx.fill();ctx.strokeStyle='#6CA8BC';ctx.lineWidth=1.3;ctx.stroke();
        ctx.beginPath();ctx.moveTo(x+4+shake,y+2);ctx.lineTo(x+hz.w*.5+shake,y+hz.h-7);ctx.lineTo(x+hz.w*.48+shake,y+2);ctx.fillStyle='#ECF8F0';ctx.fill();
      }else if(hz.type==='desert_river'||hz.type==='lava'){
        const lava=hz.type==='lava';
        const g=ctx.createLinearGradient(0,y,0,y+hz.h);g.addColorStop(0,lava?'#F6BC75':'#88CEC8');g.addColorStop(1,lava?'#C96B60':'#4D9FA9');
        ctx.beginPath();ctx.moveTo(x,y+5);
        for(let dx=0;dx<=hz.w;dx+=6)ctx.lineTo(x+dx,y+4+Math.sin(dx*.065+timeSec*3.5)*3);
        ctx.lineTo(x+hz.w,y+hz.h);ctx.lineTo(x,y+hz.h);ctx.closePath();ctx.fillStyle=g;ctx.fill();
        ctx.strokeStyle=lava?'#FFE1A1':'#DBF1DE';ctx.lineWidth=2;ctx.beginPath();
        for(let dx=0;dx<=hz.w;dx+=6){const yy=y+4+Math.sin(dx*.065+timeSec*3.5)*3;if(dx===0)ctx.moveTo(x+dx,yy);else ctx.lineTo(x+dx,yy);}ctx.stroke();
        for(let i=0;i<hz.w/28;i++){const xx=x+(i*37+timeSec*(lava?9:-28)+hz.w*10)%hz.w,yy=y+20+i%3*13;ellipse(ctx,xx,yy,lava?3:7,lava?2:1,lava?'rgba(255,219,157,.5)':'rgba(225,250,230,.55)');}
      }else if(hz.type==='firebar'){
        const endX=x+Math.cos(hz.angle)*hz.length,endY=y+Math.sin(hz.angle)*hz.length;
        ctx.strokeStyle='#7F7977';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(endX,endY);ctx.stroke();
        for(let r=16;r<=hz.length;r+=16){const fx=x+Math.cos(hz.angle)*r,fy=y+Math.sin(hz.angle)*r;ellipse(ctx,fx,fy,11,11,'rgba(244,176,112,.12)');const glow=ctx.createRadialGradient(fx-2,fy-2,1,fx,fy,8);glow.addColorStop(0,'#FFF0B5');glow.addColorStop(.46,'#F8CA80');glow.addColorStop(1,level.chapter>=6?'#D29AC6':'#DE8D70');ellipse(ctx,fx,fy,7.3,7.3,glow);ellipse(ctx,fx-2,fy-3,2,1.5,'#FFF5D2');}
        ellipse(ctx,x,y,11,11,'#52747B');ellipse(ctx,x,y,7.5,7.5,'#ABC3B9');ellipse(ctx,x-1,y-1,3,3,'#EBE9C3');
      }
    }
    const gx=Math.round(level.goalX-camera.x),gy=level.groundY;
    if(gx > -120 && gx < viewW+120){
      ellipse(ctx,gx+18,gy+1,47,5,'rgba(65,83,58,.14)');
      rounded(ctx,gx-18,gy-13,36,13,5,'#B3A384','#867D67',1.4);rounded(ctx,gx-13,gy-17,26,7,3,'#F0DCAB');
      rounded(ctx,gx-3,gy-199,6,184,3,'#E5CA95','#B49C76',1);
      ellipse(ctx,gx,gy-204,8,8,'#E4BB6E');ellipse(ctx,gx-2,gy-207,3,3,'#FFF1BE');
      const wave=Math.sin(timeSec*3)*3;
      ctx.beginPath();ctx.moveTo(gx+3,gy-193);ctx.bezierCurveTo(gx+25,gy-199+wave,gx+40,gy-184-wave,gx+66,gy-191);ctx.lineTo(gx+57,gy-170);ctx.lineTo(gx+65,gy-151);ctx.bezierCurveTo(gx+43,gy-145-wave,gx+24,gy-161+wave,gx+3,gy-154);ctx.closePath();ctx.fillStyle='#74AF96';ctx.fill();ctx.strokeStyle='#4D8B78';ctx.lineWidth=1.5;ctx.stroke();
      ctx.save();ctx.translate(gx+30,gy-173+wave*.3);ctx.rotate(-.35);rounded(ctx,-1,0,16,6,3,'#FFF2D7');ellipse(ctx,14,0,3,3,'#FFF2D7');ellipse(ctx,15,6,3,3,'#FFF2D7');ellipse(ctx,-4,2,11,9,'#F1C878');ellipse(ctx,-6,0,6,5,'#FFDE96');ctx.restore();
      rounded(ctx,gx-27,gy-60,55,25,8,'#FFF1CE','#B6A680',1.5);ctx.fillStyle='#6F8D6D';ctx.font='900 14px Trebuchet MS, sans-serif';ctx.textAlign='center';ctx.fillText('GOAL',gx,gy-43);
      flower(ctx,gx-30,gy,'#F2D887',.65);flower(ctx,gx+35,gy,'#E8B2A4',.5);
      if(ns.Sprites&&ns.Sprites.drawXiaoQi)ns.Sprites.drawXiaoQi(ctx,gx+48,gy+4,true,timeSec);
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

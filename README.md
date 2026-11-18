# 《奶龙大冒险：鸡腿保卫战》（48关完整版）

一款基于原生 **HTML5 Canvas + ES6 模块化 JavaScript + Web Audio API + Cloudflare Pages Functions / Workers** 打造的横版平台跳跃闯关游戏（60 FPS 流畅运行）。

## 📁 目录结构

```text
/Users/junxibao/code/HTML/NAILONG_ADVENTURE/
├── index.html                   # 奶油黄与薄荷绿的卡通冒险首页、游戏 HUD 与图鉴
├── css/
│   └── style.css                # 响应式卡片、状态栏、移动端手柄与弹窗样式
├── js/
│   ├── menu-art.js              # 主菜单草地场景与四类攻击物图鉴的实时 Canvas 绘制
│   ├── sprites.js               # 柔和光照 SDF 角色与高清道具缓存引擎（奶龙、暴暴龙、双形态小紫兵、小七、大鸡腿、辣椒等）
│   ├── physics.js               # 平台跳跃核心物理引擎（可变跳跃高度、土狼时间、跳跃预输入、敌人主动攻击、Boss战AI）
│   ├── weather.js               # 关卡专属固定天气系统（晴朗/大雨/强风/暴雪/雷暴）与物理手感联动
│   ├── levels.js                # 八大章节与 48 个完整关卡生成器，分层场景及圆润机关材质
│   ├── audio.js                 # Web Audio API 8-bit 芯片音乐与音效合成器 + 原版奶龙语音联动
│   ├── leaderboard.js           # 对接 Cloudflare Pages (/api/leaderboard) 的真实云端排行榜与本地进度同步
│   └── main.js                  # 60 FPS 主控循环、相机跟随与双端输入控制
├── functions/
│   └── api/
│       └── leaderboard.js       # Cloudflare Pages Functions 云端排行榜接口（KV / Edge Cache 持久化 + 重名校验）
├── worker/
│   └── index.mjs                # Cloudflare Workers + SQLite Durable Objects (LeaderboardDO) 后端
├── wrangler.jsonc               # Cloudflare 部署配置文件
├── assets/
│   └── audio/                   # 原版奶龙趣味语音包
└── images/                      # 官方角色参考图库（用于角色图鉴 1:1 还原对比）
```

## 视觉与操作

首页以实时绘制的奶龙草地场景为主视觉。游戏内的八章场景、角色光照、问号箱与机关使用统一卡通风格；辣椒火球、紫晶炸弹、晶刺飞弹、等离子球配有独立造型、拖尾与冲击效果。角色图鉴中可查看四种招式。

- 移动：A / D 或左右方向键；跳跃：W / 空格，长按跳得更高。
- 喷火：吃下辣椒后按 J / Z / X；暂停：P / Esc；音效开关：M。
- 所有竖屏窗口均须切换为横屏才能使用；游戏中转回竖屏会自动暂停，恢复横屏后继续。支持方向锁定的浏览器可点击提示按钮尝试自动横屏，其他设备需手动旋转。
- 触屏设备可同时使用方向、跳跃与攻击按钮。切离页面或打开游戏内图鉴、选关时会暂停游戏。
- 页面直接加载，无需构建或安装依赖；所有新增画面由本地 Canvas / SVG 绘制。

## ☁️ Cloudflare Pages / Workers 部署说明

1. **Cloudflare Pages 直接部署**：
   - 将 `/Users/junxibao/code/HTML/NAILONG_ADVENTURE` 作为项目根目录推送或上传至 Cloudflare Pages。
   - Build output directory 设置为 `/`（或 `.`），无需额外构建命令，目录内的 `functions/api/leaderboard.js` 将自动挂载为 `/api/leaderboard` 云端排行榜接口。
2. **Wrangler CLI (Workers + SQLite Durable Objects) 部署**：
   ```bash
   cd /Users/junxibao/code/HTML/NAILONG_ADVENTURE
   npx wrangler deploy
   ```

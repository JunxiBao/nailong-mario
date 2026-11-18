# 《奶龙大冒险：鸡腿保卫战》（30关完整版）

一款基于原生 **HTML5 Canvas + ES6 模块化 JavaScript + Web Audio API + Cloudflare Pages Functions / Workers** 打造的横版平台跳跃闯关游戏（60 FPS 流畅运行）。

## 📁 目录结构

```text
/Users/junxibao/code/HTML/NAILONG_ADVENTURE/
├── index.html                   # 极简优雅深色毛玻璃 UI 主页面
├── css/
│   └── style.css                # 现代克制深色毛玻璃样式表
├── js/
│   ├── sprites.js               # 3D-SDF 体积像素角色建模引擎（奶龙、暴暴龙、双形态小紫兵、小七、大鸡腿、辣椒等）
│   ├── physics.js               # 平台跳跃核心物理引擎（可变跳跃高度、土狼时间、跳跃预输入、敌人主动攻击、Boss战AI）
│   ├── weather.js               # 关卡专属固定天气系统（晴朗/大雨/强风/暴雪/雷暴）与物理手感联动
│   ├── levels.js                # 五大章节主题与 30 个完整关卡生成器及场景机关绘制
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

## ☁️ Cloudflare Pages / Workers 部署说明

1. **Cloudflare Pages 直接部署**：
   - 将 `/Users/junxibao/code/HTML/NAILONG_ADVENTURE` 作为项目根目录推送或上传至 Cloudflare Pages。
   - Build output directory 设置为 `/`（或 `.`），无需额外构建命令，目录内的 `functions/api/leaderboard.js` 将自动挂载为 `/api/leaderboard` 云端排行榜接口。
2. **Wrangler CLI (Workers + SQLite Durable Objects) 部署**：
   ```bash
   cd /Users/junxibao/code/HTML/NAILONG_ADVENTURE
   npx wrangler deploy
   ```

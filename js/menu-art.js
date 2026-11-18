/** A small canvas diorama for the adventure home screen. No external assets. */
window.NailongAdventure = window.NailongAdventure || {};
(function (ns) {
  "use strict";
  const TAU = Math.PI * 2;
  let scenery = null;
  function ellipse(ctx, x, y, rx, ry, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.fill();
  }
  function leaf(ctx, x, y, length, angle, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-length * 0.7, -length * 0.6, 0, -length);
    ctx.quadraticCurveTo(length * 0.7, -length * 0.6, 0, 0);
    ctx.fill();
    ctx.restore();
  }
  function flower(ctx, x, y, s, color) {
    ctx.strokeStyle = "#8caa6f";
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 2);
    ctx.quadraticCurveTo(x + s, y + s, x, y);
    ctx.stroke();
    leaf(ctx, x + 2, y + s * 1.5, s, 0.8, "#a5bd7e");
    for (let i = 0; i < 5; i++) {
      const a = (i * TAU) / 5 - Math.PI / 2;
      ellipse(
        ctx,
        x + Math.cos(a) * s * 0.58,
        y + Math.sin(a) * s * 0.58,
        s * 0.52,
        s * 0.5,
        color,
      );
    }
    ellipse(ctx, x, y, s * 0.33, s * 0.33, "#edc66c");
  }
  function bush(ctx, x, y, s, color) {
    ellipse(ctx, x - s * 0.4, y, s * 0.6, s * 0.55, color);
    ellipse(ctx, x, y - s * 0.3, s * 0.65, s * 0.7, color);
    ellipse(ctx, x + s * 0.5, y + s * 0.05, s * 0.58, s * 0.55, color);
    leaf(ctx, x + s * 0.2, y + s * 0.3, s * 0.55, -0.7, "#d0dea7");
  }
  function cloud(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ellipse(ctx, 0, 4, 44, 13, "#fffdf5df");
    ellipse(ctx, -13, -3, 18, 17, "#fffdf5df");
    ellipse(ctx, 10, -10, 25, 24, "#fffdf5df");
    ctx.restore();
  }
  function mushroom(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.13);
    ctx.fillStyle = "#f2e6c1";
    ctx.beginPath();
    ctx.roundRect(-size * 0.15, -size * 0.48, size * 0.32, size * 0.55, 5);
    ctx.fill();
    const cap = ctx.createLinearGradient(0, -size, 0, -0.3 * size);
    cap.addColorStop(0, "#eac08d");
    cap.addColorStop(1, "#d39f76");
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.46, size * 0.62, size * 0.47, 0, Math.PI, TAU);
    ctx.quadraticCurveTo(0, -size * 0.2, -size * 0.62, -size * 0.46);
    ctx.fill();
    ellipse(ctx, -size * 0.2, -size * 0.68, size * 0.1, size * 0.08, "#fff1cc");
    ellipse(ctx, size * 0.23, -size * 0.62, size * 0.13, size * 0.1, "#fff1cc");
    ctx.restore();
  }
  function buildScenery() {
    const cv = document.createElement("canvas");
    cv.width = 1080;
    cv.height = 1120;
    const ctx = cv.getContext("2d");
    ctx.scale(2, 2);
    ellipse(ctx, 272, 444, 183, 18, "#67844a0a");
    ellipse(ctx, 272, 435, 155, 14, "#67844a0d");
    // Rounded earth cross section; the grass shares a continuous silhouette.
    const soil = ctx.createLinearGradient(150, 340, 280, 449);
    soil.addColorStop(0, "#d9c596");
    soil.addColorStop(0.6, "#b8b184");
    soil.addColorStop(1, "#99a97c");
    ctx.fillStyle = soil;
    ctx.beginPath();
    ctx.moveTo(57, 348);
    ctx.bezierCurveTo(55, 411, 111, 429, 211, 437);
    ctx.bezierCurveTo(303, 455, 441, 414, 480, 358);
    ctx.lineTo(464, 340);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e6d4a2";
    ctx.beginPath();
    ctx.moveTo(60, 355);
    ctx.bezierCurveTo(98, 387, 145, 394, 193, 394);
    ctx.bezierCurveTo(255, 416, 313, 398, 366, 393);
    ctx.bezierCurveTo(421, 393, 472, 365, 480, 350);
    ctx.lineTo(469, 338);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 31; i++) {
      const x = 85 + ((i * 67) % 350),
        y = 382 + ((i * 19) % 40);
      if ((x - 270) ** 2 / 190 ** 2 + (y - 363) ** 2 / 77 ** 2 < 0.86)
        ellipse(
          ctx,
          x,
          y,
          2 + (i % 3),
          1.3 + (i % 2),
          i % 2 ? "#97a37660" : "#f3e1ae80",
        );
    }
    const grass = ctx.createRadialGradient(217, 314, 10, 255, 348, 238);
    grass.addColorStop(0, "#dce6b0");
    grass.addColorStop(0.55, "#b9d18f");
    grass.addColorStop(1, "#94b87b");
    ellipse(ctx, 269, 344, 214, 55, grass);
    ctx.strokeStyle = "#eff4c173";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(269, 341, 207, 52, 0, Math.PI * 1.06, TAU * 0.96);
    ctx.stroke();
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI + 0.08,
        x = 270 + Math.cos(a) * 204,
        y = 344 + Math.sin(a) * 49;
      leaf(
        ctx,
        x,
        y,
        5 + (i % 5),
        ((i % 3) - 1) * 0.4,
        i % 2 ? "#9dbd7b" : "#afca87",
      );
    }
    bush(ctx, 92, 331, 38, "#acc78e");
    bush(ctx, 424, 323, 42, "#a4bd89");
    bush(ctx, 426, 342, 24, "#b8cf92");
    for (let i = 0; i < 20; i++) {
      const x = 105 + ((i * 79) % 325),
        y = 317 + ((i * 31) % 59);
      if (i % 3 === 0)
        flower(ctx, x, y, 3.5 + (i % 3), i % 2 ? "#fff8db" : "#e8bca7");
      else {
        leaf(ctx, x, y + 7, 7 + (i % 4), -0.4, "#97b77a");
        leaf(ctx, x, y + 7, 6 + (i % 3), 0.6, "#acc88c");
      }
    }
    mushroom(ctx, 112, 358, 28);
    mushroom(ctx, 443, 359, 20);
    flower(ctx, 177, 380, 5, "#fff8df");
    flower(ctx, 385, 373, 5, "#f3dbb9");
    return cv;
  }
  function star(ctx, x, y, radius, color, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const r = i % 2 ? radius * 0.28 : radius;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function drawCharacter(ctx, frame, x, bottom, size, rotation) {
    if (!frame) return;
    ctx.save();
    ctx.translate(x, bottom);
    ctx.rotate(rotation || 0);
    ctx.drawImage(frame, -size / 2, -size, size, size);
    ctx.restore();
  }
  ns.MenuArt = {
    renderArsenal(timeSec) {
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
        timeSec = 0;
      const world = ns.Physics;
      const models = [
        [
          "fireball",
          (ctx) =>
            world._drawFireball(
              ctx,
              { w: 14, x: 50, vx: 430, vy: 0, dmg: 1 },
              timeSec,
            ),
        ],
        ["bomb", (ctx) => world._drawBomb(ctx, { w: 14, x: 50 }, timeSec)],
        ["bolt", (ctx) => world._drawBolt(ctx, { vx: 235, vy: 0 }, timeSec)],
        ["plasma", (ctx) => world._drawPlasma(ctx, { w: 16, x: 50 }, timeSec)],
      ];
      for (const [name, draw] of models) {
        const canvas = document.getElementById(`codex-${name}`);
        if (!canvas) continue;
        const ctx = canvas.getContext("2d");
        ctx.setTransform(2, 0, 0, 2, 0, 0);
        ctx.clearRect(0, 0, 180, 110);
        ellipse(ctx, 90, 82, 32, 4, "#72835f17");
        ctx.save();
        ctx.translate(90, 51 + Math.sin(timeSec * 2) * 2);
        ctx.scale(2.8, 2.8);
        draw(ctx);
        ctx.restore();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    },
    render(timeSec) {
      const canvas = document.getElementById("menu-scene");
      const cache = ns.Sprites.cache;
      if (!canvas || !cache.codex.nailong) return;
      if (!scenery) scenery = buildScenery();
      const ctx = canvas.getContext("2d");
      const reduced =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const t = reduced ? 0 : timeSec;
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.clearRect(0, 0, 540, 560);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      cloud(ctx, 99 + Math.sin(t * 0.24) * 4, 193, 0.68);
      cloud(ctx, 439 + Math.sin(t * 0.3) * 4, 197, 0.76);
      cloud(ctx, 364, 109, 0.37);
      ctx.drawImage(scenery, 0, 0, 540, 560);
      // Supporting cast sits behind the large hero, with their own contact shadows.
      ellipse(ctx, 384, 336, 31, 6, "#638b5440");
      ellipse(ctx, 145, 342, 29, 6, "#638b5440");
      drawCharacter(
        ctx,
        cache.codex.baobaolong[0],
        387,
        345 + Math.sin(t * 2 + 1) * 1.7,
        124,
        0.08,
      );
      drawCharacter(
        ctx,
        cache.codex.xiaoqi[0],
        139,
        346 + Math.sin(t * 2 + 3) * 1.2,
        112,
        -0.07,
      );
      ellipse(ctx, 266, 360, 84, 13, "#6a894a25");
      ellipse(ctx, 266, 360, 57, 7, "#6a894a20");
      drawCharacter(
        ctx,
        cache.codex.nailong[0],
        267,
        373 + Math.sin(t * 2.3) * 3,
        324,
        Math.sin(t * 1.1) * 0.013,
      );
      // A collectible and loose petals make the diorama feel like a playable world.
      ctx.save();
      ctx.translate(409, 230 + Math.sin(t * 1.7) * 7);
      ctx.rotate(0.28 + Math.sin(t) * 0.08);
      const drumstick = cache.items.goldenDrumstick;
      if (drumstick) ctx.drawImage(drumstick, -25, -25, 50, 50);
      ctx.restore();
      star(ctx, 177, 175, 8, "#e4be63", 0.1 + Math.sin(t) * 0.15);
      star(ctx, 415, 278, 5, "#f8f1c8", -0.1);
      star(ctx, 339, 154, 5, "#e0b95c", 0.2);
      for (let i = 0; i < 4; i++) {
        const phase = t * 0.25 + i * 1.8;
        leaf(
          ctx,
          80 + i * 123 + Math.sin(phase) * 9,
          270 + Math.cos(phase) * 34 - i * 16,
          7,
          phase,
          "#b7c68b",
        );
      }
      flower(ctx, 217, 374, 5, "#fff6dc");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
  };
})(window.NailongAdventure);

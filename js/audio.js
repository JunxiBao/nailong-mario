/**
 * 《奶龙大冒险：鸡腿保卫战》- 原生 Web Audio API 8-bit 芯片音乐与音效合成器 (audio.js)
 *
 * 零外部依赖合成：
 * - 跳跃音、吃鸡腿清脆音效、黄金大鸡腿和弦、踩扁小紫兵连击音阶、顶砖块/碎砖块音效、喷火音效、弹簧音、落雷音、受击音、过关胜利旋律
 * - 五大章节专属 8-bit 背景音乐 (BGM) 循环 + 暴暴龙 Boss 战专属激燃 BGM
 * - 内置原版奶龙语音包（吃黄金鸡腿/过关/开局时触发趣味语音与字幕提示）
 */

window.NailongAdventure = window.NailongAdventure || {};

(function (ns) {
  'use strict';

  const COMBO_FREQS = [330, 392, 440, 523.25, 659.25, 783.99, 1046.5, 1318.5];

  // 五大章节 + Boss战 8-bit 旋律与低音伴奏音序 (Hz)
  const CHAPTER_BGMS = {
    1: {
      tempoMs: 190,
      lead: [523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 523.25, 587.33, 698.46, 880.0, 698.46, 783.99, 659.25, 523.25, 0],
      bass: [261.63, 0, 196.0, 0, 220.0, 0, 196.0, 0, 174.61, 0, 196.0, 0, 261.63, 196.0, 130.81, 0],
      wave: 'square',
    },
    2: {
      tempoMs: 200,
      lead: [440.0, 523.25, 554.37, 659.25, 554.37, 523.25, 440.0, 0, 493.88, 587.33, 659.25, 587.33, 554.37, 523.25, 440.0, 0],
      bass: [220.0, 220.0, 164.81, 0, 220.0, 220.0, 164.81, 0, 196.0, 196.0, 146.83, 0, 220.0, 164.81, 110.0, 0],
      wave: 'triangle',
    },
    3: {
      tempoMs: 220,
      lead: [329.63, 392.0, 493.88, 440.0, 392.0, 329.63, 293.66, 0, 329.63, 440.0, 523.25, 493.88, 392.0, 369.99, 329.63, 0],
      bass: [164.81, 0, 123.47, 0, 146.83, 0, 110.0, 0, 130.81, 0, 146.83, 0, 164.81, 123.47, 82.41, 0],
      wave: 'sine',
    },
    4: {
      tempoMs: 185,
      lead: [659.25, 783.99, 1046.5, 987.77, 880.0, 783.99, 659.25, 523.25, 587.33, 783.99, 987.77, 880.0, 783.99, 659.25, 1046.5, 0],
      bass: [261.63, 329.63, 392.0, 0, 220.0, 261.63, 329.63, 0, 196.0, 246.94, 293.66, 0, 261.63, 196.0, 261.63, 0],
      wave: 'triangle',
    },
    5: {
      tempoMs: 165,
      lead: [293.66, 349.23, 440.0, 466.16, 440.0, 349.23, 293.66, 261.63, 293.66, 349.23, 523.25, 466.16, 440.0, 392.0, 293.66, 0],
      bass: [146.83, 146.83, 220.0, 146.83, 138.59, 138.59, 207.65, 138.59, 130.81, 130.81, 196.0, 130.81, 146.83, 110.0, 146.83, 0],
      wave: 'sawtooth',
    },
    boss: {
      tempoMs: 145,
      lead: [329.63, 349.23, 329.63, 293.66, 329.63, 440.0, 392.0, 349.23, 329.63, 349.23, 493.88, 466.16, 440.0, 392.0, 329.63, 0],
      bass: [164.81, 164.81, 246.94, 164.81, 174.61, 174.61, 261.63, 174.61, 164.81, 164.81, 233.08, 220.0, 196.0, 174.61, 164.81, 0],
      wave: 'sawtooth',
    },
  };

  const VOICE_CLIPS = [
    { url: 'assets/audio/nailong_voice.mp3', subtitle: '“我是奶龙！”' },
    { url: 'assets/audio/nailong_belly_voice.mp3', subtitle: '“我的大肚肚，真的很酷酷~”' },
    { url: 'assets/audio/nailong_voice_1.mp3', subtitle: '“今天的鸡腿腿真香呀！”' },
    { url: 'assets/audio/nailong_voice_2.mp3', subtitle: '“我没有脖子我也没有腰，我就是个球球~”' },
    { url: 'assets/audio/nailong_voice_3.mp3', subtitle: '“小七，快看我的超级大跳！”' },
  ];

  class SoundSystem {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.bgmTimer = null;
      this.bgmStep = 0;
      this.currentBgmKey = 1;
      this.voiceIndex = 0;
      this.voiceElements = [];
      this.onSubtitle = null;
      this._initVoices();
    }

    _initVoices() {
      if (typeof Audio === 'undefined') return;
      for (const v of VOICE_CLIPS) {
        try {
          const el = new Audio(v.url);
          el.preload = 'auto';
          this.voiceElements.push({ el, subtitle: v.subtitle });
        } catch (_e) {
          // 忽略离线环境错误
        }
      }
    }

    ensureContext() {
      if (this.muted) return null;
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    unlock() {
      this.ensureContext();
    }

    toggleMute() {
      this.muted = !this.muted;
      if (this.muted) {
        this.stopBgm();
        for (const v of this.voiceElements) {
          try {
            v.el.pause();
          } catch (_e) {}
        }
      } else {
        this.startBgm(this.currentBgmKey);
      }
      return this.muted;
    }

    playTone(freq, duration, type = 'square', gainPeak = 0.12, delay = 0, endFreq = null) {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(24, freq), t0);
      if (endFreq !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(24, endFreq), t0 + duration);
      }

      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(gainPeak, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    }

    playNoise(duration = 0.12, gainPeak = 0.1, delay = 0) {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const sampleRate = ctx.sampleRate;
      const frameCount = Math.max(1, Math.floor(sampleRate * duration));
      const buffer = ctx.createBuffer(1, frameCount, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / frameCount);
      }
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = buffer;
      gain.gain.setValueAtTime(gainPeak, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(ctx.currentTime + delay);
    }

    playJump(isBig = false) {
      this.playTone(isBig ? 220 : 280, 0.15, 'square', 0.11, 0, isBig ? 580 : 660);
    }

    playDrumstick(isGolden = false) {
      if (isGolden) {
        const notes = [587.33, 783.99, 987.77, 1174.66, 1567.98];
        notes.forEach((f, idx) => {
          this.playTone(f, 0.14, 'square', 0.11, idx * 0.05);
        });
      } else {
        this.playTone(987.77, 0.07, 'square', 0.09, 0);
        this.playTone(1318.51, 0.16, 'square', 0.1, 0.06);
      }
    }

    playStomp(comboCount = 1) {
      const idx = Math.min(COMBO_FREQS.length - 1, Math.max(0, comboCount - 1));
      const base = COMBO_FREQS[idx];
      this.playTone(base * 0.6, 0.08, 'triangle', 0.15, 0, base * 1.4);
      this.playTone(base * 1.5, 0.14, 'square', 0.1, 0.05, base * 2.0);
    }

    playBlockBump(hasItem = false) {
      this.playTone(150, 0.08, 'triangle', 0.16, 0, 95);
      if (hasItem) {
        [330, 392, 659, 523, 587, 784].forEach((f, i) => {
          this.playTone(f, 0.08, 'square', 0.08, 0.06 + i * 0.045);
        });
      }
    }

    playBrickBreak() {
      this.playNoise(0.14, 0.16, 0);
      this.playTone(180, 0.12, 'sawtooth', 0.12, 0, 65);
    }

    playFireball() {
      this.playTone(880, 0.11, 'sawtooth', 0.1, 0, 220);
      this.playNoise(0.06, 0.06, 0.02);
    }

    playPowerup() {
      const notes = [330, 392, 659.25, 523.25, 587.33, 783.99, 659.25, 1046.5];
      notes.forEach((f, i) => {
        this.playTone(f, 0.09, 'square', 0.1, i * 0.05);
      });
    }

    playSpring() {
      this.playTone(180, 0.26, 'triangle', 0.16, 0, 720);
      this.playTone(280, 0.22, 'square', 0.08, 0.05, 920);
    }

    playThunder() {
      this.playNoise(0.38, 0.2, 0);
      this.playTone(95, 0.35, 'sawtooth', 0.14, 0, 36);
    }

    playBossAttack() {
      this.playTone(240, 0.18, 'sawtooth', 0.12, 0, 90);
      this.playTone(480, 0.12, 'square', 0.08, 0.04, 160);
    }

    playHurt() {
      [440, 349.23, 293.66, 220].forEach((f, i) => {
        this.playTone(f, 0.1, 'sawtooth', 0.11, i * 0.06);
      });
    }

    playGameOver() {
      [523.25, 493.88, 440.0, 392.0, 349.23, 261.63].forEach((f, i) => {
        this.playTone(f, 0.22, 'triangle', 0.13, i * 0.14);
      });
    }

    playVictory() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 880.0, 1046.5, 1318.5];
      const delays = [0, 0.1, 0.2, 0.32, 0.46, 0.58, 0.72];
      notes.forEach((f, i) => {
        const dur = i === notes.length - 1 ? 0.45 : 0.12;
        this.playTone(f, dur, 'square', 0.11, delays[i]);
        this.playTone(f * 0.5, dur, 'triangle', 0.1, delays[i]);
      });
    }

    playVoiceLine() {
      const clip = this.voiceElements[this.voiceIndex % Math.max(1, this.voiceElements.length)];
      this.voiceIndex++;
      if (!clip) return;
      if (this.onSubtitle) {
        this.onSubtitle(clip.subtitle);
      }
      if (this.muted) return;
      try {
        clip.el.currentTime = 0;
        clip.el.volume = 0.9;
        clip.el.play().catch(() => {});
      } catch (_e) {}
    }

    startBgm(chapterOrBoss = 1) {
      this.currentBgmKey = chapterOrBoss;
      this.stopBgm();
      if (this.muted) return;
      const spec = CHAPTER_BGMS[chapterOrBoss] || CHAPTER_BGMS[1];
      this.bgmStep = 0;
      this.bgmTimer = window.setInterval(() => {
        if (this.muted) return;
        const ctx = this.ctx;
        if (!ctx || ctx.state !== 'running') return;
        const step = this.bgmStep % spec.lead.length;
        this.bgmStep++;
        const leadFreq = spec.lead[step];
        const bassFreq = spec.bass[step % spec.bass.length];
        if (leadFreq > 0) {
          this.playTone(leadFreq, spec.tempoMs * 0.00075, spec.wave, 0.032, 0);
        }
        if (bassFreq > 0) {
          this.playTone(bassFreq, spec.tempoMs * 0.00085, 'triangle', 0.04, 0);
        }
      }, spec.tempoMs);
    }

    stopBgm() {
      if (this.bgmTimer !== null) {
        clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }
    }
  }

  ns.Audio = new SoundSystem();
})(window.NailongAdventure);

(function () {
  // Sound effects made with the Web Audio API: no audio files to load. Everything is
  // silent until the visitor turns sound on with the corner button.
  const sound = (Bar.sound = { enabled: false });
  const KEY = 'siphappens-sound';
  let ctx = null, master = null, noise = null, btn = null;
  const last = {};

  const rand = (a, b) => a + Math.random() * (b - a);

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    // two seconds of white noise, reused by every noisy sound
    const len = ctx.sampleRate * 2;
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  }

  // a pure tone with a fast attack and an exponential fade
  function tone(freq, t, peak, decay, type) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + decay + 0.05);
  }

  // filtered noise whose filter slides from f0 to f1
  function burst(t, dur, peak, kind, f0, f1, q) {
    const s = ctx.createBufferSource();
    s.buffer = noise; s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = kind;
    f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }

  const SOUNDS = {
    // two glasses touching: a bell-like ping with a few inharmonic partials
    clink(t, vol) {
      const v = vol || 1, f = rand(2300, 2900);
      [[1, 0.5, 1.1], [2.32, 0.3, 0.7], [4.25, 0.16, 0.45], [6.63, 0.09, 0.25]].forEach(r => tone(f * r[0], t, r[1] * v, r[2]));
      burst(t, 0.012, 0.2 * v, 'highpass', 4000, 6000);
    },
    cheers(t) {
      SOUNDS.clink(t, 1.2);
      tone(3400, t + 0.03, 0.1, 0.6);
      [0, 1, 2].forEach(i => tone(rand(4200, 6000), t + 0.12 + i * 0.07, 0.06, 0.35));
    },
    // ice cubes knocking
    ice(t) {
      [0, 0.045, 0.11].forEach((dt, i) => {
        const f = rand(3200, 4600);
        tone(f, t + dt, 0.22 - i * 0.05, 0.09);
        tone(f * 2.3, t + dt, 0.1, 0.05);
      });
      burst(t, 0.03, 0.12, 'bandpass', 5000, 3000, 2);
    },
    // something soft dropping into the drink
    plop(t) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(rand(380, 520), t);
      o.frequency.exponentialRampToValueAtTime(110, t + 0.14);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.2);
    },
    pour(t) {
      burst(t, 0.7, 0.26, 'bandpass', 700, 1700, 0.8);
      burst(t + 0.1, 0.5, 0.12, 'highpass', 3000, 2500);
    },
    // carbonation: lots of tiny, quiet pops
    fizz(t) {
      for (let i = 0; i < 46; i++) burst(t + rand(0, 1.3), rand(0.01, 0.03), rand(0.03, 0.09), 'highpass', rand(4500, 7500), 5000);
    },
    shake(t) {
      for (let i = 0; i < 9; i++) burst(t + i * 0.085, 0.06, 0.2, 'bandpass', rand(2500, 4000), 2000, 2.5);
    },
    // the wave rising (up = true) or falling
    whoosh(t, up) {
      burst(t, 0.9, 0.22, 'lowpass', up ? 250 : 2400, up ? 2400 : 250, 0.7);
    },
    tick(t) { tone(1800, t, 0.12, 0.03, 'triangle'); }
  };

  // shortest gap between two plays of the same sound, in ms
  const MIN_GAP = { tick: 25, ice: 80, plop: 70, pour: 250, fizz: 1500, shake: 600, whoosh: 500, clink: 150, cheers: 400 };

  sound.play = function (name, arg) {
    if (!sound.enabled || !ctx || ctx.state === 'closed' || !SOUNDS[name]) return;
    const now = performance.now();
    if (now - (last[name] || 0) < (MIN_GAP[name] || 60)) return;
    last[name] = now;
    if (ctx.state === 'suspended') ctx.resume();
    SOUNDS[name](ctx.currentTime + 0.01, arg);
  };

  // an ingredient landing in the glass
  sound.ingredient = function (piece) {
    sound.play(piece === 'splash' || piece === 'honey' ? 'pour' : piece === 'ice' ? 'ice' : 'plop');
  };

  // a drink's signature effect starting
  const EFFECTS = { honeyDrip: 'plop', iceClink: 'clink', shakeFoam: 'shake', bubbles: 'fizz' };
  sound.effect = function (name) { if (EFFECTS[name]) sound.play(EFFECTS[name]); };

  function setEnabled(on) {
    sound.enabled = on;
    if (btn) {
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
    }
    if (on) { ensureCtx(); if (ctx && ctx.state === 'suspended') ctx.resume(); }
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* storage blocked: fine */ }
  }

  sound.init = function () {
    btn = document.getElementById('sound-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      setEnabled(!sound.enabled);
      if (sound.enabled) sound.play('clink');
    });
    let stored = null;
    try { stored = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
    if (stored === '1') {
      // the visitor had it on last time; browsers keep audio locked until a first gesture
      sound.enabled = true;
      btn.setAttribute('aria-pressed', 'true');
      btn.setAttribute('aria-label', 'Turn sound off');
      const unlock = () => {
        ensureCtx();
        if (ctx && ctx.state === 'suspended') ctx.resume();
        removeEventListener('pointerdown', unlock);
        removeEventListener('keydown', unlock);
      };
      addEventListener('pointerdown', unlock);
      addEventListener('keydown', unlock);
    }
  };
})();

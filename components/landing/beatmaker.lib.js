/* eslint-disable */
// @ts-nocheck
// Vendored verbatim from the landing handoff (beatmaker.js) — a self-contained
// Web Audio step sequencer. Sets window.SeshnBeatmaker = { mount }. Imported for
// side effects by components/landing/Beatmaker.tsx.
/* ════════════════════════════════════════════════════════════════
   SESHN · Beatmaker — embeddable Web Audio step sequencer + pads
   ----------------------------------------------------------------
   Self-contained. No deps, no external audio files, no storage.
   Synthesized drum kit (osc + filtered noise). Look-ahead scheduler.
   Theme-aware: pass { accent, bg, panel, line, ink, ink2, font, fontMono, square }.

   Usage:
     SeshnBeatmaker.mount(document.getElementById('bm'), {
       accent: '#2CCB73', bg:'#131312', panel:'#1a1a18',
       line:'#2d2d29', ink:'#e9e8e0', ink2:'#b6b5ab',
       font:'"Inter Tight",sans-serif', fontMono:'"JetBrains Mono",monospace',
       square: false   // true = hard-edged riso/zine look
     });
   ════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const TRACKS = [
    { id: "kick",  name: "Kick",   key: "A", synth: "kick" },
    { id: "snare", name: "Snare",  key: "S", synth: "snare" },
    { id: "chat",  name: "Hi-Hat", key: "D", synth: "chat" },
    { id: "ohat",  name: "Open Hat", key: "F", synth: "ohat" },
    { id: "clap",  name: "Clap",   key: "G", synth: "clap" },
    { id: "tom",   name: "Tom",    key: "H", synth: "tom" },
    { id: "rim",   name: "Rim",    key: "J", synth: "rim" },
    { id: "crash", name: "Crash",  key: "K", synth: "crash" },
  ];

  const STEPS = 16;

  const PRESETS = {
    "Boom-bap": {
      kick:  [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
      chat:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      ohat:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0],
      clap:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      tom:   [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      rim:   [0,0,1,0, 0,0,0,1, 0,0,1,0, 0,0,0,0],
      crash: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    },
    "Trap": {
      kick:  [1,0,0,0, 0,0,1,0, 0,1,0,0, 0,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      chat:  [1,1,1,1, 1,1,1,0, 1,1,0,1, 1,1,1,1],
      ohat:  [0,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
      clap:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      tom:   [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,1],
      rim:   [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      crash: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    },
    "House": {
      kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      chat:  [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
      ohat:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0],
      clap:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      tom:   [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      rim:   [0,0,0,1, 0,0,0,1, 0,0,0,1, 0,0,0,1],
      crash: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    },
    "Afrobeats": {
      kick:  [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,0],
      snare: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
      chat:  [1,0,1,1, 0,1,1,0, 1,0,1,1, 0,1,1,0],
      ohat:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0],
      clap:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
      tom:   [0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,1],
      rim:   [0,1,0,0, 1,0,0,1, 0,1,0,0, 1,0,0,0],
      crash: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    },
  };

  // ─── Synthesis ─────────────────────────────────────────────────
  function makeNoiseBuffer(ctx) {
    const len = ctx.sampleRate * 1.0;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function trigger(ctx, noiseBuf, out, synth, time, custom) {
    if (custom && custom.buffer) {
      const s = ctx.createBufferSource();
      s.buffer = custom.buffer;
      const g = ctx.createGain();
      g.gain.value = 0.9;
      s.connect(g).connect(out);
      s.start(time);
      return;
    }
    switch (synth) {
      case "kick": {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(150, time);
        o.frequency.exponentialRampToValueAtTime(48, time + 0.12);
        g.gain.setValueAtTime(1.0, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.42);
        o.connect(g).connect(out);
        o.start(time); o.stop(time + 0.45);
        break;
      }
      case "snare": {
        const n = ctx.createBufferSource(); n.buffer = noiseBuf;
        const bp = ctx.createBiquadFilter(); bp.type = "highpass"; bp.frequency.value = 1500;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.8, time);
        ng.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
        n.connect(bp).connect(ng).connect(out);
        n.start(time); n.stop(time + 0.2);
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = "triangle"; o.frequency.setValueAtTime(180, time);
        og.gain.setValueAtTime(0.5, time);
        og.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        o.connect(og).connect(out);
        o.start(time); o.stop(time + 0.12);
        break;
      }
      case "chat": {
        const n = ctx.createBufferSource(); n.buffer = noiseBuf;
        const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.5, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        n.connect(hp).connect(g).connect(out);
        n.start(time); n.stop(time + 0.06);
        break;
      }
      case "ohat": {
        const n = ctx.createBufferSource(); n.buffer = noiseBuf;
        const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 6000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.45, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.32);
        n.connect(hp).connect(g).connect(out);
        n.start(time); n.stop(time + 0.34);
        break;
      }
      case "clap": {
        for (let i = 0; i < 3; i++) {
          const n = ctx.createBufferSource(); n.buffer = noiseBuf;
          const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1200; bp.Q.value = 1.2;
          const g = ctx.createGain();
          const t0 = time + i * 0.012;
          g.gain.setValueAtTime(0.6, t0);
          g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
          n.connect(bp).connect(g).connect(out);
          n.start(t0); n.stop(t0 + 0.14);
        }
        break;
      }
      case "tom": {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(220, time);
        o.frequency.exponentialRampToValueAtTime(90, time + 0.2);
        g.gain.setValueAtTime(0.8, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
        o.connect(g).connect(out);
        o.start(time); o.stop(time + 0.32);
        break;
      }
      case "rim": {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "square"; o.frequency.setValueAtTime(420, time);
        g.gain.setValueAtTime(0.4, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        o.connect(g).connect(out);
        o.start(time); o.stop(time + 0.06);
        break;
      }
      case "crash": {
        const n = ctx.createBufferSource(); n.buffer = noiseBuf;
        const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 5000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.4, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.9);
        n.connect(hp).connect(g).connect(out);
        n.start(time); n.stop(time + 0.95);
        break;
      }
    }
  }

  // ─── Mount ─────────────────────────────────────────────────────
  function mount(root, opts) {
    opts = opts || {};
    const T = {
      accent: opts.accent || "#2CCB73",
      accent2: opts.accent2 || opts.accent || "#2CCB73",
      bg: opts.bg || "#131312",
      panel: opts.panel || "#1a1a18",
      panel2: opts.panel2 || "#21211e",
      line: opts.line || "#2d2d29",
      ink: opts.ink || "#e9e8e0",
      ink2: opts.ink2 || "#b6b5ab",
      ink3: opts.ink3 || "#74736a",
      font: opts.font || '"Inter Tight", system-ui, sans-serif',
      fontMono: opts.fontMono || '"JetBrains Mono", monospace',
      radius: opts.square ? "0px" : "10px",
      radiusSm: opts.square ? "0px" : "6px",
      border: opts.square ? "2px solid " + (opts.ink || "#e9e8e0") : "1px solid " + (opts.line || "#2d2d29"),
      onAccentText: opts.onAccentText || "#0a0a09",
      shadow: opts.square ? ("4px 4px 0 " + (opts.accent || "#2CCB73")) : "0 20px 50px rgba(0,0,0,0.4)",
    };

    const uid = "bm" + Math.random().toString(36).slice(2, 8);

    // State
    const state = {
      ctx: null, noiseBuf: null, master: null,
      playing: false, bpm: opts.bpm || 92, swing: 0,
      current: 0, nextNoteTime: 0, lookahead: 25, scheduleAhead: 0.1,
      timer: null,
      pattern: {},
      custom: {}, // trackId -> { buffer, name }
    };
    TRACKS.forEach(t => { state.pattern[t.id] = PRESETS["Boom-bap"][t.id].slice(); });

    // ─── CSS ───
    const css = `
      #${uid} { font-family: ${T.font}; color: ${T.ink}; }
      #${uid} * { box-sizing: border-box; }
      #${uid} .bm-shell { background: ${T.panel}; border: ${T.border}; border-radius: ${T.radius}; padding: 20px; box-shadow: ${T.shadow}; }
      #${uid} .bm-head { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
      #${uid} .bm-title { font-weight: 800; font-size: 18px; letter-spacing: -0.02em; margin-right: auto; }
      #${uid} .bm-title small { display:block; font-family:${T.fontMono}; font-weight:400; font-size:10.5px; letter-spacing:0.08em; color:${T.ink3}; text-transform:uppercase; margin-top:2px; }
      #${uid} .bm-play { display:inline-flex; align-items:center; gap:8px; padding:11px 20px; border:none; cursor:pointer; border-radius:${T.radiusSm}; background:${T.accent}; color:${T.onAccentText}; font-family:${T.font}; font-weight:700; font-size:14px; transition:transform .1s, filter .15s; }
      #${uid} .bm-play:hover { filter:brightness(1.08); }
      #${uid} .bm-play:active { transform:scale(0.96); }
      #${uid} .bm-ctl { display:flex; align-items:center; gap:8px; font-family:${T.fontMono}; font-size:11px; color:${T.ink2}; letter-spacing:0.04em; }
      #${uid} .bm-ctl label { text-transform:uppercase; letter-spacing:0.1em; color:${T.ink3}; font-size:10px; }
      #${uid} input[type=range] { -webkit-appearance:none; appearance:none; height:4px; background:${T.line}; border-radius:2px; outline:none; cursor:pointer; }
      #${uid} input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:${opts.square?"0":"50%"}; background:${T.accent}; cursor:pointer; border:2px solid ${T.panel}; }
      #${uid} input[type=range]::-moz-range-thumb { width:16px; height:16px; border-radius:${opts.square?"0":"50%"}; background:${T.accent}; cursor:pointer; border:2px solid ${T.panel}; }
      #${uid} .bm-readout { font-weight:700; color:${T.ink}; min-width:34px; text-align:right; font-variant-numeric:tabular-nums; }

      #${uid} .bm-pads { display:grid; grid-template-columns:repeat(8,1fr); gap:8px; margin-bottom:18px; }
      #${uid} .bm-pad { aspect-ratio:1/1.05; border:${T.border}; border-radius:${T.radiusSm}; background:${T.panel2}; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; transition:transform .06s, background .1s, box-shadow .1s; user-select:none; position:relative; overflow:hidden; }
      #${uid} .bm-pad .nm { font-weight:600; font-size:12px; letter-spacing:-0.01em; }
      #${uid} .bm-pad .ky { font-family:${T.fontMono}; font-size:9px; color:${T.ink3}; border:1px solid ${T.line}; border-radius:3px; padding:0 4px; letter-spacing:0.06em; }
      #${uid} .bm-pad.flash { background:${T.accent}; color:${T.onAccentText}; transform:scale(0.94); box-shadow:0 0 24px ${hexA(T.accent,0.6)}; }
      #${uid} .bm-pad.flash .ky { color:${T.onAccentText}; border-color:${hexA(T.onAccentText,0.4)}; }
      #${uid} .bm-pad.has-sample::after { content:"●"; position:absolute; top:5px; right:6px; color:${T.accent}; font-size:8px; }

      #${uid} .bm-grid { display:flex; flex-direction:column; gap:6px; }
      #${uid} .bm-row { display:grid; grid-template-columns:84px 1fr; gap:10px; align-items:center; }
      #${uid} .bm-rowlabel { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:${T.ink2}; }
      #${uid} .bm-rowlabel .dot { width:8px; height:8px; border-radius:${opts.square?"0":"50%"}; background:${T.accent}; flex:0 0 auto; }
      #${uid} .bm-steps { display:grid; grid-template-columns:repeat(16,1fr); gap:4px; }
      #${uid} .bm-step { aspect-ratio:1; border:1px solid ${T.line}; border-radius:${opts.square?"0":"4px"}; background:${T.bg}; cursor:pointer; transition:background .08s, transform .06s; }
      #${uid} .bm-step:nth-child(4n+1) { border-color:${hexA(T.ink2,0.35)}; }
      #${uid} .bm-step.on { background:${T.accent}; box-shadow:inset 0 0 0 1px ${hexA(T.onAccentText,0.15)}; }
      #${uid} .bm-step.playhead { outline:2px solid ${hexA(T.ink,0.6)}; outline-offset:0px; }
      #${uid} .bm-step.on.playhead { background:${T.accent}; filter:brightness(1.25); }

      #${uid} .bm-foot { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:18px; padding-top:16px; border-top:1px solid ${T.line}; }
      #${uid} .bm-btn { padding:9px 14px; border:${T.border}; border-radius:${T.radiusSm}; background:${T.panel2}; color:${T.ink}; cursor:pointer; font-family:${T.font}; font-weight:600; font-size:12.5px; transition:all .12s; }
      #${uid} .bm-btn:hover { border-color:${T.accent}; color:${T.ink}; }
      #${uid} .bm-presets { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
      #${uid} .bm-presets .lbl { font-family:${T.fontMono}; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:${T.ink3}; margin-right:2px; }
      #${uid} .bm-chip { padding:6px 11px; border:1px solid ${T.line}; border-radius:${opts.square?"0":"999px"}; background:transparent; color:${T.ink2}; cursor:pointer; font-family:${T.font}; font-size:12px; transition:all .12s; }
      #${uid} .bm-chip:hover { border-color:${T.accent}; color:${T.ink}; }
      #${uid} .bm-chip.active { background:${T.accent}; color:${T.onAccentText}; border-color:transparent; font-weight:600; }
      #${uid} .bm-upload { display:inline-flex; align-items:center; gap:8px; padding:9px 14px; border:1px dashed ${T.line}; border-radius:${T.radiusSm}; cursor:pointer; color:${T.ink2}; font-size:12.5px; transition:all .12s; }
      #${uid} .bm-upload:hover, #${uid} .bm-upload.drag { border-color:${T.accent}; color:${T.ink}; background:${hexA(T.accent,0.06)}; }
      #${uid} .bm-note { font-family:${T.fontMono}; font-size:10px; color:${T.ink3}; letter-spacing:0.04em; flex-basis:100%; }
      #${uid} .bm-note.err { color:#ff6b6b; }
      #${uid} .bm-cta { margin-left:auto; display:inline-flex; align-items:center; gap:8px; padding:10px 16px; border-radius:${T.radiusSm}; background:${T.accent}; color:${T.onAccentText}; text-decoration:none; font-weight:700; font-size:13px; transition:filter .15s; }
      #${uid} .bm-cta:hover { filter:brightness(1.08); }
      #${uid} .bm-madecount { font-family:${T.fontMono}; font-size:11px; color:${T.accent}; letter-spacing:0.04em; }

      @media (max-width:720px) {
        #${uid} .bm-pads { grid-template-columns:repeat(4,1fr); }
        #${uid} .bm-row { grid-template-columns:60px 1fr; gap:6px; }
        #${uid} .bm-rowlabel { font-size:10.5px; }
        #${uid} .bm-rowlabel .ky { display:none; }
        #${uid} .bm-steps { gap:3px; }
        #${uid} .bm-cta { margin-left:0; flex-basis:100%; justify-content:center; }
      }
    `;
    const styleEl = document.createElement("style");
    styleEl.textContent = css;
    root.appendChild(styleEl);

    // ─── DOM ───
    root.id = uid;
    const shell = document.createElement("div");
    shell.className = "bm-shell";
    shell.innerHTML = `
      <div class="bm-head">
        <div class="bm-title">Make a beat in 10 seconds.<small>Web-audio drum machine · runs in your browser</small></div>
        <button class="bm-play" data-play>▶ Play</button>
        <div class="bm-ctl"><label>BPM</label><input type="range" min="60" max="180" value="${state.bpm}" data-bpm style="width:90px"><span class="bm-readout" data-bpmout>${state.bpm}</span></div>
        <div class="bm-ctl"><label>Swing</label><input type="range" min="0" max="60" value="0" data-swing style="width:70px"><span class="bm-readout" data-swingout>0%</span></div>
        <div class="bm-ctl"><label>Bar</label><span class="bm-readout" data-bar style="min-width:46px">1 · 1</span></div>
      </div>
      <div class="bm-pads" data-pads></div>
      <div class="bm-grid" data-grid></div>
      <div class="bm-foot">
        <div class="bm-presets">
          <span class="lbl">Presets</span>
          ${Object.keys(PRESETS).map(p => `<button class="bm-chip${p === "Boom-bap" ? " active" : ""}" data-preset="${p}">${p}</button>`).join("")}
        </div>
        <button class="bm-btn" data-clear>Clear</button>
        <label class="bm-upload" data-upload>↑ Upload sample<input type="file" accept=".wav,.mp3,audio/*" hidden data-file></label>
        <a class="bm-cta" href="#join" data-cta>Like what you made? Collab →</a>
        <div class="bm-note">Synthesized kit · your uploads stay in your browser, never sent to a server.</div>
      </div>
    `;
    root.appendChild(shell);

    const $ = s => shell.querySelector(s);
    const padsWrap = $("[data-pads]");
    const gridWrap = $("[data-grid]");
    const playBtn = $("[data-play]");
    const barOut = $("[data-bar]");
    const noteEl = $(".bm-note");

    // Pads
    const padEls = {};
    TRACKS.forEach(t => {
      const pad = document.createElement("div");
      pad.className = "bm-pad";
      pad.dataset.track = t.id;
      pad.innerHTML = `<span class="nm">${t.name}</span><span class="ky">${t.key}</span>`;
      pad.addEventListener("pointerdown", (e) => { e.preventDefault(); ensureAudio(); play(t); flash(t.id); });
      padsWrap.appendChild(pad);
      padEls[t.id] = pad;
    });

    // Grid
    const stepEls = {};
    TRACKS.forEach(t => {
      const row = document.createElement("div");
      row.className = "bm-row";
      const label = document.createElement("div");
      label.className = "bm-rowlabel";
      label.innerHTML = `<span class="dot"></span>${t.name}`;
      const steps = document.createElement("div");
      steps.className = "bm-steps";
      stepEls[t.id] = [];
      for (let i = 0; i < STEPS; i++) {
        const s = document.createElement("div");
        s.className = "bm-step" + (state.pattern[t.id][i] ? " on" : "");
        s.dataset.i = i;
        s.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          ensureAudio();
          state.pattern[t.id][i] = state.pattern[t.id][i] ? 0 : 1;
          s.classList.toggle("on", !!state.pattern[t.id][i]);
          if (state.pattern[t.id][i]) { play(t); }
          clearPresetActive();
        });
        steps.appendChild(s);
        stepEls[t.id].push(s);
      }
      row.appendChild(label);
      row.appendChild(steps);
      gridWrap.appendChild(row);
    });

    function syncGrid() {
      TRACKS.forEach(t => {
        for (let i = 0; i < STEPS; i++) {
          stepEls[t.id][i].classList.toggle("on", !!state.pattern[t.id][i]);
        }
      });
    }

    // ─── Audio ───
    function ensureAudio() {
      if (!state.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        state.ctx = new AC();
        state.noiseBuf = makeNoiseBuffer(state.ctx);
        state.master = state.ctx.createGain();
        state.master.gain.value = 0.9;
        state.master.connect(state.ctx.destination);
      }
      // iOS/mobile browsers create the AudioContext "suspended" — it stays
      // silent until resume() is called inside a user gesture. ensureAudio() is
      // always invoked from a tap/click/keydown handler, so resume here (a
      // no-op when already running) to unlock sound on the very first press.
      if (state.ctx.state === "suspended") state.ctx.resume();
    }

    function play(track, time) {
      if (!state.ctx) return;
      trigger(state.ctx, state.noiseBuf, state.master, track.synth, time || state.ctx.currentTime, state.custom[track.id]);
    }

    function flash(id) {
      const pad = padEls[id];
      pad.classList.add("flash");
      setTimeout(() => pad.classList.remove("flash"), 110);
    }

    // ─── Scheduler ───
    function nextNote() {
      const secondsPerBeat = 60.0 / state.bpm;
      const stepDur = 0.25 * secondsPerBeat; // 16th
      // swing: delay odd 16ths
      let dur = stepDur;
      if (state.current % 2 === 1) dur += stepDur * (state.swing / 100);
      else dur -= stepDur * (state.swing / 100) * 0; // keep even on grid
      state.nextNoteTime += dur;
      state.current = (state.current + 1) % STEPS;
    }

    function scheduleNote(step, time) {
      TRACKS.forEach(t => {
        if (state.pattern[t.id][step]) play(t, time);
      });
      // visual
      const drawTime = (time - state.ctx.currentTime) * 1000;
      setTimeout(() => {
        if (!state.playing) return;
        drawPlayhead(step);
        TRACKS.forEach(t => { if (state.pattern[t.id][step]) flash(t.id); });
        barOut.textContent = "1 · " + (step + 1);
      }, Math.max(0, drawTime));
    }

    let lastDrawn = -1;
    function drawPlayhead(step) {
      TRACKS.forEach(t => {
        if (lastDrawn >= 0) stepEls[t.id][lastDrawn].classList.remove("playhead");
        stepEls[t.id][step].classList.add("playhead");
      });
      lastDrawn = step;
    }
    function clearPlayhead() {
      TRACKS.forEach(t => stepEls[t.id].forEach(s => s.classList.remove("playhead")));
      lastDrawn = -1;
    }

    function scheduler() {
      while (state.nextNoteTime < state.ctx.currentTime + state.scheduleAhead) {
        scheduleNote(state.current, state.nextNoteTime);
        nextNote();
      }
    }

    function start() {
      ensureAudio();
      state.playing = true;
      state.current = 0;
      state.nextNoteTime = state.ctx.currentTime + 0.05;
      state.timer = setInterval(scheduler, state.lookahead);
      playBtn.innerHTML = "■ Stop";
      bumpMadeCount();
    }
    function stop() {
      state.playing = false;
      clearInterval(state.timer);
      clearPlayhead();
      playBtn.innerHTML = "▶ Play";
      barOut.textContent = "1 · 1";
    }

    playBtn.addEventListener("click", () => { state.playing ? stop() : start(); });

    // ─── Controls ───
    $("[data-bpm]").addEventListener("input", (e) => {
      state.bpm = +e.target.value;
      $("[data-bpmout]").textContent = state.bpm;
    });
    $("[data-swing]").addEventListener("input", (e) => {
      state.swing = +e.target.value;
      $("[data-swingout]").textContent = state.swing + "%";
    });
    $("[data-clear]").addEventListener("click", () => {
      TRACKS.forEach(t => state.pattern[t.id] = new Array(STEPS).fill(0));
      syncGrid();
      clearPresetActive();
    });
    shell.querySelectorAll("[data-preset]").forEach(btn => {
      btn.addEventListener("click", () => {
        const p = PRESETS[btn.dataset.preset];
        TRACKS.forEach(t => state.pattern[t.id] = p[t.id].slice());
        syncGrid();
        shell.querySelectorAll("[data-preset]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        ensureAudio();
        bumpMadeCount();
      });
    });
    function clearPresetActive() { shell.querySelectorAll("[data-preset]").forEach(b => b.classList.remove("active")); }

    // ─── Sample upload ───
    const fileInput = $("[data-file]");
    const uploadLabel = $("[data-upload]");
    function handleFile(file) {
      if (!file) return;
      if (!/\.(wav|mp3)$/i.test(file.name) && !file.type.startsWith("audio")) {
        noteEl.textContent = "Hmm — that's not a .wav or .mp3. Try another file.";
        noteEl.classList.add("err");
        return;
      }
      ensureAudio();
      const reader = new FileReader();
      reader.onload = (ev) => {
        state.ctx.decodeAudioData(ev.target.result.slice(0), (buf) => {
          // assign to the LAST track (crash) by default, mark it
          const target = "crash";
          state.custom[target] = { buffer: buf, name: file.name };
          padEls[target].classList.add("has-sample");
          padEls[target].querySelector(".nm").textContent = file.name.replace(/\.(wav|mp3)$/i, "").slice(0, 8);
          gridWrap.querySelectorAll(".bm-row")[TRACKS.findIndex(t => t.id === target)].querySelector(".bm-rowlabel").childNodes[1].textContent = "Sample";
          noteEl.textContent = "Loaded \u201c" + file.name + "\u201d onto the last pad. Tap it or program its row.";
          noteEl.classList.remove("err");
        }, () => {
          noteEl.textContent = "Couldn't decode that audio. Try a standard .wav or .mp3.";
          noteEl.classList.add("err");
        });
      };
      reader.readAsArrayBuffer(file);
    }
    fileInput.addEventListener("change", (e) => handleFile(e.target.files[0]));
    ["dragenter", "dragover"].forEach(ev => uploadLabel.addEventListener(ev, (e) => { e.preventDefault(); uploadLabel.classList.add("drag"); }));
    ["dragleave", "drop"].forEach(ev => uploadLabel.addEventListener(ev, (e) => { e.preventDefault(); uploadLabel.classList.remove("drag"); }));
    uploadLabel.addEventListener("drop", (e) => { handleFile(e.dataTransfer.files[0]); });

    // ─── Keyboard ───
    const keymap = {};
    TRACKS.forEach(t => keymap[t.key.toLowerCase()] = t);
    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const t = keymap[e.key.toLowerCase()];
      if (t) { ensureAudio(); play(t); flash(t.id); }
      if (e.code === "Space" && isInView(root)) { e.preventDefault(); state.playing ? stop() : start(); }
    });
    function isInView(el) {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    }

    // ─── Made-count nudge ───
    let made = false;
    const ctaEl = $("[data-cta]");
    function bumpMadeCount() {
      if (made) return;
      made = true;
      setTimeout(() => {
        ctaEl.innerHTML = "🔥 That's a vibe — find a vocalist for it →";
      }, 4000);
    }

    // expose minimal control
    return { start, stop, state };
  }

  // hex + alpha helper
  function hexA(hex, a) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  window.SeshnBeatmaker = { mount };
})();

export {};

// Composes the showcase's music bed and sound effects as 48 kHz 16-bit stereo audio, in pure Node.
// Deterministic: seeded noise, no wall-clock, no downloads. `npm run compose` regenerates video/public/.
// Grid: 120 BPM = 0.5 s per beat = 15 frames at 30 fps; 18 bars of 2 s (60 frames) = 36 s.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 48000;
const FPS = 30;
const BEAT = 0.5;
const BAR = 4 * BEAT;
const BARS = 18;
const DURATION = BARS * BAR; // 36 s
const TAU = Math.PI * 2;
const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, "..", "public");
const outDir = join(here, "..", "out");

/** Master level of the music bed (linear, before the limiter); tuned so the rendered MP4 lands near -14 LUFS. */
const MUSIC_GAIN = 1.9;

/** Frames of lead-in baked into each effect before its moment; Showcase mounts the file that many frames early. Shared with the app via src/sfx-timing.json. */
const PREROLL_FRAMES = JSON.parse(readFileSync(join(here, "..", "src", "sfx-timing.json"), "utf8"));

// ---------------------------------------------------------------- helpers
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const noise = (r) => r() * 2 - 1;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const frame = (f) => f / FPS;
const stereo = (seconds) => ({ l: new Float32Array(Math.ceil(seconds * SR)), r: new Float32Array(Math.ceil(seconds * SR)) });
const sm = (x) => x * x * (3 - 2 * x); // smoothstep

/** One-pole low-pass in place (a = coefficient, fc is about a * SR / 2pi). */
function lowpass(buf, a, passes = 1) {
  for (let p = 0; p < passes; p++) {
    let y = 0;
    for (let i = 0; i < buf.length; i++) {
      y += a * (buf[i] - y);
      buf[i] = y;
    }
  }
}

/** Adds a mono voice to the stereo bus; pan -1..1 (equal-power). */
function voice(bus, t0, dur, pan, fn) {
  const n0 = Math.floor(t0 * SR);
  const n1 = Math.min(bus.l.length, Math.floor((t0 + dur) * SR));
  const gl = Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = Math.sin(((pan + 1) * Math.PI) / 4);
  for (let n = Math.max(0, n0); n < n1; n++) {
    const s = fn((n - n0) / SR);
    bus.l[n] += s * gl;
    bus.r[n] += s * gr;
  }
}

/** Band-limited soft saw: a few harmonics, rolling off as 1/k. */
const softSaw = (ph, harmonics = 5) => {
  let s = 0;
  for (let k = 1; k <= harmonics; k++) s += Math.sin(k * ph) / k;
  return s * 0.6;
};

// ---------------------------------------------------------------- music
// Key of D major / B minor. One chord per bar: I  V  vi  IV, again, then a dominant sus before the CTA resolves to D.
const D = { pad: [57, 62, 64, 66], bass: 38, arp: [62, 66, 69, 74] };
const A = { pad: [57, 61, 64, 69], bass: 45, arp: [61, 64, 69, 73] };
const Bm = { pad: [57, 59, 62, 66], bass: 47, arp: [59, 62, 66, 69] };
const G = { pad: [55, 59, 62, 66], bass: 43, arp: [59, 62, 66, 71] };
const Asus = { pad: [57, 62, 64, 69], bass: 45, arp: [62, 64, 69, 74] };
const FINAL = { pad: [50, 57, 62, 64, 66, 69], bass: 38, arp: [62, 66, 69, 74, 78, 81] };

//            hook  build      profile       leads       personas          CTA
const CHORDS = [D, A, Bm, G, D, A, Bm, G, D, A, Bm, G, D, Bm, Asus, FINAL, FINAL, FINAL];
const ARP_ORDER = [0, 2, 1, 3, 2, 3, 1, 2];

function composeMusic() {
  const r = rng(20261002);
  const pad = stereo(DURATION);
  const bass = stereo(DURATION);
  const drums = stereo(DURATION);
  const pluck = stereo(DURATION);
  const kicks = [];

  // Pad: two softly detuned soft-saw voices per tone and channel, one-pole low-passed twice. Chords overlap by half a second.
  CHORDS.forEach((chord, bar) => {
    if (bar > 15) return; // the final chord is one held event from the CTA downbeat to the end of the tail
    const t0 = bar * BAR;
    const len = (bar === 15 ? BARS - 15 : 1) * BAR + 0.55;
    const level = bar === 0 ? 0.8 : 1;
    chord.pad.forEach((m) => {
      const f = mtof(m);
      [0, 1].forEach((ch) => {
        const d = ch ? -0.0032 : 0.0032;
        let p1 = ch ? 1.3 : 0;
        let p2 = ch ? 0.4 : 2.1;
        const i1 = (TAU * f * (1 + d)) / SR;
        const i2 = (TAU * f * (1 - d * 0.7)) / SR;
        const buf = ch ? pad.r : pad.l;
        const n0 = Math.floor(t0 * SR);
        const n1 = Math.min(buf.length, n0 + Math.floor(len * SR));
        for (let n = n0; n < n1; n++) {
          const t = (n - n0) / SR;
          const att = sm(Math.min(1, t / 0.5));
          const rel = sm(Math.min(1, (len - t) / 0.5));
          buf[n] += ((softSaw(p1) + softSaw(p2)) * 0.5 + Math.sin(p1 * 0.5) * 0.3) * att * rel * 0.08 * level;
          p1 += i1;
          p2 += i2;
        }
      });
    });
  });
  lowpass(pad.l, 0.11, 2);
  lowpass(pad.r, 0.11, 2);

  const pluckNote = (t0, m, gain, pan, decay = 0.15) =>
    voice(pluck, t0, decay * 6, pan, (t) => {
      const f = mtof(m);
      const env = Math.min(1, t / 0.004) * Math.exp(-t / decay);
      return (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * 2 * f * t) + 0.1 * Math.sin(TAU * 3 * f * t)) * env * gain * 1.35;
    });

  const kick = (t0, gain = 0.4) => {
    kicks.push(t0);
    voice(drums, t0, 0.4, 0, (t) => {
      const body = Math.sin(TAU * (46 * t + (95 * (1 - Math.exp(-32 * t))) / 32)) * Math.exp(-t / 0.1);
      const click = Math.sin(TAU * 1800 * t) * Math.exp(-t / 0.002) * 0.25;
      return (body + click) * gain * Math.min(1, t / 0.001);
    });
  };

  const hat = (t0, gain, pan) => {
    let lp = 0;
    voice(drums, t0, 0.09, pan, (t) => {
      const n = noise(r);
      lp += 0.9 * (n - lp);
      return (n - lp) * Math.exp(-t / 0.016) * gain;
    });
  };

  const bassNote = (t0, m, gain, decay = 0.28) =>
    voice(bass, t0, decay * 5, 0, (t) => {
      const f = mtof(m);
      return (Math.sin(TAU * f * t) + 0.18 * Math.sin(TAU * 2 * f * t)) * Math.min(1, t / 0.006) * Math.exp(-t / decay) * gain;
    });

  for (let bar = 0; bar < BARS; bar++) {
    const t0 = bar * BAR;
    const c = CHORDS[bar];
    const eighth = (i) => t0 + i * BEAT * 0.5;
    const build = bar >= 1 && bar <= 3;
    const profile = bar >= 4 && bar <= 7;
    const leads = bar >= 8 && bar <= 10;
    const personas = bar >= 11 && bar <= 14;

    // Pluck arpeggio: eighth notes, an octave up, alternating pan. Builds over bars 2-4, thins to two notes under Leads.
    if (build || profile || personas) {
      const lvl = build ? [0.06, 0.08, 0.1][bar - 1] : 0.11;
      for (let i = 0; i < 8; i++) pluckNote(eighth(i), c.arp[ARP_ORDER[i] % 4], lvl, i % 2 ? 0.35 : -0.35);
    } else if (leads) {
      pluckNote(t0, c.arp[0], 0.075, -0.3, 0.2);
      pluckNote(t0 + 2 * BEAT, c.arp[2], 0.065, 0.3, 0.2);
    }

    // Bass: syncopated pulse from the profile beat; out under Leads.
    if (profile || personas) {
      bassNote(t0, c.bass, 0.3);
      bassNote(t0 + 1.5 * BEAT, c.bass, 0.24);
      if (bar !== 14) bassNote(t0 + 3 * BEAT, c.bass, 0.21);
    }

    // Kick on every beat from the profile beat; absent under Leads; beats 3-4 of bar 15 drop out ahead of the CTA downbeat.
    if (profile || personas) (bar === 14 ? [0, 1] : [0, 1, 2, 3]).forEach((b) => kick(t0 + b * BEAT));

    // Closed hat: offbeat eighths in Profile, every eighth in Personas, a quiet offbeat under Leads, a sixteenth roll in the back half of bar 15.
    const pan = (i) => (i % 2 ? 0.25 : -0.25);
    if (profile) for (let i = 0; i < 4; i++) hat(t0 + (i + 0.5) * BEAT, 0.07, pan(i));
    if (leads) for (let i = 0; i < 4; i++) hat(t0 + (i + 0.5) * BEAT, 0.035, pan(i));
    if (personas && bar < 14) for (let i = 0; i < 8; i++) hat(eighth(i), i % 2 ? 0.075 : 0.045, pan(i));
    if (bar === 14) {
      for (let i = 0; i < 4; i++) hat(eighth(i), i % 2 ? 0.075 : 0.045, pan(i));
      for (let i = 0; i < 8; i++) hat(t0 + 2 * BEAT + i * BEAT * 0.25, 0.04 + i * 0.01, pan(i));
    }
  }

  // CTA downbeat (frame 900): chord strike, kick, low D held with a slow decay.
  const cta = 15 * BAR;
  kick(cta, 0.5);
  FINAL.arp.forEach((m, i) => pluckNote(cta + i * 0.035, m, 0.085, i % 2 ? 0.4 : -0.4, 0.9));
  FINAL.pad.slice(1, 4).forEach((m, i) => pluckNote(cta + 0.14 + i * 0.03, m + 12, 0.04, i % 2 ? -0.5 : 0.5, 1.2));
  voice(bass, cta, 4, 0, (t) => {
    const f = mtof(38);
    return (Math.sin(TAU * f * t) + 0.15 * Math.sin(TAU * 2 * f * t)) * Math.min(1, t / 0.008) * Math.exp(-t / 1.6) * 0.34;
  });

  // Ping-pong echo on the plucks (a dotted eighth), darkened on every pass.
  const delay = Math.round(BEAT * 0.75 * SR);
  const wl = new Float32Array(pluck.l.length);
  const wr = new Float32Array(pluck.r.length);
  let lpl = 0;
  let lpr = 0;
  for (let n = delay; n < wl.length; n++) {
    lpl += 0.35 * (0.42 * pluck.l[n - delay] + 0.42 * wr[n - delay] - lpl);
    lpr += 0.35 * (0.42 * pluck.r[n - delay] + 0.42 * wl[n - delay] - lpr);
    wl[n] = lpl;
    wr[n] = lpr;
  }

  // Sidechain: pad, bass and echoes duck a little on every kick, so the beat breathes.
  const duck = new Float32Array(pad.l.length).fill(1);
  for (const t of kicks) {
    const n0 = Math.floor(t * SR);
    for (let n = n0; n < Math.min(duck.length, n0 + Math.floor(0.3 * SR)); n++) {
      duck[n] = Math.min(duck[n], 1 - 0.32 * Math.exp(-(n - n0) / SR / 0.11));
    }
  }

  const out = stereo(DURATION);
  for (let n = 0; n < out.l.length; n++) {
    const t = n / SR;
    // 2 s tail: the held chord fades to silence at 36 s.
    const tail = t > DURATION - 2 ? Math.cos(((t - (DURATION - 2)) / 2) * (Math.PI / 2)) ** 2 : 1;
    out.l[n] = ((pad.l[n] + bass.l[n] + wl[n]) * duck[n] + drums.l[n] + pluck.l[n]) * tail * MUSIC_GAIN;
    out.r[n] = ((pad.r[n] + bass.r[n] + wr[n]) * duck[n] + drums.r[n] + pluck.r[n]) * tail * MUSIC_GAIN;
  }
  return limit(out, 0.75); // about -2.5 dBFS ceiling
}

/** Offline look-ahead limiter: no sample exceeds `ceiling`, and gain changes are smoothed over about 8 ms. */
function limit(bus, ceiling) {
  const n = bus.l.length;
  const L = 384;
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = Math.max(Math.abs(bus.l[i]), Math.abs(bus.r[i]));
    need[i] = p > ceiling ? ceiling / p : 1;
  }
  // sliding minimum over +-(L-1), then a box average over the same span
  const gmin = new Float32Array(n);
  const dq = [];
  let head = 0;
  for (let i = 0; i < n + L - 1; i++) {
    if (i < n) {
      while (dq.length > head && need[dq[dq.length - 1]] >= need[i]) dq.pop();
      dq.push(i);
    }
    const c = i - (L - 1);
    if (c >= 0 && c < n) {
      while (dq[head] < c - (L - 1)) head++;
      gmin[c] = need[dq[head]];
    }
  }
  const pre = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + gmin[i];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - (L - 1));
    const b = Math.min(n - 1, i + (L - 1));
    const g = (pre[b + 1] - pre[a]) / (b - a + 1);
    bus.l[i] *= g;
    bus.r[i] *= g;
  }
  return bus;
}

// ---------------------------------------------------------------- sound effects
const normalise = (bus, peakDb) => {
  let p = 0;
  for (let i = 0; i < bus.l.length; i++) p = Math.max(p, Math.abs(bus.l[i]), Math.abs(bus.r[i]));
  const g = 10 ** (peakDb / 20) / (p || 1);
  for (let i = 0; i < bus.l.length; i++) {
    bus.l[i] *= g;
    bus.r[i] *= g;
  }
  return bus;
};

/** State-variable band-pass over noise: a paper-like swish whose centre sweeps up, then eases off. Its peak sits PREROLL frames in. */
function whoosh() {
  const dur = 0.8;
  const peak = frame(PREROLL_FRAMES.whoosh);
  const bus = stereo(dur);
  [bus.l, bus.r].forEach((buf, ch) => {
    const r = rng(7001 + ch);
    let low = 0;
    let band = 0;
    for (let n = 0; n < buf.length; n++) {
      const t = n / SR;
      const sweep = t < peak ? t / peak : 1 - (t - peak) / (dur - peak);
      const fc = 350 + 3600 * sm(Math.max(0, Math.min(1, t < peak ? sweep : 0.35 + 0.65 * sweep)));
      const f = 2 * Math.sin((Math.PI * fc) / SR);
      const x = noise(r);
      low += f * band;
      const high = x - low - 0.55 * band;
      band += f * high;
      const env = t < peak ? Math.sin((t / peak) * (Math.PI / 2)) ** 2 : Math.cos(((t - peak) / (dur - peak)) * (Math.PI / 2)) ** 2;
      buf[n] = band * env;
    }
  });
  return normalise(bus, -4);
}

function tick() {
  const bus = stereo(0.15);
  const r = rng(7010);
  voice(bus, 0, 0.15, 0, (t) => {
    const tone = Math.sin(TAU * 2600 * t) * Math.exp(-t / 0.011) + 0.4 * Math.sin(TAU * 5200 * t) * Math.exp(-t / 0.005);
    const click = noise(r) * Math.exp(-t / 0.0015) * 0.5;
    return (tone + click) * Math.min(1, t / 0.0004);
  });
  return normalise(bus, -5);
}

/** Two-note rising NFC chime, D6 then A6: chord tones of the bar it lands in. */
function chime() {
  const bus = stereo(2.2);
  const bell = (t0, m, decay, pan, gain) =>
    voice(bus, t0, 2, pan, (t) => {
      const f = mtof(m);
      const env = Math.min(1, t / 0.003) * Math.exp(-t / decay);
      return (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * 2.01 * f * t) * Math.exp(-t / (decay * 0.4)) + 0.12 * Math.sin(TAU * 3.97 * f * t) * Math.exp(-t / (decay * 0.2))) * env * gain;
    });
  bell(0, 86, 0.55, -0.25, 0.8);
  bell(0.12, 93, 0.8, 0.25, 1);
  return normalise(bus, -5);
}

/** Soft UI pop: a sine that drops a fifth in about 40 ms, A5 to E5. */
function pop() {
  const bus = stereo(0.3);
  voice(bus, 0, 0.3, 0, (t) => {
    const ph = TAU * (659.26 * t + 220.74 * 0.018 * (1 - Math.exp(-t / 0.018)));
    return (Math.sin(ph) + 0.2 * Math.sin(2 * ph)) * Math.min(1, t / 0.002) * Math.exp(-t / 0.07);
  });
  return normalise(bus, -5);
}

/** Two seconds of rising noise and a sweeping tone, ending hard on the CTA cut. */
function riser() {
  const dur = 2;
  const bus = stereo(dur);
  [bus.l, bus.r].forEach((buf, ch) => {
    const r = rng(7020 + ch);
    let low = 0;
    let band = 0;
    let ph = 0;
    for (let n = 0; n < buf.length; n++) {
      const t = n / SR;
      const u = t / dur;
      const fc = 300 * 2 ** (u * 4.6); // 300 Hz up to about 7 kHz
      const f = 2 * Math.sin((Math.PI * fc) / SR);
      const x = noise(r);
      low += f * band;
      const high = x - low - 0.35 * band;
      band += f * high;
      const amp = u ** 2.5;
      ph += (TAU * 293.66 * 2 ** (u * 3)) / SR; // D4 up three octaves
      const end = Math.min(1, (dur - t) / 0.02);
      buf[n] = (band * 0.9 + Math.sin(ph) * 0.18) * amp * end;
    }
  });
  return normalise(bus, -4);
}

// ---------------------------------------------------------------- output
function wav(bus) {
  const n = bus.l.length;
  const data = Buffer.alloc(44 + n * 4);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + n * 4, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(n * 4, 40);
  const q = (x) => Math.max(-32768, Math.min(32767, Math.round(x * 32767)));
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(q(bus.l[i]), 44 + i * 4);
    data.writeInt16LE(q(bus.r[i]), 46 + i * 4);
  }
  return data;
}

mkdirSync(publicDir, { recursive: true });
mkdirSync(outDir, { recursive: true });
for (const [name, bus] of Object.entries({ whoosh: whoosh(), tick: tick(), chime: chime(), pop: pop(), riser: riser() })) {
  writeFileSync(join(publicDir, `sfx-${name}.wav`), wav(bus));
}
// Music: a lossless master in out/ (git-ignored) for level checks, a 192 kbps MP3 in public/ to keep the repo small.
const masterWav = join(outDir, "music.wav");
writeFileSync(masterWav, wav(composeMusic()));
rmSync(join(publicDir, "music.wav"), { force: true });
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", masterWav, "-codec:a", "libmp3lame", "-b:a", "192k", join(publicDir, "music.mp3")]);
console.log("composed music.mp3 and 5 sound effects ->", publicDir);

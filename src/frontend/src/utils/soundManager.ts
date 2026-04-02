/**
 * Procedural sound manager using Web Audio API.
 * No external audio files needed – all sounds are synthesized.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// ─── Utility helpers ───────────────────────────────────────────────────────

function createGain(ctx: AudioContext, value: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(value, ctx.currentTime);
  return g;
}

function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const size = Math.floor(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

// ─── Rocket launch ────────────────────────────────────────────────────────
// A punchy thump + backblast whoosh + tail hiss

export function playRocketFire() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // --- Initial ignition thump ---
    const kickOsc = ctx.createOscillator();
    kickOsc.type = "sine";
    kickOsc.frequency.setValueAtTime(200, now);
    kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.15);
    const kickGain = createGain(ctx, 0.8);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    kickOsc.connect(kickGain);
    kickGain.connect(ctx.destination);
    kickOsc.start(now);
    kickOsc.stop(now + 0.2);

    // --- Backblast noise burst ---
    const burstNoise = ctx.createBufferSource();
    burstNoise.buffer = createNoiseBuffer(ctx, 0.12);
    const burstFilter = ctx.createBiquadFilter();
    burstFilter.type = "bandpass";
    burstFilter.frequency.setValueAtTime(2400, now);
    burstFilter.Q.setValueAtTime(0.5, now);
    const burstGain = createGain(ctx, 0.55);
    burstGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    burstNoise.connect(burstFilter);
    burstFilter.connect(burstGain);
    burstGain.connect(ctx.destination);
    burstNoise.start(now);
    burstNoise.stop(now + 0.12);

    // --- Rocket tail whoosh (descending pitch) ---
    const whooshNoise = ctx.createBufferSource();
    whooshNoise.buffer = createNoiseBuffer(ctx, 0.7);
    const whooshFilter = ctx.createBiquadFilter();
    whooshFilter.type = "bandpass";
    whooshFilter.frequency.setValueAtTime(1200, now + 0.05);
    whooshFilter.frequency.exponentialRampToValueAtTime(180, now + 0.7);
    whooshFilter.Q.setValueAtTime(1.5, now);
    const whooshGain = createGain(ctx, 0);
    whooshGain.gain.linearRampToValueAtTime(0.4, now + 0.06);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    whooshNoise.connect(whooshFilter);
    whooshFilter.connect(whooshGain);
    whooshGain.connect(ctx.destination);
    whooshNoise.start(now + 0.04);
    whooshNoise.stop(now + 0.75);
  } catch (_) {
    // silently ignore if audio not available
  }
}

// ─── Explosion ────────────────────────────────────────────────────────────
// Realistic multi-layer: initial crack, sub-bass body, pressure whoosh,
// mid crackle, long rumble tail, distance concussion effect

export function playExplosion(distanceFactor = 1.0) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const vol = Math.max(0.05, Math.min(1, distanceFactor));

    // --- 1. INITIAL CRACK/BANG (very short transient, high energy) ---
    // Simulates the initial explosive detonation crack
    const crackOsc = ctx.createOscillator();
    crackOsc.type = "sawtooth";
    crackOsc.frequency.setValueAtTime(280, now);
    crackOsc.frequency.exponentialRampToValueAtTime(40, now + 0.04);
    const crackGain = createGain(ctx, vol * 1.2);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    crackOsc.connect(crackGain);
    crackGain.connect(ctx.destination);
    crackOsc.start(now);
    crackOsc.stop(now + 0.06);

    // Crack noise burst (sharp high-freq transient)
    const crackNoise = ctx.createBufferSource();
    crackNoise.buffer = createNoiseBuffer(ctx, 0.06);
    const crackHP = ctx.createBiquadFilter();
    crackHP.type = "highpass";
    crackHP.frequency.setValueAtTime(3000, now);
    const crackNGain = createGain(ctx, vol * 0.9);
    crackNGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    crackNoise.connect(crackHP);
    crackHP.connect(crackNGain);
    crackNGain.connect(ctx.destination);
    crackNoise.start(now);
    crackNoise.stop(now + 0.06);

    // --- 2. SUB-BASS BODY (deep concussive thud) ---
    // The physical "body hit" you feel in your chest
    const subOsc = ctx.createOscillator();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(80, now);
    subOsc.frequency.exponentialRampToValueAtTime(18, now + 0.8);
    const subGain = createGain(ctx, vol * 1.1);
    subGain.gain.setValueAtTime(vol * 1.1, now + 0.02);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.95);

    // Sub harmonic (even deeper)
    const subOsc2 = ctx.createOscillator();
    subOsc2.type = "sine";
    subOsc2.frequency.setValueAtTime(40, now);
    subOsc2.frequency.exponentialRampToValueAtTime(10, now + 1.0);
    const subGain2 = createGain(ctx, vol * 0.7);
    subGain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    subOsc2.connect(subGain2);
    subGain2.connect(ctx.destination);
    subOsc2.start(now + 0.01);
    subOsc2.stop(now + 1.25);

    // --- 3. PRESSURE WAVE WHOOSH (the shockwave overpressure sound) ---
    // Air displacement whoosh -- sweeps from high to low
    const pressureNoise = ctx.createBufferSource();
    pressureNoise.buffer = createNoiseBuffer(ctx, 0.5);
    const pressureFilter = ctx.createBiquadFilter();
    pressureFilter.type = "bandpass";
    pressureFilter.frequency.setValueAtTime(2800, now + 0.02);
    pressureFilter.frequency.exponentialRampToValueAtTime(120, now + 0.5);
    pressureFilter.Q.setValueAtTime(0.6, now);
    const pressureGain = createGain(ctx, 0);
    pressureGain.gain.linearRampToValueAtTime(vol * 0.85, now + 0.04);
    pressureGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    pressureNoise.connect(pressureFilter);
    pressureFilter.connect(pressureGain);
    pressureGain.connect(ctx.destination);
    pressureNoise.start(now + 0.01);
    pressureNoise.stop(now + 0.6);

    // --- 4. MID CRACKLE / FIREBALL ROAR ---
    // Bandpass filtered noise for fire/crackle body
    const crackleNoise = ctx.createBufferSource();
    crackleNoise.buffer = createNoiseBuffer(ctx, 2.2);
    const crackleFilter = ctx.createBiquadFilter();
    crackleFilter.type = "bandpass";
    crackleFilter.frequency.setValueAtTime(600, now);
    crackleFilter.frequency.exponentialRampToValueAtTime(80, now + 2.2);
    crackleFilter.Q.setValueAtTime(0.8, now);
    const crackleGain = createGain(ctx, vol * 0.7);
    crackleGain.gain.setValueAtTime(vol * 0.7, now + 0.04);
    crackleGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
    crackleNoise.connect(crackleFilter);
    crackleFilter.connect(crackleGain);
    crackleGain.connect(ctx.destination);
    crackleNoise.start(now);
    crackleNoise.stop(now + 2.2);

    // --- 5. DEBRIS / STRUCTURAL COLLAPSE RUMBLE ---
    // Mid-low noise for rubble/debris sound at impact
    const debrisNoise = ctx.createBufferSource();
    debrisNoise.buffer = createNoiseBuffer(ctx, 1.8);
    const debrisFilter = ctx.createBiquadFilter();
    debrisFilter.type = "bandpass";
    debrisFilter.frequency.setValueAtTime(350, now + 0.1);
    debrisFilter.frequency.exponentialRampToValueAtTime(60, now + 1.8);
    debrisFilter.Q.setValueAtTime(1.2, now);
    const debrisGain = createGain(ctx, 0);
    debrisGain.gain.linearRampToValueAtTime(vol * 0.55, now + 0.15);
    debrisGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
    debrisNoise.connect(debrisFilter);
    debrisFilter.connect(debrisGain);
    debrisGain.connect(ctx.destination);
    debrisNoise.start(now + 0.08);
    debrisNoise.stop(now + 2.1);

    // --- 6. LONG DEEP RUMBLE / AFTERSHOCK TAIL ---
    // The distant rolling thunder that lasts several seconds
    const rumbleNoise = ctx.createBufferSource();
    rumbleNoise.buffer = createNoiseBuffer(ctx, 4.0);
    const rumbleLowpass = ctx.createBiquadFilter();
    rumbleLowpass.type = "lowpass";
    rumbleLowpass.frequency.setValueAtTime(90, now);
    rumbleLowpass.frequency.exponentialRampToValueAtTime(30, now + 4.0);
    const rumbleGain = createGain(ctx, vol * 0.5);
    rumbleGain.gain.setValueAtTime(vol * 0.45, now + 0.3);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 4.5);
    rumbleNoise.connect(rumbleLowpass);
    rumbleLowpass.connect(rumbleGain);
    rumbleGain.connect(ctx.destination);
    rumbleNoise.start(now + 0.1);
    rumbleNoise.stop(now + 4.6);

    // --- 7. HIGH FREQ HISS / STEAM VENT (after explosion) ---
    const hissNoise = ctx.createBufferSource();
    hissNoise.buffer = createNoiseBuffer(ctx, 3.0);
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = "highpass";
    hissFilter.frequency.setValueAtTime(4000, now + 0.5);
    const hissGain = createGain(ctx, 0);
    hissGain.gain.linearRampToValueAtTime(vol * 0.12, now + 0.8);
    hissGain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
    hissNoise.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(ctx.destination);
    hissNoise.start(now + 0.4);
    hissNoise.stop(now + 3.6);
  } catch (_) {
    // silently ignore
  }
}

// ─── Building chunk collapse ──────────────────────────────────────────────
// A short concrete crunch / debris clatter.

export function playChunkDestroy() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const pitchOffset = 0.65 + Math.random() * 0.7;

    // Concrete crack
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 0.4);
    noise.playbackRate.setValueAtTime(pitchOffset, now);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(700, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + 0.35);
    filter.Q.setValueAtTime(1.8, now);

    const gainNode = createGain(ctx, 0.2);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.4);

    // Low thud component
    const thudOsc = ctx.createOscillator();
    thudOsc.type = "sine";
    thudOsc.frequency.setValueAtTime(90 * pitchOffset, now);
    thudOsc.frequency.exponentialRampToValueAtTime(25, now + 0.15);
    const thudGain = createGain(ctx, 0.12);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudOsc.start(now);
    thudOsc.stop(now + 0.2);
  } catch (_) {
    // silently ignore
  }
}

// ─── Reload ───────────────────────────────────────────────────────────────

export function playReload() {
  try {
    const ctx = getAudioContext();

    const playClick = (time: number, freq: number, vol: number) => {
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.3, time + 0.06);

      const bufSize = Math.floor(ctx.sampleRate * 0.06);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
      const ns = ctx.createBufferSource();
      ns.buffer = buf;

      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(1200, time);

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(vol, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.07);

      osc.connect(gainNode);
      ns.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.07);
      ns.start(time);
      ns.stop(time + 0.07);
    };

    const now = ctx.currentTime;
    playClick(now, 900, 0.22);
    playClick(now + 0.18, 1100, 0.28);
    playClick(now + 0.32, 800, 0.18);
  } catch (_) {
    // silently ignore
  }
}

// ─── Reload complete chime ────────────────────────────────────────────────

export function playReloadReady() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    [523, 659].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.1);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now + i * 0.1);
      g.gain.linearRampToValueAtTime(0.12, now + i * 0.1 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);

      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.2);
    });
  } catch (_) {
    // silently ignore
  }
}

// ─── Ambient wind ────────────────────────────────────────────────────────

let ambientSource: AudioBufferSourceNode | null = null;
let ambientGain: GainNode | null = null;

export function startAmbient() {
  try {
    if (ambientSource) return;
    const ctx = getAudioContext();
    const sampleRate = ctx.sampleRate;
    const duration = 4;
    const bufferSize = sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    ambientSource = ctx.createBufferSource();
    ambientSource.buffer = buffer;
    ambientSource.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(200, ctx.currentTime);

    ambientGain = ctx.createGain();
    ambientGain.gain.setValueAtTime(0, ctx.currentTime);
    ambientGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 3);

    ambientSource.connect(lowpass);
    lowpass.connect(ambientGain);
    ambientGain.connect(ctx.destination);
    ambientSource.start();
  } catch (_) {
    // silently ignore
  }
}

export function stopAmbient() {
  try {
    if (ambientSource) {
      ambientSource.stop();
      ambientSource = null;
    }
  } catch (_) {
    // silently ignore
  }
}

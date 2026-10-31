/**
 * Cat voice, synthesised with Web Audio (no sound files): a "mi-ao" meow
 * and a purr. Browsers only allow audio after the user has touched the
 * page, and every call here comes from a tap, so it just works.
 * Muted when localStorage 'fp-sound' is 'off'.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (localStorage.getItem('fp-sound') === 'off') return null;
  } catch { /* storage blocked: keep sound on */ }
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** One meow. pitch 1 = an adult cat; > 1 sounds smaller and cuter. */
export function meow(pitch = 1.2) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.01;
  const dur = 0.55 + Math.random() * 0.25;
  const base = 520 * pitch * (0.92 + Math.random() * 0.16);

  // Voice: a buzzy source whose pitch rises then falls ("mi-ao").
  const osc = a.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(base * 0.85, t);
  osc.frequency.linearRampToValueAtTime(base * 1.35, t + dur * 0.35);
  osc.frequency.exponentialRampToValueAtTime(base * 0.75, t + dur);
  const vibrato = a.createOscillator();
  const vibratoDepth = a.createGain();
  vibrato.frequency.value = 6;
  vibratoDepth.gain.value = base * 0.015;
  vibrato.connect(vibratoDepth).connect(osc.frequency);

  // Mouth: two formants that open ("i" -> "a") and close ("o").
  const f1 = a.createBiquadFilter();
  f1.type = 'bandpass';
  f1.Q.value = 6;
  f1.frequency.setValueAtTime(700, t);
  f1.frequency.linearRampToValueAtTime(1100, t + dur * 0.4);
  f1.frequency.linearRampToValueAtTime(650, t + dur);
  const f2 = a.createBiquadFilter();
  f2.type = 'bandpass';
  f2.Q.value = 8;
  f2.frequency.setValueAtTime(2300, t);
  f2.frequency.linearRampToValueAtTime(1600, t + dur);

  const env = a.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.32, t + 0.06);
  env.gain.setValueAtTime(0.32, t + dur * 0.6);
  env.gain.exponentialRampToValueAtTime(0.001, t + dur);

  osc.connect(f1).connect(env);
  osc.connect(f2).connect(env);
  env.connect(a.destination);
  osc.start(t);
  vibrato.start(t);
  osc.stop(t + dur + 0.05);
  vibrato.stop(t + dur + 0.05);
}

/** A soft purr for `seconds` (contented, while being petted). */
export function purr(seconds = 2.5) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.01;
  // Low rumble: filtered noise, pulsing ~25 times a second like a real purr,
  // a little louder on the in-breath, softer on the out-breath.
  const len = Math.ceil(a.sampleRate * seconds);
  const buffer = a.createBuffer(1, len, a.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; // brown noise
    data[i] = last * 3.5;
  }
  const noise = a.createBufferSource();
  noise.buffer = buffer;
  const low = a.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 220;

  const pulse = a.createGain();
  pulse.gain.value = 0.5;
  const lfo = a.createOscillator();
  const lfoDepth = a.createGain();
  lfo.frequency.value = 25;
  lfoDepth.gain.value = 0.5;
  lfo.connect(lfoDepth).connect(pulse.gain);

  const env = a.createGain();
  env.gain.setValueAtTime(0, t);
  for (let s = 0; s < seconds; s += 1.6) {
    env.gain.linearRampToValueAtTime(0.9, t + s + 0.5);
    env.gain.linearRampToValueAtTime(0.5, t + s + 1.5);
  }
  env.gain.linearRampToValueAtTime(0, t + seconds);

  noise.connect(low).connect(pulse).connect(env).connect(a.destination);
  noise.start(t);
  lfo.start(t);
  noise.stop(t + seconds);
  lfo.stop(t + seconds);
}

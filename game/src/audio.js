// Ember & Sage Kitchen: every sound is synthesized with WebAudio — short
// oscillator blips and filtered noise, no audio files. The context is
// created on the first user gesture, so a silent page load stays silent.
export function createAudio() {
  let context = null;
  let muted = false;
  let sizzleTimer = 0;

  function ensure() {
    if (!context) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        context = new AudioContext();
      } catch {
        context = null;
      }
    }
    if (context && context.state === 'suspended') context.resume();
    return context;
  }

  function tone(frequency, duration, type, volume, when = 0, slideTo = 0) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const start = ctx.currentTime + when;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function noise(duration, volume, filterFrequency) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFrequency;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  }

  return {
    ensure,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    click() {
      tone(660, 0.07, 'triangle', 0.12);
    },
    pickup() {
      tone(520, 0.08, 'sine', 0.14, 0, 780);
    },
    place() {
      tone(330, 0.09, 'triangle', 0.12, 0, 220);
    },
    chop() {
      noise(0.09, 0.22, 2400);
    },
    sizzle(dt) {
      sizzleTimer -= dt;
      if (sizzleTimer <= 0) {
        sizzleTimer = 0.16;
        noise(0.12, 0.05, 5200);
      }
    },
    grillDone() {
      tone(880, 0.12, 'sine', 0.14);
      tone(1174, 0.16, 'sine', 0.12, 0.09);
    },
    serve() {
      tone(523, 0.12, 'sine', 0.16);
      tone(659, 0.12, 'sine', 0.16, 0.1);
      tone(784, 0.2, 'sine', 0.16, 0.2);
    },
    bad() {
      tone(196, 0.22, 'sawtooth', 0.1, 0, 130);
    },
    expired() {
      tone(392, 0.14, 'triangle', 0.12, 0, 260);
      tone(311, 0.2, 'triangle', 0.12, 0.13, 220);
    },
    win() {
      [523, 659, 784, 1046].forEach((frequency, index) => {
        tone(frequency, 0.22, 'sine', 0.15, index * 0.13);
      });
    },
  };
}

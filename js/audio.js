/** Web Audio cue player. Missing files fail silently. */

function dbToGain(db) {
  return 10 ** (db / 20);
}

export function createAudio(cues, mixing) {
  const byId = Object.fromEntries((cues || []).map((c) => [c.id, c]));
  let ctx = null;
  let master = null;
  let muted = sessionStorage.getItem('w5-muted') === '1';
  let manifest = null;
  let manifestTried = false;
  const buffers = new Map();
  let music = null;
  let voice = null;
  let unlocked = false;
  let wantedMusic = null;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    return ctx;
  }

  async function loadManifest() {
    if (manifestTried) return manifest;
    manifestTried = true;
    try {
      const res = await fetch('assets/audio/manifest.json');
      if (res.ok) manifest = await res.json();
      else manifest = {};
    } catch {
      manifest = {};
    }
    return manifest;
  }

  async function bufferFor(id) {
    if (!ctx) return null;
    await loadManifest();
    if (buffers.has(id)) return buffers.get(id);
    const file = manifest?.[id]?.file;
    if (!file) {
      buffers.set(id, null);
      return null;
    }
    try {
      const res = await fetch(file);
      if (!res.ok) {
        buffers.set(id, null);
        return null;
      }
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      buffers.set(id, buf);
      return buf;
    } catch {
      buffers.set(id, null);
      return null;
    }
  }

  function musicGain() {
    return music?.gain || null;
  }

  /**
   * While someone speaks, the music fades almost to silence; when they stop,
   * it waits a moment and comes back gently.
   */
  function duck(on) {
    const node = musicGain();
    if (!node || !ctx) return;
    const base = music.base;
    const now = ctx.currentTime;
    const g = node.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    if (on) {
      g.linearRampToValueAtTime(base * dbToGain(mixing?.duckMusicUnderVoiceDb ?? -26), now + (mixing?.duckAttackMs ?? 250) / 1000);
    } else {
      const hold = (mixing?.duckHoldMs ?? 400) / 1000;
      g.setValueAtTime(g.value, now + hold);
      g.linearRampToValueAtTime(base, now + hold + (mixing?.duckReleaseMs ?? 1200) / 1000);
    }
  }

  /** Fade a track out over a short time, then stop it, so music never cuts off abruptly. */
  function fadeOut(track, ms = 600) {
    if (!track?.source || !ctx) return;
    const now = ctx.currentTime;
    const g = track.gain.gain;
    try {
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0, now + ms / 1000);
      track.source.stop(now + ms / 1000 + 0.05);
    } catch {
      try { track.source.stop(); } catch { /* already ended */ }
    }
  }

  async function startBuffer(id, { loop = false, voiceTrack = false } = {}) {
    if (!unlocked) return null;
    ensure();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch { return; }
    }
    const buf = await bufferFor(id);
    if (!buf || !ctx) return;
    const cue = byId[id];
    const gain = ctx.createGain();
    gain.gain.value = dbToGain(cue?.gainDb ?? (voiceTrack ? (mixing?.voiceGainDb ?? -2) : -16));
    gain.connect(master);
    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = loop || !!cue?.loop;
    source.connect(gain);
    if (voiceTrack) {
      if (voice?.source) {
        try { voice.source.stop(); } catch { /* already ended */ }
      }
      voice = { source, gain };
      duck(true);
      source.onended = () => {
        if (voice?.source === source) {
          voice = null;
          duck(false);
        }
      };
    }
    const isMusic = !voiceTrack && (id.startsWith('music.') || (cue?.channel === 'music' && cue?.loop));
    if (isMusic && wantedMusic !== id) return null;
    if (isMusic) {
      const target = gain.gain.value;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(target, ctx.currentTime + 1.2);
    }
    try { source.start(); } catch { /* ignore */ }
    if (isMusic) {
      fadeOut(music, 800);
      music = { source, gain, base: dbToGain(cue?.gainDb ?? -16), id };
      if (voice) duck(true);
    }
    return source;
  }

  return {
    async unlock() {
      unlocked = true;
      ensure();
      if (ctx?.state === 'suspended') {
        try { await ctx.resume(); } catch { /* ignore */ }
      }
      await loadManifest();
    },
    play(id) {
      if (!id || muted) return;
      startBuffer(id).catch(() => {});
    },
    say(id) {
      if (!id || muted) return;
      if (mixing?.oneVoiceAtATime !== false && voice?.source) {
        try { voice.source.stop(); } catch { /* ignore */ }
      }
      startBuffer(id, { voiceTrack: true }).catch(() => {});
    },
    /** Resolves true when at least one audio file is listed in the manifest. */
    async ready() {
      const list = await loadManifest();
      return !!list && Object.keys(list).length > 0;
    },
    loop(id) {
      if (!id) return;
      if (music?.id === id || wantedMusic === id) return;
      wantedMusic = id;
      startBuffer(id, { loop: true })
        .then((source) => { if (!source && wantedMusic === id) wantedMusic = null; })
        .catch(() => { if (wantedMusic === id) wantedMusic = null; });
    },
    stopMusic() {
      wantedMusic = null;
      fadeOut(music, 700);
      music = null;
    },
    stopAll() {
      this.stopMusic();
      if (voice?.source) {
        try { voice.source.stop(); } catch { /* ignore */ }
      }
      voice = null;
    },
    setMuted(value) {
      muted = !!value;
      sessionStorage.setItem('w5-muted', muted ? '1' : '0');
      if (master) master.gain.value = muted ? 0 : 1;
    },
    toggleMuted() {
      this.setMuted(!muted);
      return muted;
    },
    isMuted: () => muted,
    resetMute() {
      muted = false;
      sessionStorage.removeItem('w5-muted');
      if (master) master.gain.value = 1;
    },
  };
}

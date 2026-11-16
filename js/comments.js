import { score, usedPatterns } from './scoring.js';

function kebab(value) {
  return String(value).replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/** All the lines a client has for one moment (older data may hold a single string). */
export function triggerLines(client, key) {
  const value = client?.lines?.triggers?.[key];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/** One line and its voice file. The first line keeps the original file name; others add -2, -3. */
export function triggerLine(client, key, index = 0) {
  const lines = triggerLines(client, key);
  const i = Math.min(Math.max(index, 0), lines.length - 1);
  if (i < 0) return null;
  const file = i === 0 ? kebab(key) : `${kebab(key)}-${i + 1}`;
  return { text: lines[i], voice: `voice.${client.id}.${file}` };
}

const SAME_MOMENT_PAUSE_MS = 20000;

export function createComments({ store, game, audio }) {
  let queue = [];
  let timer = 0;
  let hideTimer = 0;
  let showing = false;
  let lastAt = 0;
  const saidRules = new Set();
  // Which lines each client has already said this round, and when each moment last spoke.
  const saidLines = new Map();
  const lastMoment = new Map();
  const gap = (game.meta.liveCommentMinGapSeconds || 4) * 1000;

  function pump() {
    if (showing || !queue.length) return;
    const wait = Math.max(0, lastAt + gap - Date.now());
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const item = queue.shift();
      if (!item) return;
      showing = true;
      lastAt = Date.now();
      store.set({ comment: item.text });
      if (item.voice) audio.say(item.voice);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        showing = false;
        if (store.get().comment === item.text) store.set({ comment: null });
        pump();
      }, 3000);
    }, wait);
  }

  function push(text, voice) {
    if (!text) return;
    queue.push({ text, voice });
    if (queue.length > 3) queue = queue.slice(-3);
    pump();
  }

  function onDesign(prev, next, client) {
    if (!client || !prev || !next) return;
    // Say a line for this moment that hasn't been said yet this round, picked at random.
    // When all of them have been said, the client stays quiet about it; the same moment waits 20s.
    const voice = (key) => {
      const lines = triggerLines(client, key);
      if (!lines.length) return;
      const id = `${client.id}:${key}`;
      const now = Date.now();
      if (now - (lastMoment.get(id) || -Infinity) < SAME_MOMENT_PAUSE_MS) return;
      const used = saidLines.get(id) || new Set();
      const fresh = lines.map((_, i) => i).filter((i) => !used.has(i));
      if (!fresh.length) return;
      const pick = fresh[Math.floor(Math.random() * fresh.length)];
      used.add(pick);
      saidLines.set(id, used);
      lastMoment.set(id, now);
      const line = triggerLine(client, key, pick);
      push(line.text, line.voice);
    };

    if (next.palette !== prev.palette) {
      if (next.palette === client.wishlist.palette.perfect) voice('perfectPalette');
      if ((client.dealBreakers.palettes || []).includes(next.palette)) voice('dealBreakerPalette');
    }
    if (next.heading !== prev.heading) {
      if (next.heading === client.wishlist.headingFont.perfect) voice('perfectHeading');
      if ((client.dealBreakers.headingFonts || []).includes(next.heading)) voice('dealBreakerHeading');
    }
    if (next.style !== prev.style && next.style === client.wishlist.style.perfect) voice('perfectStyle');
    if (next.picture !== prev.picture) {
      if (next.picture === client.wishlist.pictures.perfect) voice('perfectPictures');
      const pic = game.kit.pictures.find((p) => p.id === next.picture);
      if (pic?.decoy) voice('decoyPicture');
    }
    const beforePats = usedPatterns(prev.sections);
    const afterPats = usedPatterns(next.sections);
    const added = afterPats.filter((id) => !beforePats.includes(id));
    if (added.some((id) => (client.dealBreakers.patterns || []).includes(id))) voice('dealBreakerDecoration');
    else if (added.some((id) => (client.wishlist.patterns || []).includes(id))) voice('nicePattern');
    if (beforePats.length && !afterPats.length) voice('noDecoration');

    const prevTypes = (prev.sections || []).map((s) => s.type);
    const nextTypes = (next.sections || []).map((s) => s.type);
    const must = client.wishlist.mustHave;
    const prevCount = prevTypes.filter((t) => t === must).length;
    const nextCount = nextTypes.filter((t) => t === must).length;
    if (nextCount > prevCount) voice('mustHaveAdded');

    const before = new Set(score(prev, client, game).rulesBroken);
    const after = score(next, client, game);
    for (const ruleId of after.rulesBroken) {
      if (before.has(ruleId) || saidRules.has(`${client.id}:${ruleId}`)) continue;
      saidRules.add(`${client.id}:${ruleId}`);
      const rule = game.scoring.everyonesRules.find((r) => r.id === ruleId);
      push(rule?.comment, `voice.${client.id}.rule-${ruleId}`);
    }

    const prevScore = score(prev, client, game);
    if (after.dealBreakers.length > prevScore.dealBreakers.length) audio.play('mood.dealbreaker');
    else if (after.meter > prevScore.meter) audio.play('mood.up');
    else if (after.meter < prevScore.meter) audio.play('mood.down');
  }

  return {
    push,
    onDesign,
    reset() {
      queue = [];
      showing = false;
      saidRules.clear();
      saidLines.clear();
      lastMoment.clear();
      window.clearTimeout(timer);
      window.clearTimeout(hideTimer);
    },
  };
}

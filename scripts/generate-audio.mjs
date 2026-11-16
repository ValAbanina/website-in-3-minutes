#!/usr/bin/env node
// Generates every voice line and sound effect for the game with ElevenLabs,
// once, at build time. The API key stays in .env on your computer and is
// NEVER shipped to the browser. The game only loads the MP3 files.
//
// Usage:
//   node scripts/generate-audio.mjs --dry-run          # list what would be generated
//   node scripts/generate-audio.mjs                    # generate everything that is missing
//   node scripts/generate-audio.mjs --only=voices      # or --only=sfx, --only=music
//   node scripts/generate-audio.mjs --client=gerald    # one client's voice lines
//   node scripts/generate-audio.mjs --force            # regenerate even if the file exists
//
// Needs Node 20.12+ (built-in fetch and .env loading).

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));

// ---- load .env -----------------------------------------------------------
try { process.loadEnvFile(join(root, '.env')); }
catch {
  try {
    const raw = await readFile(join(root, '.env'), 'utf8');
    for (const line of raw.split('\n')) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
  } catch { /* no .env */ }
}
const API = process.env.ELEVENLABS_API_BASE || 'https://api.elevenlabs.io';
const KEY = process.env.ELEVENLABS_API_KEY;
const FORMAT = process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_128';
const DRY = !!args['dry-run'];
if (!KEY && !DRY) { console.error('Missing ELEVENLABS_API_KEY in .env (or run with --dry-run).'); process.exit(1); }

const game = JSON.parse(await readFile(join(root, 'data/game-data.json'), 'utf8'));
const sfx = JSON.parse(await readFile(join(root, 'data/sound-cues.json'), 'utf8'));
const cast = JSON.parse(await readFile(join(root, 'data/voices.json'), 'utf8'));

// Newest models first; if the account can't use one, fall back to the next.
const VOICE_MODELS = [...new Set([process.env.ELEVENLABS_MODEL_ID, cast.model, cast.fallbackModel, 'eleven_multilingual_v2'].filter(Boolean))];
const SFX_MODELS = ['eleven_text_to_sound_v3', 'eleven_text_to_sound_v2'];
const MUSIC_MODELS = ['music_v2_5', 'music_v2', 'music_v1'];
const working = { voice: 0, sfx: 0, music: 0 };

// ---- build the job list --------------------------------------------------
const jobs = [];
const voiceFor = (id) => process.env[`ELEVENLABS_VOICE_${id.toUpperCase()}`] || cast.voices[id]?.id;
const settingsFor = (id) => cast.voices[id]?.settings || {};
if (args.only !== 'sfx') {
  for (const c of game.clients) {
    if (args.client && args.client !== c.id) continue;
    const add = (key, text) => jobs.push({ kind: 'voice', id: `voice.${c.id}.${key}`, who: c.id, voice: voiceFor(c.id), voiceEnv: `ELEVENLABS_VOICE_${c.id.toUpperCase()}`, text, file: `assets/audio/voice/${c.id}/${key}.mp3` });
    add('brief', c.brief);
    c.lines.happy.forEach((t, i) => add(`happy-${i + 1}`, t));
    c.lines.meh.forEach((t, i) => add(`meh-${i + 1}`, t));
    c.lines.meltdown.forEach((t, i) => add(`meltdown-${i + 1}`, t));
    add('times-up', c.lines.timesUp);
    add('hurry', c.lines.hurry);
    // Each moment has up to three lines: the first keeps the original file name, the others add -2, -3.
    for (const [k, value] of Object.entries(c.lines.triggers)) {
      const key = k.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
      (Array.isArray(value) ? value : [value]).forEach((t, i) => add(i === 0 ? key : `${key}-${i + 1}`, t));
    }
    for (const r of game.scoring.everyonesRules) add(`rule-${r.id}`, r.comment);
  }
  if (!args.client || args.client === 'deadline') {
    game.deadline.lines.forEach((t, i) => jobs.push({ kind: 'voice', id: `voice.deadline.${i + 1}`, who: 'deadline', voice: voiceFor('deadline'), voiceEnv: 'ELEVENLABS_VOICE_DEADLINE', text: t, file: `assets/audio/voice/deadline/line-${i + 1}.mp3` }));
  }
}
if (args.only !== 'voices' && !args.client) {
  for (const s of sfx.cues) {
    const kind = s.engine === 'music' ? 'music' : 'sfx';
    if (args.only && args.only !== kind) continue;
    const folder = kind === 'music' ? 'music' : 'sfx';
    jobs.push({ kind, id: s.id, text: s.prompt, duration: s.duration, loop: !!s.loop, file: `assets/audio/${folder}/${s.id.replace(/\./g, '-')}.mp3` });
  }
}

// ---- one request, trying each model until one works ------------------------
function request(j, model) {
  if (j.kind === 'voice') {
    const st = settingsFor(j.who);
    return {
      url: `${API}/v1/text-to-speech/${j.voice}?output_format=${FORMAT}`,
      body: {
        text: j.text,
        model_id: model,
        voice_settings: { stability: st.stability ?? 0.45, similarity_boost: 0.8, style: st.style ?? 0.35, use_speaker_boost: true, speed: st.speed ?? 1 },
      },
    };
  }
  if (j.kind === 'music') {
    return {
      url: `${API}/v1/music?output_format=${FORMAT}`,
      body: { prompt: j.text, music_length_ms: Math.round((j.duration || 30) * 1000), model_id: model, force_instrumental: true },
    };
  }
  return {
    url: `${API}/v1/sound-generation?output_format=${FORMAT}`,
    body: { text: j.text, model_id: model, duration_seconds: Math.min(30, Math.max(0.5, j.duration || 1)), loop: j.loop, prompt_influence: 0.5 },
  };
}

const modelsFor = (kind) => (kind === 'voice' ? VOICE_MODELS : kind === 'music' ? MUSIC_MODELS : SFX_MODELS);

function explain(status, text) {
  if (status === 401 && /missing_permissions|permission/i.test(text)) return 'your API key is missing a permission. In ElevenLabs > Developers > API keys, edit the key and allow Text to Speech, Sound Effects, Music and Voices (read).';
  if (status === 401) return 'the API key was not accepted. Check ELEVENLABS_API_KEY in .env.';
  if (status === 402 || /quota|credits/i.test(text)) return 'not enough credits on your ElevenLabs plan. Files made so far are kept; run the same command again after topping up.';
  return `${status} ${text.slice(0, 300)}`;
}

async function generate(j) {
  const models = modelsFor(j.kind);
  let lastError = '';
  for (let m = working[j.kind]; m < models.length; m++) {
    const { url, body } = request(j, models[m]);
    const res = await fetch(url, { method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body: JSON.stringify(body) });
    if (res.ok) {
      if (m !== working[j.kind]) console.log(`  (using ${models[m]} for ${j.kind})`);
      working[j.kind] = m;
      return Buffer.from(await res.arrayBuffer());
    }
    const text = await res.text();
    lastError = explain(res.status, text);
    const modelProblem = (res.status === 400 || res.status === 403 || res.status === 404 || res.status === 422) && /model/i.test(text);
    if (!modelProblem) break;
  }
  throw new Error(lastError);
}

// ---- run -----------------------------------------------------------------
const exists = async (p) => { try { await access(p); return true; } catch { return false; } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const manifestPath = join(root, 'assets/audio/manifest.json');
let manifest = {};
try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch { /* new */ }

let made = 0, skipped = 0, failed = 0;
for (const j of jobs) {
  const out = join(root, j.file);
  manifest[j.id] = { file: j.file, text: j.text, kind: j.kind };
  if (!args.force && await exists(out)) { skipped++; continue; }
  if (DRY) { console.log(`[dry] ${j.kind.padEnd(5)} ${j.id}  →  ${j.file}${j.kind === 'voice' && !j.voice ? `   (set ${j.voiceEnv})` : ''}`); continue; }
  if (j.kind === 'voice' && !j.voice) { console.warn(`skip ${j.id}: set ${j.voiceEnv} in .env`); failed++; continue; }
  try {
    const audio = await generate(j);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, audio);
    made++; console.log(`✓ ${j.id}`);
  } catch (e) {
    failed++; console.error(`✗ ${j.id}: ${e.message}`);
    if (/permission|not accepted|credits/.test(e.message)) { console.error('\nStopping here. Fix the issue above, then run the same command again; finished files are kept.'); break; }
  }
  await sleep(350); // be gentle with rate limits
}
if (!DRY) {
  // List only files that really exist, so the game never asks for a missing one.
  for (const [id, entry] of Object.entries(manifest)) if (!await exists(join(root, entry.file))) delete manifest[id];
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}
console.log(`\n${DRY ? 'Would generate' : 'Generated'} ${DRY ? jobs.length - skipped : made}, skipped ${skipped} existing, ${failed} failed.`);

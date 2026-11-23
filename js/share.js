import { esc, firstName, formatClock } from './dom.js';
import { characterSVG } from './characters.js';

export async function drawShareCard({ game, client, result, elapsed, canvas }) {
  const [size] = game.share.size;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const bg = client.color || '#8FB8E8';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  roundRect(ctx, 64, 64, size - 128, size - 128, 36, '#ffffff', '#000000');
  ctx.fillStyle = '#000000';
  ctx.font = '700 36px Roboto, sans-serif';
  ctx.fillText('Website in 3 minutes', 110, 150);
  ctx.fillStyle = '#D72885';
  ctx.font = '800 28px Roboto Condensed, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('DESIGN', size - 120, 130);
  ctx.fillStyle = '#000000';
  ctx.fillText('FORMATION', size - 120, 164);
  ctx.textAlign = 'left';

  roundRect(ctx, 110, 200, size - 220, 460, 28, bg, '#000000');

  const mood = result.outcome?.id || 'meh';
  const who = firstName(client);
  const verb = game.share.outcomeVerbs[mood] || mood;
  const headline = game.share.headline
    .replace('{client}', who)
    .replace('{outcomeVerb}', verb)
    .replace('{time}', formatClock(elapsed));

  ctx.fillStyle = '#111111';
  ctx.font = '800 54px Roboto Condensed, sans-serif';
  wrapText(ctx, headline, 110, 760, size - 220, 62);

  ctx.fillStyle = '#414141';
  ctx.font = '400 32px Roboto, sans-serif';
  ctx.fillText(game.share.subs[mood] || '', 110, 960);
  ctx.textAlign = 'right';
  ctx.fillText(game.share.footer, size - 120, 960);
  ctx.textAlign = 'left';

  const portrait = await loadPortrait(client.id, mood);
  if (portrait) {
    const ratio = (portrait.naturalWidth || 240) / (portrait.naturalHeight || 280);
    const w = 300;
    const h = w / ratio;
    ctx.drawImage(portrait, size / 2 - w / 2, 240, w, h);
  }
  else {
    ctx.fillStyle = '#111111';
    ctx.font = '800 120px Roboto Condensed, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(who.slice(0, 1), size / 2, 470);
    ctx.textAlign = 'left';
  }
  paintStamp(ctx, size, result);
}

function paintStamp(ctx, size, result) {
  const stamp = result.outcome?.stamp || '';
  ctx.save();
  ctx.translate(size - 340, 250);
  ctx.rotate(-0.14);
  ctx.strokeStyle = result.outcome?.stampColor || '#007A7A';
  ctx.lineWidth = 10;
  ctx.strokeRect(0, 0, 280, 110);
  ctx.fillStyle = result.outcome?.stampColor || '#007A7A';
  ctx.font = '800 48px Roboto Condensed, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(stamp, 140, 72);
  ctx.restore();

  roundRect(ctx, size - 420, 560, 220, 64, 32, '#111111');
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 28px Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Score ${result.points}/${result.max}`, size - 310, 602);
  ctx.textAlign = 'left';
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('missing'));
    img.src = src;
  });
}

async function loadPortrait(id, mood) {
  try {
    return await loadImage(`assets/svg/characters/${id}-${mood}.svg`);
  } catch { /* drawn stand-in until the asset export */ }
  const url = URL.createObjectURL(new Blob([characterSVG(id, mood)], { type: 'image/svg+xml' }));
  try {
    return await loadImage(url);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 8; ctx.stroke(); }
}

function wrapText(ctx, text, x, y, max, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  words.forEach((word) => {
    const test = `${line}${word} `;
    if (ctx.measureText(test).width > max && line) {
      ctx.fillText(line.trim(), x, yy);
      line = `${word} `;
      yy += lineHeight;
    } else line = test;
  });
  ctx.fillText(line.trim(), x, yy);
}

/** The live game's address (without any ?query), so shared links always open the game. */
export function gameUrl() {
  return `${location.origin}${location.pathname}`;
}

/** What a shared post says, e.g. "I made Rosa melt down in 2:41. Can you build a website in 3 minutes?" */
export function shareText({ game, client, result, elapsed }) {
  const mood = result.outcome?.id || 'meh';
  const line = game.share.headline
    .replace('{client}', firstName(client))
    .replace('{outcomeVerb}', game.share.outcomeVerbs[mood] || mood)
    .replace('{time}', formatClock(elapsed));
  return `${line}. Can you build a website in 3 minutes?`;
}

const ICONS = {
  share: '<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
  facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>',
  x: '<path d="M4 4l16 16M20 4 4 20"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

/** A row of share icons. The device share sheet only shows where the browser supports it. */
export function shareIcons(text) {
  const url = gameUrl();
  const enc = encodeURIComponent;
  const links = [
    ['linkedin', 'Share on LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`],
    ['facebook', 'Share on Facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`],
    ['x', 'Share on X', `https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}`],
  ];
  const native = typeof navigator !== 'undefined' && navigator.share
    ? `<button type="button" class="share-ico" data-action="share-native" aria-label="Share">${icon('share')}</button>`
    : '';
  return `<div class="share-row" role="group" aria-label="Share your result">
    <span class="share-label">Share</span>
    ${native}
    <button type="button" class="share-ico" data-action="share-copy" aria-label="Copy link">${icon('link')}</button>
    ${links.map(([id, label, href]) => `<a class="share-ico" href="${esc(href)}" target="_blank" rel="noopener" aria-label="${esc(label)}" data-share="${id}">${icon(id)}</a>`).join('')}
  </div>`;
}

/** Called straight from the tap, so phones and iPads accept it (no slow work before it). */
export async function shareNative(text) {
  try {
    await navigator.share({ title: 'Website in 3 minutes', text, url: gameUrl() });
    return 'shared';
  } catch (err) {
    return err?.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}

export async function copyLink(text) {
  const value = `${text} ${gameUrl()}`;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Older browsers: copy through a hidden text box.
    const box = document.createElement('textarea');
    box.value = value;
    box.setAttribute('readonly', '');
    box.style.position = 'fixed';
    box.style.opacity = '0';
    document.body.appendChild(box);
    box.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    box.remove();
    return ok;
  }
}

export function bubble(text, extra = '') {
  if (!text) return '';
  return `<p class="bubble ${extra}" role="status">${esc(text)}</p>`;
}


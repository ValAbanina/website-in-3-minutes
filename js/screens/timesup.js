import { esc, firstName } from '../dom.js';
import { logo, muteButton } from '../chrome.js';
import { characterHTML } from '../characters.js';
import { browserShell, renderSite, applyZoom } from '../site/render.js';

/** Which Deadline line to say this time (picked when the clock ran out). */
export function deadlineLine(state, game) {
  const lines = game.deadline.lines;
  const i = Number.isInteger(state.deadlineLine) ? state.deadlineLine : 0;
  return { index: i, text: lines[i] || lines[0] };
}

export function render(state, game, client) {
  const who = firstName(client);
  const said = deadlineLine(state, game);
  // A frozen, whole-page picture of exactly what was sent.
  const sent = { ...state, overview: false, selectedSection: null, picTarget: null, previewMode: 'desktop' };
  return `<div class="screen screen-timesup">
    <header class="topbar topbar-dark">
      ${logo()}
      <p class="timer is-panic"><span class="timer-k">Time left</span><span class="timer-num">0:00</span></p>
      ${muteButton(state.muted)}
    </header>
    <div class="tu">
      <div class="tu-stage moment-rise">
        <span class="tu-rays" aria-hidden="true"></span>
        <p class="bubble tu-say">${esc(said.text)}</p>
        ${characterHTML('deadline', 'neutral', 'tu-deadline')}
      </div>
      <div class="tu-side">
        <h1 class="tu-title">Time’s up!</h1>
        <p class="tu-lede">The Deadline sent your website to ${esc(who)}, exactly as it is.</p>
        <figure class="tu-site moment-slide" aria-label="The website you sent">
          <div class="tu-site-frame">${browserShell(sent, client, renderSite(sent, client, game))}</div>
          <span class="tu-stamp" aria-hidden="true">Sent as is</span>
        </figure>
        <div class="tu-react moment-slide" style="--card:${esc(client.color || 'var(--color-surface-muted)')}">
          ${characterHTML(client.id, 'meh', 'tu-client')}
          <p class="bubble">${esc(client.lines.timesUp)}</p>
        </div>
        <button type="button" class="btn btn-primary tu-go" data-action="see-verdict">See what ${esc(who)} thinks</button>
      </div>
    </div>
  </div>`;
}

export function mount(section) {
  // Like a screenshot of the top of the page, at real desktop width.
  const fit = () => applyZoom(section.querySelector('.tu-site .browser-page'), 'width', false, 1200);
  fit();
  section.querySelectorAll('.tu-site img').forEach((img) => img.addEventListener('load', fit, { once: true }));
}

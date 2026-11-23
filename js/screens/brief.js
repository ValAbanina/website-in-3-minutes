import { esc, firstName } from '../dom.js';
import { logo, muteButton, progress } from '../chrome.js';
import { characterHTML } from '../characters.js';

export function render(state, game, client) {
  const who = firstName(client);
  return `<div class="screen screen-client">
    <header class="topbar topbar-clear">
      ${logo()}
      ${progress('brief')}
      ${muteButton(state.muted)}
    </header>
    <div class="brief">
      <div class="brief-person moment-rise">
        <p class="bubble bubble-lg">${esc(client.brief)}</p>
        ${characterHTML(client.id, 'neutral', 'brief-art')}
      </div>
      <article class="brief-card moment-slide">
        <div class="brief-who">
          <h1>${esc(client.name)}</h1>
          <p class="role">${esc(client.role)}, ${esc(client.business)}</p>
        </div>
        <div class="brief-howto">
          <h2>How it works</h2>
          <ol class="brief-steps">
            <li>Add sections to build the page.</li>
            <li>Choose colours, fonts, pictures and patterns.</li>
            <li>Send it to ${esc(who)} before time is up.</li>
          </ol>
        </div>
        <div class="brief-go">
          <div class="brief-buttons">
            <button type="button" class="btn needs-audio" data-action="play-brief" aria-label="Play ${esc(who)}'s voice"><svg class="btn-ico" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16 9a5 5 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>Hear ${esc(who)}</button>
            <button type="button" class="btn btn-primary" data-action="to-build">Start building</button>
          </div>
          <p>You get 3 minutes. The clock starts when you tap Start building.</p>
        </div>
      </article>
    </div>
  </div>`;
}

export function reread(client) {
  return `<div class="modal-back" data-action="close-brief">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="brief-title" tabindex="-1">
      <header class="modal-head">
        <h2 id="brief-title">${esc(client.name)}'s brief</h2>
        <button type="button" class="icon-btn" data-action="close-brief" aria-label="Close">×</button>
      </header>
      <div class="reread" style="--card:${esc(client.color)}">
        <div class="reread-text">
          <p class="bubble bubble-lg">${esc(client.brief)}</p>
          <p class="reread-note">${esc(client.personality)}</p>
        </div>
        <div class="reread-art">${characterHTML(client.id, 'turned')}</div>
      </div>
      <footer class="modal-foot">
        <button type="button" class="btn btn-primary" data-action="close-brief">Back to building</button>
      </footer>
    </div>
  </div>`;
}

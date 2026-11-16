import { punchyLine } from '../dom.js';
import { logo, cast, placeCastBubble } from '../chrome.js';

export function render(state, game) {
  const active = game.clients[0];
  const line = punchyLine(active.brief);
  return `<div class="stage stage-dark" data-action="to-start">
    <header class="topbar topbar-dark">
      ${logo()}
    </header>
    <div class="stage-copy moment-rise">
      <h1>Can you build a website in 5 minutes?</h1>
      <p>Five picky clients. One drag-and-drop builder. Make them happy before the clock runs out.</p>
      <button type="button" class="pill" data-action="to-start"><span aria-hidden="true">◎</span> Tap anywhere to play</button>
    </div>
    ${cast(game, active.id, line)}
  </div>`;
}

export function lineFor(game, index) {
  const client = game.clients[index % game.clients.length];
  return { client, line: punchyLine(client.brief) };
}

export function mount(section) {
  placeCastBubble(section);
  // Fonts can change the bubble's width once they arrive.
  document.fonts?.ready.then(() => placeCastBubble(section));
}

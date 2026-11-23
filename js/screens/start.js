import { logo, muteButton, cast, placeCastBubble } from '../chrome.js';
import { lineFor } from './attract.js';

export function render(state, game) {
  const { client, line } = lineFor(game, 0);
  return `<div class="stage stage-dark">
    <header class="topbar topbar-dark">
      ${logo()}
      ${muteButton(state.muted)}
    </header>
    <div class="stage-copy moment-rise">
      <h1>Can you build a website in 3 minutes?</h1>
      <p>Five picky clients. One drag-and-drop builder. Make them happy before the clock runs out.</p>
      <div class="row-actions">
        <button type="button" class="btn" data-action="open-howto">How to play</button>
        <button type="button" class="btn btn-primary" data-action="to-pick">Start the clock</button>
      </div>
    </div>
    ${cast(game, client.id, line)}
  </div>`;
}

export function mount(section) {
  placeCastBubble(section);
  // Fonts can change the bubble's width once they arrive.
  document.fonts?.ready.then(() => placeCastBubble(section));
}

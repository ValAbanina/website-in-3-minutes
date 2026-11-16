export function render() {
  return `<div class="modal-back" data-action="close-howto">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="howto-title" tabindex="-1">
      <header class="modal-head">
        <h2 id="howto-title">How to play</h2>
        <button type="button" class="icon-btn" data-action="close-howto" aria-label="Close">×</button>
      </header>
      <div class="howto-grid">
        <article>
          <span class="howto-n">1</span>
          <p>Pick a client and read their brief. Nobody says exactly what they want.</p>
        </article>
        <article>
          <span class="howto-n">2</span>
          <p>Build a one-page site: add sections, drag to reorder, choose how many columns.</p>
        </article>
        <article>
          <span class="howto-n">3</span>
          <p>Style it: colours, fonts, a style, pictures and patterns.</p>
        </article>
        <article>
          <span class="howto-n">4</span>
          <p>Send it before the 5 minutes run out, or the Deadline sends it for you.</p>
        </article>
      </div>
      <p class="howto-note"><strong>No hints while you build.</strong> Read the brief closely: you find out what the client thinks only after you send it.</p>
      <footer class="modal-foot">
        <p>Keyboard works too: Tab to move, Enter to choose, arrows to reorder sections.</p>
        <button type="button" class="btn btn-primary" data-action="close-howto">Got it</button>
      </footer>
    </div>
  </div>`;
}

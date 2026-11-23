export function render() {
  return `<div class="modal-back" data-action="close-howto">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="howto-title" tabindex="-1">
      <header class="modal-head">
        <h2 id="howto-title">How to play</h2>
        <button type="button" class="icon-btn" data-action="close-howto" aria-label="Close">×</button>
      </header>
      <div class="howto-grid">
        <article>
          <img class="howto-icon" src="assets/svg/howto/step-1.svg" alt="" width="72" height="72">
          <span class="howto-n">1</span>
          <p>Pick a client and read their brief.</p>
        </article>
        <article>
          <img class="howto-icon" src="assets/svg/howto/step-2.svg" alt="" width="72" height="72">
          <span class="howto-n">2</span>
          <p>Add sections to build the page.</p>
        </article>
        <article>
          <img class="howto-icon" src="assets/svg/howto/step-3.svg" alt="" width="72" height="72">
          <span class="howto-n">3</span>
          <p>Choose colours, fonts, pictures and patterns.</p>
        </article>
        <article>
          <img class="howto-icon" src="assets/svg/howto/step-4.svg" alt="" width="72" height="72">
          <span class="howto-n">4</span>
          <p>Send it before the 3 minutes are up.</p>
        </article>
      </div>
      <footer class="modal-foot">
        <p>Keyboard works too: Tab and Enter.</p>
        <button type="button" class="btn btn-primary" data-action="close-howto">Got it</button>
      </footer>
    </div>
  </div>`;
}

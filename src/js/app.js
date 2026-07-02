(() => {
  const { elements } = Garden;

  function bindEvents() {
    elements.quoteCard.addEventListener('click', (event) => {
      if (event.target.closest('.drag-handle')) return;
      Garden.nextQuote();
    });
    elements.quoteCard.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') Garden.nextQuote();
    });
    elements.noteWall.addEventListener('pointerdown', Garden.startNoteDrag);
    elements.noteWall.addEventListener('input', Garden.updateNoteText);
    elements.resetLayout.addEventListener('click', Garden.resetLayout);
    elements.refreshWeather.addEventListener('click', () => Garden.loadWeather());
  }

  async function init() {
    Garden.applySavedLayout();
    Garden.initClockControls();
    Garden.renderCalendar();
    await Garden.loadQuotes();
    await Garden.loadBookmarks();
    Garden.renderNotes();
    Garden.initMusicPlayer();
    Garden.loadWeather();
    Garden.initCursorTrail();
    Garden.initPageTransitions({ homeEntry: true });
    Garden.enableDragging({
      onNotesClick: () => Garden.addNote()
    });
    Garden.enableNoteDragging();
    bindEvents();
  }

  init();
})();





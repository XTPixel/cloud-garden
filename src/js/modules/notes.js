(() => {
  const { elements, storageKeys, readStorage, writeStorage, createId, escapeHtml, clamp } = Garden;
  const DEFAULT_TEXT = '点击编辑这张灵感便利贴';
  const NOTE_WIDTH = 230;
  const NOTE_HEIGHT = 210;
  let activeNoteId = null;
  let noteDragOptions = {};

  Garden.getNotes = function getNotes() {
    return readStorage(storageKeys.notes, []).map((note, index) => ({
      id: note.id ?? createId(),
      text: note.text ?? '',
      createdAt: note.createdAt ?? formatTime(),
      x: Number.isFinite(note.x) ? note.x : 120 + index * 24,
      y: Number.isFinite(note.y) ? note.y : 110 + index * 24,
      z: Number.isFinite(note.z) ? note.z : 70 + index
    }));
  };

  function saveNotes(notes) {
    writeStorage(storageKeys.notes, notes);
  }

  function formatTime() {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(new Date());
  }

  function getNextZ(notes) {
    return notes.reduce((maxZ, note) => Math.max(maxZ, note.z ?? 0), 70) + 1;
  }

  function positionFromBottle() {
    const rect = elements.notesToggle.getBoundingClientRect();
    return {
      x: clamp(rect.left - NOTE_WIDTH + 44, 12, window.innerWidth - NOTE_WIDTH - 12),
      y: clamp(rect.top - NOTE_HEIGHT - 18, 12, window.innerHeight - NOTE_HEIGHT - 12)
    };
  }

  function setActiveNote(id) {
    activeNoteId = id;
    document.querySelectorAll('.sticky-note').forEach((noteElement) => {
      noteElement.classList.toggle('active', noteElement.dataset.noteId === id);
    });
  }

  function updateNote(id, updater) {
    const notes = Garden.getNotes();
    const nextNotes = notes.map((note) => note.id === id ? updater({ ...note }, notes) : note);
    saveNotes(nextNotes);
    return nextNotes.find((note) => note.id === id);
  }

  Garden.renderNotes = function renderNotes() {
    const notes = Garden.getNotes();
    elements.noteWall.innerHTML = notes.map((note) => `
      <article class="sticky-note" data-note-id="${note.id}" style="left: ${note.x}px; top: ${note.y}px; z-index: ${note.z};">
        <div class="sticky-note-topbar">
          <span class="sticky-note-label">灵感便笺</span>
          <button class="sticky-note-trash" type="button" data-delete-note="${note.id}" aria-label="删除这张便利贴">🗑</button>
        </div>
        <textarea class="sticky-note-text" maxlength="240" aria-label="编辑便利贴内容" placeholder="写下一粒灵感...">${escapeHtml(note.text)}</textarea>
        <time>${escapeHtml(note.createdAt)}</time>
      </article>
    `).join('');
    if (activeNoteId && !notes.some((note) => note.id === activeNoteId)) activeNoteId = null;
    setActiveNote(activeNoteId);
  };

  Garden.addNote = function addNote(onSaved) {
    const notes = Garden.getNotes();
    const position = positionFromBottle();
    const note = {
      id: createId(),
      text: DEFAULT_TEXT,
      createdAt: formatTime(),
      x: position.x,
      y: position.y,
      z: getNextZ(notes)
    };
    saveNotes([...notes, note]);
    Garden.renderNotes();
    setActiveNote(note.id);
    window.setTimeout(() => {
      const noteElement = elements.noteWall.querySelector(`[data-note-id="${note.id}"]`);
      const textArea = noteElement?.querySelector('.sticky-note-text');
      textArea?.focus();
      textArea?.select();
    });
    onSaved?.(elements.notesToggle.getBoundingClientRect());
  };

  Garden.updateNoteText = function updateNoteText(event) {
    const noteElement = event.target.closest('.sticky-note');
    if (!noteElement || !event.target.classList.contains('sticky-note-text')) return;
    updateNote(noteElement.dataset.noteId, (note) => ({ ...note, text: event.target.value }));
  };

  Garden.deleteNote = function deleteNote(id) {
    saveNotes(Garden.getNotes().filter((note) => note.id !== id));
    if (activeNoteId === id) activeNoteId = null;
    Garden.renderNotes();
  };

  Garden.startNoteDrag = function startNoteDrag(event) {
    const noteElement = event.target.closest('.sticky-note');
    if (!noteElement) return;
    const id = noteElement.dataset.noteId;
    const textArea = noteElement.querySelector('.sticky-note-text');
    const deleteButton = event.target.closest('[data-delete-note]');
    if (deleteButton) {
      event.preventDefault();
      Garden.deleteNote(deleteButton.dataset.deleteNote);
      return;
    }
    const notes = Garden.getNotes();
    const nextZ = getNextZ(notes);
    updateNote(id, (note) => ({ ...note, z: nextZ }));
    noteElement.style.zIndex = nextZ;
    setActiveNote(id);
    noteDragOptions.onActivated?.(noteElement.getBoundingClientRect());

    if (event.target === textArea) return;
    event.preventDefault();
    const rect = noteElement.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = rect.left;
    const originY = rect.top;
    let currentX = originX;
    let currentY = originY;

    noteElement.classList.add('dragging');
    noteElement.setPointerCapture(event.pointerId);

    function moveNote(moveEvent) {
      const nextX = clamp(originX + moveEvent.clientX - startX, 8, window.innerWidth - noteElement.offsetWidth - 8);
      const nextY = clamp(originY + moveEvent.clientY - startY, 8, window.innerHeight - noteElement.offsetHeight - 8);
      currentX = nextX;
      currentY = nextY;
      noteElement.style.left = `${nextX}px`;
      noteElement.style.top = `${nextY}px`;
    }

    function endDrag(upEvent) {
      noteElement.classList.remove('dragging');
      noteElement.releasePointerCapture(upEvent.pointerId);
      noteElement.removeEventListener('pointermove', moveNote);
      noteElement.removeEventListener('pointerup', endDrag);
      noteElement.removeEventListener('pointercancel', cancelDrag);
      updateNote(id, (note) => ({ ...note, x: currentX, y: currentY }));
      noteDragOptions.onPositionSaved?.();
    }

    function cancelDrag() {
      noteElement.classList.remove('dragging');
      noteElement.removeEventListener('pointermove', moveNote);
      noteElement.removeEventListener('pointerup', endDrag);
      noteElement.removeEventListener('pointercancel', cancelDrag);
    }

    noteElement.addEventListener('pointermove', moveNote);
    noteElement.addEventListener('pointerup', endDrag);
    noteElement.addEventListener('pointercancel', cancelDrag);
  };

  Garden.enableNoteDragging = function enableNoteDragging(options = {}) {
    noteDragOptions = options;
  };
})();





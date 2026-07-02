(function () {
  const wall = document.querySelector('#photoWall');
  const lightbox = document.querySelector('#photoLightbox');
  const lightboxImage = document.querySelector('#photoLightboxImage');
  const lightboxCaption = document.querySelector('#photoLightboxCaption');
  const closeButton = document.querySelector('.photo-lightbox-close');

  if (!wall || !lightbox || !lightboxImage || !lightboxCaption || !closeButton) return;

  const photos = [
    'IMG_20260615_130015.jpg',
    'IMG_20260615_120917.jpg',
    'IMG_20260615_102434.jpg',
    'IMG_20260615_101150.jpg',
    'IMG_20260614_125723.jpg',
    'IMG_20260614_125604.jpg',
    'beauty_20260614113808.jpg',
    'beauty_20260614111522.jpg',
    'IMG_20260615_170138.jpg',
    'IMG_20260615_154459.jpg',
    'IMG_20260615_144646.jpg',
    'IMG_20260615_135026.jpg',
    'mmexport1781665484310.jpg',
    'IMG_20260615_170308.jpg',
    'mmexport1781666751705.jpg'
  ];

  const layout = [
    [9, 11, -10], [25, 9, 7], [43, 13, -5], [61, 8, 11], [76, 15, -8],
    [14, 31, 8], [31, 27, -12], [50, 35, 6], [68, 30, -6],
    [10, 52, -5], [27, 60, 12], [46, 53, -9], [64, 64, 7],
    [19, 76, -11], [55, 77, 4]
  ];

  let topZIndex = 30;
  let dragState = null;

  function renderPhotos() {
    wall.innerHTML = photos.map((photo, index) => {
      const [left, top, rotate] = layout[index % layout.length];
      const title = formatPhotoTitle(photo);
      return `
        <figure class="photo-paper" tabindex="0" role="button" aria-label="查看 ${escapeAttribute(title)}" style="--photo-x:${left}vw; --photo-y:${top}vh; --rotate:${rotate}deg; --hover-rotate:${rotate * 0.45}deg; --z:${index + 1};">
          <img src="photos/${escapeAttribute(photo)}" alt="${escapeAttribute(title)}" draggable="false" />
          <figcaption>${escapeHtml(title)}</figcaption>
        </figure>
      `;
    }).join('');

    wall.querySelectorAll('.photo-paper').forEach((paper, index) => bindPhotoPaper(paper, photos[index]));
  }

  function bindPhotoPaper(paper, filename) {
    paper.addEventListener('pointerdown', (event) => startDrag(event, paper));
    paper.addEventListener('click', () => {
      if (paper.dataset.wasDragged === 'true') return;
      openLightbox(filename);
    });
    paper.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox(filename);
      }
    });
  }

  function startDrag(event, paper) {
    if (event.button !== undefined && event.button !== 0) return;

    const wallRect = wall.getBoundingClientRect();
    const paperRect = paper.getBoundingClientRect();
    topZIndex += 1;
    paper.style.zIndex = topZIndex;
    paper.classList.add('is-dragging');
    paper.dataset.wasDragged = 'false';
    paper.setPointerCapture(event.pointerId);

    dragState = {
      paper,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - paperRect.left,
      offsetY: event.clientY - paperRect.top,
      wallRect,
      moved: false
    };

    event.preventDefault();
  }

  function moveDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    const delta = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
    if (delta > 4) dragState.moved = true;

    const paperRect = dragState.paper.getBoundingClientRect();
    const maxLeft = dragState.wallRect.width - paperRect.width * 0.42;
    const maxTop = dragState.wallRect.height - paperRect.height * 0.42;
    const nextLeft = clamp(event.clientX - dragState.wallRect.left - dragState.offsetX, -paperRect.width * 0.42, maxLeft);
    const nextTop = clamp(event.clientY - dragState.wallRect.top - dragState.offsetY, -paperRect.height * 0.28, maxTop);

    dragState.paper.style.setProperty('--photo-x', '0px');
    dragState.paper.style.setProperty('--photo-y', '0px');
    dragState.paper.style.left = `${nextLeft}px`;
    dragState.paper.style.top = `${nextTop}px`;
  }

  function endDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    const paper = dragState.paper;
    paper.classList.remove('is-dragging');
    paper.dataset.wasDragged = String(dragState.moved);
    window.setTimeout(() => {
      paper.dataset.wasDragged = 'false';
    }, 0);
    dragState = null;
  }

  function openLightbox(filename) {
    const title = formatPhotoTitle(filename);
    lightboxImage.src = `photos/${filename}`;
    lightboxImage.alt = title;
    lightboxCaption.textContent = title;
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-lightbox-open');
    closeButton.focus();
  }

  function closeLightbox() {
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-lightbox-open');
    lightboxImage.src = '';
  }

  function formatPhotoTitle(filename) {
    return filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>\"]/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    }[char]));
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/'/g, '&#39;');
  }

  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  closeButton.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && lightbox.getAttribute('aria-hidden') === 'false') closeLightbox();
  });

  renderPhotos();
})();

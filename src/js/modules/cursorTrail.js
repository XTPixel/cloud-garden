let trailState = null;

export function initCursorTrail() {
  try { if (localStorage.getItem('dashboard.cursorTrail') === 'off') return; } catch (e) {}

  if (trailState) return; // already running

  const TRAIL_LENGTH = 18;
  const SPARK_INTERVAL = 54;
  const MAX_IDLE_MS = 120;
  const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

  const reduceMotion = window.matchMedia(REDUCED_MOTION_QUERY);
  if (reduceMotion.matches || !window.matchMedia('(pointer: fine)').matches) return;

  const layer = document.createElement('div');
  layer.className = 'cursor-trail-layer';
  layer.setAttribute('aria-hidden', 'true');

  const comet = document.createElement('div');
  comet.className = 'cursor-comet';
  layer.appendChild(comet);

  const dots = Array.from({ length: TRAIL_LENGTH }, (_, i) => {
    const dot = document.createElement('i');
    dot.className = 'cursor-trail-dot';
    dot.style.setProperty('--trail-index', i);
    dot.style.setProperty('--trail-scale', 1 - i / (TRAIL_LENGTH * 1.22));
    layer.appendChild(dot);
    return dot;
  });

  document.body.appendChild(layer);

  const points = Array.from({ length: TRAIL_LENGTH }, () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));
  const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let visible = false;
  let lastMove = 0;
  let lastSpark = 0;
  let lastX = target.x;
  let lastY = target.y;
  let animationFrame = 0;

  function createSpark(x, y, velocity) {
    const spark = document.createElement('span');
    const drift = Math.min(42, 14 + velocity * 0.08);
    const angle = Math.random() * Math.PI * 2;
    const size = 4 + Math.random() * 8;
    spark.className = 'cursor-spark';
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;
    spark.style.width = `${size}px`;
    spark.style.height = `${size}px`;
    spark.style.setProperty('--spark-x', `${Math.cos(angle) * drift}px`);
    spark.style.setProperty('--spark-y', `${Math.sin(angle) * drift}px`);
    document.body.appendChild(spark);
    setTimeout(() => spark.remove(), 820);
  }

  function showTrail() { if (!visible) { visible = true; layer.classList.add('is-active'); } }
  function hideTrail() { visible = false; layer.classList.remove('is-active'); }

  function handlePointerMove(event) {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const now = performance.now();
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    const velocity = Math.hypot(dx, dy);
    target.x = event.clientX;
    target.y = event.clientY;
    lastMove = now;
    showTrail();
    if (velocity > 22 && now - lastSpark > SPARK_INTERVAL) {
      createSpark(event.clientX - dx * 0.22, event.clientY - dy * 0.22, velocity);
      lastSpark = now;
    }
    lastX = event.clientX;
    lastY = event.clientY;
  }

  function render() {
    points[0].x += (target.x - points[0].x) * 0.48;
    points[0].y += (target.y - points[0].y) * 0.48;
    for (let i = 1; i < points.length; i++) {
      points[i].x += (points[i - 1].x - points[i].x) * 0.34;
      points[i].y += (points[i - 1].y - points[i].y) * 0.34;
    }
    comet.style.transform = `translate3d(${points[0].x}px, ${points[0].y}px, 0) translate(-50%, -50%)`;
    dots.forEach((dot, i) => {
      dot.style.transform = `translate3d(${points[i].x}px, ${points[i].y}px, 0) translate(-50%, -50%) scale(${1 - i / (TRAIL_LENGTH * 1.18)})`;
    });
    if (visible && performance.now() - lastMove > MAX_IDLE_MS) layer.classList.add('is-resting');
    else layer.classList.remove('is-resting');
    animationFrame = requestAnimationFrame(render);
  }

  function destroy() {
    cancelAnimationFrame(animationFrame);
    removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('mouseleave', hideTrail);
    layer.remove();
  }

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  document.addEventListener('mouseleave', hideTrail);
  reduceMotion.addEventListener('change', (e) => { if (e.matches) destroy(); }, { once: true });

  render();

  trailState = { destroy };
}

export function stopCursorTrail() {
  if (trailState) {
    trailState.destroy();
    trailState = null;
  }
}

export function restartCursorTrail() {
  stopCursorTrail();
  initCursorTrail();
}

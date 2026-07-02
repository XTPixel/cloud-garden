(function () {
  const TRANSITION_KEY = 'garden.navigationTransition';
  const ENTRY_SELECTOR = '.desktop [data-widget]';
  const NAV_SELECTOR = '.side-nav';
  const NAV_CARD_SELECTOR = '.profile-widget, .projects-side';
  const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

  function prefersReducedMotion() {
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  }

  function getRectData(element) {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    };
  }

  function isSameOriginPage(link) {
    if (!link.href || link.target || link.hasAttribute('download')) return false;
    const url = new URL(link.href, window.location.href);
    return url.origin === window.location.origin && url.pathname !== window.location.pathname;
  }

  function prepareNavigationHandoff() {
    const nav = document.querySelector(NAV_SELECTOR);
    const navCard = nav?.closest(NAV_CARD_SELECTOR) || nav;
    if (!nav || prefersReducedMotion()) return;

    nav.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link || !isSameOriginPage(link)) return;
      sessionStorage.setItem(TRANSITION_KEY, JSON.stringify({
        navCard: getRectData(navCard),
        nav: getRectData(nav),
        active: getRectData(link),
        from: window.location.pathname,
        to: new URL(link.href).pathname,
        timestamp: Date.now()
      }));
      document.body.classList.add('is-page-leaving');
    });
  }

  function runNavigationArrival() {
    const nav = document.querySelector(NAV_SELECTOR);
    const navCard = nav?.closest(NAV_CARD_SELECTOR) || nav;
    if (!nav || prefersReducedMotion()) return;

    const rawState = sessionStorage.getItem(TRANSITION_KEY);
    if (!rawState) return;
    sessionStorage.removeItem(TRANSITION_KEY);

    let state;
    try {
      state = JSON.parse(rawState);
    } catch {
      return;
    }

    if (!state?.navCard || Date.now() - Number(state.timestamp || 0) > 5000) return;

    const targetRect = navCard.getBoundingClientRect();
    const deltaX = state.navCard.left - targetRect.left;
    const deltaY = state.navCard.top - targetRect.top;
    const scaleX = state.navCard.width / Math.max(targetRect.width, 1);
    const scaleY = state.navCard.height / Math.max(targetRect.height, 1);

    const isCompactTarget = navCard.classList.contains('floating-nav');
    const isCompactSource = state.navCard.width < 420 && state.navCard.height < 110;
    const middleScaleX = isCompactTarget && !isCompactSource ? Math.max(scaleX * 0.42, 1.18) : scaleX;
    const middleScaleY = isCompactTarget && !isCompactSource ? Math.max(scaleY * 0.16, 1.18) : scaleY;
    const middleDeltaX = isCompactTarget && !isCompactSource ? deltaX * 0.34 : deltaX;
    const middleDeltaY = isCompactTarget && !isCompactSource ? deltaY * 0.34 : deltaY;

    navCard.classList.add('nav-card-transitioning');
    navCard.style.transformOrigin = 'top left';
    const keyframes = [
      {
        transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`,
        borderRadius: isCompactTarget ? '42px' : undefined,
        opacity: 0.72,
        filter: 'blur(1.5px) saturate(1.18)'
      },
      {
        transform: `translate3d(${middleDeltaX}px, ${middleDeltaY}px, 0) scale(${middleScaleX}, ${middleScaleY})`,
        borderRadius: isCompactTarget ? '30px' : undefined,
        opacity: 0.9,
        filter: 'blur(0.5px) saturate(1.1)',
        offset: 0.58
      },
      {
        transform: 'translate3d(0, 0, 0) scale(1)',
        borderRadius: isCompactTarget ? '26px' : undefined,
        opacity: 1,
        filter: 'blur(0) saturate(1)'
      }
    ];

    navCard.animate(keyframes, {
      duration: isCompactTarget || isCompactSource ? 860 : 760,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'both'
    }).addEventListener('finish', () => {
      navCard.classList.remove('nav-card-transitioning');
      navCard.style.transformOrigin = '';
    }, { once: true });
  }

  function getSpiralOrderedCards(cards) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    return cards
      .map((card) => {
        const rect = card.getBoundingClientRect();
        const cardX = rect.left + rect.width / 2;
        const cardY = rect.top + rect.height / 2;
        const angle = (Math.atan2(cardY - centerY, cardX - centerX) + Math.PI * 2.5) % (Math.PI * 2);
        const radius = Math.hypot(cardX - centerX, cardY - centerY);
        return { card, score: radius * 0.012 + angle };
      })
      .sort((first, second) => first.score - second.score)
      .map((item) => item.card);
  }

  function runHomeSpiralEntry() {
    const desktop = document.querySelector('.desktop');
    if (!desktop || prefersReducedMotion()) return;

    const cards = Array.from(document.querySelectorAll(ENTRY_SELECTOR));
    if (!cards.length) return;

    const orderedCards = getSpiralOrderedCards(cards);
    desktop.classList.add('desktop-entering');

    orderedCards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      const cardX = rect.left + rect.width / 2;
      const cardY = rect.top + rect.height / 2;
      const angle = index * 0.92 + 0.65;
      const distance = 72 + index * 10;

      card.style.setProperty('--entry-delay', `${120 + index * 86}ms`);
      card.style.setProperty('--entry-x', `${Math.cos(angle) * -distance + (window.innerWidth / 2 - cardX) * 0.1}px`);
      card.style.setProperty('--entry-y', `${Math.sin(angle) * -distance + (window.innerHeight / 2 - cardY) * 0.1}px`);
      card.style.setProperty('--entry-rotate', `${-10 + index * 2.4}deg`);
      card.classList.add('spiral-entry-card');
    });

    window.setTimeout(() => {
      desktop.classList.remove('desktop-entering');
      cards.forEach((card) => {
        card.classList.remove('spiral-entry-card');
        card.style.removeProperty('--entry-delay');
        card.style.removeProperty('--entry-x');
        card.style.removeProperty('--entry-y');
        card.style.removeProperty('--entry-rotate');
      });
    }, 120 + orderedCards.length * 86 + 980);
  }

  Garden.initPageTransitions = function initPageTransitions({ homeEntry = false } = {}) {
    prepareNavigationHandoff();
    runNavigationArrival();
    if (homeEntry) window.requestAnimationFrame(runHomeSpiralEntry);
  };
})();

(() => {
  'use strict';
  const root = document.documentElement;
  // Notices share a flow below the measured HUD, the upper instruments; equipment lives in the lower dock.
  const arenaNotices = document.createElement('div');
  arenaNotices.id = 'arena-notices';
  document.getElementById('game-container')?.append(arenaNotices);
  ['boss-hp-container','chapter-transition-card','tactical-alert-banner','synergy-banner','speed-toast'].forEach(id => {
    const notice = document.getElementById(id);
    if (notice) arenaNotices.append(notice);
  });
  const hud = document.getElementById('hud');
  if (hud) {
    const hudParts = [hud,...hud.querySelectorAll('.hud-row,.info-subrow,.char-info')];
    const measureHud = () => {
      const bottom = `${Math.ceil(Math.max(...hudParts.map(part => part.getBoundingClientRect().bottom)))}px`;
      if (root.style.getPropertyValue('--errata-hud-bottom') !== bottom) root.style.setProperty('--errata-hud-bottom', bottom);
    };
    const hudObserver = new ResizeObserver(measureHud);
    hudParts.forEach(part => hudObserver.observe(part));
    measureHud();
  }
  const title = document.getElementById('title-screen');
  const bookButtons = [...document.querySelectorAll('[data-open-book]')];
  const pauseButton = document.querySelector('[data-open-pause]');
  if (!title) return;

  const settingKeys = {
    'large-text': 'lexicon_errata_large_text',
    'reduced-motion': 'lexicon_errata_reduced_motion',
    'low-effects': 'lexicon_errata_low_effects'
  };
  const readSetting = key => {
    try { return localStorage.getItem(key) === 'true'; } catch (_) { return false; }
  };
  const writeSetting = (key, value) => {
    try { localStorage.setItem(key, String(value)); } catch (_) {}
  };
  const settingClass = { 'large-text': 'errata-large-text', 'reduced-motion': 'errata-reduced-motion', 'low-effects': 'errata-low-effects' };
  for (const name of Object.keys(settingKeys)) root.classList.toggle(settingClass[name], readSetting(settingKeys[name]));

  // The parent owns visual layout; this controller owns which title stage is exposed.
  const titleStages = ['landing', 'character', 'preparation'];
  function setTitleStep(step, focusTarget, moveFocus = true) {
    if (!titleStages.includes(step)) return;
    const previousStep = title.dataset.step;
    title.dataset.step = step;
    syncStepSemantics();
    titleStages.forEach(name => {
      const section = document.getElementById(`errata-${name}`);
      if (!section) return;
      const active = step === name;
      section.hidden = !active;
      if (active) section.style.removeProperty('display'); else section.style.display = 'none';
      section.setAttribute('aria-hidden', String(!active));
      section.inert = !active;
    });
    if (previousStep !== step) title.scrollTop = 0;
    if (step === 'character') requestAnimationFrame(syncCarouselArrows);
    const target = focusTarget || (step === 'landing'
      ? document.getElementById('errata-begin')
      : step === 'character'
        ? title.querySelector('#char-selection-grid .choice-card.selected[role="button"]') || title.querySelector('#char-selection-grid [role="button"]')
        : title.querySelector('#learning-level-selection [aria-pressed="true"]') || document.getElementById('start-game-btn'));
    if (moveFocus) queueMicrotask(() => target?.focus?.({ preventScroll: true }));
  }
  function syncStepSemantics() {
    title.querySelectorAll('[data-title-step]').forEach(button => {
      if (button.dataset.titleStep === title.dataset.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  let lastFocusedHero = null;
  title.addEventListener('focusin', event => {
    const hero = event.target.closest('#char-selection-grid [data-hero]');
    if (hero) lastFocusedHero = hero.dataset.hero;
  });
  const carousel = document.getElementById('char-selection-grid');
  if (carousel && 'MutationObserver' in window) {
    new MutationObserver(() => {
      if (!lastFocusedHero || title.dataset.step !== 'character') return;
      queueMicrotask(() => {
        const card = carousel.querySelector(`[data-hero="${CSS.escape(lastFocusedHero)}"]`);
        if (card) { card.focus({ preventScroll: true }); scrollHeroIntoView(card); }
      });
    }).observe(carousel, { childList: true });
  }
  title.addEventListener('click', event => {
    const chosenCard = event.target.closest('#char-selection-grid .choice-card[data-hero]');
    if (chosenCard) {
      const heroId = chosenCard.dataset.hero;
      lastFocusedHero = heroId;
      queueMicrotask(() => {
        const current = document.querySelector(`#char-selection-grid [data-hero="${CSS.escape(heroId)}"]`);
        current?.focus({ preventScroll: true });
        scrollHeroIntoView(current);
      });
    }
    const nav = event.target.closest('[data-title-step]');
    if (nav && title.contains(nav)) {
      event.preventDefault();
      setTitleStep(nav.dataset.titleStep);
    }
  }, true);
  title.addEventListener('keydown', event => {
    const card = event.target.closest('#char-selection-grid [role="button"]');
    if (!card) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const cards = [...document.querySelectorAll('#char-selection-grid [role="button"]')];
      const currentIndex = cards.indexOf(card);
      const next = cards[Math.max(0, Math.min(cards.length - 1, currentIndex + (event.key === 'ArrowRight' ? 1 : -1)))];
      next?.focus({ preventScroll: true });
      scrollHeroIntoView(next);
      return;
    }
    if (!['Enter', ' '].includes(event.key)) return;
    // game.js recreates the cards after choosing one; keep focus in the character stage.
    queueMicrotask(() => document.querySelector(`#char-selection-grid [data-hero="${CSS.escape(card.dataset.hero || '')}"]`)?.focus({ preventScroll: true }));
  }, true);
  function scrollHeroIntoView(card) {
    if (!card) return;
    const reduceMotion = root.classList.contains('errata-reduced-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduceMotion ? 'instant' : 'smooth' });
  }
  let carouselFrame = 0;
  function syncCarouselArrows() {
    carouselFrame = 0;
    const arrows = [...document.querySelectorAll('.dossier-pagination button')];
    if (!carousel || arrows.length < 2) return;
    const max = Math.max(0, carousel.scrollWidth - carousel.clientWidth);
    arrows[0].disabled = carousel.scrollLeft <= 1;
    arrows[1].disabled = carousel.scrollLeft >= max - 1;
    arrows[0].setAttribute('aria-disabled', String(arrows[0].disabled));
    arrows[1].setAttribute('aria-disabled', String(arrows[1].disabled));
  }
  carousel?.addEventListener('scroll', () => {
    if (!carouselFrame) carouselFrame = requestAnimationFrame(syncCarouselArrows);
  }, { passive: true });
  window.addEventListener('resize', () => {
    if (!carouselFrame) carouselFrame = requestAnimationFrame(syncCarouselArrows);
  }, { passive: true });
  syncCarouselArrows();
  setTitleStep(title.dataset.step || 'landing', null, false);

  let bookOverlay = document.getElementById('errata-book');
  let pauseOverlay = document.getElementById('errata-pause');
  const dialogStack = [];
  const dialogReturnTargets = new Map();
  let focusReturn = null;
  let previousInventory = false;
  let ownsPauseGate = false;
  let ownsShopCountdownGate = false;
  let shopCountdownRemainingMs = 0;
  let titleSuspension = null;
  let externalModalPause = false;
  let externalPausePreviousInventory = false;

  function ensurePauseGate() {
    try {
      if (typeof state !== 'undefined' && state.is_wave_active && !ownsPauseGate) {
        previousInventory = state.is_inventory_open;
        state.is_inventory_open = true;
        ownsPauseGate = true;
        window.syncMobileControlsVisibility?.();
      }
    } catch (_) {}
  }
  function releasePauseGate() {
    try { if (ownsPauseGate && typeof state !== 'undefined') state.is_inventory_open = previousInventory; } catch (_) {}
    ownsPauseGate = false;
    window.syncMobileControlsVisibility?.();
  }
  function ensureShopCountdownGate() {
    try {
      const shop = document.getElementById('shop-screen');
      if (!state.auto_new_tur || !shop || shop.style.display === 'none' || typeof shopAutoWaveTimer === 'undefined' || !shopAutoWaveTimer) return;
      shopCountdownRemainingMs = Math.max(0, shopAutoWaveEndTime - Date.now());
      clearShopAutoWaveTimer();
      ownsShopCountdownGate = true;
    } catch (_) {}
  }
  function releaseShopCountdownGate() {
    if (!ownsShopCountdownGate) return;
    ownsShopCountdownGate = false;
    try {
      const shop = document.getElementById('shop-screen');
      if (state.auto_new_tur && !state.is_wave_active && shop && shop.style.display !== 'none' && state.current_wave < state.max_waves) {
        startShopAutoWaveCountdown(Math.max(0, shopCountdownRemainingMs) / 1000);
      }
    } catch (_) {}
    shopCountdownRemainingMs = 0;
  }
  function releaseExternalModalGate() {
    if (!externalModalPause) return;
    try { if (typeof state !== 'undefined') state.is_inventory_open = externalPausePreviousInventory; } catch (_) {}
    externalModalPause = false;
    try { if (typeof wakeGameLoop === 'function') wakeGameLoop(); } catch (_) {}
  }
  function visibleDialog(dialog) { return dialog && !dialog.hidden && getComputedStyle(dialog).display !== 'none'; }
  function topDialog() { return dialogStack.at(-1) || null; }
  function focusables(dialog) {
    return [...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el => !el.hidden && !el.closest('[hidden],[inert]') && el.getAttribute('aria-hidden') !== 'true' && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
  }
  function containTabFocus(event, container) {
    const items = focusables(container);
    if (!items.length) { event.preventDefault(); container.focus?.({ preventScroll: true }); return; }
    const first = items[0], last = items.at(-1);
    const activeIndex = items.indexOf(document.activeElement);
    if (event.shiftKey && (activeIndex <= 0)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (activeIndex < 0 || activeIndex === items.length - 1)) { event.preventDefault(); first.focus(); }
  }
  const resultModal = document.getElementById('game-over-screen');
  let resultWasOpen = false;
  if (resultModal) {
    const resultHeading = document.getElementById('game-over-title');
    resultHeading.tabIndex = -1;
    new MutationObserver(() => {
      const open = resultModal.style.display === 'flex';
      if (open && !resultWasOpen) queueMicrotask(() => resultHeading.focus({preventScroll:true}));
      resultWasOpen = open;
    }).observe(resultModal,{attributes:true,attributeFilter:['style']});
    document.addEventListener('keydown',event => {
      const board = document.getElementById('leaderboard-overlay');
      if (resultModal.style.display !== 'flex' || (board && !board.hidden)) return;
      if (event.key === 'Tab') containTabFocus(event,resultModal);
      event.stopImmediatePropagation();
    },true);
  }
  const quizModal = document.getElementById('quiz-modal');
  let quizWasOpen = false;
  let quizOpener = null;
  let quizShopInert = false;
  let quizShopAriaHidden = null;
  let quizContinueFocused = false;
  function isQuizOpen() { return Boolean(quizModal && quizModal.style.display === 'flex' && !quizModal.classList.contains('hidden')); }
  function syncQuizDialog() {
    if (!quizModal) return;
    const isOpen = isQuizOpen();
    quizModal.setAttribute('role', 'dialog');
    quizModal.setAttribute('aria-labelledby', 'quiz-word-title');
    quizModal.setAttribute('aria-describedby', 'quiz-question-text quiz-buff-text');
    quizModal.setAttribute('tabindex', '-1');
    const questionTitle = document.getElementById('quiz-word-title');
    if (questionTitle) questionTitle.setAttribute('tabindex', '-1');
    const result = document.getElementById('quiz-result-text');
    if (result) { result.setAttribute('role', 'status'); result.setAttribute('aria-live', 'polite'); result.setAttribute('aria-atomic', 'true'); }
    const options = document.getElementById('quiz-options-container');
    if (options) { options.setAttribute('role', 'group'); options.setAttribute('aria-labelledby', 'quiz-question-text'); }
    if (isOpen && !quizWasOpen) {
      quizWasOpen = true;
      quizContinueFocused = false;
      quizOpener = document.activeElement;
      const shop = document.getElementById('shop-screen');
      if (shop) {
        quizShopInert = shop.inert;
        quizShopAriaHidden = shop.getAttribute('aria-hidden');
        shop.inert = true;
        shop.setAttribute('aria-hidden', 'true');
      }
      quizModal.inert = false;
      quizModal.setAttribute('aria-hidden', 'false');
      quizModal.setAttribute('aria-modal', 'true');
      queueMicrotask(() => questionTitle?.focus({ preventScroll: true }));
    } else if (!isOpen && quizWasOpen) {
      quizWasOpen = false;
      quizContinueFocused = false;
      quizModal.setAttribute('aria-hidden', 'true');
      quizModal.setAttribute('aria-modal', 'false');
      quizModal.inert = true;
      const shop = document.getElementById('shop-screen');
      if (shop) {
        shop.inert = quizShopInert;
        if (quizShopAriaHidden === null) shop.removeAttribute('aria-hidden'); else shop.setAttribute('aria-hidden', quizShopAriaHidden);
      }
      queueMicrotask(() => {
        if (quizOpener?.isConnected) quizOpener.focus({ preventScroll: true });
        else {
          const fallback = document.querySelector('#shop-items-grid .shop-buy:not([disabled])') || document.getElementById('shop-title') || document.getElementById('shop-screen');
          if (fallback && fallback === document.getElementById('shop-title')) fallback.tabIndex = -1;
          fallback?.focus?.({ preventScroll: true });
        }
        quizOpener = null;
      });
    }
    const continueButton = document.getElementById('quiz-continue-btn');
    if (isOpen && continueButton && continueButton.style.display !== 'none' && !quizContinueFocused) {
      quizContinueFocused = true;
      queueMicrotask(() => continueButton.focus({ preventScroll: true }));
    }
  }
  if (quizModal && 'MutationObserver' in window) {
    new MutationObserver(syncQuizDialog).observe(quizModal, { attributes: true, attributeFilter: ['class', 'style'], childList: true, subtree: true });
    syncQuizDialog();
  }
  function syncDialogStack() {
    for (const dialog of [bookOverlay, pauseOverlay]) {
      if (!dialog) continue;
      const isOpen = dialogStack.includes(dialog);
      dialog.hidden = !isOpen;
      dialog.style.display = isOpen ? '' : 'none';
      dialog.style.zIndex = isOpen ? String(310 + dialogStack.indexOf(dialog)) : '';
      dialog.setAttribute('aria-hidden', String(!isOpen));
      dialog.inert = !isOpen;
      dialog.querySelector('[role="dialog"]')?.setAttribute('aria-modal', isOpen && dialog === topDialog() ? 'true' : 'false');
    }
    const top = topDialog();
    if (!top) {
      if (titleSuspension) {
        title.inert = titleSuspension.inert;
        if (titleSuspension.ariaHidden === null) title.removeAttribute('aria-hidden'); else title.setAttribute('aria-hidden', titleSuspension.ariaHidden);
        if (titleSuspension.ariaModal === null) title.removeAttribute('aria-modal'); else title.setAttribute('aria-modal', titleSuspension.ariaModal);
        titleSuspension = null;
      }
      releasePauseGate();
      releaseShopCountdownGate();
      focusReturn?.focus?.({ preventScroll: true });
      focusReturn = null;
      return;
    }
    if (!titleSuspension) {
      titleSuspension = { inert: title.inert, ariaHidden: title.getAttribute('aria-hidden'), ariaModal: title.getAttribute('aria-modal') };
    }
    title.inert = true;
    title.setAttribute('aria-hidden', 'true');
    title.setAttribute('aria-modal', 'false');
    ensurePauseGate();
    ensureShopCountdownGate();
    for (const dialog of [bookOverlay, pauseOverlay]) if (dialog && dialog !== top) dialog.setAttribute('aria-modal', 'false');
    queueMicrotask(() => (focusables(top)[0] || top).focus?.({ preventScroll: true }));
  }
  function openDialog(dialog, opener) {
    if (!dialog) return;
    if (!dialogStack.length) focusReturn = opener || document.activeElement;
    if (opener) dialogReturnTargets.set(dialog, opener);
    if (dialogStack.includes(dialog)) dialogStack.splice(dialogStack.indexOf(dialog), 1);
    dialogStack.push(dialog);
    syncDialogStack();
  }
  function closeTop() {
    const dialog = dialogStack.pop();
    if (!dialog) return;
    const returnTarget = dialogReturnTargets.get(dialog);
    dialogReturnTargets.delete(dialog);
    syncDialogStack();
    if (dialogStack.length && returnTarget) queueMicrotask(() => returnTarget.isConnected && returnTarget.focus({ preventScroll: true }));
  }
  function createDialog(id, classes, titleText, closeAttr) {
    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.className = 'screen-overlay';
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `<section class="dialog-panel ${classes}" role="dialog" aria-modal="true" aria-labelledby="${id}-title" tabindex="-1"><header class="book-dialog-header"><div><p class="errata-kicker">LEXICON SURVIVORS · ARŞİV</p><h2 id="${id}-title"></h2></div><button class="btn" type="button" ${closeAttr}>Kapat <span aria-hidden="true">×</span></button></header><div class="errata-dialog-content"></div></section>`;
    overlay.querySelector('h2').textContent = titleText;
    document.body.append(overlay);
    return overlay;
  }
  bookOverlay ||= createDialog('errata-book', 'errata-book-panel', 'Arşiv', 'data-close-book');
  pauseOverlay ||= createDialog('errata-pause', 'errata-pause-panel', 'Oyun duraklatıldı', 'data-pause-action="resume"');
  bookOverlay.setAttribute('role', 'presentation');
  pauseOverlay.setAttribute('role', 'presentation');
  const bookContent = bookOverlay.querySelector('.errata-dialog-content');
  const pauseContent = pauseOverlay.querySelector('.errata-dialog-content');

  function actualWeaponEntries() {
    try { return Object.values(WEAPONS_CATALOG || {}).filter(item => item && item.name).map(item => ({ name: item.name, description: item.desc || '', image: `assets/sprites/${item.sprite}` })); }
    catch (_) { return []; }
  }
  function actualWordEntries() {
    try {
      const cards = typeof state !== 'undefined' && Array.isArray(state.questions) ? state.questions : [];
      const unique = new Map();
      cards.forEach(card => {
        if (!card?.word) return;
        const key = `${card.word.toLocaleLowerCase('tr')}|${card.level || ''}`;
        if (!unique.has(key)) unique.set(key, { name: card.word, type: card.type || '', level: card.level || '', description: card.meaning_tr || '', example: card.example || '' });
      });
      return [...unique.values()];
    } catch (_) { return []; }
  }
  function actualEnemyEntries() {
    try {
      const rewards = GAME_ECONOMY?.enemy_ink_rewards || {};
      return Object.entries(rewards).map(([name, reward]) => {
        const spriteId = name.toLocaleLowerCase('en').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        return { name, description: `Ödül: ${reward} mürekkep.`, image: `assets/ui/errata/arena-v4/enemies/${spriteId}_0.webp` };
      });
    } catch (_) { return []; }
  }
  const bestiaryAtlasSlots = new Map([
    ['Grammar Goblin', [0, 0]], ['Typo Slime', [1, 0]], ['Punctuation Phantom', [2, 0]], ['Idiom Imp', [3, 0]],
    ['Tautology Twin', [0, 1]], ['Homophone Harpy', [1, 1]], ['Run-on Reaper', [2, 1]], ['Malapropism Mimic', [3, 1]],
    ['Dangling Modifier', [0, 2]], ['Palindrome Phantom', [1, 2]], ['Vocabulary Void', [2, 2]], ['Double Negative Drake', [3, 2]],
    ['Oxymoron Ogre', [0, 3]], ['Spelling Spectre', [1, 3]], ['Red Pen Boss', [2, 3]], ['Syntax Titan', [3, 3]]
  ]);
  function stableAtlasSlot(value) {
    let hash = 2166136261;
    for (const character of String(value)) hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
    return (hash >>> 0) % 16;
  }
  function makeAtlasArtwork(name, atlas, slot) {
    const art = document.createElement('span');
    art.className = `archive-card-art archive-card-art--${atlas}`;
    art.setAttribute('aria-hidden', 'true');
    const index = Math.max(0, Math.min(15, slot));
    art.style.backgroundPosition = `${(index % 4) * 100 / 3}% ${Math.floor(index / 4) * 100 / 3}%`;
    art.dataset.subject = name;
    return art;
  }
  let bestiaryRequested = false;
  let wordsRequested = false;
  function renderBook(kind) {
    bookOverlay.dataset.kind = kind;
    bookOverlay.dataset.category = kind === 'codex' ? 'words' : kind;
    const labels = { codex: 'Kelime kitabı', bestiary: 'Dil canavarları', guide: 'Oynama kılavuzu', settings: 'Tercihler' };
    bookOverlay.querySelector(`#${bookOverlay.id}-title`).textContent = labels[kind] || 'Arşiv';
    if (kind === 'codex' || kind === 'bestiary') {
      let category = kind === 'codex' ? 'words' : 'enemies';
      let selectedWordLevel = 'all';
      let entries = kind === 'codex' ? actualWordEntries() : actualEnemyEntries();
      const list = document.createElement('div');
      list.className = 'book-entries book-collection-grid';
      const search = document.createElement('input');
      search.type = 'search'; search.className = 'book-search'; search.setAttribute('aria-label', 'Fihristte ara'); search.placeholder = 'Ada göre ara';
      const tabs = document.createElement('nav'); tabs.className = 'book-index'; tabs.setAttribute('aria-label', 'Fihrist bölümleri');
      const levels = document.createElement('nav'); levels.className = 'book-level-index'; levels.setAttribute('aria-label', 'Kelime seviyesi');
      if (kind === 'codex') for (const level of ['all','A1','A2','B1','B2','C1','C2']) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = level === 'all' ? 'Tümü' : level; button.dataset.wordLevel = level; button.setAttribute('aria-pressed', String(level === selectedWordLevel));
        button.addEventListener('click', () => { selectedWordLevel = level; [...levels.children].forEach(item => item.setAttribute('aria-pressed', String(item === button))); renderEntries(search.value); }); levels.append(button);
      }
      const tabButtons = [];
      const selectCategory = name => {
        category = name;
        bookOverlay.dataset.category = name;
        warmCollectionArt(name === 'weapons' ? 'weapons' : 'codex');
        levels.hidden = name !== 'words';
        entries = name === 'words' ? actualWordEntries() : actualWeaponEntries();
        tabButtons.forEach(button => { const selected = button.dataset.codexCategory === name; button.setAttribute('aria-selected', String(selected)); });
        renderEntries(search.value);
        const intro = bookContent.querySelector('.book-heading');
        if (intro) intro.textContent = name === 'words' ? 'Sorulardaki gerçek kelimeler ve örnekleri.' : 'Oyundaki silahlar ve özellikleri.';
      };
      if (kind === 'codex') {
        for (const [name, label] of [['words', 'Kelimeler'], ['weapons', 'Silahlar']]) {
          const button = document.createElement('button'); button.type = 'button'; button.dataset.codexCategory = name; button.textContent = label; button.setAttribute('aria-selected', String(name === category));
          const warm = () => warmCollectionArt(name === 'weapons' ? 'weapons' : 'codex');
          button.addEventListener('pointerenter', warm, { passive: true });
          button.addEventListener('focus', warm, { passive: true });
          button.addEventListener('pointerdown', warm, { passive: true });
          button.addEventListener('click', () => selectCategory(name)); tabButtons.push(button); tabs.append(button);
        }
      }
      const status = document.createElement('p'); status.className = 'book-status'; status.setAttribute('aria-live', 'polite');
      function renderEntries(query) {
        list.replaceChildren();
        const matches = entries.filter(entry => (category !== 'words' || selectedWordLevel === 'all' || entry.level === selectedWordLevel) && `${entry.name} ${entry.description} ${entry.example || ''} ${entry.type || ''} ${entry.level || ''}`.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))).sort((a,b) => a.name.localeCompare(b.name,'tr'));
        matches.slice(0, 80).forEach(entry => {
          const isEnemy = kind === 'bestiary';
          const isWord = category === 'words';
          const article = document.createElement('article');
          article.className = `book-entry archive-card${isEnemy ? ' archive-card--enemy' : isWord ? ' archive-card--word' : ' archive-card--weapon'}`;
          const tile = isEnemy ? bestiaryAtlasSlots.get(entry.name) : null;
          if (tile) {
            article.append(makeAtlasArtwork(entry.name, 'bestiary', tile[1] * 4 + tile[0]));
          } else if (isWord) {
            article.append(makeAtlasArtwork(entry.name, 'emblems', stableAtlasSlot(`${entry.level || ''}:${entry.type || ''}:${entry.name}`)));
          } else if (entry.image) {
            const art = document.createElement('div'); art.className = 'archive-card-art archive-card-art--image';
            const image = document.createElement('img'); image.src = entry.image; image.alt = ''; image.loading = 'lazy'; art.append(image); article.append(art);
          } else {
            article.append(makeAtlasArtwork(entry.name, 'emblems', stableAtlasSlot(entry.name)));
          }
          const copy = document.createElement('div'); copy.className = 'archive-card-copy';
          const eyebrow = document.createElement('span'); eyebrow.className = 'archive-card-eyebrow';
          eyebrow.textContent = isEnemy ? (entry.name.includes('Boss') || entry.name.includes('Titan') ? 'KARŞILAŞMA · ELİT' : 'DİL CANAVARI') : isWord ? 'KELİME KAYDI' : 'SİLAH KAYDI';
          const heading = document.createElement('h3'); heading.textContent = entry.name; copy.append(eyebrow, heading);
          if (entry.type || entry.level) {
            const meta = document.createElement('small'); meta.className = 'archive-card-meta';
            meta.textContent = [entry.level, entry.type].filter(Boolean).join(' · '); copy.append(meta);
          }
          if (entry.description && !isEnemy) {
            const text = document.createElement('p'); text.className = isWord ? 'archive-card-definition' : 'archive-card-description';
            text.textContent = entry.description; copy.append(text);
          }
          if (entry.example) {
            const example = document.createElement('p'); example.className = 'archive-card-example'; example.textContent = `“${entry.example}”`; copy.append(example);
          }
          if (isEnemy) {
            const reward = document.createElement('span'); reward.className = 'archive-card-reward'; reward.textContent = entry.description;
            copy.append(reward);
          }
          article.append(copy); list.append(article);
        });
        status.textContent = matches.length > 80 ? `İlk 80 kayıt gösteriliyor (${matches.length} sonuç). Aramayı daralt.` : `${matches.length} kayıt`;
      }
      const appendEntries = query => {
        renderEntries(query);
      };
      search.addEventListener('input', () => appendEntries(search.value));
      appendEntries('');
      if (kind === 'bestiary' && !entries.length && !bestiaryRequested) {
        bestiaryRequested = true;
        fetch('assets/data/game_economy.json').then(response => response.ok ? response.json() : null).then(data => {
          if (!data?.enemy_ink_rewards) return;
          entries = Object.entries(data.enemy_ink_rewards).map(([name, reward]) => {
            const spriteId = name.toLocaleLowerCase('en').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
            return { name, description: `Ödül: ${reward} mürekkep.`, image: `assets/ui/errata/arena-v4/enemies/${spriteId}_0.webp` };
          });
          if (visibleDialog(bookOverlay) && bookOverlay.querySelector(`#${bookOverlay.id}-title`)?.textContent === labels.bestiary) appendEntries(search.value);
        }).catch(() => {});
      }
      bookContent.replaceChildren();
      const intro = document.createElement('p'); intro.className = 'book-heading'; intro.textContent = kind === 'codex' ? 'Sorulardaki gerçek kelimeler ve örnekleri.' : 'Karşılaşabileceğin düşmanlar ve katalogdaki gerçek ödülleri.';
      if (kind === 'codex') { entries = actualWordEntries(); }
      renderEntries('');
      bookContent.append(intro, tabs, levels, search, status, list);
      if (kind === 'codex' && !entries.length && !wordsRequested) {
        wordsRequested = true;
        fetch('questions.json').then(response => response.ok ? response.json() : []).then(cards => {
          if (!Array.isArray(cards)) return;
          const unique = new Map();
          cards.forEach(card => { if (card?.word) { const key = `${card.word.toLocaleLowerCase('tr')}|${card.level || ''}`; if (!unique.has(key)) unique.set(key, { name: card.word, type: card.type || '', level: card.level || '', description: card.meaning_tr || '', example: card.example || '' }); } });
          if (visibleDialog(bookOverlay) && bookOverlay.querySelector(`#${bookOverlay.id}-title`)?.textContent === labels.codex && category === 'words') { entries = [...unique.values()]; renderEntries(search.value); }
        }).catch(() => {});
      }
    } else if (kind === 'settings') {
      const rows = document.createElement('div'); rows.className = 'settings-rows';
      const settingLabels = { 'large-text': 'Büyük yazı', 'reduced-motion': 'Hareketi azalt', 'low-effects': 'Görsel efektleri azalt' };
      for (const [name, label] of Object.entries(settingLabels)) {
        const row = document.createElement('label'); row.className = 'settings-row';
        const text = document.createElement('span'); text.textContent = label;
        const descriptions = { 'large-text': 'Metin boyutunu artırır.', 'reduced-motion': 'Geçiş hareketlerini kapatır.', 'low-effects': 'Dekoratif arka planları sadeleştirir.' };
        const detail = document.createElement('small'); detail.textContent = descriptions[name]; text.append(detail);
        const input = document.createElement('input'); input.type = 'checkbox'; input.dataset.setting = name; input.checked = readSetting(settingKeys[name]);
        input.addEventListener('change', () => {
          root.classList.toggle(settingClass[name], input.checked);
          writeSetting(settingKeys[name], input.checked);
        });
        row.append(text, input); rows.append(row);
      }
      const musicRow = document.createElement('label'); musicRow.className = 'settings-row';
      musicRow.classList.add('audio-setting-row'); musicRow.dataset.audioSetting = 'music-muted';
      const musicLabel = document.createElement('span'); musicLabel.textContent = 'Müziği kapat';
      const musicDescription = document.createElement('small'); musicDescription.textContent = 'Oyun müziğini ve müzikal geçişleri susturur.'; musicLabel.append(musicDescription);
      const music = document.createElement('input'); music.type = 'checkbox'; music.dataset.setting = 'music-muted';
      try { music.checked = typeof bgm !== 'undefined' && bgm.isMuted; } catch (_) {}
      music.setAttribute('aria-label', 'Müziği kapat');
      music.addEventListener('change', () => { try { if (typeof bgm !== 'undefined') bgm.setMuted(music.checked); } catch (_) {} });
      musicRow.append(musicLabel, music); rows.append(musicRow);
      const sfxRow = document.createElement('label'); sfxRow.className = 'settings-row audio-setting-row'; sfxRow.dataset.audioSetting = 'sfx-muted';
      const sfxLabel = document.createElement('span'); sfxLabel.textContent = 'Ses efektlerini kapat';
      const sfxDescription = document.createElement('small'); sfxDescription.textContent = 'Silah, düşman, gereç ve arayüz seslerini kapatır; müziği ve telaffuzu etkilemez.'; sfxLabel.append(sfxDescription);
      const sfx = document.createElement('input'); sfx.type = 'checkbox'; sfx.dataset.setting = 'sfx-muted'; sfx.setAttribute('aria-label', 'Ses efektlerini kapat');
      try { sfx.checked = typeof sounds !== 'undefined' && sounds.sfxMuted; } catch (_) {}
      sfx.addEventListener('change', () => { try { sounds.setSfxMuted(sfx.checked); } catch (_) {} });
      sfxRow.append(sfxLabel, sfx); rows.append(sfxRow);
      const addAudioSlider = (setting, title, description, initialValue, onChange) => {
        const row = document.createElement('div'); row.className = 'settings-row audio-setting-row'; row.dataset.audioSetting = setting;
        const label = document.createElement('label'); label.htmlFor = `setting-${setting}`; label.textContent = title;
        const detail = document.createElement('small'); detail.textContent = description; label.append(detail);
        const control = document.createElement('div'); control.className = 'audio-setting-control';
        const range = document.createElement('input'); range.id = `setting-${setting}`; range.type = 'range'; range.min = '0'; range.max = '1'; range.step = '0.05'; range.value = String(initialValue); range.dataset.setting = setting;
        range.setAttribute('aria-label', title); range.setAttribute('aria-valuetext', `${Math.round(Number(range.value) * 100)}%`);
        range.style.cssText = 'width:min(240px,34vw);min-width:132px;min-height:44px;accent-color:#d79987;touch-action:pan-y';
        const output = document.createElement('output'); output.htmlFor = range.id; output.className = 'audio-setting-value'; output.textContent = `${Math.round(Number(range.value) * 100)}%`;
        range.addEventListener('input', () => { const value = Number(range.value); output.textContent = `${Math.round(value * 100)}%`; range.setAttribute('aria-valuetext', output.textContent); onChange(value); });
        control.append(range, output); row.append(label, control); rows.append(row);
      };
      try {
        addAudioSlider('sfx-volume', 'Ses efekti düzeyi', 'Savaş ve arayüz seslerinin seviyesini ayarla.', sounds.sfxVolume, value => sounds.setSfxVolume(value));
        addAudioSlider('music-volume', 'Müzik düzeyi', 'Müzik parçasının ve sentezlenen müziğin seviyesini ayarla.', bgm.musicVolume, value => bgm.setVolume(value));
      } catch (_) {}
      const trackRow = document.createElement('div'); trackRow.className = 'settings-row audio-setting-row'; trackRow.dataset.audioSetting = 'music-track';
      const trackLabel = document.createElement('label'); trackLabel.htmlFor = 'setting-music-track'; trackLabel.textContent = 'Müzik parçası';
      const trackDescription = document.createElement('small'); trackDescription.textContent = 'Otomatik seçim bölümün ritmini izler.'; trackLabel.append(trackDescription);
      const track = document.createElement('select'); track.id = 'setting-music-track'; track.dataset.setting = 'music-track'; track.setAttribute('aria-label', 'Müzik parçası');
      track.style.cssText = 'min-height:44px;max-width:min(250px,44vw);width:100%';
      [['auto','Otomatik · bölüme göre'],['library','Karanlık Kütüphane'],['action','Mürekkep Takibi'],['urgent','Rafların Uyanışı'],['last_stand','Son Nöbet · Boss']].forEach(([value, label]) => { const option = document.createElement('option'); option.value = value; option.textContent = label; track.appendChild(option); });
      try { track.value = bgm.musicChoice; } catch (_) {}
      track.addEventListener('change', () => { try { bgm.setMusicChoice(track.value); } catch (_) {} });
      trackRow.append(trackLabel, track); rows.append(trackRow);
      if (window.ErrataVoice) {
        const voiceRow = document.createElement('label'); voiceRow.className = 'settings-row audio-setting-row';
        const voiceLabel = document.createElement('span'); voiceLabel.textContent = 'Anlatımı kapat';
        const voiceDetail = document.createElement('small'); voiceDetail.textContent = 'Hikâye, boss replikleri ve kelime telaffuzu.'; voiceLabel.append(voiceDetail);
        const muted = document.createElement('input'); muted.type = 'checkbox'; muted.dataset.setting = 'voice-muted'; muted.checked = ErrataVoice.muted; muted.setAttribute('aria-label', 'Anlatımı kapat');
        muted.addEventListener('change', () => ErrataVoice.set({muted: muted.checked})); voiceRow.append(voiceLabel, muted); rows.append(voiceRow);
        addAudioSlider('voice-volume', 'Anlatım düzeyi', 'Konuşma sesini müzikten bağımsız ayarla.', ErrataVoice.volume, value => ErrataVoice.set({volume:value}));
        const row = document.createElement('div'); row.className = 'settings-row audio-setting-row';
        const label = document.createElement('label'); label.htmlFor = 'setting-voice-choice'; label.textContent = 'Anlatıcı sesi';
        const detail = document.createElement('small'); detail.textContent = 'Anlatım ve telaffuzda konuşulan dile uygun ses kullanılır.'; label.append(detail);
        const select = document.createElement('select'); select.id = 'setting-voice-choice'; select.dataset.setting = 'voice-choice'; select.setAttribute('aria-label', 'Anlatıcı sesi');
        const refresh = () => {
          if (!select.isConnected && select.options.length) return;
          select.replaceChildren(new Option('Otomatik · dile göre', ''));
          for (const voice of ErrataVoice.voices) select.append(new Option(`${voice.name} · ${voice.lang}`, voice.voiceURI));
          select.value = ErrataVoice.voiceChoice; if (select.selectedIndex < 0) select.value = '';
        };
        refresh(); select.addEventListener('change', () => ErrataVoice.set({voiceURI:select.value}));
        window.speechSynthesis?.addEventListener?.('voiceschanged', () => { if (select.isConnected) refresh(); }, {once:true});
        row.append(label,select); rows.append(row);
        const previewRow = document.createElement('div'); previewRow.className = 'settings-row';
        const previewLabel = document.createElement('span'); previewLabel.textContent = 'Ses önizlemesi';
        const preview = document.createElement('button'); preview.type = 'button'; preview.className = 'btn'; preview.dataset.setting = 'voice-preview'; preview.textContent = 'Anlatımı dinle';
        preview.addEventListener('click', () => ErrataVoice.speak('Bir sözlük kayboldu. Onu hatırlayan son kişi sensin.', {role:'narrative',lang:'tr-TR'}));
        previewRow.append(previewLabel,preview); rows.append(previewRow);
      }
      const runtimeOptions = [
        { key: 'virtual-joystick', label: 'Sanal joystick', stateKey: 'show_touch_controls', buttonId: 'mobile-toggle-joy-btn', fallback: true },
        { key: 'auto-wave', label: 'Dalga bitince otomatik ilerle', stateKey: 'auto_new_tur', buttonId: 'mobile-toggle-autowave-btn', fallback: false },
        { key: 'auto-run', label: 'Sefer sonunda otomatik yenile', stateKey: 'auto_new_run', buttonId: 'mobile-toggle-autorun-btn', fallback: false }
      ];
      runtimeOptions.forEach(option => {
        const existingControl = document.getElementById(option.buttonId);
        if (!existingControl) return;
        const row = document.createElement('label'); row.className = 'settings-row';
        const label = document.createElement('span'); label.textContent = option.label;
        const input = document.createElement('input'); input.type = 'checkbox'; input.dataset.setting = option.key;
        try { input.checked = typeof state !== 'undefined' ? Boolean(state[option.stateKey] ?? option.fallback) : option.fallback; } catch (_) { input.checked = option.fallback; }
        input.addEventListener('change', () => {
          let current; try { current = Boolean(state[option.stateKey] ?? option.fallback); } catch (_) { current = option.fallback; }
          if (input.checked !== current) existingControl.click();
          queueMicrotask(() => { try { input.checked = Boolean(state[option.stateKey] ?? option.fallback); } catch (_) {} });
        });
        row.append(label, input); rows.append(row);
      });
      const speedControl = document.getElementById('speed-btn');
      if (speedControl) {
        const row = document.createElement('div'); row.className = 'settings-row';
        const label = document.createElement('span'); label.textContent = 'Oyun hızı';
        const button = document.createElement('button'); button.type = 'button'; button.className = 'btn'; button.dataset.setting = 'game-speed';
        const refreshSpeed = () => { try { button.textContent = `Hız: ${Number(state.game_speed || 1).toFixed(1)}×`; } catch (_) { button.textContent = 'Hızı değiştir'; } };
        refreshSpeed(); button.addEventListener('click', () => { speedControl.click(); queueMicrotask(refreshSpeed); });
        row.append(label, button); rows.append(row);
      }
      const fullscreenControl = document.getElementById('fullscreen-btn');
      if (fullscreenControl) {
        const row = document.createElement('div'); row.className = 'settings-row';
        const label = document.createElement('span'); label.textContent = 'Ekran';
        const button = document.createElement('button'); button.type = 'button'; button.className = 'btn'; button.textContent = 'Tam ekranı değiştir'; button.addEventListener('click', () => fullscreenControl.click());
        row.append(label, button); rows.append(row);
      }
      bookContent.replaceChildren(rows);
    } else {
      const steps = document.createElement('ol'); steps.className = 'guide-steps';
      const guideCards = [
        {
          title: 'Hareket ve saldırı',
          visual: '<div class="guide-visual"><img src="assets/ui/errata/arena-v3/inky_idle_0.webp" alt="Inky oyun sprite’ı"><div class="guide-keys" aria-label="Hareket: W A S D"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div><span class="guide-path" aria-hidden="true">→</span><img src="assets/ui/errata/arena-v4/enemies/grammar_goblin_0.webp" alt="Grammar Goblin"></div>',
          copy: 'WASD veya ok tuşlarıyla düşmanlardan uzaklaş. Silahın otomatik ateş eder. Dokunmatik ekranda sol alttaki hareket kolunu kullan.'
        },
        {
          title: 'Etkin yetenek',
          visual: '<div class="guide-visual"><img src="assets/sprites/gadgets/eraser_dash.png" alt="Silgi Sıçrayışı"><img src="assets/sprites/gadgets/lexicon_aegis.png" alt="Sözlük Kalkanı"><kbd class="key-wide">SPACE</kbd></div>',
          copy: 'Etkin yeteneğini Space, Shift veya sağ tıkla kullan. Her karakterin yeteneği farklıdır. Mobilde YETENEK düğmesine dokun; arena nesneleri için R kullan.'
        },
        {
          title: 'Silah ve envanter',
          visual: '<div class="guide-visual"><img src="assets/sprites/weapons/quill_blaster.png" alt="İğne Ucu Kalem"><img src="assets/sprites/weapons/dictionary_blade.png" alt="Sözlük Kılıcı"><div class="guide-shortcuts"><kbd>Q / E</kbd><kbd>I</kbd></div></div>',
          copy: 'Q/E veya 1–6 ile silah seç. I ile envanteri, M ile hata defterini aç. Dalga arasında mürekkebini silah, yetenek ve geliştirmeler için harca.'
        },
        {
          title: 'Kelime soruları',
          visual: '<div class="guide-flow"><img src="assets/ui/icons/cards.svg" alt="Kelime kartı"><span aria-hidden="true">→</span><img src="assets/ui/icons/corrections.svg" alt="Soruyu yanıtla"><span aria-hidden="true">→</span><img src="assets/ui/icons/health.svg" alt="Can ve güç kazan"><strong>½ fiyat</strong></div>',
          copy: 'Doğru yanıt normal kartı yarı fiyatına kazandırır; etkisi %50 artar ve 25 can yeniler. Yanlışta normal fiyat ödenir. Yanlış kelimeler hata defterine ve sonraki boss turlarına geri döner.'
        }
      ];
      for (const item of guideCards) {
        const li = document.createElement('li');
        const heading = document.createElement('h3'); heading.textContent = item.title;
        const art = document.createElement('div'); art.innerHTML = item.visual;
        const copy = document.createElement('p'); copy.textContent = item.copy;
        li.append(heading, art, copy); steps.append(li);
      }
      bookContent.replaceChildren(steps);
    }
  }
  function renderPause() {
    pauseContent.replaceChildren();
    const actions = [['resume', 'Oyuna dön'], ['inventory', 'Envanter'], ['mistakes', 'Hata defteri'], ['codex', 'Kelime kitabı'], ['bestiary', 'Dil canavarları'], ['settings', 'Tercihler'], ['guide', 'Oynama kılavuzu']];
    for (const [action, label] of actions) { const button = document.createElement('button'); button.type = 'button'; button.className = 'btn'; button.dataset.pauseAction = action; button.textContent = label; pauseContent.append(button); }
  }
  const collectionArtWarmups = new Map();
  const collectionArtByView = {
    codex: ['collection-art/codex-scene.webp', 'archive-atlas/emblems-v2.webp'],
    weapons: ['collection-art/armory.webp'],
    bestiary: ['collection-art/bestiary-hall.webp', 'archive-atlas/bestiary-v2.webp'],
    guide: ['collection-art/guide-map.webp'],
    settings: ['collection-art/settings-scriptorium.webp'],
    leaderboard: ['collection-art/leaderboard-hall.webp', 'collection-art/rank-gold.webp', 'collection-art/rank-silver.webp', 'collection-art/rank-teal.webp']
  };
  function warmCollectionArt(kind) {
    const view = kind === 'codex' && bookOverlay?.dataset.category === 'weapons' ? 'weapons' : kind;
    const files = collectionArtByView[view] || [];
    if (!files.length) return;
    const key = files.join('|');
    if (!collectionArtWarmups.has(key)) {
      const pending = Promise.all(files.map(file => new Promise(resolve => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => {
          const decoded = image.decode?.();
          if (decoded) decoded.catch(() => {}).finally(resolve);
          else resolve();
        };
        image.onerror = resolve;
        image.src = `assets/ui/errata/${file}`;
        if (image.complete && image.naturalWidth) resolve();
      })));
      collectionArtWarmups.set(key, pending);
    }
    return collectionArtWarmups.get(key);
  }
  bookButtons.forEach(button => {
    const warm = () => warmCollectionArt(button.dataset.openBook);
    button.addEventListener('pointerenter', warm, { passive: true });
    button.addEventListener('focus', warm, { passive: true });
    button.addEventListener('pointerdown', warm, { passive: true });
  });
  ['title-leaderboard-btn', 'gameover-leaderboard-btn'].forEach(id => {
    const button = document.getElementById(id);
    if (!button) return;
    const warm = () => warmCollectionArt('leaderboard');
    button.addEventListener('pointerenter', warm, { passive: true });
    button.addEventListener('focus', warm, { passive: true });
    button.addEventListener('pointerdown', warm, { passive: true });
  });
  function openBook(kind, opener) { renderBook(kind); openDialog(bookOverlay, opener); warmCollectionArt(kind); }
  bookButtons.forEach(button => button.addEventListener('click', event => { event.preventDefault(); openBook(button.dataset.openBook, button); }));
  pauseButton?.addEventListener('click', event => { event.preventDefault(); renderPause(); openDialog(pauseOverlay, pauseButton); });
  document.addEventListener('click', event => {
    if (dialogStack.length && event.target.closest('#mobile-toggle-autowave-btn, #auto-tur-btn, #shop-auto-tur-btn')) ensureShopCountdownGate();
    if (event.target.closest('#close-mistakes-btn') || (externalModalPause && event.target.closest('#mistakes-btn') && document.getElementById('mistakes-modal')?.style.display !== 'flex')) releaseExternalModalGate();
    const closeBookButton = event.target.closest('[data-close-book]');
    if (closeBookButton && bookOverlay.contains(closeBookButton)) { closeTop(); return; }
    const pauseAction = event.target.closest('[data-pause-action]');
    if (!pauseAction || !pauseOverlay.contains(pauseAction)) return;
    if (pauseAction.dataset.pauseAction === 'resume') { closeTop(); return; }
    if (pauseAction.dataset.pauseAction === 'inventory' || pauseAction.dataset.pauseAction === 'mistakes') {
      const control = document.getElementById(pauseAction.dataset.pauseAction === 'inventory' ? 'inventory-btn' : 'mistakes-btn');
      if (!control) return;
      closeTop();
      if (pauseAction.dataset.pauseAction === 'mistakes') {
        try { externalPausePreviousInventory = state.is_inventory_open; state.is_inventory_open = true; externalModalPause = true; } catch (_) {}
      }
      control.click();
      document.getElementById(pauseAction.dataset.pauseAction === 'inventory' ? 'close-inventory-btn' : 'close-mistakes-btn')?.focus?.({ preventScroll: true });
      return;
    }
    if (['codex', 'bestiary', 'settings', 'guide'].includes(pauseAction.dataset.pauseAction)) openBook(pauseAction.dataset.pauseAction, pauseAction);
  });
  document.addEventListener('keydown', event => {
    if (isQuizOpen()) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); return; }
      if (event.key === 'Tab') { containTabFocus(event, quizModal); return; }
      event.stopImmediatePropagation(); return;
    }
    const top = topDialog();
    if (!top || !visibleDialog(top)) {
      const titleIsVisible = !title.hidden && getComputedStyle(title).display !== 'none';
      if (event.key === 'Tab' && titleIsVisible) { containTabFocus(event, title); return; }
      if (externalModalPause) {
        if (event.key === 'Tab') { containTabFocus(event, document.getElementById('mistakes-modal')); return; }
        if (event.key === 'Escape' || event.key.toLowerCase() === 'm') {
          event.preventDefault(); event.stopImmediatePropagation(); document.getElementById('close-mistakes-btn')?.click(); return;
        }
        event.stopImmediatePropagation(); return;
      }
      if (event.key === 'Escape' && titleIsVisible) {
        const previous = title.dataset.step === 'preparation' ? 'character' : title.dataset.step === 'character' ? 'landing' : null;
        if (previous) { event.preventDefault(); event.stopImmediatePropagation(); setTitleStep(previous); }
        return;
      }
      if (event.key === 'Escape') {
        const inventory = document.getElementById('inventory-modal');
        const mistakes = document.getElementById('mistakes-modal');
        const leaderboard = document.getElementById('leaderboard-overlay');
        if (inventory?.style.display === 'flex') { event.preventDefault(); event.stopImmediatePropagation(); document.getElementById('close-inventory-btn')?.click(); return; }
        if (mistakes?.style.display === 'flex') { event.preventDefault(); event.stopImmediatePropagation(); document.getElementById('close-mistakes-btn')?.click(); return; }
        if (leaderboard && !leaderboard.hidden) { event.preventDefault(); event.stopImmediatePropagation(); document.getElementById('leaderboard-close-btn')?.click(); return; }
        const shop = document.getElementById('shop-screen');
        if (shop && shop.style.display !== 'none') { event.preventDefault(); event.stopImmediatePropagation(); renderPause(); openDialog(pauseOverlay, pauseButton); return; }
        try { if (typeof state !== 'undefined' && state.is_wave_active) { event.preventDefault(); event.stopImmediatePropagation(); renderPause(); openDialog(pauseOverlay, pauseButton); return; } } catch (_) {}
      }
      return;
    }
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); closeTop(); return; }
    if (event.key !== 'Tab') { event.stopImmediatePropagation(); return; }
    containTabFocus(event, top);
    return;
  }, true);
})();

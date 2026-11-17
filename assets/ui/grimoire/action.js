/* Grimoire action layer.
   Watches the HUD the game already renders and answers it with feedback:
   wave banners, a boss title card, a kill chain counter, hurt vignettes and
   ink splatter, a heartbeat at low health, a red pulse in the final seconds.
   It never touches game state. */
(() => {
  const $ = (id) => document.getElementById(id);
  const container = $('game-container');
  if (!container) return;
  const root = document.documentElement;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('errata-reduced-motion');
  const lowFx = () => root.classList.contains('errata-low-effects');

  const layer = document.createElement('div');
  layer.id = 'gm-action-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = `
    <div class="gm-hurt"></div>
    <div class="gm-low"></div>
    <div class="gm-splats"></div>
    <div class="gm-banner" hidden><span class="gm-banner-kicker"></span><strong class="gm-banner-title"></strong><span class="gm-banner-sub"></span></div>
    <div class="gm-bosscard" hidden><span class="gm-bosscard-kicker">Bekçi uyandı</span><strong class="gm-bosscard-name"></strong><span class="gm-bosscard-slash"></span><em class="gm-bosscard-line"></em></div>
    <div class="gm-chain" hidden><b class="gm-chain-count"></b><span class="gm-chain-label">zincir</span><i class="gm-chain-timer"></i></div>`;
  container.appendChild(layer);
  const hurt = layer.querySelector('.gm-hurt');
  const low = layer.querySelector('.gm-low');
  const splats = layer.querySelector('.gm-splats');
  const banner = layer.querySelector('.gm-banner');
  const bossCard = layer.querySelector('.gm-bosscard');
  const chain = layer.querySelector('.gm-chain');

  const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const inCombat = () => {
    const hud = $('hud');
    const title = $('title-screen');
    const shop = $('shop-screen');
    return hud && (!title || title.hidden || title.style.display === 'none') && (!shop || shop.style.display === 'none');
  };

  /* -- health: hurt flash, splatter, heartbeat ------------------------- */
  let lastHp = null;
  const hpText = $('hp-text');
  function readHp() {
    const m = /(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/.exec(hpText?.textContent || '');
    return m ? { hp: +m[1], max: +m[2] } : null;
  }
  function splat() {
    if (lowFx() || splats.childElementCount > 5) return;
    const s = document.createElement('i');
    const edge = Math.random();
    const x = edge < .5 ? (Math.random() < .5 ? -4 : 88) + Math.random() * 12 : Math.random() * 100;
    const y = edge < .5 ? Math.random() * 100 : (Math.random() < .5 ? -4 : 86) + Math.random() * 12;
    s.style.cssText = `left:${x}%;top:${y}%;--r:${Math.random() * 360}deg;--s:${.7 + Math.random() * .8}`;
    splats.appendChild(s);
    setTimeout(() => s.remove(), 1400);
  }
  function onHp() {
    const v = readHp();
    if (!v) return;
    if (lastHp !== null && v.hp < lastHp - .5 && inCombat()) {
      replay(hurt, 'is-on');
      replay($('hud')?.querySelector('.hp-container') || hurt, 'gm-shake');
      if (lastHp - v.hp > v.max * .04) splat();
    }
    const ratio = v.max ? v.hp / v.max : 1;
    low.classList.toggle('is-on', ratio > 0 && ratio <= .3 && inCombat());
    low.style.setProperty('--beat', ratio <= .15 ? '.55s' : '.9s');
    lastHp = v.hp;
  }
  if (hpText) new MutationObserver(onHp).observe(hpText, { childList: true, characterData: true, subtree: true });

  /* -- kill chain ------------------------------------------------------ */
  let lastKills = null, chainCount = 0, chainTimer = 0;
  const killEl = $('kill-value');
  function onKill() {
    const k = parseInt(killEl.textContent, 10);
    if (Number.isNaN(k)) return;
    if (lastKills !== null && k > lastKills && inCombat()) {
      chainCount += k - lastKills;
      if (chainCount >= 5) {
        chain.hidden = false;
        chain.querySelector('.gm-chain-count').textContent = '×' + chainCount;
        chain.dataset.tier = chainCount >= 50 ? '3' : chainCount >= 25 ? '2' : chainCount >= 12 ? '1' : '0';
        replay(chain, 'is-hit');
        replay(chain.querySelector('.gm-chain-timer'), 'is-run');
      }
      clearTimeout(chainTimer);
      chainTimer = setTimeout(() => { chainCount = 0; chain.classList.add('is-out'); setTimeout(() => { chain.hidden = true; chain.classList.remove('is-out'); }, 320); }, 2600);
    } else if (lastKills !== null && k < lastKills) {
      chainCount = 0; chain.hidden = true;
    }
    lastKills = k;
  }
  if (killEl) new MutationObserver(onKill).observe(killEl, { childList: true, characterData: true, subtree: true });

  /* -- ink counter bump ---------------------------------------------- */
  const inkEl = $('ink-count');
  let lastInk = null;
  if (inkEl) new MutationObserver(() => {
    const v = parseInt($('ink-value')?.textContent, 10);
    if (lastInk !== null && v > lastInk) replay(inkEl, 'gm-bump');
    lastInk = v;
  }).observe(inkEl, { childList: true, characterData: true, subtree: true });

  /* -- wave banner + final seconds ------------------------------------ */
  const ROMAN = ['I', 'II', 'III', 'IV'];
  let lastWave = null;
  const timer = $('timer-badge');
  function onTimer() {
    const wave = parseInt($('hud-wave-number')?.textContent, 10);
    const secs = parseInt($('hud-seconds')?.textContent, 10);
    timer.classList.toggle('gm-urgent', inCombat() && secs > 0 && secs <= 5);
    if (!Number.isNaN(wave) && wave !== lastWave) {
      if (lastWave !== null && inCombat() && wave % 5 !== 0) showBanner(wave);
      lastWave = wave;
    }
  }
  function showBanner(wave) {
    const place = $('hud-biome-name')?.textContent?.trim() || 'Kütüphane';
    const wing = ROMAN[Math.min(3, Math.floor((wave - 1) / 25))];
    banner.querySelector('.gm-banner-kicker').textContent = `Kanat ${wing} · ${place}`;
    banner.querySelector('.gm-banner-title').textContent = `Dalga ${wave}`;
    banner.querySelector('.gm-banner-sub').textContent = wave % 5 === 4 ? 'Bir sonraki sayfada bekçi bekliyor' : 'Mürekkebini topla, adları koru';
    banner.hidden = false;
    replay(banner, 'is-on');
    clearTimeout(banner._t);
    banner._t = setTimeout(() => { banner.hidden = true; }, reduced() ? 900 : 2300);
  }
  if (timer) new MutationObserver(onTimer).observe(timer, { childList: true, characterData: true, subtree: true });

  /* -- boss title card ------------------------------------------------- */
  const bossBox = $('boss-hp-container');
  let bossShown = false;
  function onBoss() {
    const visible = bossBox.style.display && bossBox.style.display !== 'none';
    if (visible && !bossShown && inCombat()) {
      const raw = ($('boss-hp-title')?.textContent || '').split('·')[0].trim();
      const name = raw.toLocaleLowerCase('tr-TR').replace(/(^|\s)(\S)/g, (m, s, c) => s + c.toLocaleUpperCase('tr-TR'));
      bossCard.querySelector('.gm-bosscard-name').textContent = name || 'Bekçi';
      bossCard.querySelector('.gm-bosscard-line').textContent = $('boss-hp-sentence')?.getAttribute('aria-label') || '';
      bossCard.hidden = false;
      replay(bossCard, 'is-on');
      replay(container, 'gm-quake');
      clearTimeout(bossCard._t);
      bossCard._t = setTimeout(() => { bossCard.hidden = true; }, reduced() ? 1200 : 2600);
    }
    bossShown = visible;
  }
  if (bossBox) new MutationObserver(onBoss).observe(bossBox, { attributes: true, attributeFilter: ['style'] });

  /* -- gadget ready ---------------------------------------------------- */
  const gadgetStatus = $('combat-gadget-status');
  const gadgetBtn = $('touch-gadget-btn');
  if (gadgetStatus && gadgetBtn) new MutationObserver(() => {
    const ready = /HAZIR/i.test(gadgetStatus.textContent);
    if (ready && !gadgetBtn.classList.contains('gm-ready')) replay(gadgetBtn, 'gm-ready-flash');
    gadgetBtn.classList.toggle('gm-ready', ready);
  }).observe(gadgetStatus, { childList: true, characterData: true, subtree: true });

  // test hooks for screenshots
  window.GrimoireAction = Object.freeze({ showBanner, splat, flashHurt: () => replay(hurt, 'is-on') });
})();

/* Bug-fix layer (2026-11-18). Small guards that do not belong to one feature. */
(() => {
  // B2 — a screen container must never keep a sideways/vertical scroll offset:
  // focus() and scrollIntoView() can scroll overflow:hidden boxes.
  const pinned = ["game-container", "title-screen"];
  function pin(id) {
    const node = document.getElementById(id);
    if (!node) return;
    node.addEventListener("scroll", () => {
      if (node.scrollLeft) node.scrollLeft = 0;
      if (id === "game-container" && node.scrollTop) node.scrollTop = 0;
    }, { passive: true });
  }
  pinned.forEach(pin);
})();

// B4 — old sprites flashed in between painted frames because each animation
// strip was only fetched the first time it was needed. Decode them ahead of
// time: this hero's sheets and the common combat set as soon as the hero is
// known, and the next boss a few waves before it arrives.
(() => {
  let warmedHero = null, warmedBossWave = -1;
  function tick() {
    const sprites = window.GrimoireSprites;
    if (!sprites || typeof state === "undefined") return;
    const hero = state.selected_char || "inky";
    if (hero !== warmedHero) { warmedHero = hero; sprites.warmCombat(hero); }
    const wave = Number(state.current_wave) || 0;
    const nextBossWave = Math.ceil((wave + 1) / 5) * 5;
    if (state.is_wave_active && nextBossWave - wave <= 4 && nextBossWave !== warmedBossWave) {
      warmedBossWave = nextBossWave;
      sprites.warmBoss(nextBossWave);
    }
  }
  setTimeout(tick, 400);
  setInterval(tick, 1500);
})();

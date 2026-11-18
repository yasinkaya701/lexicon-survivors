/* Stage behaviour for the shop and the word trial (see stage.css).
 * Presentation only: no game state is read or written except through the
 * DOM the game already renders. */
(() => {
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("errata-reduced-motion");

  // Shop word cards lean toward the cursor; a soft light follows it.
  const grid = document.getElementById("shop-items-grid");
  grid?.addEventListener("pointermove", event => {
    if (reduced()) return;
    const card = event.target.closest?.(".shop-card");
    if (!card || card.closest("#shop-screen")?.dataset.tab !== "cards") return;
    const r = card.getBoundingClientRect();
    const x = (event.clientX - r.left) / r.width, y = (event.clientY - r.top) / r.height;
    card.style.setProperty("--ry", `${(x - 0.5) * 14}deg`);
    card.style.setProperty("--rx", `${(0.5 - y) * 12}deg`);
    card.style.setProperty("--gx", `${x * 100}%`);
    card.style.setProperty("--gy", `${y * 100}%`);
  });
  grid?.addEventListener("pointerout", event => {
    const card = event.target.closest?.(".shop-card");
    if (card && !card.contains(event.relatedTarget)) { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); }
  });
  // A bought card burns away before the grid re-renders.
  grid?.addEventListener("click", event => {
    const button = event.target.closest?.("button.shop-buy");
    if (!button || button.disabled) return;
    const card = button.closest(".shop-card");
    if (card && !reduced()) { const ghost = card.cloneNode(true); const r = card.getBoundingClientRect();
      Object.assign(ghost.style, { position: "fixed", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, margin: 0, zIndex: 600 });
      ghost.classList.add("is-bought"); document.body.append(ghost); setTimeout(() => ghost.remove(), 750); }
  }, true);

  // The ink counter counts instead of jumping.
  const ink = document.getElementById("shop-ink-display");
  let shown = null, raf = 0;
  if (ink) new MutationObserver(() => {
    const target = Number((ink.textContent.match(/\d+/) || [0])[0]);
    if (shown === null || reduced()) { shown = target; return; }
    if (target === shown || ink.dataset.counting) return;
    const from = shown, start = performance.now(), label = ink.textContent.replace(/\d+/, "{n}");
    shown = target; ink.dataset.counting = "1"; ink.classList.add("is-ticking");
    cancelAnimationFrame(raf);
    const step = now => {
      const k = Math.min(1, (now - start) / 520), v = Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3)));
      ink.textContent = label.replace("{n}", v);
      if (k < 1) raf = requestAnimationFrame(step); else { delete ink.dataset.counting; ink.classList.remove("is-ticking"); }
    };
    raf = requestAnimationFrame(step);
  }).observe(ink, { childList: true, characterData: true, subtree: true });

  // Word trial: sparks fly from the chosen answer.
  const options = document.getElementById("quiz-options-container");
  options?.addEventListener("click", event => {
    const button = event.target.closest?.(".quiz-opt-btn");
    if (!button || reduced()) return;
    requestAnimationFrame(() => {
      const good = button.classList.contains("is-correct");
      const r = button.getBoundingClientRect();
      for (let i = 0; i < (good ? 26 : 12); i++) {
        const spark = document.createElement("i");
        spark.className = `quiz-burst${good ? "" : " is-red"}`;
        const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * (good ? 180 : 90);
        spark.style.left = `${r.left + r.width * (0.2 + Math.random() * 0.6)}px`;
        spark.style.top = `${r.top + r.height / 2}px`;
        spark.style.setProperty("--dx", `${Math.cos(a) * d}px`);
        spark.style.setProperty("--dy", `${Math.sin(a) * d - 30}px`);
        document.body.append(spark);
        setTimeout(() => spark.remove(), 950);
      }
    });
  });
})();

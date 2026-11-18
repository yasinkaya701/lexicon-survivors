/* Story intermission presentation.
 *
 * game.js still decides what each panel says and shows (renderStoryPanel).
 * This layer only stages it: a blurred copy of the panel fills the screen,
 * the previous panel dissolves into the next, the camera drifts slowly over
 * the painting, and the line is revealed word by word. #story-copy always
 * holds the full text (words are wrapped in spans), so readers, speech and
 * tests see the whole line at once.
 */
(() => {
  const root = document.getElementById("story-intermission");
  if (!root) return;
  const scene = document.getElementById("story-scene");
  const image = document.getElementById("story-scene-image");
  const copy = document.getElementById("story-copy");
  const portrait = document.getElementById("story-speaker-portrait");
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("errata-reduced-motion");

  const backdrop = document.createElement("div");
  backdrop.className = "story-backdrop";
  backdrop.innerHTML = "<i></i><i></i>";
  root.prepend(backdrop);
  root.insertAdjacentHTML("afterbegin", '<div class="story-letterbox" aria-hidden="true"><span></span><span></span></div>');
  const ghost = document.createElement("img");
  ghost.className = "story-scene-ghost";
  ghost.alt = "";
  ghost.setAttribute("aria-hidden", "true");
  image.after(ghost);
  const motes = document.createElement("div");
  motes.className = "story-motes";
  motes.setAttribute("aria-hidden", "true");
  motes.innerHTML = Array.from({ length: 14 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${6 + (i % 5) * 1.7}s;--o:${-(i * 0.9)}s"></i>`).join("");
  scene.append(motes);

  let lastSrc = "";
  let layer = 0;
  let drift = 0;
  function onImage() {
    const src = image.currentSrc || image.src;
    if (!src || src === lastSrc) return;
    if (lastSrc && !reduced()) {
      ghost.src = lastSrc;
      ghost.classList.remove("is-fading"); void ghost.offsetWidth; ghost.classList.add("is-fading");
    }
    lastSrc = src;
    const layers = backdrop.querySelectorAll("i");
    layer = 1 - layer;
    layers[layer].style.backgroundImage = `url("${src}")`;
    layers[layer].classList.add("on");
    layers[1 - layer].classList.remove("on");
    drift = (drift + 1) % 4;
    scene.dataset.drift = String(drift);
    image.classList.remove("is-drifting"); void image.offsetWidth; image.classList.add("is-drifting");
  }
  new MutationObserver(onImage).observe(image, { attributes: true, attributeFilter: ["src"] });

  // Word-by-word reveal; the full text stays in the DOM.
  let typing = false, typingTimer = 0, wrapping = false;
  function onCopy() {
    if (wrapping) return;
    const text = copy.textContent;
    if (!text || copy.querySelector(".sw")) return;
    wrapping = true;
    const words = text.split(/(\s+)/);
    copy.replaceChildren(...words.map((w, i) => {
      if (/^\s+$/.test(w)) return document.createTextNode(w);
      const span = document.createElement("span");
      span.className = "sw";
      span.textContent = w;
      span.style.setProperty("--w", String(Math.floor(i / 2)));
      return span;
    }));
    wrapping = false;
    const count = Math.ceil(words.length / 2);
    copy.classList.remove("is-done");
    if (reduced()) { finish(); return; }
    typing = true;
    clearTimeout(typingTimer);
    typingTimer = setTimeout(finish, Math.min(2600, count * 55 + 200));
    portrait?.classList.remove("is-speaking"); void portrait?.offsetWidth; portrait?.classList.add("is-speaking");
  }
  function finish() {
    typing = false;
    clearTimeout(typingTimer);
    copy.classList.add("is-done");
  }
  new MutationObserver(onCopy).observe(copy, { childList: true, characterData: true, subtree: true });

  // First press completes the line; the next one advances (game.js handler).
  window.addEventListener("keydown", event => {
    if (root.hidden || !typing) return;
    if (["Enter", " ", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      finish();
    }
  }, true);
  scene.addEventListener("click", () => { if (typing) finish(); else document.getElementById("story-next")?.click(); });

  new MutationObserver(() => {
    if (root.hidden) { lastSrc = ""; return; }
    root.classList.remove("is-entering"); void root.offsetWidth; root.classList.add("is-entering");
  }).observe(root, { attributes: true, attributeFilter: ["hidden"] });
})();

/* Mirrored brass corner for the leather slabs (CSS can only flip a whole
 * element, so it is a tiny extra node). */
(() => {
  const add = () => document.querySelectorAll("#errata-book .dialog-panel, .leaderboard-panel, #inventory-modal .dialog-panel, #mistakes-modal .dialog-panel")
    .forEach(panel => { if (!panel.querySelector(":scope > .slab-corner")) { const c = document.createElement("i"); c.className = "slab-corner"; c.setAttribute("aria-hidden", "true"); panel.append(c); } });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add); else add();
  setTimeout(add, 1500);
})();

/* End-of-wave treasure chest.
 *
 * Hazine nodes and boss waves leave a chest. Before the shop opens it is
 * shown here: it shakes, the player opens it, light bursts, and the offers
 * (ink, a relic, or cursed relics in Errata) rise out of it. The choice goes
 * through GrimoireMeta.takeTreasure, then the real openShop() runs. Closing
 * the chest without choosing leaves the offers in the shop, as before.
 */
(() => {
  const art = id => window.GrimoireSprites?.src(id) || "";
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("errata-reduced-motion");
  let root = null, done = null, phase = "closed";

  function build() {
    root = document.createElement("section");
    root.id = "grimoire-chest";
    root.className = "grimoire-chest";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "gc-title");
    root.innerHTML = `
      <div class="gc-light" aria-hidden="true"></div>
      <header class="gc-head"><span class="errata-kicker" id="gc-kicker"></span><h2 id="gc-title"></h2></header>
      <button type="button" class="gc-chest" aria-label="Sandığı aç">
        <span class="gc-rays" aria-hidden="true"></span>
        <span class="gc-body" aria-hidden="true"></span>
        <span class="gc-lid" aria-hidden="true"></span>
        <span class="gc-sparks" aria-hidden="true"></span>
      </button>
      <div class="gc-offers" role="group" aria-label="Sandıktan çıkanlar"></div>
      <footer class="gc-foot"><button type="button" class="btn primary gc-open">Sandığı aç</button><button type="button" class="gc-later">Sonra al · dükkâna geç</button></footer>`;
    document.body.append(root);
    const sheet = art("pickup_relic_chest");
    root.querySelectorAll(".gc-body, .gc-lid").forEach(node => { if (sheet) node.style.backgroundImage = `url("${sheet}")`; });
    root.querySelector(".gc-chest").addEventListener("click", open);
    root.querySelector(".gc-open").addEventListener("click", open);
    root.querySelector(".gc-later").addEventListener("click", () => finish());
    root.addEventListener("keydown", event => {
      if (event.key === "Escape") { event.stopPropagation(); finish(); }
      else if ((event.key === "Enter" || event.key === " ") && phase === "closed" && !event.target.closest("button")) { event.preventDefault(); open(); }
    });
  }

  function sparks() {
    const holder = root.querySelector(".gc-sparks");
    holder.replaceChildren(...Array.from({ length: 22 }, () => {
      const i = document.createElement("i");
      const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 190;
      i.style.setProperty("--dx", `${Math.cos(a) * d}px`);
      i.style.setProperty("--dy", `${Math.sin(a) * d - 80}px`);
      i.style.animationDelay = `${Math.random() * 0.25}s`;
      return i;
    }));
  }

  function offerButton(offer, index) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `gc-offer gc-offer--${offer.kind}`;
    b.style.setProperty("--i", index);
    if (offer.kind === "ink") b.innerHTML = `<span class="gc-strip" style="background-image:url('${art("pickup_ink_large")}')"></span><b>${offer.amount} mürekkep</b><span>Hemen harcanabilir.</span>`;
    else if (offer.kind === "relic") b.innerHTML = `<img src="${window.paintedIcon?.(offer.relic.icon) || offer.relic.icon}" alt=""><b>${offer.relic.name}</b><span>${offer.relic.desc}</span>`;
    else b.innerHTML = `<img src="${art(`cursed_${offer.relic.id}`)}" alt=""><b>${offer.relic.name}</b><span class="good">${offer.relic.good}</span><span class="bad">${offer.relic.bad}</span>`;
    b.addEventListener("click", () => {
      if (phase !== "offers") return;
      phase = "taken";
      window.GrimoireMeta?.takeTreasure(offer);
      b.classList.add("is-taken");
      root.classList.add("is-closing");
      setTimeout(finish, reduced() ? 80 : 700);
    });
    return b;
  }

  function open() {
    if (phase !== "closed") return;
    phase = "opening";
    root.classList.add("is-opening");
    sparks();
    try { window.sounds?.playTone?.(300, "triangle", 0.3, 0.2); setTimeout(() => window.sounds?.playTone?.(760, "sine", 0.4, 0.2), 380); } catch (_) { /* audio not ready */ }
    const offers = window.GrimoireMeta?.treasureOffers() || [];
    root.querySelector(".gc-offers").replaceChildren(...offers.map(offerButton));
    root.querySelector(".gc-foot").classList.add("is-hidden");
    setTimeout(() => {
      phase = "offers";
      root.classList.add("is-open");
      root.querySelector(".gc-offers button")?.focus({ preventScroll: true });
      root.querySelector(".gc-foot").classList.remove("is-hidden");
      root.querySelector(".gc-open").hidden = true;
      root.querySelector(".gc-later").textContent = "Sonra seç · dükkâna geç";
    }, reduced() ? 60 : 1150);
  }

  function finish() {
    if (!root || root.hidden) return;
    root.hidden = true;
    root.classList.remove("is-opening", "is-open", "is-closing");
    const next = done; done = null; phase = "closed";
    next?.();
  }

  function show(callback) {
    if (!root) build();
    done = callback;
    phase = "closed";
    root.classList.remove("is-opening", "is-open", "is-closing");
    root.querySelector(".gc-open").hidden = false;
    root.querySelector(".gc-later").textContent = "Sonra al · dükkâna geç";
    root.querySelector(".gc-foot").classList.remove("is-hidden");
    root.querySelector(".gc-offers").replaceChildren();
    const errata = window.GrimoireMeta?.isErrata?.();
    const wave = typeof state !== "undefined" ? state.current_wave : 0;
    root.querySelector("#gc-kicker").textContent = wave % 5 === 0 ? `BEKÇİ DÜŞTÜ · DALGA ${wave}` : `HAZİNE DÜĞÜMÜ · DALGA ${wave}`;
    root.querySelector("#gc-title").textContent = errata ? "Lanetli bir sandık" : "Bir sandık bıraktı";
    root.hidden = false;
    root.querySelector(".gc-open").focus({ preventScroll: true });
  }

  // Run the chest before the shop whenever the run left one.
  function wrapShop() {
    if (typeof window.openShop !== "function" || window.openShop.__chest) return;
    const original = window.openShop;
    const wrapped = function () {
      if (window.GrimoireMeta?.treasureOffers?.()) { show(() => original()); return; }
      return original();
    };
    wrapped.__chest = true;
    window.openShop = wrapped;
  }
  wrapShop();
  window.addEventListener("load", wrapShop);
  window.GrimoireChest = { show };
})();

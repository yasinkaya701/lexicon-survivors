/* Extras: studio splash, credits, the loading veil with tips, the shop tip
 * card, and small motion details shared by every screen (ink ripples on
 * press, an ink curtain when a big screen opens, a damage trail on the
 * health bar). Presentation only. */
(() => {
  const G = () => window.GrimoireSprites;
  const art = id => G()?.src(id) || "";
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("errata-reduced-motion");
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };

  /* ---------------------------------------------------------------- tips */
  const TIPS = [
    ["tip_01", "Raflar arasında dur durak bilme. Hareket eden kâtip uzun yaşar."],
    ["tip_02", "Mürekkep her şeydir: silah, gereç ve kelime kartları onunla alınır."],
    ["tip_03", "Kitaplardan sürünen kâğıt yaratıklar kalabalıkta gelir. Kenara çekil, silahın çalışsın."],
    ["tip_04", "Hazine düğümü seçtiysen dalga sonunda sandık seni dükkânda bekler."],
    ["tip_05", "Yıldız astrolabı gerecini hemen yeniler ve bir kalkan verir. R ile kullan."],
    ["tip_06", "Hasım maskesi takan düşman güçlüdür ama altı kat mürekkep bırakır."],
    ["tip_07", "Uçuşan kâğıt oklar tek sıra halinde gelir. Yana kaç, geriye değil."],
    ["tip_08", "Postanede Sera'nın mektupları sıradaki başarımı gösterir."],
    ["tip_09", "Cevaplamadığın kelimeler de boss turunda döner. Her turda biraz daha güçlenirler."],
    ["tip_10", "İdman köşesinde Lira'nın yetenek ağacı kahramanına kalıcı güç verir."],
    ["tip_11", "Boş Sayfa her adı silmek ister. Son kapıya kadar mürekkebini koru."],
    ["tip_12", "Haritada yol seçerken mola düğümü canını %30 tazeler."],
    ["tut_dash", "Silgi atılımı düşmanların içinden geçerken onlara hasar verir."],
    ["tut_pickup_ink", "Mürekkep damlaları yakına gelince kendiliğinden toplanır. Menzil geliştirilebilir."],
    ["tut_auto_attack", "Silahlar kendi ateş eder. Sen yalnızca nerede duracağını seç."],
    ["tut_boss_sentence", "Boss canı azaldıkça cümlesinin kelimeleri tek tek silinir."],
    ["tut_shop_cards", "Dükkânda dört kart çıkar. Yenile düğmesi yeni bir el dağıtır."],
    ["tut_hub_return", "Sefer bitince Arşiv Odası'na dön: mumlarını orada harca."]
  ];
  const pickTip = () => TIPS[Math.floor(Math.random() * TIPS.length)];

  /* -------------------------------------------------------------- splash */
  function splash() {
    let seen = false; try { seen = sessionStorage.getItem("ls-splash") === "1"; } catch (_) {}
    if (seen || navigator.webdriver) return;
    try { sessionStorage.setItem("ls-splash", "1"); } catch (_) {}
    const s = el("div", "studio-splash", `<i style="background-image:url('${art("sys_splash_studio")}')"></i><span>Lexicon Survivors</span>`);
    document.body.append(s);
    const end = () => { s.classList.add("is-out"); setTimeout(() => s.remove(), 600); };
    s.addEventListener("pointerdown", end);
    setTimeout(end, reduced() ? 400 : 1700);
  }

  /* ------------------------------------------------------------- credits */
  function credits() {
    const nav = document.querySelector(".errata-masthead nav");
    if (!nav || nav.querySelector("[data-credits]")) return;
    const b = el("button", "", "Jenerik"); b.type = "button"; b.dataset.credits = "";
    nav.append(b);
    b.addEventListener("click", () => {
      const o = el("div", "credits-roll", `<i class="credits-bg" style="background-image:url('${art("sys_credits_bg")}')"></i>
        <div class="credits-track">
          <h2>Lexicon Survivors</h2><p class="credits-sub">The Last Errata</p>
          <h3>Bir kütüphane, bir gece, son düzeltme</h3>
          <dl>
            <dt>Oyun, tasarım ve yapım</dt><dd>Lexicon Survivors ekibi</dd>
            <dt>Sözcük bankası</dt><dd>FreeDict İngilizce–Türkçe sözlüğü (CC BY-SA 4.0)<br>Words-CEFR-Dataset, Maximax67 (MIT)<br>Octanove Vocabulary Profile C1/C2 (CC BY-SA 4.0)</dd>
            <dt>Yazı tipleri</dt><dd>Grenze, Grenze Gotisch, Alegreya, IBM Plex (SIL Open Font License)</dd>
            <dt>Teşekkür</dt><dd>Gece yarısı kütüphanede kalan bütün kâtiplere</dd>
          </dl>
          <p class="credits-end">Son sayfa henüz yazılmadı.</p>
        </div>
        <button type="button" class="btn credits-close">Kapat ×</button>`);
      document.body.append(o);
      const close = () => { o.classList.add("is-out"); setTimeout(() => o.remove(), 400); document.removeEventListener("keydown", onKey, true); };
      const onKey = e => { if (e.key === "Escape") { e.stopImmediatePropagation(); close(); } };
      document.addEventListener("keydown", onKey, true);
      o.querySelector(".credits-close").addEventListener("click", close);
      o.querySelector(".credits-close").focus({ preventScroll: true });
    });
  }

  /* ------------------------------------------------------- loading veil */
  function loadingVeil() {
    const start = document.getElementById("start-game-btn");
    start?.addEventListener("click", () => {
      if (navigator.webdriver) return;
      const [img, text] = pickTip();
      const v = el("div", "loading-veil", `<i class="lv-art" style="background-image:url('${art(img)}')"></i>
        <div class="lv-copy"><span class="lv-spin" style="background-image:url('${art("sys_loading_spinner")}')"></span><div><small>KÜTÜPHANE HAZIRLANIYOR</small><p></p></div></div>`);
      v.querySelector("p").textContent = text;
      document.body.append(v);
      const begun = performance.now();
      const wait = () => {
        const ready = typeof state !== "undefined" && state.is_wave_active;
        if ((ready && performance.now() - begun > 900) || performance.now() - begun > 6000) { v.classList.add("is-out"); setTimeout(() => v.remove(), 500); return; }
        requestAnimationFrame(wait);
      };
      requestAnimationFrame(wait);
    }, true);
  }

  /* ---------------------------------------------------- shop tip card */
  function shopTip() {
    const shop = document.getElementById("shop-screen");
    const rail = shop?.querySelector(".shop-rail");
    if (!rail) return;
    const card = el("figure", "shop-tip", `<i></i><figcaption><small>KÂTİBİN NOTU</small><span></span></figcaption>`);
    rail.append(card);
    const fill = () => { const [img, text] = pickTip(); card.querySelector("i").style.backgroundImage = `url("${art(img)}")`; card.querySelector("span").textContent = text; card.classList.remove("is-in"); void card.offsetWidth; card.classList.add("is-in"); };
    new MutationObserver(() => { if (shop.style.display !== "none") fill(); }).observe(shop, { attributes: true, attributeFilter: ["style"] });
  }

  /* --------------------------------------------- motion: ink ripples */
  document.addEventListener("pointerdown", event => {
    if (reduced()) return;
    const target = event.target.closest?.(".btn, .toc-item, .tab-btn, .title-mode, .meta-mode, .hub-station, .quiz-opt-btn, .meta-offer, .meta-lane, .choice-card");
    if (!target) return;
    const r = target.getBoundingClientRect();
    const blot = el("i", "ink-ripple");
    const size = Math.max(r.width, r.height) * 1.6;
    Object.assign(blot.style, { left: `${event.clientX - size / 2}px`, top: `${event.clientY - size / 2}px`, width: `${size}px`, height: `${size}px` });
    document.body.append(blot);
    setTimeout(() => blot.remove(), 620);
  }, { passive: true });

  /* ------------------------- motion: an ink curtain for big screens */
  function curtain() {
    const veil = el("div", "ink-curtain"); veil.setAttribute("aria-hidden", "true"); document.body.append(veil);
    const play = () => { if (reduced()) return; veil.classList.remove("on"); void veil.offsetWidth; veil.classList.add("on"); };
    const watch = (id, visible) => {
      const node = document.getElementById(id); if (!node) return;
      let was = visible(node);
      new MutationObserver(() => { const now = visible(node); if (now && !was) play(); was = now; }).observe(node, { attributes: true, attributeFilter: ["style", "hidden"] });
    };
    const shown = n => !n.hidden && n.style.display !== "none";
    ["shop-screen", "game-over-screen", "story-intermission"].forEach(id => watch(id, shown));
  }

  /* ----------------------- motion: health bar trail and HUD pulses */
  function hudMotion() {
    const fill = document.getElementById("hp-fill");
    if (fill && !document.getElementById("hp-trail")) {
      const trail = el("div", "hp-trail"); trail.id = "hp-trail"; fill.before(trail);
      let lastPct = 100, timer = 0;
      new MutationObserver(() => {
        const pct = parseFloat(fill.style.width) || 0;
        if (pct < lastPct - 0.5) { clearTimeout(timer); trail.style.transition = "none"; trail.style.width = `${lastPct}%`;
          timer = setTimeout(() => { trail.style.transition = "width .55s cubic-bezier(.4,0,.2,1)"; trail.style.width = `${pct}%`; }, 260);
          fill.parentElement.classList.remove("is-hit"); void fill.offsetWidth; fill.parentElement.classList.add("is-hit"); }
        else { trail.style.transition = "none"; trail.style.width = `${pct}%`; }
        lastPct = pct;
      }).observe(fill, { attributes: true, attributeFilter: ["style"] });
    }
    for (const id of ["ink-value", "kill-value"]) {
      const node = document.getElementById(id); if (!node) continue;
      let last = node.textContent;
      new MutationObserver(() => { if (node.textContent === last) return; last = node.textContent; const host = node.parentElement; host.classList.remove("is-pulse"); void host.offsetWidth; host.classList.add("is-pulse"); })
        .observe(node, { childList: true, characterData: true, subtree: true });
    }
  }

  /* ----------------------------------- title: no numerals in the menu */
  function titleNumerals() { document.querySelectorAll("#errata-landing .toc-num").forEach(n => n.remove()); }

  function init() { splash(); credits(); loadingVeil(); shopTip(); curtain(); hudMotion(); titleNumerals(); setTimeout(titleNumerals, 300); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();

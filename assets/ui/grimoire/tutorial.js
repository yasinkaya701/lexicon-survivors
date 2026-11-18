/* Kâtibin Rehberi — the first-run tutorial.
 *
 * Shown once, right after the very first "Oyuna başla", over a paused arena.
 * Every step can be skipped ("Geç" or Esc) and the choice is remembered, so
 * it never nags. It can be replayed from the guide in the book or the pause
 * menu. Presentation only: the only game state it touches is a pause flag the
 * game loop reads (GrimoireTutorial.active).
 */
(() => {
  const KEY = "lexicon_tutorial_seen_v1";
  const art = id => window.GrimoireSprites?.src(id) || "";
  const touch = () => ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);

  const STEPS = [
    { art: "tut_move", kicker: "I · HAREKET", title: "Kalem hep hareket halinde",
      body: () => touch()
        ? "Sol alttaki hareket koluyla düşmanlardan uzaklaş. Silahın kendiliğinden ateş eder; sen sadece yaşa."
        : "WASD veya ok tuşlarıyla düşmanlardan uzaklaş. Silahın kendiliğinden ateş eder; sen sadece yaşa.",
      keys: () => touch() ? [] : ["W", "A", "S", "D"] },
    { art: "tut_auto_attack", kicker: "II · SİLAHLAR", title: "Silahın kendi kendine yazar",
      body: () => "Hedefi sen seçmezsin, en yakın düşmana ateş eder. Birden fazla silahın varsa Q / E ya da 1–6 ile değiştir.",
      keys: () => touch() ? [] : ["Q", "E", "1–6"] },
    { art: "tut_dash", kicker: "III · KAÇIŞ", title: "Sıkıştığında sıçra",
      body: () => touch()
        ? "Sağ alttaki YETENEK düğmesi etkin yeteneğini kullanır. Bekleme süresi dolana kadar bir daha kullanamazsın."
        : "Space, Shift ya da sağ tık etkin yeteneğini kullanır; kalabalıktan çıkmanın en hızlı yolu. Bekleme süresi düğmenin altında görünür.",
      keys: () => touch() ? [] : ["SPACE"] },
    { art: "tut_gadget", kicker: "IV · GEREÇ", title: "Her kâtibin kendi gereci var",
      body: () => "Gerecin her karakterde farklıdır: kalkan, sıçrayış ya da tuzak. Arenadaki ocak, kürsü ve çan gibi nesnelere yaklaşınca R ile etkileş.",
      keys: () => touch() ? [] : ["R"] },
    { art: "tut_pickup_ink", kicker: "V · MÜREKKEP", title: "Mürekkep damlalarını topla",
      body: () => "Düşen her damla mürekkep demek. Mürekkep, dalgalar arasında silah, gereç ve kelime kartı almak için harcanır; ne kadar toplarsan o kadar güçlenirsin.",
      keys: () => [] },
    { art: "tut_shop_cards", kicker: "VI · SCRIPTORIUM", title: "Dalga bitince dükkân açılır",
      body: () => "Kelime kartları, silahlar, gereçler ve yadigârlar burada. Sonraki dalga düğmesine basana kadar acele yok; dükkândayken oyun durur.",
      keys: () => [] },
    { art: "tut_quiz_answer", kicker: "VII · KELİME SINAVI", title: "Doğru cevap yarı fiyatına",
      body: () => "Kartı almadan önce kelimenin anlamı sorulur. Doğru bilirsen kart yarı fiyatına gelir, etkisi %50 artar ve 25 can yenilenir. Yanlışta tam fiyat ödersin ve kelime hata defterine yazılır.",
      keys: () => [] },
    { art: "tut_weapon_merge", kicker: "VIII · BİRLEŞTİRME", title: "İki aynı silah, bir güçlü silah",
      body: () => touch()
        ? "Envanterde aynı silahın aynı seviyedeki iki kopyasını birleştirerek geliştir."
        : "I ile envanteri aç. Aynı silahın aynı seviyedeki iki kopyasını birleştirerek bir üst seviyeye çıkar.",
      keys: () => touch() ? [] : ["I"] },
    { art: "tut_boss_sentence", kicker: "IX · BOSS", title: "Her beşinci dalgada bir hüküm",
      body: () => "Beşinci dalgada ve her beşinde bir boss gelir. Cevaplamadığın ya da yanlış bildiğin kelimeler boss turunda geri döner, her turda biraz daha güçlü.",
      keys: () => [] },
    { art: "tut_hub_return", kicker: "X · ARŞİV ODASI", title: "Düşersen kütüphaneye dönersin",
      body: () => "Sefer bittiğinde Arşiv Odası'nda kalıcı geliştirmeler, yetenek ağacı ve başarımlar seni bekler. Bu rehbere her zaman Nasıl oynanır'dan dönebilirsin.",
      keys: () => [] }
  ];

  let root = null, index = 0, resolve = null, restore = null;
  const api = { active: false, seen, open, close, STEPS };

  function seen() { try { return localStorage.getItem(KEY) === "1"; } catch (_) { return false; } }
  function remember() { try { localStorage.setItem(KEY, "1"); } catch (_) { /* private mode */ } }

  function build() {
    root = document.createElement("section");
    root.id = "grimoire-tutorial";
    root.className = "grimoire-tutorial";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "gt-title");
    root.innerHTML = `
      <div class="gt-folio">
        <button type="button" class="gt-skip" data-gt="skip">Geç <kbd>Esc</kbd></button>
        <figure class="gt-plate"><img alt=""><figcaption class="gt-keys" aria-hidden="true"></figcaption></figure>
        <div class="gt-copy">
          <span class="gt-kicker"></span>
          <h2 id="gt-title"></h2>
          <p class="gt-body"></p>
          <p class="gt-first" hidden>İlk seferin: istediğin an <b>Geç</b> diyebilirsin; bir daha sormayacağım.</p>
        </div>
        <footer class="gt-foot">
          <ol class="gt-dots" aria-hidden="true"></ol>
          <span class="gt-count"></span>
          <button type="button" class="btn" data-gt="back">← Geri</button>
          <button type="button" class="btn primary" data-gt="next">İleri →</button>
        </footer>
      </div>`;
    document.body.append(root);
    root.querySelector(".gt-dots").replaceChildren(...STEPS.map(() => document.createElement("li")));
    root.addEventListener("click", event => {
      const action = event.target.closest("[data-gt]")?.dataset.gt;
      if (action === "skip") finish(true);
      else if (action === "back") go(index - 1);
      else if (action === "next") go(index + 1);
    });
    // The arena keys (Space, Shift, Q...) must not reach the game underneath.
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", event => { if (api.active) event.stopImmediatePropagation(); }, true);
  }

  function onKey(event) {
    if (!api.active) return;
    const key = event.key;
    event.stopImmediatePropagation();
    if (key === "Escape") { event.preventDefault(); finish(true); }
    else if (key === "ArrowRight" || key === "Enter" || key === " ") {
      // A focused button handles its own Enter / Space.
      if (event.target.closest?.("button") && key !== "ArrowRight") return;
      event.preventDefault(); go(index + 1);
    } else if (key === "ArrowLeft") { event.preventDefault(); go(index - 1); }
    else if (key === "Tab") { event.stopPropagation(); }
    else event.preventDefault();
  }

  function render() {
    const step = STEPS[index];
    const img = root.querySelector(".gt-plate img");
    img.src = art(step.art);
    img.hidden = !img.src;
    root.querySelector(".gt-kicker").textContent = step.kicker;
    root.querySelector("#gt-title").textContent = step.title;
    root.querySelector(".gt-body").textContent = step.body();
    const keys = step.keys();
    const caps = root.querySelector(".gt-keys");
    caps.replaceChildren(...keys.map(label => { const kbd = document.createElement("kbd"); kbd.textContent = label; return kbd; }));
    caps.hidden = !keys.length;
    root.querySelectorAll(".gt-dots li").forEach((dot, i) => { dot.className = i < index ? "is-done" : i === index ? "is-on" : ""; });
    root.querySelector(".gt-count").textContent = `${index + 1} / ${STEPS.length}`;
    root.querySelector('[data-gt="back"]').style.visibility = index ? "visible" : "hidden";
    const last = index === STEPS.length - 1;
    root.querySelector('[data-gt="next"]').textContent = last ? "Seferi başlat" : "İleri →";
    root.querySelector(".gt-first").hidden = !!seen() && !api.firstRun;
    const folio = root.querySelector(".gt-folio");
    folio.classList.remove("is-turn"); void folio.offsetWidth; folio.classList.add("is-turn");
  }

  function go(next) {
    if (next < 0) return;
    if (next >= STEPS.length) return finish(false);
    index = next;
    render();
  }

  function finish(skipped) {
    if (!api.active) return;
    api.active = false;
    remember();
    root.hidden = true;
    document.documentElement.classList.remove("gt-open");
    try { window.sounds?.playTone?.(skipped ? 320 : 560, "triangle", 0.07, 0.12); } catch (_) { /* audio not ready */ }
    const after = resolve; resolve = null;
    if (restore?.isConnected) restore.focus?.({ preventScroll: true });
    // Wake the loop the pause was holding.
    window.wakeGameLoop?.();
    after?.({ skipped });
  }

  /** Open the tutorial. Resolves when it is finished or skipped. */
  function open(options = {}) {
    if (!root) build();
    if (api.active) return Promise.resolve({ skipped: true });
    api.firstRun = !!options.firstRun;
    index = 0;
    restore = document.activeElement;
    api.active = true;
    root.hidden = false;
    document.documentElement.classList.add("gt-open");
    render();
    root.querySelector('[data-gt="next"]').focus({ preventScroll: true });
    return new Promise(done => { resolve = done; });
  }
  function close() { finish(true); }

  /** Called by the game right after the first wave of a run begins. */
  function onRunBegin() {
    if (seen()) return;
    open({ firstRun: true });
  }

  Object.assign(api, { onRunBegin });
  // Safety net: if a cached game.js lacks the startGame hook, notice the first
  // active wave ourselves.
  const watch = setInterval(() => {
    if (seen()) return clearInterval(watch);
    if (typeof state !== "undefined" && state.is_wave_active && !api.active) { clearInterval(watch); onRunBegin(); }
  }, 600);
  window.GrimoireTutorial = api;
})();

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

  const CHAPTERS = ["Temel", "Dükkân ve kelimeler", "Yol ve hazine", "Bosslar", "Modlar ve ilerleme"];
  const T = (ch, art, kicker, title, body, keys) => ({ ch, art, kicker, title, body: typeof body === "function" ? body : () => body, keys: keys || (() => []) });
  const K = list => () => touch() ? [] : list;
  const STEPS = [
    // ---- 0 · Temel
    T(0, "tut_move", "HAREKET", "Kalem hep hareket halinde",
      () => touch() ? "Sol alttaki hareket koluyla düşmanlardan uzaklaş. Silahın kendiliğinden ateş eder; sen sadece yaşa." : "WASD veya ok tuşlarıyla düşmanlardan uzaklaş. Silahın kendiliğinden ateş eder; sen sadece yaşa. Durmak ölümdür.", K(["W", "A", "S", "D"])),
    T(0, "tut_auto_attack", "SİLAHLAR", "Silahın kendi kendine yazar",
      "Hedefi sen seçmezsin; silah en yakın düşmana ateş eder. Dört silah yuvan var (yadigârla altıya çıkar). Q / E ya da 1–6 ile aktif silahı değiştir; her silahın kendi menzili ve ritmi vardır.", K(["Q", "E", "1–6"])),
    T(0, "tut_dash", "KAÇIŞ", "Sıkıştığında sıçra",
      () => touch() ? "Sağ alttaki YETENEK düğmesi etkin yeteneğini kullanır. Sıçrayış sırasında hasar almazsın; kırmızı çizgiden ve halkadan bu şekilde sıyrılırsın." : "Space, Shift ya da sağ tık etkin yeteneğini kullanır. Sıçrayış sırasında hasar almazsın; kırmızı çizgiden ve halkadan bu şekilde sıyrılırsın. Bekleme süresi düğmenin altında görünür.", K(["SPACE"])),
    T(0, "tut_gadget", "GEREÇ", "Her kâtibin kendi gereci var",
      "Gereç karaktere göre değişir: sıçrayış, kalkan, tuzak. Etkin yetenek yuvasında durur; hazır olunca HAZIR yazar. Kalıcı geliştirmelerle bekleme süresi kısalır.", () => []),
    T(0, "interact_brazier", "ARENA YAPILARI", "Arenadaki yapılar savaşı çevirir",
      () => (touch() ? "Bir yapıya yaklaşınca ekrandaki düğmeye dokun. " : "Bir yapıya yaklaşınca R'ye bas. ") + "Hazır yapıların üstünde ışık sütunu ve adı görünür. Her yapı kullanıldıktan sonra 24 saniyede yeniden hazır olur, yani bir dalgada defalarca kullanabilirsin. Hafıza İzi hariç: o dalga başına bir kez ve her dalga başka yerde belirir.", K(["R"])),
    T(0, "interact_resonance_bell", "ÇAN VE MANGAL", "Kalabalığı sersemlet, yak",
      "Arşiv Çanı: 440 birim içindeki düşmanları 2 saniye sersemletir ve yaralar; boss'ları kısa sersemletir. Kor Mangalı: yakındaki düşmanlara güçlü yangın hasarı verir, dalga ilerledikçe daha çok. İkisi de yakında düşman yoksa boşa harcanmaz.", () => []),
    T(0, "interact_illuminated_lectern", "KÜRSÜ VE KUYU", "Güçlen, iyileş",
      "Işıklı Kürsü: 14 saniye boyunca +%40 atış hızı ve +%20 kritik şansı verir; boss öncesi harika. Mürekkep Kuyusu: canının %30'unu yeniler. Canın doluysa kuyu çalışmaz, nesnenin üstünde nedeni yazar.", () => []),
    T(0, "interact_astral_astrolabe", "ASTROLAB VE HAFIZA İZİ", "Gerecini yenile, mürekkep topla",
      "Yıldız Astrolabı: gerecini anında yeniler, bir kalkan ve biraz can verir. Hafıza İzi: bol mürekkep ve karakter deneyimi verir, her dalgada başka yerde belirir; uzağa gidip alman gerekir. Susturan sözleşmeler ve lanetler yapıları kapatabilir.", () => []),
    T(0, "tut_pickup_ink", "MÜREKKEP", "Mürekkep damlalarını topla",
      "Düşmanlar mürekkep bırakır. Mürekkep dalga arasında silah, gereç, yadigâr ve kelime kartı almak için harcanır. Kırmızı damlalar can yeniler. Toplama menzilini geliştirmeler büyütür.", () => []),
    T(0, "tip_02", "DENEYİM", "Kâtibin seviyesi kalıcıdır",
      "Seferlerde kazandığın deneyim karakterini seviyelendirir ve yetenek puanı verir. Puanları Arşiv Odası'nda Lira'nın yetenek ağacında harcarsın; kalıcıdır, sefer bitince silinmez.", () => []),
    T(0, "tip_01", "DALGALAR", "Yüz dalga, her biri bir sayfa",
      "Üstteki sayaç dalganın kalan süresini gösterir. Süre dolunca dalga biter ve Scriptorium açılır. Hasar alınca ekran kenarı kızarır; canın azalınca çatlak sayfa kenarı belirir.", () => []),
    // ---- 1 · Dükkân ve kelimeler
    T(1, "tut_shop_cards", "SCRIPTORIUM", "Dalga bitince dükkân açılır",
      "Kelime kartları, silahlar, gereçler, yadigârlar, yetenek ağacı ve mürekkep pazarı sekmelerde. Dükkândayken oyun durur, acele yok. Yenile düğmesi yeni kartlar getirir ama mürekkep harcar.", () => []),
    T(1, "tut_quiz_answer", "KELİME SINAVI", "Doğru cevap yarı fiyatına",
      "Lexicon modunda bir kartı almadan önce kelimenin anlamı sorulur. Doğru bilirsen kart yarı fiyatına gelir, etkisi %50 artar ve 25 can yenilenir. Yanlışta tam fiyatı ödersin ve kelime hata defterine yazılır.", () => []),
    T(1, "screen_codex", "SEVİYE", "Sorular seninle büyür",
      "A1'den C2'ye kendi seviyeni seçersin. Her 10 soruda 8 ya da daha fazla doğru yaparsan seviye yükselir, 5'ten azında düşer. Böylece sorular ne çok kolay ne imkânsız olur. Kelimeleri Neris'in kelime kitabında tekrar okuyabilirsin.", () => []),
    T(1, "tip_09", "BİLİNMEYEN KELİMELER", "Bilmediğin kelime geri döner",
      "Yanlış bildiğin ve dükkânda hiç cevaplamadığın kelimeler unutulmaz: boss turunda düşman olarak geri gelir. Her boss turunda biraz daha güçlenirler. Onları yenmek kelimeyi öğrenmiş saymanın en eğlenceli yolu.", () => []),
    T(1, "screen_bestiary", "HATA DEFTERİ", "Yanlışların defterde birikir",
      () => touch() ? "Defter düğmesiyle hata defterini aç. Yanlış kelimeler orada anlamlarıyla durur; dükkânda 'Pekiştirme' kartı olarak karşına çıkar." : "M ile hata defterini aç. Yanlış kelimeler anlamlarıyla orada durur; sonraki dükkânlarda 'Pekiştirme' kartı olarak karşına çıkar ve doğru bilirsen defterden silinir.", K(["M"])),
    T(1, "tut_weapon_merge", "BİRLEŞTİRME", "İki aynı silah, bir güçlü silah",
      () => touch() ? "Envanterde aynı silahın aynı seviyedeki iki kopyasını birleştirerek bir üst seviyeye çıkar. En üst seviyede silah evrimleşir ve görünümü değişir." : "I ile envanteri aç. Aynı silahın aynı seviyedeki iki kopyasını birleştirerek bir üst seviyeye çıkar. En üst seviyede silah evrimleşir ve görünümü değişir.", K(["I"])),
    T(1, "tip_05", "SİNERJİLER", "Kelime türleri birlikte çalışır",
      "Aldığın kelimelerin türü sinerji açar: 3 sıfat +40 hareket hızı, 3 fiil +%28 hasar, 2 ön ek +2 delme, 3 dilbilgisi +%18 zırh. Bir kez açılır, banner'la haber verilir. Kartları seçerken türlere de bak.", () => []),
    // ---- 2 · Yol ve hazine
    T(2, "route_map_bg", "YOL HARİTASI", "Her beş dalgada yolunu seçersin",
      "Boss'tan sonra iki yol sunulur; her yol dört dalgalık düğümlerden oluşur: Çatışma, Elit, Hazine, Mola, Pazar ve Bilinmeyen. Sonunda yine bir Bekçi (boss) var. Üstteki rozet bulunduğun düğümü gösterir.", () => []),
    T(2, "route_node_treasure", "HAZİNE", "Dalga sonunda sandık açılır",
      "Hazine düğümünde ve her boss'tan sonra animasyonlu bir sandık açılır; açınca dükkâna geçersin. Lexicon'da mürekkep ya da bir yadigâr seçersin; Errata'da iki lanetli yadigâr arasından seçersin. Hazineyi planlayarak yol seçmek büyük güç kazandırır.", () => []),
    T(2, "route_node_elite", "ELİT", "Zor dalga, bol mürekkep",
      "Elit düğümünde seçkin düşmanlar çıkar ve mürekkep ×1,5 olur. Hasım maskesi takan düşman daha da güçlüdür ama altı kat mürekkep bırakır. Gücün yetiyorsa risk al.", () => []),
    T(2, "route_node_rest", "MOLA VE PAZAR", "Nefes al, ucuza al",
      "Mola dalgası başında canının %30'unu yeniler. Pazar düğümünden sonraki dükkânda her şey %25 ucuzdur. Bilinmeyen düğüm dalga başında rastgele bir türe dönüşür.", () => []),
    T(2, "tip_10", "YADİGÂRLAR VE GEREÇLER", "Kalıcı güçler, bu sefere özel",
      "Yadigârlar can, zırh, silah yuvası gibi etkileri sefer boyunca verir. Gereçler etkin yetenek yuvanı doldurur. İkisini de dükkândan ya da hazineden alırsın; sefer bitince kaybolurlar.", () => []),
    // ---- 3 · Bosslar
    T(3, "boss_red_inspector_portrait", "BOSS", "Her beşinci dalgada bir bekçi",
      "5, 10, 15 ... dalgalarda bir boss gelir; toplam yirmi tane, hepsinin kendi adı ve hikâyesi var. Boss'a ulaşınca kütüphanenin bölümü değişir; her yirmi beş dalgada yeni bir kanat açılır.", () => []),
    T(3, "tip_07", "SALDIRILAR", "Kırmızı işaret, ardından darbe",
      "Boss hamleleri önceden yerde belirir: kırmızı çizgi yönü, halka alanı gösterir. İşarete bakıp yandan çık ya da sıçra. Her boss imza hamlesini yapar ama zamanla yelpaze, paralel şerit ve düşen mühür gibi yeni hamleler ekler.", () => []),
    T(3, "fx_boss_phase", "EVRELER", "Canı azaldıkça sertleşir",
      "Boss canı %70 ve %35'e inince yeni evreye girer: daha hızlı olur, hamleleri sıklaşır ve yeni desenler açar. Son evrede öfkelenir; bu evrede mürekkep ve sıçrayış bekleme süreni hazır tut.", () => []),
    T(3, "tut_boss_sentence", "HATA YANKILARI", "Cevaplamadığın kelimeler boss'la gelir",
      "Boss turunda geri dönen kelime yankıları üzerinde kelimeyi taşır. Yankıları öldürmek boss'a ulaşmadan önce ortalığı temizler. Çok kelime biriktirdiysen boss turu kalabalık olur; dükkânda kelimeleri cevaplamak bunu azaltır.", () => []),
    // ---- 4 · Modlar ve ilerleme
    T(4, "mode_lexicon_card", "LEXICON", "Kelime seferi",
      "Varsayılan mod: kartlar sınavla açılır, doğru cevap yarı fiyat ve +%50 güç. İngilizce öğrenirken oynamanın ana yolu bu.", () => []),
    T(4, "mode_errata_card", "ERRATA", "Saf savaş",
      "Sınav yok, kartları doğrudan alırsın. Bunun yerine 'mührü kır': altın bölgede vurursan yarı fiyata +%50 güç. Elitler lanet taşır, hasım adlı güçlü düşmanlar çıkar ve lanetli yadigârlar hem güç hem bedel getirir.", () => []),
    T(4, "mode_endless_card", "SONSUZ", "Kapanmayan kitap",
      "25. dalgaya ulaşınca açılır. 100. dalgadan sonra devam eder; bosslar yeniden gelir ve her dalga daha sert olur. Ne kadar derine inebileceğini gör.", () => []),
    T(4, "heat_red_ink", "KIRMIZI SÖZLEŞMELER", "İsteyerek zorlaştır",
      "İlk seferini bitirince açılır. Düşman hasarı, canı, hızı gibi on koşuldan istediklerini seçersin; her sözleşme puanı kazanılan mühür mumunu %10 artırır.", () => []),
    T(4, "mat_wax_seal", "MÜHÜR MUMU", "Kalıcı para birimi",
      "Her sefer sonunda ve başarım açınca mühür mumu kazanırsın. Arşiv Odası'ndaki Atölye Tezgâhı'nda on iki kalıcı geliştirme alırsın: can, zırh, kritik, mürekkep, başlangıç silahı, diriliş ve daha fazlası.", () => []),
    T(4, "screen_hub", "ARŞİV ODASI", "Seferler arası evin",
      "Neris kelime kitabını, Sessiz Mekanik geliştirmeleri, Lira yetenek ağacını, Tavi canavarları, Sera başarımları, Yel kanat haritasını, Mürekkep Çocuk arşiv notlarını tutar. Kırmızı Masa, 5. dalgayı geçince açılır. Demir Kapı yeni sefere çıkar.", () => []),
    T(4, "screen_settings", "KONTROLLER", "Oynarken işine yarayanlar",
      () => touch() ? "Duraklat düğmesi menüyü açar. Ayarlardan hız, yazı boyutu, hareket azaltma ve ses seçeneklerini değiştirebilirsin." : "Esc duraklatır. [ ve ] oyun hızını azaltır ya da artırır, 0 hızı sıfırlar. Z ve X yakınlaştırır / uzaklaştırır. Ayarlardan yazı boyutu, hareket azaltma ve sesi değiştirebilirsin.", K(["ESC", "[ ]", "Z X"]))
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
        <nav class="gt-chapters" aria-label="Bölümler"></nav>
        <footer class="gt-foot">
          <ol class="gt-dots" aria-hidden="true"></ol>
          <span class="gt-count"></span>
          <button type="button" class="btn" data-gt="back">← Geri</button>
          <button type="button" class="btn primary" data-gt="next">İleri →</button>
        </footer>
      </div>`;
    document.body.append(root);
    root.querySelector(".gt-dots").replaceChildren(...STEPS.map(() => document.createElement("li")));
    root.querySelector(".gt-chapters").replaceChildren(...CHAPTERS.map((name, i) => {
      const tab = document.createElement("button"); tab.type = "button"; tab.dataset.chapter = i; tab.textContent = name; return tab;
    }));
    root.addEventListener("click", event => {
      const chapter = event.target.closest("[data-chapter]");
      if (chapter) return go(STEPS.findIndex(step => step.ch === Number(chapter.dataset.chapter)));
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
    root.querySelector(".gt-kicker").textContent = `${step.kicker}`;
    root.querySelectorAll(".gt-chapters button").forEach(tab => tab.classList.toggle("is-on", Number(tab.dataset.chapter) === step.ch));
    root.querySelector("#gt-title").textContent = step.title;
    root.querySelector(".gt-body").textContent = step.body();
    const keys = step.keys();
    const caps = root.querySelector(".gt-keys");
    caps.replaceChildren(...keys.map(label => { const kbd = document.createElement("kbd"); kbd.textContent = label; return kbd; }));
    caps.hidden = !keys.length;
    root.querySelectorAll(".gt-dots li").forEach((dot, i) => { dot.className = i < index ? "is-done" : i === index ? "is-on" : ""; dot.dataset.ch = STEPS[i].ch; });
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

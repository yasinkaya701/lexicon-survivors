/* Arşiv Odası — the hub between runs.
 *
 * A painted room with a row of stations, each kept by an NPC. Stations open
 * systems the game already has (word book, armory, bestiary, skill tree,
 * errata notebook, records) plus two hub-only sheets: Yel's wing map and
 * Ink Child's lore wall (20 notes, one per five waves reached, using the
 * selected hero's own story text). Progress comes from the lifetime record
 * the game writes at the end of every run (lexicon_archive_record).
 */
(() => {
  const G = () => window.GrimoireSprites;
  const art = id => G()?.src(id) || "";

  function record() {
    try { return JSON.parse(localStorage.getItem("lexicon_archive_record") || "{}") || {}; } catch (_) { return {}; }
  }

  // Station order follows the room left → right; the exit door closes the row.
  const STATIONS = [
    { id: "neris_hearth", npc: "neris", name: "Ocak Başı", keeper: "Neris", role: "Kelime kitabı", open: () => clickHidden('[data-open-book="codex"]') },
    { id: "mechanic_bench", npc: "silent_mechanic", name: "Atölye Tezgâhı", keeper: "Sessiz Mekanik", role: "Kalıcı geliştirmeler", open: openWorkshop },
    { id: "lira_training", npc: "lira", name: "İdman Köşesi", keeper: "Lira", role: "Yetenek ağacı", open: openSkills },
    { id: "redactor_desk", npc: "red_redactor", name: "Kırmızı Masa", keeper: "Kırmızı Redaktör", role: "Hata defteri", unlockWave: 5,
      lockedNote: "Kırmızı Müfettiş'i yenince masasına döner.", open: () => window.toggleMistakesModal?.(true) },
    { id: "tavi_apothecary", npc: "tavi", name: "Eczane Rafı", keeper: "Tavi", role: "Dil canavarları", open: () => clickHidden('[data-open-book="bestiary"]') },
    { id: "sera_post", npc: "sera", name: "Postane", keeper: "Sera", role: "Başarımlar ve kayıtlar", open: openPost },
    { id: "yel_map", npc: "yel", name: "Harita Masası", keeper: "Yel", role: "Kanat haritası", open: openMap },
    { id: "ink_child_post", npc: "ink_child", name: "Not Duvarı", keeper: "Mürekkep Çocuk", role: "Arşiv notları", open: openLore },
    { id: "exit_door", npc: null, name: "Demir Kapı", keeper: "", role: "Sefere çık", open: depart }
  ];
  // What each keeper says when the player walks up: [mood, line].
  const LINES = {
    neris: [["smile", "Kelimeler yine ocağın başında toplandı. Hangisini hatırlamak istersin?"], ["neutral", "Kitap açık. Okuduğun her ad, gece biraz daha kısalır."]],
    silent_mechanic: [["neutral", "…"], ["smile", "(Tezgâha bir avuç mum döker ve sana bakar.)"]],
    lira: [["angry", "Kolların hâlâ titriyor. Bir tur daha."], ["smile", "İyi. Şimdi aynısını gözün kapalı yap."]],
    red_redactor: [["neutral", "Hatalarını bana getir. Kırmızı mürekkep affetmez ama unutmaz da."], ["angry", "Bu defter yine dolmuş."]],
    tavi: [["neutral", "Raflardaki her kavanozda bir canavarın adı var. Dokunma, oku."], ["shock", "Bu sonuncusu kavanozu çatlatmış!"]],
    sera: [["smile", "Sana mektup yok, ama mühürlerin burada."], ["neutral", "Her sefer bir kayıt bırakır. Ben hepsini saklarım."]],
    yel: [["neutral", "Harita her gece değişiyor. Yolları ezberleme, oku."], ["smile", "Rüzgâr bu gece sol koridordan esiyor."]],
    ink_child: [["sad", "Duvardaki notlar silinmeye başladı. Biraz daha ilerlersen yenileri belirir."], ["smile", "Bak! Yeni bir not!"]]
  };
  const WINGS = [
    ["reading_hall", "I · Okuma Salonu"], ["word_corridor", "II · Kelime Dehlizi"],
    ["observatory", "III · Yıldız Gözlemevi"], ["last_page", "IV · Son Sayfa"]
  ];

  let root = null, sheet = null, opener = null;

  // The book, records and errata notebook open above the hub (higher layer),
  // so closing them returns the player to the room.
  function clickHidden(selector) {
    document.querySelector(selector)?.click();
  }
  function openArmory() {
    clickHidden('[data-open-book="codex"]');
    requestAnimationFrame(() => document.querySelector('#errata-book [data-codex-category="weapons"]')?.click());
  }
  function depart() {
    close();
    document.querySelector("#errata-landing .toc-item")?.click();
  }

  function roomArt(rec) {
    if ((rec.victories || 0) > 0) return art("screen_hub_restored");
    if ((rec.best_wave || 0) >= 50) return art("screen_hub_erased_50");
    return art("screen_hub");
  }

  function build() {
    root = document.createElement("section");
    root.id = "grimoire-hub";
    root.className = "screen-overlay grimoire-hub";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "grimoire-hub-title");
    root.innerHTML = `
      <div class="hub-room" aria-hidden="true"></div>
      <header class="hub-head">
        <div>
          <span class="errata-kicker">KAYIP KENARLAR KÜTÜPHANESİ · SEFERLER ARASI</span>
          <h2 id="grimoire-hub-title">Arşiv Odası</h2>
          <p class="hub-record"></p>
        </div>
        <button type="button" class="btn hub-back">← Ana menü</button>
      </header>
      <ul class="hub-stations"></ul>
      <section class="hub-sheet" hidden aria-live="polite">
        <header><h3 class="hub-sheet-title"></h3><button type="button" class="btn hub-sheet-close">Kapat</button></header>
        <div class="hub-sheet-voice" hidden><img alt=""><div><b></b><p></p></div></div>
        <div class="hub-sheet-body"></div>
      </section>`;
    document.body.append(root);
    sheet = root.querySelector(".hub-sheet");
    root.querySelector(".hub-back").addEventListener("click", close);
    root.querySelector(".hub-sheet-close").addEventListener("click", () => { sheet.hidden = true; refreshRecord(); });
    root.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      if (!sheet.hidden) sheet.hidden = true; else close();
    });
  }

  function renderStations(rec) {
    const list = root.querySelector(".hub-stations");
    list.replaceChildren(...STATIONS.map((station, index) => {
      const locked = station.unlockWave && (rec.best_wave || 0) < station.unlockWave;
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = `hub-station${locked ? " is-locked" : ""}`;
      button.dataset.station = station.id;
      button.disabled = !!locked;
      button.style.setProperty("--delay", `${index * 45}ms`);
      const npcStrip = station.npc ? art(`npc_${station.npc}_hub_idle`) : "";
      button.innerHTML = `
        <span class="hub-station-art"><img src="${art(`hub_${station.id}`)}" alt="" loading="lazy">${npcStrip ? `<span class="hub-npc" style="background-image:url('${npcStrip}')"></span>` : ""}</span>
        <span class="hub-station-copy"><b>${station.name}</b>${station.keeper ? `<small>${station.keeper}</small>` : ""}<em>${locked ? station.lockedNote : station.role}</em></span>`;
      button.setAttribute("aria-label", `${station.name}${station.keeper ? ` · ${station.keeper}` : ""} · ${locked ? station.lockedNote : station.role}`);
      if (!locked) button.addEventListener("click", () => station.open());
      item.append(button);
      return item;
    }));
  }

  function showSheet(title, nodes, npc) {
    root.querySelector(".hub-sheet-title").textContent = title;
    const voice = root.querySelector(".hub-sheet-voice");
    const lines = npc && LINES[npc];
    voice.hidden = !lines;
    if (lines) {
      const [mood, line] = lines[Math.floor(Math.random() * lines.length)];
      voice.querySelector("img").src = G()?.npcFace(npc, mood) || "";
      voice.querySelector("b").textContent = STATIONS.find(st => st.npc === npc)?.keeper || "";
      voice.querySelector("p").textContent = line;
      voice.classList.remove("is-in"); void voice.offsetWidth; voice.classList.add("is-in");
    }
    root.querySelector(".hub-sheet-body").replaceChildren(...nodes);
    sheet.hidden = false;
    sheet.querySelector(".hub-sheet-close").focus({ preventScroll: true });
  }

  function openMap() {
    const best = record().best_wave || 0;
    const rows = WINGS.map(([key, label], i) => {
      const from = i * 25 + 1, to = (i + 1) * 25;
      const progress = Math.max(0, Math.min(1, (best - from + 1) / 25));
      const row = document.createElement("article");
      row.className = `hub-wing${progress <= 0 ? " is-dark" : ""}`;
      row.innerHTML = `<img src="${art(`screen_chapter_${key}`)}" alt="" loading="lazy">
        <div><b>${label}</b><small>Dalga ${from}–${to}</small>
        <span class="hub-wing-bar" role="progressbar" aria-valuemin="0" aria-valuemax="25" aria-valuenow="${Math.round(progress * 25)}"><i style="width:${progress * 100}%"></i></span>
        <em>${progress <= 0 ? "Henüz girilmedi" : progress >= 1 ? "Kanat aşıldı" : `${Math.round(progress * 25)} / 25 dalga`}</em></div>`;
      return row;
    });
    showSheet("Yel'in Kanat Haritası", rows, "yel");
  }

  function openLore() {
    const best = record().best_wave || 0;
    const hero = typeof state !== "undefined" ? state.selected_char : "inky";
    const episodes = (typeof STORY_ARC_DATA !== "undefined" && STORY_ARC_DATA?.characters?.[hero]?.episodes) || [];
    const grid = document.createElement("div");
    grid.className = "hub-lore";
    for (let n = 1; n <= 20; n++) {
      const open = best >= n * 5;
      const episode = episodes[n - 1];
      const note = document.createElement("article");
      note.className = `hub-note${open ? "" : " is-sealed"}`;
      note.innerHTML = `<img src="${art(`lore_note_${String(n).padStart(2, "0")}`)}" alt="" loading="lazy">
        <b>${open && episode ? episode.title : `Not ${n}`}</b>
        <p>${open && episode ? episode.scene : `Dalga ${n * 5}'e ulaşınca açılır.`}</p>`;
      grid.append(note);
    }
    showSheet("Arşiv Notları", [grid], "ink_child");
  }

  function openWorkshop() {
    const sheetNode = window.GrimoireMeta?.upgradesSheet();
    if (!sheetNode) return openArmory();
    showSheet("Atölye · Kalıcı Geliştirmeler", [sheetNode], "silent_mechanic");
    refreshRecord();
  }
  function openPost() {
    const sheetNode = window.GrimoireMeta?.achievementsSheet();
    if (!sheetNode) return clickHidden("#title-leaderboard-btn");
    const records = document.createElement("button");
    records.type = "button"; records.className = "btn hub-records-btn"; records.textContent = "Sefer kayıtlarını aç →";
    records.addEventListener("click", () => clickHidden("#title-leaderboard-btn"));
    showSheet("Postane · Başarımlar", [records, sheetNode], "sera");
  }
  function openSkills() {
    const holder = document.createElement("div");
    holder.className = "hub-skills";
    if (typeof renderCharacterSkillTree === "function") renderCharacterSkillTree(holder);
    showSheet("İdman · Yetenek Ağacı", [holder], "lira");
  }

  function open(from) {
    if (!root) build();
    const rec = record();
    opener = from || document.activeElement;
    root.querySelector(".hub-room").style.backgroundImage = `url("${roomArt(rec)}")`;
    refreshRecord(rec);
    renderStations(rec);
    sheet.hidden = true;
    root.hidden = false;
    root.querySelector(".hub-station:not([disabled])")?.focus({ preventScroll: true });
  }

  function refreshRecord(rec = record()) {
    const wax = window.GrimoireMeta ? ` · Mühür mumu: ${window.GrimoireMeta.wax}` : "";
    root.querySelector(".hub-record").textContent = rec.runs
      ? `En derin sefer: Dalga ${rec.best_wave || 0} · Sefer: ${rec.runs} · Zafer: ${rec.victories || 0}${wax}`
      : `İlk seferini bekleyen bir oda. Kapıdan çık, kütüphaneyi geri yaz.${wax}`;
  }
  function close() {
    renderTitleStatus();
    if (!root || root.hidden) return;
    root.hidden = true;
    sheet.hidden = true;
    if (opener?.isConnected) opener.focus?.({ preventScroll: true });
  }

  // Entry points: a menu item on the title page and "Kütüphaneye dön" after a run.
  function addMenuEntry() {
    const toc = document.querySelector("#errata-landing .toc-item")?.parentElement;
    if (!toc || toc.querySelector("#title-hub-btn")) return;
    const count = toc.querySelectorAll(".toc-item").length;
    const numerals = ["I.", "II.", "III.", "IV.", "V.", "VI."];
    const button = document.createElement("button");
    button.className = "toc-item";
    button.id = "title-hub-btn";
    button.type = "button";
    button.innerHTML = `<span class="toc-num">${numerals[count] || ""}</span><span class="toc-label">Arşiv odası</span>`;
    button.addEventListener("click", () => open(button));
    // The room is the heart between runs: right under "Sefere çık".
    toc.querySelector(".landing-begin")?.after(button);
    // Each choice wears its station's painted icon.
    const icons = { "errata-begin": "exit_door", "title-hub-btn": "mechanic_bench", "title-leaderboard-btn": "sera_post" };
    toc.querySelectorAll(".toc-item").forEach((item, i) => {
      const key = icons[item.id] || { codex: "neris_hearth", bestiary: "tavi_apothecary" }[item.dataset.openBook];
      if (key && !item.querySelector(".toc-icon")) item.insertAdjacentHTML("afterbegin", `<img class="toc-icon" src="${art(`hub_${key}_icon`)}" alt="">`);
      const num = item.querySelector(".toc-num"); if (num) num.textContent = ["I.", "II.", "III.", "IV.", "V.", "VI."][i] || "";
      item.style.setProperty("--n", i);
    });
    renderTitleStatus();
  }
  // A small plaque on the title: what the archive remembers.
  function renderTitleStatus() {
    const copy = document.querySelector("#errata-landing .landing-nav");
    if (!copy) return;
    let plaque = document.getElementById("title-status");
    if (!plaque) { plaque = document.createElement("div"); plaque.id = "title-status"; plaque.className = "title-status"; copy.append(plaque); }
    const rec = record();
    const meta = window.GrimoireMeta;
    const achDone = meta ? Object.keys(meta._debug.store().achievements || {}).length : 0;
    const achAll = meta ? meta._debug.ACH.length : 0;
    plaque.innerHTML = `
      <span><img src="${art("mat_wax_seal")}" alt=""><b>${meta?.wax ?? 0}</b><small>mühür mumu</small></span>
      <span><b>${rec.best_wave || 0}</b><small>en derin dalga</small></span>
      <span><b>${achDone}/${achAll}</b><small>başarım</small></span>
      <span><b>${({ lexicon: "Lexicon", errata: "Errata", endless: "Sonsuz" })[meta?.mode] || "Lexicon"}</b><small>sefer türü</small></span>`;
  }
  function init() {
    addMenuEntry();
    document.getElementById("restart-game-btn")?.addEventListener("click", () => requestAnimationFrame(() => open()));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.GrimoireHub = Object.freeze({ open, close, record });
})();

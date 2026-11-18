/* Between-run progression and run modifiers.
 *
 *  - Mühür mumu (wax): the permanent currency. Earned at the end of every run
 *    and from achievements; spent on 12 permanent upgrades at the hub bench.
 *  - Modes: Lexicon (word quizzes), Errata (action only: no quizzes, eight
 *    elite affixes, nemesis, boss weak points, cursed relics), Endless (no
 *    wave cap; unlocks at wave 25).
 *  - Red-ink contracts (heat): ten optional handicaps; each point adds 10% wax.
 *  - Route: every five waves the player picks one of two lanes; each node
 *    changes the coming wave (elite, treasure, rest, discount, unknown).
 *  - 31 achievements with painted seals and a wax reward.
 *
 * game.js calls the hooks below through window.GrimoireMeta?.x(), so the game
 * still runs if this file is missing. Everything persists in one
 * localStorage key.
 */
(() => {
  const KEY = "lexicon_meta_v1";
  const G = () => window.GrimoireSprites;
  const art = id => G()?.src(id) || "";
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const S = () => (typeof state !== "undefined" ? state : null);

  /* ------------------------------------------------------------------ store */
  const blank = () => ({
    wax: 0, wax_total: 0, upgrades: {}, achievements: {}, mode: "lexicon", heat: {},
    stats: { words_total: 0, quiz_streak: 0, redeemed: 0, nemesis: 0, heroes_played: [], heroes_cleared: [], heroes_won: [], weapons_seen: [], relics_seen: [], best_heat_wave: {} }
  });
  let store = blank();
  try { store = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || "{}")); store.stats = Object.assign(blank().stats, store.stats); } catch (_) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (_) {} };
  const archive = () => { try { return JSON.parse(localStorage.getItem("lexicon_archive_record") || "{}") || {}; } catch (_) { return {}; } };

  /* --------------------------------------------------------------- upgrades */
  // cost[i] buys level i+1.
  const UPGRADES = [
    { id: "max_health", name: "Kalın Cilt", desc: lv => `Başlangıç canı +${lv * 8}`, step: "Her seviye +8 can", cost: [30, 50, 80, 120, 170] },
    { id: "armour", name: "Pirinç Sırt", desc: lv => `Zırh +%${lv * 2}`, step: "Her seviye +%2 zırh", cost: [40, 70, 110, 160, 220] },
    { id: "luck", name: "Dört Yapraklı Ayraç", desc: lv => `Kritik şansı +%${lv * 2}`, step: "Her seviye +%2 kritik", cost: [35, 60, 95, 140, 190] },
    { id: "ink_gain", name: "Mürekkep Hokkası", desc: lv => `Toplanan mürekkep +%${lv * 5}`, step: "Her seviye +%5 mürekkep", cost: [40, 65, 100, 150, 210] },
    { id: "pickup_range", name: "Mıknatıslı Uç", desc: lv => `Toplama menzili +${lv * 20}`, step: "Her seviye +20 menzil", cost: [25, 45, 70] },
    { id: "dash_charges", name: "Atılım Yayı", desc: lv => `Yetenek bekleme süresi −%${lv * 10}`, step: "Her seviye −%10 bekleme", cost: [80, 160] },
    { id: "reroll", name: "Yeniden Diz", desc: lv => `Her dükkânda ${lv} ücretsiz yenileme`, step: "Her seviye +1 ücretsiz yenileme", cost: [50, 90, 140] },
    { id: "story_insight", name: "Anlatıcının Gözü", desc: lv => `Karakter deneyimi +%${lv * 10}`, step: "Her seviye +%10 deneyim", cost: [40, 70, 110] },
    { id: "starting_weapon", name: "Hazır Silah", desc: lv => lv >= 2 ? "İkinci silah ve başlangıç silahı 2. kademe" : "Sefere ikinci bir silahla başla", step: "1: ikinci silah · 2: silah 2. kademede", cost: [120, 260] },
    { id: "gadget_slot", name: "Gereç Kemeri", desc: () => "Sefere fazladan bir gereçle başla", step: "Ek gereç çantada hazır", cost: [150] },
    { id: "relic_slot", name: "Yadigâr Kutusu", desc: () => "Sefere rastgele bir yadigârla başla", step: "Kutudan bir yadigâr çıkar", cost: [200] },
    { id: "revive", name: "Son Satır", desc: lv => `Seferde ${lv} kez %40 canla diril`, step: "Her seviye +1 diriliş", cost: [250, 500] }
  ];
  const lvl = id => Math.max(0, Number(store.upgrades[id]) || 0);

  /* ------------------------------------------------------------------ heat */
  const HEAT = [
    { id: "red_ink", name: "Kırmızı Mürekkep", desc: "Düşman hasarı +%20", pts: 2 },
    { id: "thick_paper", name: "Kalın Kâğıt", desc: "Düşman canı +%25", pts: 2 },
    { id: "faster_shelves", name: "Hızlı Raflar", desc: "Düşmanlar %12 daha hızlı", pts: 1 },
    { id: "elite_tide", name: "Seçkin Gelgit", desc: "Elit çıkma şansı iki katı", pts: 2 },
    { id: "double_guard", name: "Çifte Muhafız", desc: "Boss canı +%40", pts: 2 },
    { id: "short_candle", name: "Kısa Mum", desc: "Gece uzar: dalgalar %20 uzun", pts: 1 },
    { id: "blank_margins", name: "Boş Kenarlar", desc: "Dükkân fiyatları +%20", pts: 1 },
    { id: "no_mercy", name: "Merhamet Yok", desc: "Hata yankıları iki kat canlı", pts: 1 },
    { id: "silent_witness", name: "Sessiz Tanık", desc: "Arena nesneleri çalışmaz", pts: 1 },
    { id: "last_word", name: "Son Söz", desc: "Diriliş kapalı", pts: 1 }
  ];
  const heatOn = id => !!store.heat[id] && heatUnlocked();
  const heatLevel = () => HEAT.reduce((sum, h) => sum + (heatOn(h.id) ? h.pts : 0), 0);
  const heatUnlocked = () => (archive().runs || 0) >= 1;

  /* ----------------------------------------------------------------- modes */
  const MODES = [
    { id: "lexicon", name: "Lexicon", sub: "Kelime seferi", desc: "Kelime kartları sınavla açılır. Doğru cevap yarı fiyat ve +%50 güç.", card: "mode_lexicon_card", emblem: "mode_lexicon_emblem" },
    { id: "errata", name: "Errata", sub: "Saf savaş", desc: "Sınav yok. Kartları doğrudan al. Elitler sekiz lanet taşır, hasım ve lanetli yadigârlar çıkar.", card: "mode_errata_card", emblem: "mode_errata_emblem" },
    { id: "endless", name: "Sonsuz", sub: "Kapanmayan kitap", desc: "100. dalgadan sonra devam eder. Bosslar yeniden döner, her dalga daha sert.", card: "mode_endless_card", emblem: "mode_endless_emblem", unlock: () => (archive().best_wave || 0) >= 25, lockNote: "25. dalgaya ulaşınca açılır" }
  ];
  const mode = () => {
    const m = MODES.find(x => x.id === store.mode);
    return m && (!m.unlock || m.unlock()) ? m.id : "lexicon";
  };
  const errata = () => run.mode === "errata";

  /* ----------------------------------------------------------------- route */
  const NODES = {
    combat: { name: "Çatışma", desc: "Olağan bir dalga.", art: "route_node_combat" },
    elite: { name: "Elit", desc: "Elit dolu dalga · mürekkep ×1,5", art: "route_node_elite" },
    treasure: { name: "Hazine", desc: "Dalga sonunda sandık açılır", art: "route_node_treasure" },
    rest: { name: "Mola", desc: "Dalga başında %30 can", art: "route_node_rest" },
    shop: { name: "Pazar", desc: "Sonraki dükkân %25 ucuz", art: "route_node_shop" },
    unknown: { name: "Bilinmeyen", desc: "Dalga başında açılır", art: "route_node_unknown" },
    boss: { name: "Bekçi", desc: "Bölüm bekçisi", art: "route_node_boss" }
  };
  const POOL = ["combat", "combat", "elite", "elite", "treasure", "rest", "shop", "unknown"];
  const pick = list => list[Math.floor(Math.random() * list.length)];
  function makeLane() {
    const lane = [pick(POOL), pick(POOL), pick(POOL), pick(POOL)];
    if (!lane.includes("treasure") && Math.random() < 0.5) lane[1 + Math.floor(Math.random() * 3)] = "treasure";
    return lane;
  }

  /* ---------------------------------------------------------- cursed relics */
  const CURSED = [
    { id: "blood_price", name: "Kan Bedeli", good: "Hasar +%35", bad: "Azami can −%20", apply: s => { s.damage_mult += 0.35; scaleHp(s, 0.8); } },
    { id: "burning_margin", name: "Yanan Kenar", good: "Atış hızı +%25", bad: "Her dalga başında −%8 can", apply: s => addAtk(0.25) },
    { id: "erased_name", name: "Silinmiş Ad", good: "+2 delme", bad: "Kritik −%5", apply: s => { s.pierce_count += 2; s.crit_chance = Math.max(0, s.crit_chance - 0.05); } },
    { id: "glass_ink", name: "Cam Mürekkep", good: "Kritik +%12", bad: "Zırh −%10", apply: s => { s.crit_chance = Math.min(1, s.crit_chance + 0.12); s.armor = Math.max(0, s.armor - 0.10); } },
    { id: "hollow_quill", name: "Oyuk Kalem", good: "+1 mermi", bad: "Hasar −%15", apply: s => { s.projectile_count += 1; s.damage_mult = Math.max(0.3, s.damage_mult - 0.15); } },
    { id: "hungry_index", name: "Aç Dizin", good: "Mürekkep +%60", bad: "Düşman canı +%15", apply: s => { s.ink_mult += 0.6; } },
    { id: "iron_binding", name: "Demir Cilt", good: "Zırh +%15", bad: "Hız −%15", apply: s => { addArm(0.15); s.move_speed *= 0.85; } },
    { id: "last_candle", name: "Son Mum", good: "Bir kez dirilirsin", bad: "Azami can −%30", apply: s => { run.revives += 1; scaleHp(s, 0.7); } },
    { id: "red_ledger", name: "Kırmızı Defter", good: "Dükkân %25 ucuz", bad: "Düşman hasarı +%15", apply: () => {} },
    { id: "silent_bell", name: "Sessiz Çan", good: "Yetenek bekleme −%30", bad: "Arena nesneleri susar", apply: s => { s.gadget_cooldown_mult = Math.max(0.5, s.gadget_cooldown_mult * 0.7); } },
    { id: "twin_shadow", name: "İkiz Gölge", good: "Hız +%25 · hasar +%10", bad: "Düşmanlar %10 hızlı", apply: s => { s.move_speed *= 1.25; s.damage_mult += 0.10; } },
    { id: "weeping_wax", name: "Ağlayan Mum", good: "Her öldürme +0,5 can", bad: "Azami can −%25", apply: s => scaleHp(s, 0.75) }
  ];
  function scaleHp(s, f) { s.max_hp = Math.max(20, Math.round(s.max_hp * f)); s.hp = Math.min(s.hp, s.max_hp); }
  function addAtk(v) { if (typeof addAttackSpeed === "function") addAttackSpeed(v); }
  function addArm(v) { if (typeof addArmor === "function") addArmor(v); }

  /* ----------------------------------------------------------- achievements */
  const HERO_KEYS = { inky: "inky", quillmaster: "quillmaster", word_knight: "word_knight", rune_sorceress: "rune_sorceress", lexicon_alchemist: "alchemist", shadow_lexicographer: "shadow_scribe" };
  const HERO_NAMES = { inky: "Inky", quillmaster: "Quillmaster", word_knight: "Word Knight", rune_sorceress: "Rune Sorceress", lexicon_alchemist: "Alchemist", shadow_lexicographer: "Shadow Scribe" };
  const ACH = [
    ["first_night", "İlk Gece", "Bir seferi bitir.", 10],
    ["first_boss", "İlk Bekçi", "İlk bölüm bekçisini yen.", 15],
    ["wing_1", "Okuma Salonu", "25. dalgayı geç.", 25],
    ["wing_2", "Kelime Dehlizi", "50. dalgayı geç.", 40],
    ["wing_3", "Yıldız Gözlemevi", "75. dalgayı geç.", 60],
    ["wing_4", "Son Sayfa", "100. dalgayı tamamla.", 100],
    ["no_damage_wave", "Lekesiz Sayfa", "3. dalgadan sonra bir dalgayı hasar almadan bitir.", 15],
    ["chain_50", "Kesintisiz 50", "Hasar almadan 50 düşman yen.", 15],
    ["chain_100", "Kesintisiz 100", "Hasar almadan 100 düşman yen.", 30],
    ["perfect_quiz_10", "Kusursuz On", "Üst üste 10 soruyu doğru cevapla.", 25],
    ["words_100", "Yüz Kelime", "Toplam 100 kelime mühürle.", 20],
    ["words_500", "Beş Yüz Kelime", "Toplam 500 kelime mühürle.", 50],
    ["words_1000", "Bin Kelime", "Toplam 1000 kelime mühürle.", 100],
    ["evolve_weapon", "Dönüşüm", "Bir silahı 4. kademeye taşı.", 20],
    ["all_weapons", "Tam Cephanelik", "15 silahın hepsini en az bir kez kuşan.", 60],
    ["all_relics", "Yadigâr Koleksiyoncusu", "Her yadigârı en az bir kez edin.", 60],
    ["red_redactor_ally", "Kırmızı Dost", "Hata defterinden 10 kelimeyi temize çek.", 30],
    ["nemesis_slain", "Hasım Düştü", "Errata modunda bir hasımı yen.", 30],
    ["heat_5", "Kırmızı Sözleşme", "5+ sözleşme puanıyla 25. dalgayı geç.", 40],
    ["heat_10", "Kanla İmzalı", "10+ sözleşme puanıyla 25. dalgayı geç.", 80],
    ["endless_50", "Kapanmayan Kitap", "Sonsuz modda 150. dalgaya ulaş.", 80],
    ["endless_100", "Sayfaların Ötesi", "Sonsuz modda 200. dalgaya ulaş.", 150],
    ...Object.keys(HERO_KEYS).map(h => [`hero_${HERO_KEYS[h]}`, HERO_NAMES[h], `${HERO_NAMES[h]} ile 25. dalgayı geç.`, 20]),
    ["all_heroes", "Altı Kâtip", "Altı kahramanla da 25. dalgayı geç.", 60],
    ["neris_name", "Neris'in Adı", "Shadow Scribe ile 100. dalgayı tamamla.", 80],
    ["true_ending", "Gerçek Son", "Altı kahramanla da 100. dalgayı tamamla.", 200]
  ].map(([id, name, desc, wax]) => ({ id, name, desc, wax }));

  /* ------------------------------------------------------------- run state */
  let run = freshRun();
  function freshRun() {
    return { mode: "lexicon", heat: 0, revives: 0, wave_hurt: false, chain: 0, bosses: 0, cursed: [], plan: {}, choice: null, discount: 1, treasure: null, ink_factor: 1, node: null, nemesis_wave: 0, started: false, reached100: false };
  }

  /* ------------------------------------------------------------- run hooks */
  function applyRunStart() {
    const s = S(); if (!s) return;
    run = freshRun();
    run.started = true;
    run.mode = mode();
    run.heat = heatLevel();
    s.max_waves = run.mode === "endless" ? 1000 : 100;
    s.max_hp += lvl("max_health") * 8; s.hp = s.max_hp;
    addArm(lvl("armour") * 0.02);
    s.crit_chance = Math.min(1, s.crit_chance + lvl("luck") * 0.02);
    s.ink_mult += lvl("ink_gain") * 0.05;
    s.pickup_radius += lvl("pickup_range") * 20;
    s.gadget_cooldown_mult *= 1 - lvl("dash_charges") * 0.10;
    run.revives = heatOn("last_word") ? 0 : lvl("revive");
    const startLv = lvl("starting_weapon");
    if (startLv > 0 && typeof WEAPONS_CATALOG !== "undefined") {
      const first = s.equipped_weapons[0];
      if (startLv >= 2 && first) first.tier = 2;
      const others = Object.keys(WEAPONS_CATALOG).filter(id => id !== first?.id);
      s.equipped_weapons.push({ id: pick(others), tier: 1 });
    }
    if (lvl("gadget_slot") > 0 && typeof GADGETS_CATALOG !== "undefined") {
      const extra = Object.keys(GADGETS_CATALOG).filter(id => !s.owned_gadgets.includes(id));
      if (extra.length) s.owned_gadgets.push(pick(extra));
    }
    if (lvl("relic_slot") > 0 && typeof ARTIFACTS_CATALOG !== "undefined" && typeof applyArtifact === "function") {
      const pool = Object.values(ARTIFACTS_CATALOG).filter(a => a.id !== "slot_expansion");
      const relic = pool.length ? pick(pool) : null;
      if (relic) { applyArtifact(relic); s.artifacts_owned.push(relic.id); }
    }
    s.free_rerolls_per_shop = lvl("reroll");
    s.free_rerolls = 0;
    if (!store.stats.heroes_played.includes(s.selected_char)) store.stats.heroes_played.push(s.selected_char);
    save();
    renderBadge();
  }

  function onRunBegin() {
    // The first segment's lane is drawn for the player; they choose later ones in the shop.
    const lane = makeLane();
    setPlan(1, lane);
    toast(`${MODES.find(m => m.id === run.mode)?.name || ""} seferi${run.heat ? ` · ${run.heat} sözleşme puanı` : ""}`, "Yol: " + lane.map(n => NODES[n].name).join(" → ") + " → Bekçi", art(MODES.find(m => m.id === run.mode)?.emblem), "route");
  }
  function setPlan(firstWave, lane) {
    lane.forEach((node, i) => { run.plan[firstWave + i] = node; });
    run.plan[firstWave + 4] = "boss";
  }

  function onWaveStart(wave) {
    const s = S(); if (!s || !run.started) return;
    run.wave_hurt = false;
    let node = run.plan[wave] || (wave % 5 === 0 ? "boss" : "combat");
    if (node === "unknown") node = pick(["combat", "elite", "treasure", "rest", "shop"]);
    run.node = node;
    run.ink_factor = node === "elite" ? 1.5 : 1;
    if (node === "rest") {
      const heal = Math.round(s.max_hp * 0.3);
      s.hp = Math.min(s.max_hp, s.hp + heal);
      if (typeof addFloatingText === "function") addFloatingText(s.player.x, s.player.y - 50, `MOLA · +${heal} CAN`, "#8ee0b5", 16);
    }
    if (node === "shop") run.discount = 0.75;
    if (heatOn("short_candle")) { s.wave_duration *= 1.2; s.wave_time_left = s.wave_duration; }
    if (run.cursed.includes("burning_margin")) s.hp = Math.max(1, s.hp - Math.round(s.max_hp * 0.08));
    if (errata() && wave % 10 === 7) run.nemesis_wave = wave;
    if (s.weapons) s.weapons.forEach(w => { if (!store.stats.weapons_seen.includes(w.id)) store.stats.weapons_seen.push(w.id); if ((w.tier || 1) >= 4) unlock("evolve_weapon"); });
    if (store.stats.weapons_seen.length >= 15) unlock("all_weapons");
    renderBadge();
  }

  function onWaveEnd(wave) {
    const s = S(); if (!s || !run.started) return;
    if (!run.wave_hurt && wave > 3) unlock("no_damage_wave");
    if (wave % 5 === 0) { run.bosses += 1; unlock("first_boss"); }
    (s.artifacts_owned || []).forEach(id => { if (!store.stats.relics_seen.includes(id)) store.stats.relics_seen.push(id); });
    const relicCount = typeof ARTIFACTS_CATALOG !== "undefined" ? Object.keys(ARTIFACTS_CATALOG).length : 99;
    if (store.stats.relics_seen.length >= relicCount) unlock("all_relics");
    const passed = n => wave >= n;
    if (passed(25)) unlock("wing_1"); if (passed(50)) unlock("wing_2"); if (passed(75)) unlock("wing_3"); if (passed(100)) { unlock("wing_4"); markWin(); }
    if (passed(25)) {
      const hk = HERO_KEYS[s.selected_char];
      if (hk) unlock(`hero_${hk}`);
      if (!store.stats.heroes_cleared.includes(s.selected_char)) store.stats.heroes_cleared.push(s.selected_char);
      if (store.stats.heroes_cleared.length >= 6) unlock("all_heroes");
      if (run.heat >= 5) unlock("heat_5"); if (run.heat >= 10) unlock("heat_10");
    }
    if (run.mode === "endless") { if (wave >= 150) unlock("endless_50"); if (wave >= 200) unlock("endless_100"); }
    if (run.node === "treasure") run.treasure = makeTreasure();
    run.discount = run.node === "shop" ? 0.75 : 1;
    if (wave % 5 === 0) run.choice = { first: wave + 1, lanes: [makeLane(), makeLane()], picked: 0 };
    s.free_rerolls = s.free_rerolls_per_shop || 0;
    save();
  }
  function markWin() {
    const s = S(); if (run.reached100) return;
    run.reached100 = true;
    if (!store.stats.heroes_won.includes(s.selected_char)) store.stats.heroes_won.push(s.selected_char);
    if (s.selected_char === "shadow_lexicographer") unlock("neris_name");
    if (store.stats.heroes_won.length >= 6) unlock("true_ending");
  }

  function makeTreasure() {
    const s = S();
    const ink = Math.round(25 + s.current_wave * 2.2);
    const offers = [{ kind: "ink", amount: ink }];
    if (errata()) {
      const pool = CURSED.filter(c => !run.cursed.includes(c.id));
      for (let i = 0; i < 2 && pool.length; i++) offers.push({ kind: "cursed", relic: pool.splice(Math.floor(Math.random() * pool.length), 1)[0] });
    } else if (typeof ARTIFACTS_CATALOG !== "undefined") {
      const pool = Object.values(ARTIFACTS_CATALOG).filter(a => !s.artifacts_owned.includes(a.id) && a.id !== "slot_expansion");
      if (pool.length) offers.push({ kind: "relic", relic: pick(pool) });
    }
    return offers;
  }

  function onRunEnd(victory) {
    const s = S(); if (!s || !run.started || run.ended) return;
    run.ended = true;
    if (victory) markWin();
    const waves = victory ? 100 : Math.max(0, s.current_wave - 1);
    const words = (s.words_learned || []).length;
    store.stats.words_total += words;
    const base = Math.floor(waves * 1.5) + run.bosses * 8 + Math.floor(words / 2) + (victory || run.reached100 ? 60 : 0);
    const mult = 1 + run.heat * 0.1;
    const earned = Math.max(3, Math.round(base * mult));
    run.earned = { base, mult, earned, waves, bosses: run.bosses, words };
    store.wax += earned; store.wax_total += earned;
    unlock("first_night");
    const t = store.stats.words_total;
    if (t >= 100) unlock("words_100"); if (t >= 500) unlock("words_500"); if (t >= 1000) unlock("words_1000");
    save();
  }

  function decorateSummary(summary) {
    const e = run.earned; if (!e) return;
    const box = el("div", "meta-wax-earned");
    box.innerHTML = `<img src="${art("mat_wax_seal")}" alt=""><div><small>ARŞİVE DÖKÜLEN MUM</small><b data-count="${e.earned}">+${e.earned}</b><span>${e.waves} dalga · ${e.bosses} bekçi · ${e.words} kelime${run.heat ? ` · sözleşme ×${e.mult.toFixed(1)}` : ""}</span></div><em>Toplam ${store.wax}</em>`;
    summary.append(box);
    const b = box.querySelector("b");
    const start = performance.now();
    const tick = now => { const k = Math.min(1, (now - start) / 900); b.textContent = `+${Math.round(e.earned * (1 - Math.pow(1 - k, 3)))}`; if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------- combat hooks */
  function onEnemySpawn(e) {
    if (!e || e._meta || !run.started) return;
    e._meta = true;
    let hp = 1, dmg = 1, spd = 1;
    if (heatOn("red_ink")) dmg *= 1.2;
    if (heatOn("thick_paper")) hp *= 1.25;
    if (heatOn("faster_shelves")) spd *= 1.12;
    if (e.is_boss && heatOn("double_guard")) hp *= 1.4;
    if (e.is_mistake_echo && heatOn("no_mercy")) hp *= 2;
    if (run.cursed.includes("hungry_index")) hp *= 1.15;
    if (run.cursed.includes("red_ledger")) dmg *= 1.15;
    if (run.cursed.includes("twin_shadow")) spd *= 1.1;
    if (hp !== 1) { e.hp *= hp; e.max_hp *= hp; }
    if (dmg !== 1 && e.damage) e.damage *= dmg;
    if (spd !== 1 && e.speed) e.speed *= spd;
    if (e.is_boss && errata()) e.weak = { t: 4, open: 0, hp: e.hp };
  }
  // Elite route nodes start affixes early; Errata and Seçkin Gelgit raise the odds.
  function affixBoost(wave) {
    if (!run.started) return null;
    let mult = 1, add = 0;
    if (errata()) { mult *= 1.4; add += wave < 15 ? 0.06 : 0; }
    if (heatOn("elite_tide")) { mult *= 2; add += wave < 15 ? 0.05 : 0; }
    if (run.node === "elite") add += 0.3;
    return mult === 1 && add === 0 ? null : { mult, add };
  }
  const ERRATA_AFFIX = { vampiric: "VAMPİR", splitting: "BÖLÜNEN", summoner: "ÇAĞIRAN", warded: "MUHAFIZ" };
  function decorateElite(e) {
    if (errata() && Math.random() < 0.5) {
      const id = pick(Object.keys(ERRATA_AFFIX));
      e.label = `${ERRATA_AFFIX[id]} ${String(e.label || "").replace(/^(KALKANLI|HIZLI|AURA|PATLAYICI) /, "")}`;
      e.affix = id;
      if (id === "summoner") e.summon_timer = 3;
    }
  }
  function onEliteCheck(e) {
    if (!errata() || !run.nemesis_wave || run.nemesis_wave !== S().current_wave || e.is_boss) return;
    run.nemesis_wave = 0;
    e.is_nemesis = true; e.is_elite = true;
    e.max_hp *= 4; e.hp = e.max_hp; e.size = Math.round((e.size || 40) * 1.3);
    e.ink_reward = (e.ink_reward || 2) * 6;
    e.label = `HASIM · ${e.label || e.type}`;
    toast("Bir hasım belirdi", "Kırmızı işaretli düşman güçlü ama ödülü büyük.", art("nemesis_mark"), "threat");
  }
  const AFFIX_ART = { shielded: "shielded", blinker: "teleporting", commander: "hasted", volatile: "exploding", vampiric: "vampiric", splitting: "splitting", summoner: "summoner", warded: "warded" };

  function onKill(e) {
    const s = S(); if (!run.started) return null;
    run.chain += 1;
    if (run.chain >= 50) unlock("chain_50"); if (run.chain >= 100) unlock("chain_100");
    if (run.cursed.includes("weeping_wax")) s.hp = Math.min(s.max_hp, s.hp + 0.5);
    if (e.is_nemesis) { store.stats.nemesis += 1; unlock("nemesis_slain"); save(); }
    if (e.affix === "splitting" && !e.is_split) {
      return [0, 1].map(i => ({ ...e, _meta: true, dead: false, affix: null, is_elite: false, is_split: true, is_nemesis: false,
        x: e.x + (i ? 26 : -26), y: e.y + (i ? -14 : 14), vx: 0, vy: 0,
        hp: e.max_hp * 0.3, max_hp: e.max_hp * 0.3, size: Math.round((e.size || 40) * 0.72), label: "PARÇA", ink_reward: 1 }));
    }
    return null;
  }
  function onPlayerHurt(amount) {
    const s = S(); if (!run.started) return;
    run.wave_hurt = true; run.chain = 0;
    for (const e of s.enemies) {
      if (e.affix === "vampiric" && !e.dead && Math.hypot(e.x - s.player.x, e.y - s.player.y) < 140) {
        e.hp = Math.min(e.max_hp, e.hp + e.max_hp * 0.12);
        G()?.fx?.("fx_heal", e.x, e.y, { size: 70 });
      }
    }
  }
  function tryRevive() {
    const s = S();
    if (!run.started || run.revives <= 0) return false;
    run.revives -= 1;
    s.hp = Math.round(s.max_hp * 0.4);
    s.player.invuln_timer = 2.2;
    for (const e of s.enemies) {
      const d = Math.hypot(e.x - s.player.x, e.y - s.player.y) || 1;
      if (d < 320 && !e.is_boss) { e.vx = (e.x - s.player.x) / d * 520; e.vy = (e.y - s.player.y) / d * 520; }
    }
    s.enemy_projectiles.length = 0;
    if (typeof triggerScreenShake === "function") triggerScreenShake(0.4, 9);
    G()?.fx?.("fx_level_up", s.player.x, s.player.y, { size: 260 });
    toast("Son Satır", `Kitap kapanmadı · %40 canla döndün${run.revives ? ` · ${run.revives} hak kaldı` : ""}`, art("meta_revive"), "revive");
    return true;
  }

  // Per-frame affix behaviour; runs only while a wave is active.
  function update(dt) {
    const s = S(); if (!run.started || !s.is_wave_active) return;
    renderStatus(dt);
    for (const e of s.enemies) {
      if (e.dead) continue;
      if (e.affix === "summoner") {
        e.summon_timer = (e.summon_timer ?? 4) - dt;
        if (e.summon_timer <= 0 && s.enemies.length < 140) {
          e.summon_timer = 6;
          const a = Math.random() * Math.PI * 2;
          const minion = { type: "Typo Slime", sprite: "typo_slime.png", label: "ÇAĞRILMIŞ", x: e.x + Math.cos(a) * 50, y: e.y + Math.sin(a) * 50, vx: 0, vy: 0,
            hp: e.max_hp * 0.12, max_hp: e.max_hp * 0.12, speed: 120, damage: (e.damage || 10) * 0.4, ink_reward: 1, size: 30, facing_left: false, _meta: true };
          if (typeof addAliveEnemy === "function") addAliveEnemy(minion);
          G()?.fx?.("fx_elite_spawn", minion.x, minion.y, { size: 70 });
        }
      }
      if (e.affix === "warded") {
        if (e._lastHp != null && e.hp < e._lastHp - 0.01) e.ward_idle = 0; else e.ward_idle = (e.ward_idle || 0) + dt;
        if (e.ward_idle > 2) e.hp = Math.min(e.max_hp, e.hp + e.max_hp * 0.05 * dt);
        e._lastHp = e.hp;
      }
      if (e.weak) {
        const w = e.weak;
        w.t -= dt;
        if (w.open > 0) {
          // While the weak point is open the boss takes 50% more from every hit.
          const lost = w.hp - e.hp;
          if (lost > 0) e.hp -= lost * 0.5;
          w.open -= dt;
          if (w.open <= 0) { w.t = 7; G()?.fx?.("fx_crit_hit", e.x, e.y, { size: 120 }); }
        } else if (w.t <= 0) { w.open = 3; }
        w.hp = e.hp;
      }
    }
  }

  // Status icons: on the HUD for the hero, above enemies for stun/slow.
  let statusClock = 0;
  function renderStatus(dt) {
    statusClock -= dt; if (statusClock > 0) return; statusClock = 0.25;
    const s = S(); const host = document.querySelector("#hud .char-info"); if (!host) return;
    let row = document.getElementById("hud-status"); if (!row) { row = el("div", "hud-status"); row.id = "hud-status"; host.after(row); }
    const list = [];
    if (s.shield_charges > 0) list.push(["shield", `Kalkan ×${s.shield_charges}`]);
    if (s.lectern_timer > 0) list.push(["haste", `Okuma · ${Math.ceil(s.lectern_timer)} sn`]);
    if (s.player.slow_timer > 0) list.push(["slow", "Yavaşlatıldın"]);
    if (s.player.invuln_timer > 0.4) list.push(["invisible", "Dokunulmaz"]);
    if (run.node === "rest") list.push(["regen", "Mola dalgası"]);
    if (run.cursed.includes("burning_margin")) list.push(["burn", "Yanan Kenar"]);
    if (s.enemies.some(e => e.is_nemesis && !e.dead)) list.push(["marked", "Hasım sahada"]);
    if (heatOn("red_ink") || heatOn("thick_paper")) list.push(["weaken", `Sözleşme · ${run.heat} puan`]);
    const key = list.map(x => x[1]).join("|");
    if (row.dataset.key === key) return; row.dataset.key = key;
    row.replaceChildren(...list.map(([id, label]) => { const i = el("span", "hud-status-icon"); i.title = label; i.innerHTML = `<img src="${art(`status_${id}`)}" alt="${label}">`; return i; }));
  }
  const auraFrames = new Map();
  function drawEnemyMarks(ctx, e, reduced) {
    const key = AFFIX_ART[e.affix];
    const now = performance.now();
    const sz = e.size || 40;
    if (key) {
      const frame = G()?.loopFrame?.(`affix_${key}_aura`, now, e.x * 0.01) || null;
      if (frame) { ctx.save(); ctx.globalAlpha = 0.85; ctx.drawImage(frame, e.x - sz * 1.15, e.y - sz * 1.15, sz * 2.3, sz * 2.3); ctx.restore(); }
      const icon = G()?.image?.(`affix_${key}_icon`);
      if (icon) ctx.drawImage(icon, e.x + sz * 0.32, e.y - sz * 0.95, 22, 22);
    }
    if (e.is_nemesis) {
      const mark = G()?.image?.("nemesis_mark");
      const bob = reduced ? 0 : Math.sin(now * 0.005) * 3;
      if (mark) ctx.drawImage(mark, e.x - 20, e.y - sz - 34 + bob, 40, 40);
    }
    const status = e.stun_timer > 0 ? "stun" : e.slow_timer > 0 ? "slow" : null;
    if (status && !e.is_boss) { const icon = G()?.image?.(`status_${status}`); if (icon) ctx.drawImage(icon, e.x - sz * 0.5 - 6, e.y - sz * 0.95, 20, 20); }
    if (e.weak && e.weak.open > 0) {
      const img = G()?.image?.("weakpoint");
      const r = sz * 0.9 * (1 + (reduced ? 0 : Math.sin(now * 0.012) * 0.06));
      if (img) { ctx.save(); ctx.globalAlpha = 0.9; ctx.drawImage(img, e.x - r, e.y - r, r * 2, r * 2); ctx.restore(); }
    }
  }

  const inkFactor = () => run.started ? run.ink_factor : 1;
  const priceFactor = () => !run.started ? 1 : run.discount * (heatOn("blank_margins") ? 1.2 : 1) * (run.cursed.includes("red_ledger") ? 0.75 : 1);
  const xpFactor = () => 1 + lvl("story_insight") * 0.1;
  const arenaSilenced = () => run.started && (heatOn("silent_witness") || run.cursed.includes("silent_bell"));

  function onQuiz(correct) {
    store.stats.quiz_streak = correct ? store.stats.quiz_streak + 1 : 0;
    if (store.stats.quiz_streak >= 10) unlock("perfect_quiz_10");
    save();
  }
  function onRedeem() { store.stats.redeemed += 1; if (store.stats.redeemed >= 10) unlock("red_redactor_ally"); save(); }

  // Errata: no quiz. Breaking the seal is a timing strike instead:
  // gold = half price and +50%, bronze = full price and +25%, miss = full price.
  function buyCardDirect(card, index) {
    if (!errata()) return false;
    const s = S();
    const cost = card.shop_cost ?? card.cost;
    if (s.ink_count < cost) return true;
    openSealBreak(card, index, cost);
    return true;
  }
  function openSealBreak(card, index, cost) {
    const s = S();
    clearShopAutoWaveTimer?.();
    const wave = s.current_wave;
    const speed = Math.min(560, 210 + wave * 4.5);          // degrees per second
    const gold = Math.max(16, 38 - wave * 0.3);             // gold arc width
    const bronze = gold + 46;
    const target = 40 + Math.random() * 280;
    const emblem = { max_hp: "health", heal: "health", armor: "armor", move_speed: "speed", attack_speed: "attack_speed", crit_chance: "crit", pierce: "pierce", damage: "damage", pickup_radius: "ink_range", ink_mult: "luck", projectile_count: "damage" }[card.stat] || "shield";
    const arc = (from, width, r) => { const a0 = (from - width / 2 - 90) * Math.PI / 180, a1 = (from + width / 2 - 90) * Math.PI / 180;
      return `M ${50 + r * Math.cos(a0)} ${50 + r * Math.sin(a0)} A ${r} ${r} 0 ${width > 180 ? 1 : 0} 1 ${50 + r * Math.cos(a1)} ${50 + r * Math.sin(a1)}`; };
    const overlay = el("div", "seal-break");
    overlay.setAttribute("role", "dialog"); overlay.setAttribute("aria-label", "Mühür kırma");
    overlay.innerHTML = `<div class="seal-break-box">
      <small class="errata-kicker">MÜHÜR KIRMA · ${card.buff_name || "GÜÇ"}</small>
      <h3>${card.description || ""}</h3>
      <div class="seal-dial">
        <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" class="sb-track"/><path d="${arc(target, bronze, 44)}" class="sb-bronze"/><path d="${arc(target, gold, 44)}" class="sb-gold"/></svg>
        <img class="sb-seal" src="${art("mat_wax_seal")}" alt=""><img class="sb-emblem" src="${art(`emblem_${emblem}`)}" alt="">
        <i class="sb-needle"></i>
      </div>
      <p class="sb-legend"><span class="g">Altın · yarı fiyat, +%50</span><span class="b">Bronz · +%25</span><span>Iska · normal</span></p>
      <button type="button" class="btn primary sb-strike">Vur · <kbd>Space</kbd></button>
      <p class="sb-result" aria-live="assertive"></p>
    </div>`;
    document.body.append(overlay);
    const needle = overlay.querySelector(".sb-needle");
    const strike = overlay.querySelector(".sb-strike");
    strike.focus({ preventScroll: true });
    let angle = Math.random() * 360, last = performance.now(), done = false, raf = 0;
    const tick = now => { angle = (angle + speed * (now - last) / 1000) % 360; last = now; needle.style.transform = `rotate(${angle}deg)`; if (!done) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    const finish = () => {
      if (done) return; done = true; cancelAnimationFrame(raf);
      const diff = Math.abs(((angle - target + 540) % 360) - 180);
      const grade = diff <= gold / 2 ? "gold" : diff <= bronze / 2 ? "bronze" : "miss";
      const mult = grade === "gold" ? 1.5 : grade === "bronze" ? 1.25 : 1.0;
      const paid = grade === "gold" ? Math.ceil(cost * 0.5) : cost;
      s.ink_count -= paid;
      applyCardUpgrade(card, grade === "gold", mult);
      if (typeof shopCards !== "undefined") shopCards.splice(index, 1);
      overlay.dataset.grade = grade;
      overlay.querySelector(".sb-result").textContent = grade === "gold" ? `KUSURSUZ · +%50 · ${paid} mürekkep` : grade === "bronze" ? `İYİ VURUŞ · +%25 · ${paid} mürekkep` : `MÜHÜR ÇATLADI · ${paid} mürekkep`;
      const fx = grade === "miss" ? "correction_strike" : "word_learned";
      overlay.querySelector(".seal-dial").insertAdjacentHTML("beforeend", `<span class="sb-fx" style="background-image:url('${art(fx)}');--frames:${grade === "miss" ? 10 : 8}"></span>`);
      sounds?.playTone?.(grade === "gold" ? 880 : grade === "bronze" ? 660 : 180, grade === "miss" ? "sawtooth" : "triangle", 0.2, 0.2);
      if (grade !== "miss") triggerHaptic?.("success"); else triggerHaptic?.("fail");
      renderShopView(); updateShopTopBar(); updateHUD();
      setTimeout(close, 1100);
    };
    const close = () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey, true); overlay.classList.add("is-out"); setTimeout(() => overlay.remove(), 260); };
    const onKey = event => {
      if (event.code === "Space" || event.key === "Enter") { event.preventDefault(); event.stopImmediatePropagation(); finish(); }
      else if (event.key === "Escape" && !done) { event.preventDefault(); event.stopImmediatePropagation(); done = true; close(); }
    };
    window.addEventListener("keydown", onKey, true);
    strike.addEventListener("click", event => { event.stopPropagation(); finish(); });
    overlay.addEventListener("pointerdown", event => { if (event.target === overlay && !done) { done = true; close(); } });
  }

  /* ------------------------------------------------------------ achievements */
  function unlock(id) {
    if (store.achievements[id]) return;
    const a = ACH.find(x => x.id === id); if (!a) return;
    store.achievements[id] = Date.now();
    store.wax += a.wax; store.wax_total += a.wax;
    save();
    toast(a.name, `${a.desc} · +${a.wax} mum`, art(`ach_${id}`), "ach");
  }

  /* -------------------------------------------------------------------- UI */
  let toastLayer = null;
  const toastQueue = [];
  let toastBusy = false;
  function toast(title, body, icon, kind = "ach") {
    toastQueue.push({ title, body, icon, kind });
    if (!toastBusy) nextToast();
  }
  function nextToast() {
    const t = toastQueue.shift();
    if (!t) { toastBusy = false; return; }
    toastBusy = true;
    if (!toastLayer) { toastLayer = el("div", "meta-toasts"); toastLayer.setAttribute("aria-live", "polite"); document.body.append(toastLayer); }
    const node = el("div", `meta-toast meta-toast--${t.kind}`, `${t.icon ? `<img src="${t.icon}" alt="">` : ""}<div><small>${t.kind === "ach" ? "BAŞARIM" : t.kind === "threat" ? "UYARI" : t.kind === "revive" ? "DİRİLİŞ" : "SEFER"}</small><b></b><span></span></div>`);
    node.querySelector("b").textContent = t.title;
    node.querySelector("span").textContent = t.body;
    toastLayer.append(node);
    if (t.kind === "ach") sounds?.playTone?.(784, "triangle", 0.18, 0.16);
    setTimeout(() => { node.classList.add("is-out"); setTimeout(() => { node.remove(); nextToast(); }, 380); }, 3400);
  }

  // Small node badge beside the wave timer.
  function renderBadge() {
    const timer = document.getElementById("timer-badge");
    if (!timer) return;
    let badge = document.getElementById("meta-node-badge");
    if (!badge) { badge = el("span", "meta-node-badge"); badge.id = "meta-node-badge"; timer.after(badge); }
    const node = run.started ? NODES[run.node || "combat"] : null;
    badge.hidden = !node;
    if (!node) return;
    badge.innerHTML = `<img src="${art(node.art)}" alt=""><span>${node.name}</span>${run.revives ? `<i title="Diriliş">${run.revives}</i>` : ""}`;
    badge.title = node.desc;
  }

  /* shop panel: route choice + treasure ---------------------------------- */
  function renderShopPanel() {
    const display = document.querySelector("#shop-screen .shop-display");
    if (!display) return;
    let panel = document.getElementById("meta-shop-panel");
    if (!panel) { panel = el("section", "meta-shop-panel"); panel.id = "meta-shop-panel"; display.prepend(panel); }
    panel.replaceChildren();
    if (!run.started) { panel.hidden = true; return; }
    if (run.treasure) panel.append(treasureBlock());
    if (run.choice) panel.append(routeBlock());
    panel.hidden = !panel.children.length;
  }
  function routeBlock() {
    const c = run.choice;
    const box = el("div", "meta-route");
    box.style.setProperty("--map", `url("${art("route_map_bg")}")`);
    box.innerHTML = `<header><span class="errata-kicker">YOL AYRIMI · DALGA ${c.first}–${c.first + 4}</span><h3>Yel'in haritası: bir yol seç</h3></header>`;
    c.lanes.forEach((lane, li) => {
      const row = el("button", `meta-lane${c.picked === li ? " is-picked" : ""}`);
      row.type = "button";
      row.setAttribute("aria-pressed", String(c.picked === li));
      row.innerHTML = `<span class="meta-lane-tag">${li ? "Sağ yol" : "Sol yol"}</span>` + [...lane, "boss"].map((n, i) =>
        `<span class="meta-node" style="--i:${i}" title="${NODES[n].name} · ${NODES[n].desc}"><img src="${art(NODES[n].art)}" alt=""><small>${c.first + i}</small><em>${NODES[n].name}</em></span>`).join('<span class="meta-path" aria-hidden="true"></span>');
      if (c.picked === li) row.insertAdjacentHTML("beforeend", `<img class="meta-pawn" src="${art("route_cursor")}" alt="">`);
      row.addEventListener("click", () => { c.picked = li; sounds?.playTone?.(520 + li * 80, "triangle", 0.08, 0.12); renderShopPanel(); });
      box.append(row);
    });
    box.append(el("p", "meta-note", "Seçmezsen işaretli yoldan gidersin. Bilinmeyen düğüm dalga başında açılır."));
    return box;
  }
  function treasureBlock() {
    const box = el("div", "meta-treasure");
    box.innerHTML = `<header><img src="${art("route_node_treasure")}" alt=""><div><span class="errata-kicker">HAZİNE SANDIĞI</span><h3>${errata() ? "Lanetli bir seçim" : "Sandıktan birini al"}</h3></div></header><div class="meta-offers"></div>`;
    const list = box.querySelector(".meta-offers");
    run.treasure.forEach((offer, i) => {
      const b = el("button", `meta-offer meta-offer--${offer.kind}`);
      b.type = "button";
      b.style.setProperty("--i", i);
      if (offer.kind === "ink") b.innerHTML = `<span class="meta-strip" style="background-image:url('${art("pickup_ink_large")}')"></span><b>${offer.amount} mürekkep</b><span>Hemen harcanabilir.</span>`;
      if (offer.kind === "relic") b.innerHTML = `<img src="${paintedIcon?.(offer.relic.icon) || offer.relic.icon}" alt=""><b>${offer.relic.name}</b><span>${offer.relic.desc}</span>`;
      if (offer.kind === "cursed") b.innerHTML = `<img src="${art(`cursed_${offer.relic.id}`)}" alt=""><b>${offer.relic.name}</b><span class="good">${offer.relic.good}</span><span class="bad">${offer.relic.bad}</span>`;
      b.addEventListener("click", () => takeTreasure(offer));
      list.append(b);
    });
    return box;
  }
  function takeTreasure(offer) {
    const s = S();
    if (offer.kind === "ink") s.ink_count += offer.amount;
    if (offer.kind === "relic") { applyArtifact(offer.relic); s.artifacts_owned.push(offer.relic.id); }
    if (offer.kind === "cursed") { run.cursed.push(offer.relic.id); offer.relic.apply(s); }
    run.treasure = null;
    sounds?.playTone?.(880, "triangle", 0.2, 0.18);
    renderShopPanel(); renderShopView?.(); updateShopTopBar?.(); updateHUD?.();
  }
  // When the next wave starts a new segment, commit the chosen lane.
  function commitChoice() {
    const s = S();
    if (run.choice && s.current_wave + 1 >= run.choice.first) {
      setPlan(run.choice.first, run.choice.lanes[run.choice.picked]);
      run.choice = null;
    }
  }

  /* preparation: mode cards + contracts ---------------------------------- */
  function renderPreparation() {
    const book = document.querySelector("#errata-preparation .preparation-book");
    if (!book) return;
    let modes = document.getElementById("meta-modes");
    if (!modes) { modes = el("section", "meta-modes"); modes.id = "meta-modes"; modes.setAttribute("aria-label", "Sefer türü"); book.before(modes); }
    modes.replaceChildren(...MODES.map((m, i) => {
      const locked = m.unlock && !m.unlock();
      const b = el("button", `meta-mode${mode() === m.id ? " is-on" : ""}${locked ? " is-locked" : ""}`);
      b.type = "button"; b.disabled = !!locked; b.style.setProperty("--i", i);
      b.setAttribute("aria-pressed", String(mode() === m.id));
      b.innerHTML = `<span class="meta-mode-art" style="background-image:url('${art(m.card)}')"></span><img class="meta-mode-emblem" src="${art(m.emblem)}" alt=""><span class="meta-mode-copy"><small>${m.sub}</small><b>${m.name}</b><em>${locked ? m.lockNote : m.desc}</em></span>`;
      b.addEventListener("click", () => { store.mode = m.id; save(); sounds?.playTone?.(440 + i * 90, "triangle", 0.1, 0.14); renderPreparation(); });
      return b;
    }));
    const page = document.querySelectorAll("#errata-preparation .preparation-page")[1];
    if (!page) return;
    let heat = document.getElementById("meta-heat");
    if (!heat) { heat = el("div", "meta-heat"); heat.id = "meta-heat"; page.append(heat); }
    if (!heatUnlocked()) { heat.innerHTML = `<span class="errata-kicker">KIRMIZI SÖZLEŞMELER</span><p class="meta-note">İlk seferini bitirince açılır. Her sözleşme puanı kazanılan mumu %10 artırır.</p>`; return; }
    heat.innerHTML = `<div class="meta-heat-head"><span class="errata-kicker">KIRMIZI SÖZLEŞMELER</span><b>${heatLevel()}<small> puan · mum ×${(1 + heatLevel() * 0.1).toFixed(1)}</small></b></div><div class="meta-heat-grid"></div>`;
    const grid = heat.querySelector(".meta-heat-grid");
    HEAT.forEach(h => {
      const b = el("button", `meta-heat-item${store.heat[h.id] ? " is-on" : ""}`);
      b.type = "button";
      b.setAttribute("aria-pressed", String(!!store.heat[h.id]));
      b.title = `${h.name} · ${h.desc} · ${h.pts} puan`;
      b.innerHTML = `<img src="${art(`heat_${h.id}`)}" alt=""><span><b>${h.name}</b><em>${h.desc}</em></span><i>${h.pts}</i>`;
      b.addEventListener("click", () => { store.heat[h.id] = !store.heat[h.id]; save(); sounds?.playTone?.(store.heat[h.id] ? 196 : 330, "sawtooth", 0.09, 0.08); renderPreparation(); });
      grid.append(b);
    });
  }

  /* hub sheets: workshop upgrades + achievements ------------------------- */
  function waxChip() { return `<span class="meta-wax"><img src="${art("mat_wax_seal")}" alt=""><b>${store.wax}</b><small>mühür mumu</small></span>`; }
  function upgradesSheet() {
    const wrap = el("div", "meta-upgrades");
    const head = el("div", "meta-sheet-head", `${waxChip()}<p>Mumlar her seferin sonunda arşive dökülür. Geliştirmeler bütün kahramanlara işler.</p><button type="button" class="btn meta-armory">Silah cephaneliğine bak →</button>`);
    head.querySelector(".meta-armory").addEventListener("click", () => {
      document.querySelector('[data-open-book="codex"]')?.click();
      requestAnimationFrame(() => document.querySelector('#errata-book [data-codex-category="weapons"]')?.click());
    });
    const grid = el("div", "meta-upgrade-grid");
    UPGRADES.forEach((u, i) => {
      const level = lvl(u.id), max = u.cost.length, next = u.cost[level];
      const card = el("article", `meta-upgrade${level >= max ? " is-max" : ""}${level ? " is-owned" : ""}`);
      card.style.setProperty("--i", i);
      card.innerHTML = `<img src="${art(`meta_${u.id}`)}" alt=""><div class="meta-upgrade-copy"><b>${u.name}</b><span>${level ? u.desc(level) : u.step}</span><span class="meta-pips">${u.cost.map((_, k) => `<i class="${k < level ? "on" : ""}"></i>`).join("")}</span></div>`;
      const buy = el("button", "btn meta-buy");
      buy.type = "button";
      if (level >= max) { buy.textContent = "Tamamlandı"; buy.disabled = true; }
      else { buy.innerHTML = `<img src="${art("mat_wax_seal")}" alt="">${next}`; buy.disabled = store.wax < next; buy.title = `Sonraki: ${u.desc(level + 1)}`; }
      buy.addEventListener("click", () => {
        if (store.wax < next) return;
        store.wax -= next; store.upgrades[u.id] = level + 1; save();
        sounds?.playTone?.(660, "triangle", 0.16, 0.16);
        const fresh = upgradesSheet();
        wrap.replaceWith(fresh);
        fresh.querySelectorAll(".meta-upgrade")[i]?.classList.add("is-bought");
      });
      card.append(buy);
      grid.append(card);
    });
    wrap.append(head, grid);
    return wrap;
  }
  function achievementsSheet() {
    const wrap = el("div", "meta-achievements");
    const done = ACH.filter(a => store.achievements[a.id]).length;
    wrap.append(el("div", "meta-sheet-head", `${waxChip()}<p><b>${done} / ${ACH.length}</b> başarım mühürlendi.</p>`));
    // Sera's letters: the next three seals to earn, and the last one earned.
    const letters = el("div", "meta-letters");
    const open = ACH.filter(a => !store.achievements[a.id]).slice(0, 3);
    const last = ACH.filter(a => store.achievements[a.id]).sort((a, b) => store.achievements[b.id] - store.achievements[a.id])[0];
    open.forEach((a, i) => letters.append(el("article", "meta-letter", `<img src="${art("letter_quest")}" alt=""><div><small>GÖREV MEKTUBU</small><b>${a.name}</b><span>${a.desc}</span><em>Ödül: ${a.wax} mum</em></div>`)));
    if (last) letters.append(el("article", "meta-letter is-reward", `<img src="${art("letter_reward")}" alt=""><div><small>ÖDÜL MEKTUBU</small><b>${last.name}</b><span>Sera mührünü arşive işledi.</span><em>+${last.wax} mum alındı</em></div>`));
    letters.querySelectorAll(".meta-letter").forEach((n, i) => n.style.setProperty("--i", i));
    wrap.append(letters);
    const grid = el("div", "meta-ach-grid");
    ACH.forEach((a, i) => {
      const on = !!store.achievements[a.id];
      const card = el("article", `meta-ach${on ? " is-on" : ""}`);
      card.style.setProperty("--i", i);
      card.innerHTML = `<img src="${art(on ? `ach_${a.id}` : `ach_${a.id}_locked`) || art(`ach_${a.id}`)}" alt=""><b>${a.name}</b><span>${a.desc}</span><em>+${a.wax}</em>`;
      grid.append(card);
    });
    wrap.append(grid);
    return wrap;
  }

  /* keep panels in sync with the game's own screens ---------------------- */
  function watch() {
    const shop = document.getElementById("shop-screen");
    if (shop) new MutationObserver(() => { if (shop.style.display !== "none") renderShopPanel(); }).observe(shop, { attributes: true, attributeFilter: ["style"] });
    const prep = document.getElementById("errata-preparation");
    if (prep) new MutationObserver(() => { if (!prep.hidden) renderPreparation(); }).observe(prep, { attributes: true, attributeFilter: ["hidden"] });
    renderPreparation();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watch); else watch();

  window.GrimoireMeta = {
    // hooks
    applyRunStart, onRunBegin, onWaveStart, onWaveEnd, onRunEnd, decorateSummary, onEnemySpawn, affixBoost, decorateElite, onEliteCheck,
    onKill, onPlayerHurt, tryRevive, update, drawEnemyMarks, inkFactor, priceFactor, xpFactor, arenaSilenced, onQuiz, onRedeem, buyCardDirect,
    commitChoice,
    // ui for the hub
    upgradesSheet, achievementsSheet, renderPreparation, toast,
    modes: () => MODES.map(m => ({ id: m.id, name: m.name, sub: m.sub, desc: m.desc, emblem: art(m.emblem), card: art(m.card), locked: !!(m.unlock && !m.unlock()), lockNote: m.lockNote || "" })),
    setMode(id) { const m = MODES.find(x => x.id === id); if (!m || (m.unlock && !m.unlock())) return false; store.mode = id; save(); renderPreparation(); document.dispatchEvent(new CustomEvent("grimoire:mode", { detail: id })); return true; },
    get wax() { return store.wax; }, get mode() { return run.started ? run.mode : mode(); },
    _debug: { store: () => store, run: () => run, unlock, UPGRADES, ACH, HEAT, CURSED, setWax: n => { store.wax = n; save(); } }
  };
})();

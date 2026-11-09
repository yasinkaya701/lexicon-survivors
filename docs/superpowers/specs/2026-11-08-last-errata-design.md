# LEXICON SURVIVORS — DESIGN.md (v2.0)

**Tasarım yönü:** **THE LAST ERRATA / SON DÜZELTME**  
**Görsel referans:** kullanıcı tarafından onaylanan 4 PNG (3 benzersiz görsel; üçüncü ve dördüncü dosyalar aynı görüntü).  
**Kaynak kod hedefi:** aktif web yayını = `gh-pages` (`index.html`, `game.js`, `questions.json`, `assets/`); Godot projesi = `main` (`scenes/`, `scripts/`, `project.godot`).  
**İnceleme tarihi:** 2026-11-08. Referanslarda yer alan sahne, karakter adları ve istatistikler otomatik olarak kanonik içerik değildir.

## Ana fikir

Bu bir **İngilizce öğrenme temalı horde survival** oyunu: baskı hataları ve dil yanlışları canavar, kelimeler güç, mürekkep ekonomi, kalem ve kitap savaş araçlarıdır. UI tek bir dünya içinden gelmeli: **kayıp sözlük arşivinin kırmızı kalemli editörlüğü**. Referanstaki “kitap + yer imi + editorial marks + filmik illüstrasyon” katmanlarının işlevi var; dekor baskın olmamalı.

**Kesin yasaklar:** yüzlerce altın bordür, random emoji, birbirine benzeyen neon kartlar, fantezi konsept renderını gerçekte çalışan game asset’i gibi kullanmak, bloklarla gerçek metni görsele gömmek, internetteki fontu izin yokken ZIP’e kopyalamak, gerçek olmayan istatistikler üretmek. Screen controls gerçek kod ile bağlanmalı.

## 1 · Dört görselin rolü

| Referans | Ne için | Ne için değil |
|---|---|---|
| [01 Character Select](references/01_CHARACTER_SELECT.png) | Büyük tipografi, editör notu kenarlıkları, 3 görünür dossier hiyerarşisi | “The Linguist/Editor/Grammarian” mevcut altı karakter yerine geçirilemez |
| [02 Main Menu](references/02_MAIN_MENU.png) | Sinematik açık kitap, logo işçiliği, bordo/parşömen kontrastı | Baştan sona render’ı UI background olarak yapıştırmak |
| [03 Word Codex](references/03_WORD_CODEX.png) | Çift sayfalı okunabilir sözlük, sol indeks, kırmızı düzeltme jestleri | Kodda var olmayan yetenekler ve etkileşimleri gerçek saymak |
| [04 Repeat](references/04_WORD_CODEX_REPEAT.png) | Kullanıcının gönderdiği dosya aynen saklandı | Yeni dördüncü tasarım değil; SHA-256 aynıdır |

![Referanslar](references/CONTACT_SHEET.jpg)

## 2 · Ana stil sistemi

### Yüzeyler ve oranlar

- **Katman 0:** arşiv gecesi, koyu mat mürekkep, ses/animasyon dahil ortam; canlı gameplay’de görünmez veya çok düşük yoğunluk.
- **Katman 1:** tek “büyük kitap” veya editör masası, yalnızca başlık / codex / story / sonuçta.
- **Katman 2:** bağlamsal parchment: yazılar için fiziksel ayırıcı, gölge için değil.
- **Katman 3:** oynanabilir buton, gerçek metin, tooltip, feedback. Süs eylemi örtemez.
- **Kompozisyon:** ana menüde ~40% cinematic art, ~45% UI, ~15% çevresel boşluk; dükkan/quiz’de tersine metin/karar hakim; HUD’da oyun alanının çoğu açık.
- **Sınır:** 1280×720 temel, 16:9 FHD art master; yapısal UI responsive CSS/Godot `Container`; 390×844 ve 844×390 test.

### Renk tokenleri (önerilen, gerçek görüntülerden yaratıcı yorum)

| İsim | Hex | İşlev |
|---|---|---|
| `ink-950` | `#110D10` | Kozmik/kütüphane zemin |
| `ink-850` | `#21191C` | Çerçeve içi koyu panel |
| `wine-900` | `#3D1620` | Ana CTA ve bordür gölgesi |
| `wine-700` | `#7C202D` | Primary CTA |
| `editor-red` | `#B63A3E` | Proofreading, yanlış, seçili alt çizgi |
| `paper-100` | `#F2E1C5` | Açık parchment okunabilir zemin |
| `paper-250` | `#E4CBA6` | Kitap kağıt gölgesi |
| `ink-text` | `#281A1A` | Açık yüzey üzeri ana metin |
| `antique-gold` | `#B9945C` | Minör dış çerçeve, asla ana tekstin tek kontrastı değil |
| `cool-teal` | `#49766E` | Doğru / destek / kontrast aksanı |
| `neutral-disabled` | `#8E8174` | Disabled text + farklı ikon |

**UI renk semantiği:** bordo = etkileşim, kırmızı = editör düzeltme/hata, yeşil/teal = doğru/iyileşme, altın = koleksiyon/kültürel değer, siyah = gizem; aynı semantikte tek palette kal. Kırmızı ve teal tek başına durum göstergesi olamaz, işaret + sözcük gerekir.

### Tipografi

- **Logotype ve ana menü başlıkları:** `Cinzel Bold` **veya** el düzenlemeli özel logotype SVG; gerçek uygulamada metinlerden ayrı, dekoratif wordmark. Google Fonts: https://fonts.google.com/specimen/Cinzel
- **Sayfa ve dossier başlıkları:** `Cormorant Garamond Semibold` veya `Spectral Semibold` (Türkçe karakter ve okunurluk test edilerek). https://fonts.google.com/specimen/Spectral
- **Uzun metin / kart açıklaması:** web’de halihazırda kullanılan **IBM Plex Serif**; font family ve Türkçe glyph kontrolü. `assets/fonts/ibm-plex/` içinde mevcut repo var.
- **Kontrol/hız/istatistik ve küçük sekme:** **IBM Plex Sans**; sayısal hizalama için **IBM Plex Mono**. Bu üç aile web projesinde hali hazırda local @font-face tanımlı.
- **Boyutlar:** h1 40–64 / h2 28–36 / kart başlığı 20–26 / body 15–18 / metadata 12–14 / HUD metadata 12–14; 12px altı gerçek içerik yok.
- **Dizgi:** 1.35–1.6 satır aralığı; Türkçe İ/ı, Ş/ş, Ğ/ğ, uzun “KARAKTER GELİŞİMİ” ve A1–C2 test.
- **Font dosyaları bu pakete dahil değil**; repo içindeki lisanslı IBM Plex fontları veya resmî kanallardan edinilen fontlarla uygulamaya alınmalı.

### Materyal ve görsel dil

- Parşömen **rahat okunabilir metin yüzeyidir**, her düğme için rastgele kirli kağıt kullanılmaz.
- Red proofreading marks: `circle`, `insert caret ^`, `strikeout`, `arrow`, `check`, `margin note`. Her biri gerçek feedback/seçim vurgularına bağlanmalı.
- Cilt köşeleri, wax seal, brass clip **yalnızca geniş ekran başlık veya codex gibi düşük frekanslı ekranlarda**. Canlı HUD’da max 1 işaret/grup.
- Gerçek karakter/enemy sprite’ları **pixelated** olarak render; yüksek çözünürlüklü kapak sanatı ayrı, tipografi/konsept ile açık arka plan katmanı.
- Dekor arkaplanı <2–4MB hedef web raster, modern WebP/AVIF seçenekleri; ağır 1672×941 PNG’ler runtime’da doğrudan sayfa olarak kullanılmaz.

## 3 · Komponent sistemi / exact behavior

| Bileşen | Normal | Hover/Focus | Selected | Disabled | Motion |
|---|---|---|---|---|---|
| `EditorButtonPrimary` | Wine panel + cream label | 2px ışıklı baskı kenarı, outline | basılı seal | gri kontrast + sebep | <=140ms |
| `DossierCard` | paper surface, black type | altın kenar değil, kağıt hafif aydınlanır | kırmızı daire ve ✔ | düşük kontrast + “kilitli” | <=150ms |
| `BookTab` | ince sekme + gerçek text | kırmızı underline | kırmızı bant + aria-selected | açıklama | none |
| `InkPriceTag` | damla ikon + mono sayı | - | satın aldı / fiyat | `Yetersiz Mürekkep` | none |
| `CorrectStamp` | yok | - | teal ✔ + “DOĞRU” | - | 160ms |
| `CorrectionStamp` | yok | - | kırmızı X + açıklama | - | 160ms |
| `DialogueLeaf` | açık sayfa, tek konuşmacı | - | panel index | skip var | 180ms |
| `HUDChip` | low-height dark tag | yalnız tıklanabilir olan vurgulu | state değişir | - | none |

## 4 · Ekran mimarisi ve mevcut özellikleri ayırma

Web `gh-pages` tek `index.html` DOM ve `game.js` içinde bir çok overlay + shop sekmesi kullanıyor. **Yeni route URL icat etme:** tasarımlar “screens” ama uygulamada overlay/section olabilir. Godot main birçok ekranı `CanvasLayer` olarak yönetiyor.

**Mevcut web:** `#title-screen`, `#archive-intro`, `#story-intermission`, `#chapter-transition-card`, `#hud`, `#boss-hp-container`, `#shop-screen` (6 tab), `#quiz-modal`, `#inventory-modal`, `#mistakes-modal`, `#mobile-quick-menu`, `#game-over-screen`, `#leaderboard-overlay`.  
**Yeni öneriler:** bağımsız Ana Menü navigasyon katmanı, Word Codex, Bestiary, Pause, ayrıntılı Settings, dünya haritası. **Mevcut Godot** `title_screen`, `main`, `hud`, `shop_ui`, `QuizModal`, `GameOverLayer`; Web parity garantisi yok.

### Ekran belgeleri

- [`00_archive_intro` — Arşiv açılışı / splash](screens/00_archive_intro/DESIGN.md) — Web mevcut, Godot için yeni
- [`01_main_menu` — Ana menü / The Last Errata](screens/01_main_menu/DESIGN.md) — Web için yeni navigasyon katmanı; web `#title-screen` hâlihazırda birleşik, Godot da birleşik
- [`02_character_selection` — Karakter seçimi / survivor dossiers](screens/02_character_selection/DESIGN.md) — Web mevcut (6 karakter); Godot main sınırlı (3 karakter)
- [`03_learning_and_difficulty` — Öğrenme seviyesi ve zorluk](screens/03_learning_and_difficulty/DESIGN.md) — Web mevcut; Godot yalnızca 3 zorluk modunu destekliyor
- [`04_run_options` — Sefer hazırlığı / run tercihleri](screens/04_run_options/DESIGN.md) — Web başlık ekranında mevcut; Godot farklı kapsamda
- [`05_live_hud` — Oyun içi HUD / battle](screens/05_live_hud/DESIGN.md) — Web ve Godot mevcut (kapsam farkları)
- [`06_boss_and_alerts` — Boss karşılaşması ve taktik uyarılar](screens/06_boss_and_alerts/DESIGN.md) — Web mevcut; Godot kısmi
- [`07_chapter_transition` — Bölüm geçiş fişi](screens/07_chapter_transition/DESIGN.md) — Web mevcut; Godot biyom geçişi var, kart yok
- [`08_story_intermission` — Hikâye bölümü / çizgi roman yaprakları](screens/08_story_intermission/DESIGN.md) — Web mevcut; Godot main’de bu katman yok
- [`09_wave_shop_shell` — Dalga arası Scriptorium / dükkan kabuğu](screens/09_wave_shop_shell/DESIGN.md) — Web ve Godot mevcut; web kapsamı daha geniş
- [`10_word_cards` — Kelime kartları / quiz teklifi](screens/10_word_cards/DESIGN.md) — Web ve Godot mevcut
- [`11_quiz` — Quiz / karar ve sonuç](screens/11_quiz/DESIGN.md) — Web ve Godot mevcut
- [`12_weapon_armory` — Silah envanteri / arsenal](screens/12_weapon_armory/DESIGN.md) — Web ve Godot mevcut
- [`13_gadgets` — Gadget teçhizatı](screens/13_gadgets/DESIGN.md) — Web mevcut; Godot’ta gadgets veri/oyun mantığı var, shop sekmesi yok
- [`14_artifacts` — Yadigârlar / relics](screens/14_artifacts/DESIGN.md) — Web ve Godot mevcut
- [`15_character_skills` — Karakter gelişimi / skill tree](screens/15_character_skills/DESIGN.md) — Web mevcut; Godot main’de yok
- [`16_ink_market` — Mürekkep Pazarı / run teklifleri](screens/16_ink_market/DESIGN.md) — Web mevcut (premium isimli sekme); Godot main’de yok
- [`17_inventory` — Envanter / silah yuvaları](screens/17_inventory/DESIGN.md) — Web ve Godot kısmi (HUD, weapon state var; ayrı modal Web)
- [`18_mistake_notebook` — Hata Defteri / geri çağırma](screens/18_mistake_notebook/DESIGN.md) — Web ve Godot mevcut
- [`19_word_codex_proposed` — Kelime Kitabı / yaşayan sözlük](screens/19_word_codex_proposed/DESIGN.md) — ÖNERİ / repo gh-pages’te bağımsız Kelime Kitabı sayfası mevcut değil
- [`20_bestiary_proposed` — Bestiyer / Dil Canavarları](screens/20_bestiary_proposed/DESIGN.md) — ÖNERİ / doğrudan bağımsız bestiyer mevcut değil
- [`21_gameover_results` — Oyun sonu / yenilgi ve zafer](screens/21_gameover_results/DESIGN.md) — Web ve Godot mevcut; Web leaderboard ve otomasyon ekli
- [`22_leaderboard` — Liderlik tablosu / run defteri](screens/22_leaderboard/DESIGN.md) — Web mevcut; Godot main’de yok
- [`23_mobile_controls` — Mobil kontrol HUD / joystick](screens/23_mobile_controls/DESIGN.md) — Web mevcut; Godot kısmi
- [`24_quick_settings` — Hızlı ayarlar / mobil menü](screens/24_quick_settings/DESIGN.md) — Web mevcut; Godot HUD butonları var ama ayrı menü yok
- [`25_pause_menu_proposed` — Duraklatma menüsü / pause](screens/25_pause_menu_proposed/DESIGN.md) — ÖNERİ / `main` Godot ve web DOM’da bağımsız klasik pause ekranı doğrulanmadı
- [`26_settings_and_accessibility` — Ayarlar / erişilebilirlik](screens/26_settings_and_accessibility/DESIGN.md) — ÖNERİ / web hızlı ayarlar mevcut, bağımsız kapsamlı ekran yok
- [`27_archive_world_map_proposed` — Arşiv Atlası / dünya haritası](screens/27_archive_world_map_proposed/DESIGN.md) — ÖNERİ / dört biome ve hikâye konumları mevcut fakat ayrı world map yok

## 5 · Product & technical constraints

1. **Dört gerçek referans:** 03 ve 04 aynı görüntüdür; `references/` içinde ikisi de korunur. Bunlar **sanat yönü**, final UI sprite değildir.
2. **Game data:** gerçek kanonik değerler `gh-pages/game.js` (CHARACTERS, DIFFICULTIES, WEAPONS...) ve `assets/data/` JSON; Godot farklı olabilir. Mockuptaki üç karakter sınıfı fake/konsept.
3. **Input:** DOM gerçek focus + Escape/Enter/Space; Godot sinyaller korunur. Tap targets >=44×44, scroll trapped değersiz overlay yok.
4. **Motion:** prefers-reduced-motion; 100–200ms kısa durumlar; hareketli grain/blur efektleri yok. FPS düşüşü, alpha blend flood, filter blur yasak.
5. **Text & export:** 16:9 `1672×941` referans görseller yalnız style; buton etiketleri web DOM/Godot Label ile render edilir; text as image final art'a gömülmez.
6. **Responsive:** 1280×720, 1024×576, 844×390, 390×844, font zoom 200%, mouse, keyboard, touch.
7. **Data provenance:** fiyat, karakter canı, dalga süresi, XP, boss ismi ve envanter her zaman runtime data’dan.
8. **No implicit repo mutation:** belge üretildi; GitHub’a push/merge/deploy yapılmadı.

## 6 · Uygulama sırası

**P0** global tokens → title/character/level selector → shop cards/quiz → HUD/game over → mobil.  
**P1** story panel/chapter transition/inventory/skill/relic/gadget/leaderboard.  
**P2** codex/bestiary/ayrıntılı ayarlar/pause/world map; yeni fonksiyonel feature tanımları gerektirir.

## 7 · Kabul çıtası

- Kullanıcı 5 saniyede “Başla”, 2 saniyede seçiminden dönme/karakter değiştirme eylemini bulur.
- 25s dalgada ekranın en az %80’i aksiyona ayrılır; 4s inter-wave sayacı katılımcı erişimi engellemez.
- Üç büyük görsel örneğin stiline benzer ama **uygulama oyunun gerçek kimliği ve sprites** ile tutarlıdır.
- Kullandığımız her içerik sayfasında font, buton, ikon, grafik ayrı katman; her çözünürlükte okunur.
- Hatalı/boş/loading/disabled durumları dokümanda atlanmaz.

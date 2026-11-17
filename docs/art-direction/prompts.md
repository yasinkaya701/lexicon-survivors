# Prompt listesi

**Kullanım:** Her prompt'un sonuna `README.md` § 2'deki **STYLE LOCK** bloğu aynen eklenir. `[REF: …]` yazan yerlerde, ilgili onaylı referans görseli GPT'ye ek olarak verilir. Prompt'lar İngilizcedir; açıklamalar Türkçedir.

**Üretim sırası:**

1. Referans sayfaları (A)
2. Kahraman portreleri (B)
3. Başlık anahtar görseli (C)
4. Boss'lar (D)
5. Düşmanlar (E)
6. Arena (F)
7. NPC ve ifade setleri (G)
8. Eşya ikonları (H)
9. Hikâye panelleri (I)
10. Mağaza görselleri (J)

---

## A. Referans model sayfaları

Boyut 2048×1280, `art-source/ref/`. Her biri tek karakter. Önden, yandan ve arkadan tam boy görünüm, üç yüz ifadesi ve imza eşyanın yakın planı. Düz, koyu umber zemin.

| ID | Karakter | Prompt gövdesi |
|---|---|---|
| REF-INKY | Inky | Character model sheet of Inky, a young adult archive scribe (early twenties, androgynous, slight build). Wide-brimmed pointed hat in faded ink-navy with a tarnished brass band and a single grey quill pinned to it; short navy capelet over a scholar's coat with ink-stained cuffs; satchel of rolled slips; holds a long quill like a rapier. Unruly brown curls, freckles, determined tired eyes. Front, three-quarter, back; three expressions: resolve, grief, defiance; close-up of the quill nib dripping red ink. |
| REF-QUILL | Quillmaster | Model sheet of Quillmaster, a lean man in his late twenties, duelist of letters. Short-brimmed hat with a single dark feather, wine-red long coat with tarnished brass buttons, black gloves, a thin quill-rapier with a steel nib point. Dark hair tied back, sharp jaw, a scar through one eyebrow. Expressions: controlled, guilty, furious. Close-up: an unsealed letter with a broken red wax seal. |
| REF-KNIGHT | Word Knight | Model sheet of the Word Knight, a broad man in his thirties in dented, blackened plate armour, a short blood-red plume on a visored helm, a deep teal tattered cloak. Carries a heavy shield made from a bound dictionary cover with brass corners and a broad blade. Grounded, immovable stance. Expressions (helm off): stern, ashamed, resolved. Close-up: the shield's brass corner protector and rivets. |
| REF-RUNE | Rune Sorceress | Model sheet of the Rune Sorceress, an adult woman in her thirties, midnight-violet layered robes, a hood edged with a crescent-shaped brim, a cracked family seal on a chain. Violet light is painted as soft flat colour on her hands, never as glow particles. Long dark hair, tired proud eyes. Expressions: focused, mourning, fierce. Close-up: the cracked seal. |
| REF-ALCH | Alchemist | Model sheet of the Alchemist, an adult woman in her late twenties, moss-green hood and mantle, leather apron and belt of glass vials (one blood-red), round brass lens on a strap over one eye, burn scars on her fingers. Brown wavy hair. Expressions: analytical, desperate, wry smile. Close-up: a stoppered vial holding a tiny painted wisp of a voice. |
| REF-SHADOW | Shadow Scribe | Model sheet of the Shadow Scribe, a slim figure in a black hood and wrapped scarf covering the lower face, one pale cold-blue eye visible, a dried-blood-red sash, a narrow calligraphy katana with an ink-black blade. His shadow on the floor has its own independent pose. Expressions (eyes only): wary, lost, cold. Close-up: the katana guard shaped like an ink pot. |
| REF-NERIS | Neris | Model sheet of Neris, an adult archivist in her forties, dark wavy hair tied low with one silver forelock, green eyes, a small ink mark on her left cheek, forest-green archivist coat with cream collar, antique brass key pendant. Her outline is slightly erased at the edges — a few strokes fade to white paper. Expressions: warm, guarded, haunted. |
| REF-BLANK | Blank Page | Model sheet of Blank Page, the antagonist: a tall, faceless archivist made of layered blank paper, pale bone-white (#F4F1EA) with deep black negative space. Where the face should be there is a smooth folded page. Long paper sleeves end in a single red editor's pen. Everything near it is being erased into white. Calm, elegant, terrifying. Three poses: standing, reaching, erasing. |

---

## B. Kahraman portreleri (seçim ekranı ve oyun sonu)

Boyut 1200×1600 (3:4), `assets/ui/grimoire/portraits/<id>.webp`. Bu görseller mevcut anime portrelerin yerine geçer. Kompozisyon bel üstü, kahraman sola bakıyor. Alt üçte bir koyu bırakılır, çünkü arayüz ismi oraya yazıyor.

| ID | Prompt gövdesi |
|---|---|
| POR-INKY | [REF: REF-INKY] Half-length portrait of Inky in a candlelit archive aisle, holding the long quill across the chest, hat brim casting a hard shadow over the eyes, a torn catalogue slip in the other hand. Background: towering black shelves dissolving into darkness. Lower third left dark for text. |
| POR-QUILL | [REF: REF-QUILL] Half-length portrait of Quillmaster in a dueling guard, quill-rapier raised, a sealed letter tucked in the coat; candle to his right. |
| POR-KNIGHT | [REF: REF-KNIGHT] Half-length portrait of the Word Knight behind his dictionary shield, visor up, gaze lowered, standing before a barred gate of the forbidden stacks. |
| POR-RUNE | [REF: REF-RUNE] Half-length portrait of the Rune Sorceress with one hand raised, violet painted light pooling in the palm, the cracked seal hanging at her throat. |
| POR-ALCH | [REF: REF-ALCH] Half-length portrait of the Alchemist lifting a vial to the brass lens, studying it; shelves of jars behind her. |
| POR-SHADOW | [REF: REF-SHADOW] Half-length portrait of the Shadow Scribe drawing the katana a hand's width; on the wall behind him his shadow is already fully drawn. |

---

## C. Başlık anahtar görseli

| ID | Boyut / Dosya | Prompt |
|---|---|---|
| KEY-TITLE | 2560×1440 · `assets/ui/grimoire/title-key.webp` | [REF: REF-BLANK, REF-INKY] Cinematic wide view of the Library of Lost Margins at midnight: gothic shelves forty metres high, iron galleries, a great rose window letting in cold moonlight. On the right two-thirds, Blank Page stands far away on a balcony and a wave of white erasure is spreading across the shelves behind it, books turning to blank paper. In the foreground, small and lit by a single candle, Inky looks up. The left third of the frame is deep shadow and nearly empty (the logo sits there). Paper flakes drift upward. |
| KEY-SHOP | 2560×1440 · `assets/ui/grimoire/scriptorium.webp` | An abandoned scriptorium between waves: long desks, guttering candles, cages of chained books, a brass card catalogue cabinet with open drawers; quiet, warm, safe. Centre kept dark and calm for interface cards. |
| KEY-GAMEOVER | 2560×1440 · `assets/ui/grimoire/erased.webp` | A single archive desk being erased into pure white from the right edge; the hero's quill lies on the desk, half of it already blank paper. |

---

## D. Boss'lar

Her boss için iki çıktı üretilir:

- **Kart:** 1200×1600, `assets/ui/grimoire/bosses/<id>.webp`. Boss tanıtım kartında ve bestiary'de kullanılır.
- **Sprite parçaları:** şeffaf PNG, 1024×1024, `art-source/sprites/bosses/<id>/`.

Ortak prompt şablonu:

> `Full-figure boss illustration of <NAME>, <DESIGN>. Setting hint: <PLACE>. Pose communicates the attack: <ATTACK>. Strong silhouette, menacing scale, candle and moonlight rim light.`

| ID | NAME | DESIGN | PLACE | ATTACK |
|---|---|---|---|---|
| BOSS-05 | The Red Inspector | gaunt magistrate in crimson robes, face hidden by a tall red editor's cap, wields a giant red pen like a halberd; his robes are stitched from crossed-out pages | Hall of Reversed Verdicts | slams the pen to draw red lines across the floor |
| BOSS-10 | The Unfinished Giant | colossus of stacked shelves and half-written sentences, chains of unfinished lines hanging from its arms, one side of its body missing | Bridge of Suspended Sentences | stomps causing quake rings |
| BOSS-15 | Contradiction | two-headed ogre whose heads argue, stitched together down the middle, one half bone-white and one half black | Courtyard of Two Truths | bursts in a ring of opposing shards |
| BOSS-20 | The Two-Voiced Harpy | harpy whose two mouths whisper different names, paper feathers, quill talons | Whispering Shaft | fans of feathers in a cone |
| BOSS-25 | The Lexicon Dragon | serpentine dragon whose rings are made of bound book spines, lost words trapped inside its body as dark lines | Dome of Lost Margins | orbiting rings of pages |
| BOSS-30 | The Restless Reaper | hooded reaper made of one endless run-on scroll, never stops moving, scythe blade is a long ruler | Corridor of Endless Stacks | long dashing charges |
| BOSS-35 | The Borrowed Face | mimic wearing a gallery of mismatched portrait faces on its body like masks | Gallery of Wrong Portraits | mirrors the hero's attacks |
| BOSS-40 | The Wordless Mouth | a pit-creature that is mostly a vast silent mouth sewn shut with threads, names sinking into it | Pit of the Nameless | gravity pull towards its centre |
| BOSS-45 | The Final Stop | phantom in a theatre mask shaped like a full stop, cloak of closed curtains | Theatre of Ended Sentences | crossfire of black dots |
| BOSS-50 | The Double Negation | drake with two heads facing opposite directions, each devouring the other's tail | Rift of Two Denials | tears rifts in the floor |
| BOSS-55 | Reversed Reflection | phantom that is its own mirror image, walking up a staircase that returns to itself | Returning Staircase | projectiles that return |
| BOSS-60 | The Repeating Twin | identical twins moving in perfect echo, one slightly faded | Room of Repetition | echoed attacks a beat later |
| BOSS-65 | Dangling Clause | a hanged figure of tangled conjunctions dangling from chains, limbs like loose ropes | Hall of Unbound Conjunctions | snares that tie the hero |
| BOSS-70 | The Pale Corrector | spectral scribe of bone-white ink who silently fixes letters, carries a scalpel-pen | Court of the Single Letter | shards of broken letters |
| BOSS-75 | The Literal Flame | small grinning imp of living candle flame juggling proverbs as fireballs | Furnace of Idioms | scattering embers |
| BOSS-80 | The Red Redactor | the Red Inspector reborn as a rogue: robes torn, red pen broken and re-forged into twin blades, half his face bandaged | Archive of Severed Testimony | severing slashes |
| BOSS-85 | The Twofold Truth | the Contradiction ogre split cleanly into two separate halves fighting side by side | Two Halls Side by Side | splits the arena |
| BOSS-90 | The False Neris | [REF: REF-NERIS] a perfect copy of Neris with a blank paper face and red ink tears | Room of Copied Trust | eclipse of darkness |
| BOSS-95 | The Unwritten | a blooming void flower of blank pages, a silent storm of white | Hall Before Silence | blooms of erasure |
| BOSS-100 | Omega, the Last Word | [REF: REF-BLANK] Blank Page wearing the Lexicon Dragon's rings as a mantle, paper body crowned with every red pen of the archive | Heart of the Counter-Catalogue | three phases: paper body, dragon mantle, erasing the arena |

---

## E. Düşmanlar (oyun içi sprite)

Şeffaf PNG, 1024×1024, kesme parçalar: gövde / kafa / sol kol / sağ kol / silah ayrı katmanlarda. Hedef `art-source/sprites/enemies/<id>/`; oyuna girecek dosya 128×128 `assets/sprites/grimoire/enemies/<id>.png`.

Ortak şablon:

> `Game enemy sprite, top-down three-quarter view, <DESIGN>, bold readable silhouette, transparent background, delivered as separate layers: body, head, arms, weapon.`

| ID | DESIGN |
|---|---|
| EN-GOBLIN | Grammar Goblin: hunched goblin wearing a torn book as armour, carrying a broken pen spear |
| EN-SLIME | Typo Slime: a blot of living ink with misplaced letters drowning inside as dark shapes |
| EN-SPLINTER | Typo Splinter: a jagged shard of a broken page, skittering on paper legs |
| EN-SPECTRE | Spelling Spectre: a pale hooded wisp of corrected ink |
| EN-PUNCT | Punctuation Phantom: a floating comma-shaped wraith |
| EN-PALIN | Palindrome Phantom: a symmetrical ghost identical on both sides |
| EN-TAUT | Tautology Twin: two small identical imps joined at the hand |
| EN-OXY | Oxymoron Ogre: small ogre half bone-white half black |
| EN-MIMIC | Malapropism Mimic: a book chest with a toothy mouth and wrong labels |
| EN-IMP | Idiom Imp: a grinning candle imp |
| EN-HARPY | Homophone Harpy: a small two-voiced paper harpy |
| EN-DRAKE | Double Negative Drake: a small two-headed paper drake |
| EN-DANGLE | Dangling Modifier: a dangling puppet on loose threads |
| EN-VOID | Vocabulary Void: a small floating mouth sewn shut |

---

## F. Arena (dört kanat)

Zemin karesi 1024×1024 (kenarları dikişsiz tekrar edecek şekilde). Çerçeve dekoru ise 3200×2400 tek görsel, ortası boş ve koyu. Dosyalar `assets/sprites/grimoire/arena/`.

| ID | Prompt |
|---|---|
| AR-I-FLOOR | Seamless top-down floor tile: worn black-and-umber stone of a gothic reading hall, scattered torn catalogue slips, dried ink stains, faint candle wax drips. Low contrast so characters read on top. |
| AR-I-FRAME | Top-down arena border for the Reading Hall: tall dark bookshelves along the edges, reading desks with candles, iron railings; centre left empty and dark. |
| AR-II-FLOOR | Seamless floor tile: cracked flagstones of the Word Corridor with rusted iron grates and pale green moss in seams. |
| AR-II-FRAME | Border for the Word Corridor: arched niches with chained books, hanging lanterns, iron gates. |
| AR-III-FLOOR | Seamless floor tile: dark observatory floor inlaid with brass star-map lines and moonlight pools. |
| AR-III-FRAME | Border for the Astral Observatory: brass orreries, telescopes, tall windows of cold moonlight. |
| AR-IV-FLOOR | Seamless floor tile: stone being erased into blank white paper at random patches, crisp edges between stone and white. |
| AR-IV-FRAME | Border for the Last Page: shelves and walls half dissolved into blank white paper, floating torn pages. |

---

## G. NPC'ler ve ifade setleri (hub diyaloğu)

Büst, 1024×1024, şeffaf arka plan, `assets/ui/grimoire/faces/<id>-<ifade>.webp`. Her karakter için beş ifade: `neutral`, `angry`, `sad`, `smile`, `shock`. Altı kahraman ve Neris için önce `REF-*` sayfası verilir; diğer NPC'ler aşağıda tanımlanmıştır.

Şablon:

> `[REF: …] Bust portrait of <NAME>, expression: <EXPRESSION>, three-quarter view facing right, transparent background, consistent with the reference sheet.`

| NPC | Tanım (prompt'a eklenecek) |
|---|---|
| Mira | adult cartographer, short copper-brown curls, amber eyes, indigo scarf, ink-stained cuffs, a small star-shaped pen charm |
| Ada | young adult letter-maker, auburn bob, red-brown work jacket, two-knot pale thread bracelet, alert posture |
| Lale | older woman, silver-lavender hair, violet mantle, weathered hands, cracked family seal |
| Lio | young man, unruly chestnut curls, freckles, faded sea-green lab coat, mismatched glove cuffs |
| Shadow Double | the Shadow Scribe's exact build and hood with a wine-red rim instead of blue, his own posture |
| Sera | courier with a notched pair of scissors and an orange route satchel |
| Mara | former gate witness with a repaired lantern of mismatched glass |
| Yel | map restorer with an inverted compass and two folded routes |
| Tavi | former lab assistant with a cracked measuring cup, distrustful look |
| Lira | stripped former guard with a short baton and worn slate-grey armour |
| Ink Child | young adult courier in a plain charcoal coat with a stitched note pouch |
| Silent Mechanic | engineer with calipers and a signalling rod, never speaks, expressive hands |

---

## H. Eşya ikonları (madalyon içi)

512×512, şeffaf, nesne ortalanmış. Dosyalar `assets/ui/grimoire/items/<id>.webp`. Arayüz bunları pirinç halkalı madalyona yerleştiriyor, bu yüzden nesne dairenin %70'ini doldurmalı.

Şablon:

> `Single object icon, painted, centred, transparent background: <OBJECT>.`

**Silahlar**

| Silah | Nesne |
|---|---|
| İğne Ucu Kalem | a needle-tipped steel pen |
| Hece Saçması | a blunderbuss loaded with syllable pellets |
| Prizma Işını | a brass prism lantern |
| Ünlem Mayını | an exclamation-shaped iron mine |
| Sözlük Muhafızı | a dictionary-cover shield |
| Bulmaca Balistası | a small crossword-grid ballista |
| Tire Yörüngesi | a boomerang shaped like a dash |
| Mürekkep Ocağı | an ink brazier |
| Eşanlamlı Harcı | a mortar of twin pestles |
| Tırnak Salvosu | twin quotation-mark daggers |
| Kalem Hilali | a crescent quill blade |
| Raf Bekçisi | a tiny turret made of a bookshelf |
| Atıf Küresi | a citation orb in a brass cage |
| Zayıf Nokta Rayı | a sniper rail pen |
| Dipnot Tezgâhı | a footnote loom |

**Gereçler ve yadigârlar**

| Eşya | Nesne |
|---|---|
| Silgi Sıçrayışı | a winged eraser |
| Son Nokta | a black iron full-stop orb |
| Zaman Virgülü | a comma-shaped hourglass |
| Fihrist Kalkanı | an index-tab shield |
| Arşiv Çekimi | a magnet of bound pages |
| Fiş Fırtınası | a whirl of catalogue slips |
| Palimpsest Adımı | boots over a scraped page |
| Palimpsest Silgisi | a worn eraser |
| Sansür Dalgası | a black censor bar as a blade |
| Kenar Düzeltisi Merceği | a margin lens |
| Altın Mürekkep Kalbi | a golden inkwell heart |
| Dipnot Çizmeleri | footnote boots |
| Kırmızı Çizgi El Kitabı | a red-ruled handbook |
| Arşiv Rafı | a small shelf |
| Arşivcinin Pusulası | an archivist's compass |
| Gece Hattatının Kahvesi | a night calligrapher's coffee cup |
| Hafıza İpliği | a spool of memory thread |
| İşaret Prizması | a signal prism |

---

## I. Hikâye anahtar panelleri (~66)

1600×900 (16:9), `assets/ui/grimoire/story/<id>.webp`. Arayüz bunları cilt çerçevesine koyuyor. Şablon:

> `[REF: ilgili REF-*] Cinematic story panel: <BEAT>. Wide shot, strong single light source, no text.`

**Açılış**

| ID | BEAT |
|---|---|
| ST-OPEN-1 | the Library at midnight, a red line being drawn across the catalogue |
| ST-OPEN-2 | names on shelves fading to white paper |
| ST-OPEN-3 | Neris's faint outline in the margin, holding a candle out to the hero |

**Kanat girişleri** (her kanat için iki panel)

| ID | BEAT |
|---|---|
| ST-WING-I-1 / ST-WING-I-2 | Reading Hall: doors opening, red-lined desks |
| ST-WING-II-1 / ST-WING-II-2 | Word Corridor: chained books whispering, iron gates |
| ST-WING-III-1 / ST-WING-III-2 | Observatory: moonlight, orreries frozen mid-turn |
| ST-WING-IV-1 / ST-WING-IV-2 | Last Page: the world erased to white at the edges |

**Boss tanıtımları:** her boss için bir panel, `ST-BOSS-<dalga>`. D bölümündeki tanımlar kullanılır; boss mekânında, kahramana yukarıdan bakarken çizilir.

**İlk zafer ve twist**

| ID | BEAT |
|---|---|
| ST-WIN-1 | dawn light, Blank Page falling |
| ST-WIN-2 | the erasure begins again |
| ST-WIN-3 | Neris reading the first correction rule in her own handwriting |
| ST-WIN-4 | Neris turning away |
| ST-WIN-5 | the hero catching her sleeve |
| ST-WIN-6 | the hub's walls half white |

**Emanetler:** her kahraman için üç panel (ilk, ikinci ve üçüncü emanet anı), ID'ler `ST-<kahraman>-R1..R3`.

| Kahraman | Emanet anları |
|---|---|
| Inky | the star dot, the true map, the open door |
| Quillmaster | the two-tap signal, the address, the unsealed letter |
| Word Knight | the erased crest, the duplicate order, the shared watch |
| Rune Sorceress | the ash seal, the two memories, the shared light |
| Alchemist | the numbered record, the crooked label, the released bottle |
| Shadow Scribe | the borrowed signature, the shadow's own pose, the two signatures |

**Kişisel finaller:** her kahraman için iki panel, `ST-<kahraman>-F1/F2`. `assets/data/story_arc.json` içindeki final cümlelerine göre çizilir.

**Gerçek son**

| ID | BEAT |
|---|---|
| ST-END-1 | the counter-catalogue: many hands writing in one open book |
| ST-END-2 | Neris writing her own name |
| ST-END-3 | Blank Page offered a pen and the page of objections |
| ST-END-4 | the outer door of the library open at dawn |
| ST-END-5 | the hub fully restored with all witnesses |
| ST-END-6 | a final close-up of a page with many different handwritings as abstract lines |

---

## J. Mağaza ve pazarlama

| ID | Boyut | Prompt |
|---|---|---|
| MK-CAPSULE | 920×430 | [REF: REF-INKY, REF-BLANK] Steam capsule: Inky in the foreground with the quill raised, Blank Page looming behind erasing the library into white; leave the upper-left area dark for the logo. |
| MK-HERO | 3840×1240 | Library hero banner, wide, the six heroes as small silhouettes on a gallery facing the wave of erasure. |
| MK-SHOT-FRAME | 1920×1080 | Clean background plate for marketing screenshots: dark archive with a central lit area. |

# Lexicon Survivors: The Last Errata · Sanat yönü (Grimoire)

Bu klasör, oyunun bütün görsellerinin GPT ile üretilmesi için gereken kuralları ve prompt'ları içerir.

- `README.md`: art bible. Stil kilidi, palet, yasaklar, üretim ve onay süreci.
- `prompts.md`: üretilecek her görselin ID'si, dosya yolu, boyutu ve prompt'u.

Arayüz bu dile göre çizildi (`assets/ui/grimoire/grimoire.css`). Arayüz şu an eski görselleri sepya ve karartma filtresiyle bu dile yaklaştırıyor. Yeni görseller geldiğinde bu filtreler hafifletilebilir.

## 1. Tek cümlelik yön

**Gece yarısı, yasak bir kitabın içi: mum ışığında gotik bir arşiv, kemik rengi sayfalar, eskimiş pirinç, kan kırmızısı mürekkep. Ve her şeyi beyaza silmeye çalışan yüzsüz bir sayfa.**

Referans aile: Darkest Dungeon'ın ağır mürekkep gölgeleri, Hades'in güçlü silüetleri ve okunaklılığı, Mike Mignola'nın siyah lekeleri. Anime, parlak fantezi render'ı ve "AI fantasy" yüzü bu dünyada yoktur.

## 2. Stil kilidi (her prompt'un sonuna aynen eklenir)

```
STYLE LOCK — Lexicon Survivors: The Last Errata (Grimoire).
Dark gothic hand-painted 2D illustration in the tradition of Darkest Dungeon and Mike Mignola: large shapes of solid black ink, hard chiaroscuro from a single warm candle source, visible dry-brush and ink-wash texture on toned paper, confident inked contour lines of varying weight. Limited palette: near-black (#070609), deep umber (#15100D), bone (#EDE3CD), tarnished brass (#B08A4E) and blood-ink red (#B3201A); one cold accent (#4F6B78) only for moonlight. Faces are adult and characterful with angular planes, heavy brows and painted shadows — never anime, manga, chibi or doll-like; no big glossy eyes, no smooth airbrushed skin. No glow haze, no bloom, no lens flare, no sparkles, no particle confetti, no 3D render look, no photorealism. Strong readable silhouette that survives at 64 pixels. No text, letters, numbers, runes that read as letters, logos, signatures or watermarks anywhere; books and pages show only abstract dark lines.
```

## 3. Palet

| Ad | Hex | Kullanım |
|---|---|---|
| Gece | `#070609` | En koyu gölge, boşluk |
| Deri | `#15100D` | Gölgede kalan yüzeyler |
| Kemik | `#EDE3CD` | Işık alan ten, kâğıt, vurgu ışığı |
| Pirinç | `#B08A4E` | Metal, mum ışığının sıcak yansıması |
| Kan mürekkebi | `#B3201A` | Düzeltme, yara, Kırmızı Müfettiş ailesi, kahramanların tek sıcak aksanı |
| Ay | `#4F6B78` | Yalnızca pencereden düşen soğuk ışık |
| Blank Page beyazı | `#F4F1EA` | Yalnızca Blank Page ve silinen şeyler |

Kahraman imza renkleri. Her kahraman bu tonu kostümünde, sönük ve boyalı olarak taşır:

| Kahraman | İmza | Silüet anahtarı |
|---|---|---|
| Inky | Mürekkep laciverti | Sivri geniş şapka, tüy kalem, kısa pelerin |
| Quillmaster | Şarap kırmızısı | Tüylü kısa şapka, ince tüy-kalem kılıç, düellocu duruşu |
| Word Knight | Kararmış çelik ve camgöbeği pelerin | Kısa kırmızı sorguçlu miğfer, sözlük kalkanı, ağır duruş |
| Rune Sorceress | Menekşe | Hilal kenarlı başlık, katmanlı cüppe, menekşe rün ışığı (parıltısız, boyalı) |
| Alchemist | Yosun yeşili | Kukuleta, pirinç büyüteç, kemerde şişeler |
| Shadow Scribe | Kurumuş kan kuşağı | İnce siyah kukuleta, kaligrafi katanası, tek soğuk göz |

## 4. Kesin yasaklar

Bunlardan birini içeren görsel reddedilir ve yeniden üretilir:

- **Anime / manga / AI fantasy yüzü.** Şu anki portrelerin hepsi bu yüzden değişecek.
- **Parıltı, sihir partikülü, bokeh, neon, ışık hüzmesi sisi.**
- **Yazı, harf, sayı, logo, okunur rün.** Oyundaki bütün metin koddan gelir.
- **Kahramanın kostümünün, saçının veya silüetinin panelden panele değişmesi.**
- **Renkli, doygun "mobil oyun" paleti.**

## 5. Üretim süreci

1. **Önce referans sayfaları.** `REF-*` model sayfaları üretilir ve onaylanır. Sonraki her prompt'ta o karakterin onaylı sayfası GPT'ye referans görsel olarak verilir.
2. **Bir istek, bir görsel.** Kontak sayfası istenmez.
3. **Kontrol listesi:**
   - Silüet referansla aynı mı?
   - Palet dışına çıkılmış mı?
   - Yazı veya logo var mı?
   - Yüz anime mi?
   - 64 px'e küçülünce okunuyor mu?
4. **Dosya yerleşimi.** Kayıpsız orijinal `art-source/` altında saklanır. Oyuna giden kopya WebP'dir (kalite 82). Yollar `prompts.md`'de verilmiştir.
5. **Arayüz entegrasyonu.** Görseller geldikçe `grimoire.css` içindeki `sepia(...) brightness(...)` filtreleri hafifletilir ve eski anime görsellerin yerini alır.

## 6. Oyun içi sprite kuralı

Savaş alanında karakterler 64–96 px görünür.

- **Kontur:** kalın tutulur. İç detay az, büyük ışık/gölge blokları net olmalı.
- **Animasyon:** kesme (cutout) parçalarla yapılır. Gövde, kafa, kollar ve silah ayrı şeffaf PNG katmanları olarak istenir. Kare kare animasyon GPT'den istenmez.
- **Düşmanlar:** biyomun tonunda, kan kırmızısı yalnızca Kırmızı Müfettiş ailesinde.

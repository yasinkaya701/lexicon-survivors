# Lexicon Survivors: The Last Errata · Sanat yönü

Bu klasör, oyunun bütün görsellerinin GPT ile üretilmesi için gereken kuralları ve prompt'ları içerir.

- `README.md`: art bible. Stil kilidi, palet, yasaklar, üretim ve onay süreci.
- `prompts.md`: üretilecek her görsel için ID, dosya yolu, boyut ve prompt.
- `../../tools/art/postprocess.py`: GPT çıktısını oyunun mürekkep paletine kilitleyen son işlem betiği.

Arayüz artık bu dile göre çizildi (`assets/ui/catalog/catalog.css`). Yeni görseller geldiğinde UI'daki "mürekkep baskısı" filtresi kaldırılabilir; görseller zaten bu stilde olacak.

## 1. Tek cümlelik yön

**Bir kütüphane kataloğunun gece yarısı: mavi-siyah mürekkep, soğuk beyaz karton, tek bir kırmızı düzeltme kalemi.**

Her görsel, 19. yüzyıl bir sözlüğün gravür illüstrasyonu ile modern bir çizgi romanın mürekkep çizimi arasında durur. Görüntü bir fotoğraf ya da boyama değil, **basılmış** bir şeydir.

## 2. Stil kilidi (her prompt'a eklenen blok)

Aşağıdaki blok `prompts.md`'deki her prompt'un sonuna **aynen** eklenir. Kısaltılmaz, değiştirilmez.

```
STYLE LOCK — Lexicon Survivors: The Last Errata.
Ink-and-engraving illustration printed on cool white card stock. Line work in blue-black ink (#18213A) with cross-hatching and stippling for shadow, the way a 19th-century dictionary or encyclopedia plate is engraved, drawn with the confidence of a modern comic inker. Flat paper white (#F6F5F0) for light. At most ONE spot colour from the subject's swatch, printed flat and slightly off-register, covering less than 20% of the image. Proofreading red (#CC2A1E) appears ONLY where the brief asks for it. No gradients, no airbrush, no glow, no bloom, no lens effects, no 3D render look, no glossy highlights, no anime or manga faces, no chibi proportions, no photorealism, no painterly smears. Realistic adult proportions, expressive but restrained faces, strong readable silhouette. No text, letters, numbers, captions, logos, signatures or watermarks anywhere in the image; any book, page or label shows only abstract ruled lines.
```

## 3. Palet ve renk kartelası

| Mürekkep | Hex | Kullanım |
|---|---|---|
| Mürekkep (mavi-siyah) | `#18213A` | Bütün çizgi ve gölge |
| Kâğıt | `#F6F5F0` | Işık, boşluk |
| Düzeltme kırmızısı | `#CC2A1E` | Yalnızca istenen yerlerde: düzeltme izleri, Kırmızı Müfettiş ailesi, Blank Page'e karşı çizilen çizgiler |
| Gece | `#0D121E` | Oyun içi zeminler ve ara sahnelerin karanlığı |

Her kahraman ve önemli karakter **tek bir spot renk** taşır:

| Karakter | Spot renk | Hex |
|---|---|---|
| Inky | Kobalt | `#2E4A8C` |
| Quillmaster | Şarap | `#7A2032` |
| Word Knight | Çelik-camgöbeği | `#2F5E5E` |
| Rune Sorceress | Menekşe | `#5B3F7A` |
| Alchemist | Yosun | `#55652F` |
| Shadow Scribe | Kurumuş kan | `#8E1F1A` |
| Neris | Orman yeşili | `#2F4A3A` |
| Blank Page | Yok. Sadece kâğıt beyazı ve negatif alan | — |
| Bosslar | Bölüm biyom rengi (aşağıda) | — |

Biyom renkleri:

| Kanat | Renk | Hex |
|---|---|---|
| I · Okuma Salonu | Okra | `#B8862E` |
| II · Söz Dehlizi | Pas yeşili | `#4F6B57` |
| III · Astral Gözlemevi | Lacivert | `#2E4A7A` |
| IV · Son Sayfa | Renk yok | — |

## 4. Kesin yasaklar

Bir görsel bunlardan birini içeriyorsa **reddedilir ve yeniden üretilir**:

- Anime, manga ya da "AI fantasy" yüzü. Büyük parlak gözler, kusursuz pürüzsüz cilt.
- Parıltı, ışık hüzmesi, bokeh, sihir partikülü bulutları, neon.
- Altın varak ve süslü fantezi çerçeveleri.
- Görsele gömülü harf, kelime, sayı, sahte yazı ya da logo. Oyunda bütün yazılar koddan gelir.
- Birden fazla spot renk, ya da spot rengin görselin yarısını kaplaması.
- Aynı karakterin kostümünün, saç renginin veya silüetinin panelden panele değişmesi.

## 5. Üretim süreci

1. **Referans önce.** Her karakter için önce `REF-*` model sayfası üretilir ve onaylanır. Sonraki bütün promptlarda bu sayfa referans görsel olarak GPT'ye verilir.
2. **Bir istek, bir görsel.** Kontak sayfası istenmez. Her ID ayrı üretilir.
3. **Son işlem zorunlu.** Her çıktı şu komuttan geçer:
   ```
   python3 tools/art/postprocess.py girdi.png cikti.png --spot "#2E4A8C"
   ```
   Betik görseli 2 mürekkep + 1 spot renk + isteğe bağlı kırmızıya kilitler, kâğıt dokusu ekler ve kenarları bastırır. Böylece farklı oturumlardan gelen görseller tek baskı turu gibi görünür.
4. **Kontrol listesi** (her görsel için):
   - Silüet referansla aynı mı?
   - Spot renk doğru ve tek mi?
   - Yazı veya logo var mı?
   - Yüz anime mi?
   - 64 px'e küçültüldüğünde hâlâ okunuyor mu?
5. **Dosya yerleşimi.** Kayıpsız orijinal `art-source/` altında saklanır. Oyuna giden kopya WebP'dir (kalite 82); yolu `prompts.md`'de verilen yoldur.

## 6. Oyun içi sprite kuralı

Savaş alanındaki karakterler ve düşmanlar küçük görünür (64–96 px). Bu yüzden:

- Kontur kalın tutulur (çıktı boyutunda 2–3 px eşdeğeri). Tarama ve noktalama yalnızca büyük gölge alanlarında kullanılır.
- Kahramanlar kendi spot renkleriyle, düşmanlar biyom rengiyle basılır. Kırmızı yalnızca Kırmızı Müfettiş ailesinde ve vurulma anında kullanılır.
- Animasyon, kesme (cutout) parçalarla yapılır: gövde, kafa, kollar ve silah ayrı katmanlar halinde, şeffaf PNG olarak istenir. Kare kare animasyon GPT'den istenmez.

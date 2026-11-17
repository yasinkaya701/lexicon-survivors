# Yeniden üretilecek görseller

Teslim edilen 1174 görsel 18 Kasım 2026'da otomatik ve göz kontrolünden geçti. Hepsi manifest'teki boyutla birebir uyuşuyor. Aşağıdakiler `tools/art/build_web_art.py` ile onarılamadı.

Orijinaller `codex/mobile-ipad-touch-layout` branch'inde, `assets/art/grimoire/` altında. Yeni görseli aynı yola koyup pipeline'ı yeniden çalıştırmak yeterli:

```
python3 tools/art/build_web_art.py --jobs 6 --src <orijinal assets/art/grimoire klasörü>
```

## Bozuk düşman ölüm şeritleri (ertelendi)

Model, tek sıralı 6 kare yerine 2×6'lık bir ızgara çizmiş. Ardından üst yarı kesilmiş ve bazı karelere sahte şeffaflık (damalı desen) girmiş. Boss dışı ölümler şimdilik oyunda kullanılmıyor.

- `enemies/dangling_modifier/death.png`
- `enemies/double_negative_drake/death.png`
- `enemies/punctuation_phantom/death.png`
- `enemies/run_on_reaper/death.png`
- `enemies/spelling_spectre/death.png`
- `enemies/syntax_titan/death.png`
- `enemies/typo_slime/death.png`
- `enemies/typo_splinter/death.png`
- `enemies/vocabulary_void/death.png`

Prompt'a eklenecek kural: *"Exactly 6 frames in ONE horizontal row, each 256×256, full figure inside every cell, real alpha transparency (no checkerboard)."*

## Kahraman dash şeritleri (kullanılıyor, iyileştirilebilir)

Figür hücre sınırını aşıyor, bu yüzden karelerin kenarı kesik görünüyor. Dash 0.25 saniye sürdüğü için oyunda kabul edilebilir durumda.

- `heroes/quillmaster/dash.png`
- `heroes/rune_sorceress/dash.png`
- `heroes/shadow_scribe/dash.png`
- `heroes/word_knight/dash.png`

## Pipeline'ın otomatik düzelttikleri

Bunlar için yeniden üretim gerekmiyor:

- Kâğıt arka plan: `heroes/word_knight/run`, `enemies/spelling_spectre/move`.
- Yarım ölçek: `heroes/quillmaster/run`, `heroes/quillmaster/dash`, `bosses/red_redactor/move`, `bosses/unwritten/attack`.
- İnce kutu çizgileri: `heroes/quillmaster/death`.
- Komşu kareden taşan parçalar: tüm karakter şeritleri.

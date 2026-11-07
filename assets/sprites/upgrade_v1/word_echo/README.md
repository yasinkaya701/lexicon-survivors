# Boss mistake-word echo art

Shared Web/Godot transparent SVG art for accumulated quiz mistakes appearing as boss minions.

- `word_echo_title_frame.svg` — 320×96 floating word/nameplate. Keep its center blank in the source image: the vocabulary string is drawn at runtime so long, Turkish, and newly accumulated words remain exact and readable. Recommended text safe area: x=24..296, y=26..70; use a narrow serif or mono font with a dark outline. Scale to about 160–250 px wide on a 64 px enemy.
- `echo_mark_quill.svg` — 64×64 scarlet quill-scar echo, for spelling/writing mistakes.
- `echo_mark_mirror.svg` — 64×64 green mirrored seal, for synonym/opposite confusion.
- `echo_mark_splinter.svg` — 64×64 violet fractured glyph, for grammar/structure mistakes.

The emblems are purposefully text-free and have transparent canvas edges, so combat code can tint/flash them without baking vocabulary into an image. They use the existing v1 monster palette and crisp, stepped outlines.

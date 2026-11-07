# Upgrade asset set v1

Runtime sprites shared by the Godot project and `build/web/`.

- `hero_*.png`: six playable characters, pixel-art 64×64.
- `monster_*.png`: four basic enemies, seven later-wave enemies, and two bosses, pixel-art 64×64.
- `arena_*.png`: three 256×256 stage floor tiles. The first stage keeps the existing seamless library parquet tile.
- `arena_frame_*.png`: four single-scene 4:3 arena illustrations, shared by Web and Godot. Each image is drawn once as the complete stage floor and perimeter at 2800×2100 world units; collision/play space remains centered at 2400×1800, with a clean 200×150-unit border.

Source illustrations live under `output/imagegen/backgrounds/frame/source-v3/`; original atlas references remain under `assets/arenas/source/`.
- Monster refresh v1 replaces all 18 runtime enemy portraits with distinct transparent 64×64 designs. Generation masters are in `output/imagegen/monsters/refresh-v1/`.

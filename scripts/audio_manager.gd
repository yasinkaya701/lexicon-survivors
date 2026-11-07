extends Node

const SAMPLE_RATE := 22050
const LOOP_SECONDS := 12.0
const BEAT_SECONDS := 0.75
const STAGE_ROOTS := [38, 36, 43, 34] # D, C, G, Bb
const CHORD_STEPS := [0, 5, 3, 10]
const MELODY_STEPS := [0, 3, 7, 10, 12, 10, 7, 5, 3, 7, 10, 14, 12, 10, 7, 3]

var music_player: AudioStreamPlayer
var cue_player: AudioStreamPlayer
var ambience_player: AudioStreamPlayer
var active_stage := -1
var active_loop: AudioStreamWAV
var _stage_tween: Tween
var _ambience_tween: Tween
var _sfx_players: Array[AudioStreamPlayer] = []
var _sfx_cursor := 0
var _main_theme: AudioStream
var _boss_theme: AudioStream
var _biome_themes: Array[AudioStream] = []
var _effect_stream_cache: Dictionary = {}
var _ambience_stream_cache: Dictionary = {}
var _last_effect_variant: Dictionary = {}
var _last_weapon_cue_at: Dictionary = {}
var _last_any_weapon_cue_msec: int = 0
var _boss_mode := false
var music_choice := "auto"
const BIOME_THEME_PATHS := [
	"res://assets/audio/music/biome_dark_library_theme.mp3",
	"res://assets/audio/music/magical_library_action_b.mp3",
	"res://assets/audio/music/magical_library_urgent_a.mp3",
	"res://assets/audio/music/magical_library_extreme_a.mp3"
]
const BIOME_AMBIENCE_PATHS := [
	"res://assets/audio/ambience/ambience_dark_library.wav",
	"res://assets/audio/ambience/ambience_dungeon_corridor.wav",
	"res://assets/audio/ambience/ambience_astral_observatory.wav",
	"res://assets/audio/ambience/ambience_void_sanctum.wav"
]
var _effect_paths := {
	"quill_blaster": ["res://assets/audio/weapons/weapon_quill_blaster_v1.wav", "res://assets/audio/weapons/weapon_quill_blaster_v2.wav", "res://assets/audio/weapons/weapon_quill_blaster_v3.wav"],
	"syllable_shotgun": ["res://assets/audio/weapons/weapon_syllable_shotgun_v1.wav", "res://assets/audio/weapons/weapon_syllable_shotgun_v2.wav", "res://assets/audio/weapons/weapon_syllable_shotgun_v3.wav"],
	"lexicon_beam": ["res://assets/audio/weapons/weapon_lexicon_beam_v1.wav", "res://assets/audio/weapons/weapon_lexicon_beam_v2.wav"],
	"punctuation_bomb": "res://assets/audio/weapons/weapon_punctuation_mine_drop.wav",
	"punctuation_bomb_detonation": "res://assets/audio/weapons/weapon_punctuation_mine_detonation.wav",
	"dictionary_blade": ["res://assets/audio/weapons/weapon_dictionary_blade_v1.wav", "res://assets/audio/weapons/weapon_dictionary_blade_v2.wav", "res://assets/audio/weapons/weapon_dictionary_blade_v3.wav"],
	"crossword_crossbow": ["res://assets/audio/weapons/weapon_crossword_crossbow_v1.wav", "res://assets/audio/weapons/weapon_crossword_crossbow_v2.wav", "res://assets/audio/weapons/weapon_crossword_crossbow_v3.wav"],
	"hyphen_boomerang": "res://assets/audio/weapons/weapon_hyphen_boomerang.wav",
	"ink_flamethrower": "res://assets/audio/weapons/weapon_ink_flamethrower.wav",
	"thesaurus_rocket": "res://assets/audio/weapons/weapon_thesaurus_rocket_launch.wav",
	"thesaurus_rocket_impact": "res://assets/audio/weapons/weapon_thesaurus_rocket_impact.wav",
	"quote_pistols": ["res://assets/audio/weapons/weapon_quote_pistols_v1.wav", "res://assets/audio/weapons/weapon_quote_pistols_v2.wav", "res://assets/audio/weapons/weapon_quote_pistols_v3.wav"],
	"calligraphy_katana": ["res://assets/audio/weapons/weapon_calligraphy_katana_v1.wav", "res://assets/audio/weapons/weapon_calligraphy_katana_v2.wav", "res://assets/audio/weapons/weapon_calligraphy_katana_v3.wav"],
	"scroll_turret": "res://assets/audio/weapons/weapon_scroll_turret_deploy.wav",
	"scroll_turret_fire": "res://assets/audio/weapons/weapon_scroll_turret_fire.wav",
	"rune_orb": "res://assets/audio/weapons/weapon_rune_orb.wav",
	"grammar_sniper": "res://assets/audio/weapons/weapon_grammar_sniper.wav",
	"word_loom": "res://assets/audio/weapons/weapon_rune_orb.wav",
	"hit": "res://assets/audio/gameplay/enemy_hit_light.wav",
	"hit_heavy": "res://assets/audio/gameplay/enemy_hit_heavy.wav",
	"critical_hit": "res://assets/audio/gameplay/critical_hit.wav",
	"death": "res://assets/audio/gameplay/enemy_defeat.wav",
	"pickup": "res://assets/audio/gameplay/ink_pickup.wav",
	"heal": "res://assets/audio/gameplay/ink_pickup.wav",
	"player_damage": "res://assets/audio/gameplay/player_damage.wav",
	"player_defeat": "res://assets/audio/gameplay/player_defeat.wav",
	"wave": "res://assets/audio/gameplay/wave_start.wav",
	"wave_complete": "res://assets/audio/gameplay/wave_complete.wav",
	"chapter_transition": "res://assets/audio/gameplay/chapter_transition.wav",
	"gadget": "res://assets/audio/abilities/gadget_eraser_dash.wav",
	"gadget_eraser_dash": "res://assets/audio/abilities/gadget_eraser_dash.wav",
	"gadget_chrono_comma": "res://assets/audio/abilities/gadget_chrono_comma.wav",
	"gadget_grammar_magnet": "res://assets/audio/abilities/gadget_grammar_magnet.wav",
	"gadget_ink_cataclysm": "res://assets/audio/abilities/gadget_ink_cataclysm.wav",
	"gadget_lexicon_aegis": "res://assets/audio/abilities/gadget_lexicon_aegis.wav",
	"quiz_correct": "res://assets/audio/ui/quiz_correct.wav",
	"quiz_incorrect": "res://assets/audio/ui/quiz_incorrect.wav",
	"ui_pause_resume": "res://assets/audio/ui/ui_pause_resume.wav",
	"ui_purchase": "res://assets/audio/ui/ui_purchase.wav",
	"ui_reroll": "res://assets/audio/ui/ui_reroll.wav",
	"ui_select": "res://assets/audio/ui/ui_select.wav",
	"ui_start": "res://assets/audio/ui/ui_start.wav",
	"ui_tab": "res://assets/audio/ui/ui_tab.wav",
	"boss_roar": "res://assets/audio/gameplay/enemy_hit_heavy.wav",
	"resonance_bell": "res://assets/audio/gameplay/chapter_transition.wav"
}

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	music_player = AudioStreamPlayer.new()
	music_player.name = "ProceduralMusic"
	music_player.process_mode = Node.PROCESS_MODE_ALWAYS
	music_player.volume_db = -19.0
	add_child(music_player)

	cue_player = AudioStreamPlayer.new()
	cue_player.name = "MysticCues"
	cue_player.process_mode = Node.PROCESS_MODE_ALWAYS
	cue_player.volume_db = -11.0
	add_child(cue_player)
	ambience_player = AudioStreamPlayer.new()
	ambience_player.name = "BiomeAmbience"
	ambience_player.process_mode = Node.PROCESS_MODE_ALWAYS
	ambience_player.volume_db = -34.0
	add_child(ambience_player)
	for index in range(10):
		var player := AudioStreamPlayer.new()
		player.process_mode = Node.PROCESS_MODE_ALWAYS
		player.volume_db = -5.0
		add_child(player)
		_sfx_players.append(player)
	_main_theme = load("res://assets/audio/music/biome_dark_library_theme.mp3")
	_boss_theme = load("res://assets/audio/music/magical_library_extreme_a.mp3")
	if _main_theme is AudioStreamMP3:
		_main_theme.loop = true
		music_player.stream = _main_theme
		music_player.play()
	if _boss_theme is AudioStreamMP3:
		_boss_theme.loop = true
	for path in BIOME_THEME_PATHS:
		var stream := load(path) as AudioStreamMP3
		if stream:
			stream.loop = true
			_biome_themes.append(stream)
		else:
			push_warning("Biome music could not be loaded: " + path)
	var config := ConfigFile.new()
	if config.load("user://audio_settings.cfg") == OK:
		music_choice = str(config.get_value("music", "choice", "auto"))
	_apply_music_choice()

func play_effect(key: String) -> void:
	if not _effect_paths.has(key) or _sfx_players.is_empty():
		return
	if _is_weapon_cue(key):
		var now := Time.get_ticks_msec()
		if now - int(_last_weapon_cue_at.get(key, -10000)) < 120 or now - _last_any_weapon_cue_msec < 55:
			return
		_last_weapon_cue_at[key] = now
		_last_any_weapon_cue_msec = now
	var configured_paths: Variant = _effect_paths[key]
	var paths: Array = configured_paths if configured_paths is Array else [configured_paths]
	if paths.is_empty():
		return
	var previous_path := str(_last_effect_variant.get(key, ""))
	var candidates: Array = paths.filter(func(path): return str(path) != previous_path)
	if candidates.is_empty():
		candidates = paths
	var path := str(candidates[randi_range(0, candidates.size() - 1)])
	_last_effect_variant[key] = path
	var stream: AudioStream = _effect_stream_cache.get(path)
	if stream == null:
		stream = load(path) as AudioStream
		if stream == null:
			push_warning("Audio asset could not be loaded: " + path)
			return
		_effect_stream_cache[path] = stream
	if stream == null:
		return
	var player: AudioStreamPlayer = _sfx_players[_sfx_cursor % _sfx_players.size()]
	_sfx_cursor += 1
	player.stream = stream
	player.play()

func _is_weapon_cue(key: String) -> bool:
	return key in ["quill_blaster", "syllable_shotgun", "lexicon_beam", "punctuation_bomb", "dictionary_blade", "crossword_crossbow", "hyphen_boomerang", "ink_flamethrower", "thesaurus_rocket", "quote_pistols", "calligraphy_katana", "scroll_turret", "scroll_turret_fire", "rune_orb", "grammar_sniper", "word_loom"]

func set_biome(stage_index: int, boss_wave: bool = false) -> void:
	var stage := clampi(stage_index, 0, 3)
	if boss_wave != _boss_mode:
		_boss_mode = boss_wave
		_apply_music_choice()
	if stage != active_stage:
		active_stage = stage
		_set_biome_ambience(stage)
		_apply_music_choice()
		play_effect("chapter_transition")
		_play_chapter_chime(stage)
	elif boss_wave:
		_play_boss_cue(stage)

func set_music_choice(choice: String) -> void:
	music_choice = choice if choice in ["auto", "library", "action", "urgent", "last_stand"] else "auto"
	var config := ConfigFile.new()
	config.set_value("music", "choice", music_choice)
	config.save("user://audio_settings.cfg")
	_apply_music_choice()

func _apply_music_choice() -> void:
	if not music_player or not _main_theme:
		return
	var next_theme: AudioStream = _main_theme
	if music_choice == "last_stand" or (music_choice == "auto" and _boss_mode):
		next_theme = _boss_theme if _boss_theme else _main_theme
	elif music_choice == "auto" and active_stage >= 0 and active_stage < _biome_themes.size():
		next_theme = _biome_themes[active_stage]
	elif music_choice == "action" and _biome_themes.size() > 1:
		next_theme = _biome_themes[1]
	elif music_choice == "urgent" and _biome_themes.size() > 2:
		next_theme = _biome_themes[2]
	elif music_choice == "library" and not _biome_themes.is_empty():
		next_theme = _biome_themes[0]
	if music_player.stream != next_theme:
		music_player.stream = next_theme
		music_player.play()

func _switch_loop(stream: AudioStreamWAV) -> void:
	active_loop = stream
	music_player.stream = active_loop
	music_player.play()

func _set_biome_ambience(stage: int) -> void:
	if not ambience_player or stage < 0 or stage >= BIOME_AMBIENCE_PATHS.size():
		return
	var path: String = BIOME_AMBIENCE_PATHS[stage]
	var stream: AudioStreamWAV = _ambience_stream_cache.get(path)
	if not stream:
		stream = load(path) as AudioStreamWAV
		if not stream:
			push_warning("Biome ambience could not be loaded: " + path)
			return
		stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
		_ambience_stream_cache[path] = stream
	if ambience_player.stream == stream and ambience_player.playing:
		return
	if _ambience_tween and _ambience_tween.is_running():
		_ambience_tween.kill()
	_ambience_tween = create_tween()
	if ambience_player.playing:
		_ambience_tween.tween_property(ambience_player, "volume_db", -50.0, 0.32)
		_ambience_tween.tween_callback(func():
			ambience_player.stream = stream
			ambience_player.play()
		)
	else:
		ambience_player.stream = stream
		ambience_player.play()
		ambience_player.volume_db = -50.0
	_ambience_tween.tween_property(ambience_player, "volume_db", -34.0, 0.65)

func _make_biome_loop(stage: int) -> AudioStreamWAV:
	var sample_count := int(SAMPLE_RATE * LOOP_SECONDS)
	var bytes := PackedByteArray()
	bytes.resize(sample_count * 2)
	var root: int = int(STAGE_ROOTS[stage])
	var root_hz := _midi_hz(root)
	var chord_ratios := [1.0, 1.189207, 1.498307, 1.781797]
	for i in range(sample_count):
		var t := float(i) / SAMPLE_RATE
		var chord_index := int(t / 3.0) % 4
		var chord_root := _midi_hz(root + CHORD_STEPS[chord_index])
		var section_time := fposmod(t, 3.0)
		var fade := minf(_smoothstep(section_time / 0.18), _smoothstep((3.0 - section_time) / 0.18))
		var pad := 0.0
		for ratio in chord_ratios:
			pad += sin(TAU * chord_root * ratio * t) * 0.012

		var beat_pos := fposmod(t, BEAT_SECONDS)
		var beat_index := int(t / BEAT_SECONDS)
		var bass_envelope := exp(-beat_pos * 4.0)
		var bass := sin(TAU * _midi_hz(root + CHORD_STEPS[chord_index] - 12) * t) * bass_envelope * 0.045
		var degree: int = int(MELODY_STEPS[beat_index % MELODY_STEPS.size()])
		var melody_hz := _midi_hz(root + degree + 12)
		var melody_envelope := exp(-beat_pos * 6.5) * minf(1.0, beat_pos / 0.012)
		var bell := (sin(TAU * melody_hz * t) + 0.24 * sin(TAU * melody_hz * 2.01 * t)) * melody_envelope * 0.026
		var value := (pad * fade) + bass + bell
		var sample := int(clampf(value, -0.92, 0.92) * 32767.0)
		bytes[i * 2] = sample & 0xff
		bytes[i * 2 + 1] = (sample >> 8) & 0xff

	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = SAMPLE_RATE
	stream.stereo = false
	stream.data = bytes
	stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
	stream.loop_begin = 0
	stream.loop_end = sample_count
	return stream

func _play_chapter_chime(stage: int) -> void:
	var root := _midi_hz(STAGE_ROOTS[stage] + 24)
	cue_player.stream = _make_chime([root, root * 1.25, root * 1.5], 1.25)
	cue_player.play()

func _play_boss_cue(stage: int) -> void:
	var root := _midi_hz(STAGE_ROOTS[stage] - 12)
	cue_player.stream = _make_chime([root, root * 1.01], 0.7)
	cue_player.play()

func _make_chime(frequencies: Array, duration: float) -> AudioStreamWAV:
	var sample_count := int(SAMPLE_RATE * duration)
	var bytes := PackedByteArray()
	bytes.resize(sample_count * 2)
	for i in range(sample_count):
		var t := float(i) / SAMPLE_RATE
		var envelope := minf(1.0, t / 0.025) * pow(maxf(0.0001, 1.0 - t / duration), 2.4)
		var value := 0.0
		for index in range(frequencies.size()):
			var delay := float(index) * 0.1
			if t >= delay:
				value += sin(TAU * frequencies[index] * (t - delay)) * envelope * (0.06 / (index + 1))
		var sample := int(clampf(value, -0.92, 0.92) * 32767.0)
		bytes[i * 2] = sample & 0xff
		bytes[i * 2 + 1] = (sample >> 8) & 0xff
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = SAMPLE_RATE
	stream.stereo = false
	stream.data = bytes
	return stream

func _midi_hz(note: int) -> float:
	return 440.0 * pow(2.0, (float(note) - 69.0) / 12.0)

func _smoothstep(value: float) -> float:
	var x := clampf(value, 0.0, 1.0)
	return x * x * (3.0 - 2.0 * x)

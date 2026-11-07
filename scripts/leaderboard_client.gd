extends Node

signal leaderboard_loaded(entries: Array, error: String)
signal submission_finished(accepted: bool, rank: int, error: String)

const LOCAL_PATH := "user://leaderboard_local.cfg"
const PROFILE_PATH := "user://leaderboard_profile.cfg"
const MAX_LOCAL_ENTRIES := 20

var api_url := ""
var _get_request: HTTPRequest
var _post_request: HTTPRequest
var _fetch_difficulty := "normal"
var _pending_submission: Dictionary = {}

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	api_url = str(ProjectSettings.get_setting("leaderboard/api_base_url", "")).strip_edges()
	if not api_url.is_empty() and not api_url.ends_with("/api/leaderboard"):
		api_url = api_url.trim_suffix("/") + "/api/leaderboard"
	_get_request = HTTPRequest.new()
	_get_request.name = "LeaderboardGetRequest"
	_get_request.timeout = 8.0
	_post_request = HTTPRequest.new()
	_post_request.name = "LeaderboardPostRequest"
	_post_request.timeout = 8.0
	add_child(_get_request)
	add_child(_post_request)
	_get_request.request_completed.connect(_on_get_completed)
	_post_request.request_completed.connect(_on_post_completed)

func create_submission_id() -> String:
	var bytes := Crypto.new().generate_random_bytes(16)
	if bytes.size() != 16:
		bytes = PackedByteArray()
		for _index in 16:
			bytes.append(randi() & 0xff)
	bytes[6] = (bytes[6] & 0x0f) | 0x40
	bytes[8] = (bytes[8] & 0x3f) | 0x80
	return "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x" % [
		bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7],
		bytes[8], bytes[9], bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]
	]

func fetch_top(difficulty_id: String) -> void:
	_fetch_difficulty = difficulty_id if difficulty_id in ["easy", "normal", "hard"] else "normal"
	if api_url.is_empty():
		leaderboard_loaded.emit([], "Küresel tablo ayarlanmamış. Yerel en iyi skor cihazda saklanır.")
		return
	if _get_request.get_http_client_status() != HTTPClient.STATUS_DISCONNECTED:
		return
	var url := api_url + "?difficulty=" + _fetch_difficulty.uri_encode() + "&limit=20"
	var error := _get_request.request(url, PackedStringArray(["Accept: application/json"]))
	if error != OK:
		leaderboard_loaded.emit([], "Küresel tabloya bağlanılamadı. Yerel kayıt kullanılabilir.")

func save_alias(alias: String) -> String:
	var cleaned := _sanitize_alias(alias)
	if cleaned.is_empty():
		return ""
	var profile := ConfigFile.new()
	profile.load(PROFILE_PATH)
	profile.set_value("profile", "alias", cleaned)
	profile.save(PROFILE_PATH)
	return cleaned

func get_saved_alias() -> String:
	var profile := ConfigFile.new()
	if profile.load(PROFILE_PATH) != OK:
		return ""
	return _sanitize_alias(str(profile.get_value("profile", "alias", "")))

func save_local_result(summary: Dictionary, alias: String) -> void:
	var row := summary.duplicate(true)
	row["alias"] = _sanitize_alias(alias)
	var difficulty := str(row.get("difficultyId", "normal"))
	if difficulty not in ["easy", "normal", "hard"]:
		return
	var config := ConfigFile.new()
	config.load(LOCAL_PATH)
	var rows: Array = config.get_value("scores", difficulty, [])
	var submission_id := str(row.get("submissionId", ""))
	if not submission_id.is_empty():
		rows = rows.filter(func(existing: Variant) -> bool:
			return not existing is Dictionary or str(existing.get("submissionId", "")) != submission_id
		)
	rows.append(row)
	rows.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		if int(a.get("wavesCleared", 0)) != int(b.get("wavesCleared", 0)):
			return int(a.get("wavesCleared", 0)) > int(b.get("wavesCleared", 0))
		if int(a.get("kills", 0)) != int(b.get("kills", 0)):
			return int(a.get("kills", 0)) > int(b.get("kills", 0))
		return int(a.get("elapsedMs", 0)) < int(b.get("elapsedMs", 0))
	)
	if rows.size() > MAX_LOCAL_ENTRIES:
		rows.resize(MAX_LOCAL_ENTRIES)
	config.set_value("scores", difficulty, rows)
	config.save(LOCAL_PATH)

func get_local_records(difficulty_id: String) -> Array:
	if difficulty_id not in ["easy", "normal", "hard"]:
		return []
	var config := ConfigFile.new()
	if config.load(LOCAL_PATH) != OK:
		return []
	var value: Variant = config.get_value("scores", difficulty_id, [])
	return value if value is Array else []

func submit_run(summary: Dictionary) -> void:
	if _post_request.get_http_client_status() != HTTPClient.STATUS_DISCONNECTED:
		submission_finished.emit(false, 0, "Skor gönderimi sürüyor.")
		return
	_pending_submission = summary.duplicate(true)
	_pending_submission["alias"] = _sanitize_alias(str(_pending_submission.get("alias", "")))
	if _pending_submission["alias"].is_empty():
		submission_finished.emit(false, 0, "Geçerli bir görünen ad gir.")
		return
	if api_url.is_empty():
		submission_finished.emit(false, 0, "Küresel tablo çevrimdışı; skor bu cihazda saklandı.")
		return
	var headers := PackedStringArray(["Content-Type: application/json", "Accept: application/json"])
	var error := _post_request.request(api_url, headers, HTTPClient.METHOD_POST, JSON.stringify(_pending_submission))
	if error != OK:
		submission_finished.emit(false, 0, "Skor gönderilemedi; yerel kayıt korunuyor.")

func _on_get_completed(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	if result != HTTPRequest.RESULT_SUCCESS or response_code < 200 or response_code >= 300:
		leaderboard_loaded.emit([], "Küresel tabloya ulaşılamadı. Yerel kayıt gösteriliyor.")
		return
	var parsed: Variant = JSON.parse_string(body.get_string_from_utf8())
	if not parsed is Dictionary or not parsed.get("entries", []) is Array:
		leaderboard_loaded.emit([], "Küresel tablodan geçerli yanıt alınamadı.")
		return
	leaderboard_loaded.emit(parsed.get("entries", []), "")

func _on_post_completed(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	if result != HTTPRequest.RESULT_SUCCESS or response_code < 200 or response_code >= 300:
		submission_finished.emit(false, 0, "Skor gönderilemedi; cihaz içi kayıt korunuyor.")
		return
	var parsed: Variant = JSON.parse_string(body.get_string_from_utf8())
	if not parsed is Dictionary or not bool(parsed.get("accepted", false)):
		submission_finished.emit(false, 0, "Skor sunucu tarafından kabul edilmedi; cihaz içi kayıt korunuyor.")
		return
	submission_finished.emit(true, int(parsed.get("rank", 0)), "")

func _sanitize_alias(value: String) -> String:
	var regex := RegEx.new()
	regex.compile("[^A-Za-zÀ-ÖØ-öø-ÿĀ-ſƀ-ɏ0-9 _-]")
	var cleaned := regex.sub(value.strip_edges().replace("\n", " "), "", true)
	cleaned = " ".join(cleaned.split(" ", false)).strip_edges()
	return cleaned.substr(0, 20).strip_edges()

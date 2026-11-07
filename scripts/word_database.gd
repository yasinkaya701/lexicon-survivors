extends Node


# 50+ Rich Educational English Vocabulary & Grammar Questions
# Covering: Türkçe Anlam, Eş Anlam (Synonyms), Zıt Anlam (Antonyms),
# Yazım Yanlışı (Spell Check), Prepositions & Collocations across A1, A2, B1, B2, C1.

var words: Array = [
	# ==========================================
	# --- A1 & A2 (KOLAY / LGS / BEGINNER) ---
	# ==========================================
	{
		"word": "Fast",
		"type": "Adjective",
		"level": "A1",
		"question_type": "meaning",
		"stat": "move_speed",
		"value": 30.0,
		"cost": 6,
		"description": "+30 Hareket Hızı",
		"question": "'Fast' kelimesinin Türkçe anlamı nedir?",
		"options": ["Hızlı", "Yavaş", "Zor", "Sessiz"],
		"correct_index": 0,
		"example": "He runs very fast to dodge incoming errors."
	},
	{
		"word": "Strong",
		"type": "Adjective",
		"level": "A1",
		"question_type": "meaning",
		"stat": "damage",
		"value": 0.15,
		"cost": 8,
		"description": "+%15 Mermi Hasarı",
		"question": "'Strong' kelimesinin Türkçe anlamı nedir?",
		"options": ["Zayıf", "Güçlü / Kuvvetli", "Huzurlu", "Karanlık"],
		"correct_index": 1,
		"example": "Inky became strong enough to defeat the slime."
	},
	{
		"word": "Heal",
		"type": "Verb",
		"level": "A1",
		"question_type": "meaning",
		"stat": "heal",
		"value": 25.0,
		"cost": 7,
		"description": "+25 Can Yenile",
		"question": "'Heal' fiilinin Türkçe karşılığı nedir?",
		"options": ["Zarar vermek", "Koşmak", "İyileştirmek / Şifa bulmak", "Düşmek"],
		"correct_index": 2,
		"example": "The magic ink potion heals your wounds."
	},
	{
		"word": "Shield",
		"type": "Noun",
		"level": "A1",
		"question_type": "meaning",
		"stat": "max_hp",
		"value": 20.0,
		"cost": 9,
		"description": "+20 Maksimum Can",
		"question": "'Shield' kelimesinin Türkçe karşılığı nedir?",
		"options": ["Kalkan", "Kılıç", "Ok", "Miğfer"],
		"correct_index": 0,
		"example": "A sturdy lexicon shield blocks damage."
	},
	{
		"word": "Quick",
		"type": "Adjective",
		"level": "A1",
		"question_type": "synonym",
		"stat": "attack_speed",
		"value": 0.15,
		"cost": 8,
		"description": "+%15 Saldırı Hızı",
		"question": "'Quick' kelimesinin eş anlamlısı (synonym) hangisidir?",
		"options": ["Slow", "Rapid / Fast", "Heavy", "Quiet"],
		"correct_index": 1,
		"example": "Her quick reflexes saved the day."
	},
	{
		"word": "Magnet",
		"type": "Noun",
		"level": "A1",
		"question_type": "meaning",
		"stat": "pickup_radius",
		"value": 50.0,
		"cost": 7,
		"description": "+50 Mürekkep Çekim Alanı",
		"question": "'Magnet' kelimesinin anlamı nedir?",
		"options": ["Mıknatıs / Çekim Aracı", "Pusula", "Ayna", "Mercek"],
		"correct_index": 0,
		"example": "The magnet pulls ink drops from across the arena."
	},
	{
		"word": "Brave",
		"type": "Adjective",
		"level": "A2",
		"question_type": "antonym",
		"stat": "armor",
		"value": 0.08,
		"cost": 9,
		"description": "+%8 Hasar Direnci (Zırh)",
		"question": "'Brave' (Cesur) kelimesinin zıt anlamlısı (antonym) hangisidir?",
		"options": ["Cowardly / Timid", "Heroic", "Valiant", "Bold"],
		"correct_index": 0,
		"example": "The brave scholar faced the giant grammar boss."
	},
	{
		"word": "Protect",
		"type": "Verb",
		"level": "A2",
		"question_type": "meaning",
		"stat": "max_hp",
		"value": 25.0,
		"cost": 10,
		"description": "+25 Maksimum Can",
		"question": "'Protect' fiilinin Türkçe anlamı nedir?",
		"options": ["Saldırmak", "Korumak / Muhafaza etmek", "Terk etmek", "Yok etmek"],
		"correct_index": 1,
		"example": "You must protect the sacred dictionary."
	},
	{
		"word": "Defend",
		"type": "Verb",
		"level": "A2",
		"question_type": "synonym",
		"stat": "armor",
		"value": 0.10,
		"cost": 11,
		"description": "+%10 Hasar Direnci",
		"question": "'Defend' fiilinin eş anlamlısı hangisidir?",
		"options": ["Protect / Guard", "Attack", "Destroy", "Escape"],
		"correct_index": 0,
		"example": "Defend the arena against corrupt spelling slimes."
	},
	{
		"word": "Spell: Friend",
		"type": "Grammar",
		"level": "A2",
		"question_type": "spelling",
		"stat": "crit_chance",
		"value": 0.08,
		"cost": 10,
		"description": "+%8 Kritik Vuruş Şansı",
		"question": "Hangisinin yazımı DOĞRUDUR? (I before E rule)",
		"options": ["Friend", "Freind", "Frind", "Frend"],
		"correct_index": 0,
		"example": "Remember: 'i' before 'e' except after 'c' in 'friend'!"
	},
	{
		"word": "Prep: Interested",
		"type": "Collocation",
		"level": "A2",
		"question_type": "collocation",
		"stat": "pickup_radius",
		"value": 45.0,
		"cost": 8,
		"description": "+45 Mürekkep Toplama Menzili",
		"question": "'She is interested ___ learning English.' Boşluğa ne gelmelidir?",
		"options": ["in", "at", "on", "for"],
		"correct_index": 0,
		"example": "We say: 'interested IN something'."
	},
	{
		"word": "Prep: Good at",
		"type": "Collocation",
		"level": "A2",
		"question_type": "collocation",
		"stat": "damage",
		"value": 0.18,
		"cost": 10,
		"description": "+%18 Mermi Hasarı",
		"question": "'He is exceptionally good ___ spelling words.' Boşluğa ne gelmelidir?",
		"options": ["in", "at", "with", "about"],
		"correct_index": 1,
		"example": "We say: 'good AT doing something'."
	},
	{
		"word": "Swift",
		"type": "Adjective",
		"level": "A2",
		"question_type": "synonym",
		"stat": "move_speed",
		"value": 35.0,
		"cost": 9,
		"description": "+35 Hareket Hızı",
		"question": "'Swift' kelimesinin en yakın eş anlamlısı nedir?",
		"options": ["Rapid / Fast", "Heavy", "Clumsy", "Late"],
		"correct_index": 0,
		"example": "With swift steps, Inky evaded the goblin's rush."
	},
	{
		"word": "Spell: Beautiful",
		"type": "Grammar",
		"level": "A2",
		"question_type": "spelling",
		"stat": "heal",
		"value": 30.0,
		"cost": 9,
		"description": "+30 Anında Can Yenile",
		"question": "Hangisinin yazımı DOĞRUDUR?",
		"options": ["Beautifull", "Beautiful", "Beutiful", "Beatiful"],
		"correct_index": 1,
		"example": "'Beautiful' ends with a single 'l'."
	},
	{
		"word": "Gather",
		"type": "Verb",
		"level": "A2",
		"question_type": "meaning",
		"stat": "pickup_radius",
		"value": 60.0,
		"cost": 9,
		"description": "+60 Mürekkep Toplama Menzili",
		"question": "'Gather' fiili ne anlama gelir?",
		"options": ["Dağıtmak", "Toplamak / Bir araya getirmek", "Kaçmak", "Fırlatmak"],
		"correct_index": 1,
		"example": "Gather ink drops quickly to buy powerful upgrades."
	},
	{
		"word": "Ancient",
		"type": "Adjective",
		"level": "A2",
		"question_type": "antonym",
		"stat": "damage",
		"value": 0.20,
		"cost": 11,
		"description": "+%20 Mermi Hasarı",
		"question": "'Ancient' (Kadim/Eski) kelimesinin zıt anlamlısı nedir?",
		"options": ["Modern / Contemporary", "Historic", "Antique", "Elderly"],
		"correct_index": 0,
		"example": "Ancient manuscripts hold great linguistic secrets."
	},
	{
		"word": "Spell: Until",
		"type": "Grammar",
		"level": "A2",
		"question_type": "spelling",
		"stat": "attack_speed",
		"value": 0.18,
		"cost": 9,
		"description": "+%18 Saldırı Hızı",
		"question": "Hangisinin yazımı DOĞRUDUR?",
		"options": ["Untill", "Until", "Untile", "Undeal"],
		"correct_index": 1,
		"example": "Unlike 'till', 'until' has only one 'l'."
	},
	{
		"word": "Victory",
		"type": "Noun",
		"level": "A2",
		"question_type": "meaning",
		"stat": "damage",
		"value": 0.22,
		"cost": 12,
		"description": "+%22 Mermi Hasarı",
		"question": "'Victory' kelimesinin Türkçe karşılığı nedir?",
		"options": ["Zafer / Galibiyet", "Yenilgi", "Barış", "Yolculuk"],
		"correct_index": 0,
		"example": "A glorious victory over grammatical chaos!"
	},

	# ==========================================
	# --- B1 (ORTA / YKS-YDT / INTERMEDIATE) ---
	# ==========================================
	{
		"word": "Pierce",
		"type": "Verb",
		"level": "B1",
		"question_type": "meaning",
		"stat": "pierce",
		"value": 1.0,
		"cost": 14,
		"description": "+1 Delici Atış (Düşmanları delip geçer)",
		"question": "'Pierce' fiilinin Türkçe karşılığı nedir?",
		"options": ["Delip geçmek / Saplanmak", "Geri kaçmak", "Korumak", "Bağlamak"],
		"correct_index": 0,
		"example": "The ink projectile pierced through multiple typo goblins."
	},
	{
		"word": "Resilient",
		"type": "Adjective",
		"level": "B1",
		"question_type": "synonym",
		"stat": "max_hp",
		"value": 35.0,
		"cost": 12,
		"description": "+35 Maksimum Can",
		"question": "'Resilient' kelimesinin en yakın eş anlamlısı hangisidir?",
		"options": ["Fragile", "Tough / Durable (Dayanıklı)", "Pessimistic", "Careless"],
		"correct_index": 1,
		"example": "A resilient guardian bounces back from severe setbacks."
	},
	{
		"word": "Furious",
		"type": "Adjective",
		"level": "B1",
		"question_type": "meaning",
		"stat": "attack_speed",
		"value": 0.25,
		"cost": 13,
		"description": "+%25 Saldırı Hızı",
		"question": "'Furious' kelimesinin Türkçe karşılığı nedir?",
		"options": ["Sakin", "Öfkeli / Çok Hızlı ve Hiddetli", "Korkak", "Meraklı"],
		"correct_index": 1,
		"example": "Inky unleashed a furious barrage of syllables."
	},
	{
		"word": "Ignite",
		"type": "Verb",
		"level": "B1",
		"question_type": "meaning",
		"stat": "damage",
		"value": 0.25,
		"cost": 14,
		"description": "+%25 Mermi Hasarı",
		"question": "'Ignite' fiili ne anlama gelir?",
		"options": ["Söndürmek", "Ateşlemek / Tutuşturmak", "Dondurmak", "Gizlemek"],
		"correct_index": 1,
		"example": "The flaming quill will ignite error slimes."
	},
	{
		"word": "Multi-",
		"type": "Prefix",
		"level": "B1",
		"question_type": "meaning",
		"stat": "projectile_count",
		"value": 1.0,
		"cost": 22,
		"description": "+1 Ekstra Mermi Atışı (Multi-Shot)",
		"question": "'Multi-' ön ekinin kattığı anlam nedir?",
		"options": ["Tek / Yalnız", "Çoklu / Birden fazla", "Eski / Önceki", "Ters / Karşı"],
		"correct_index": 1,
		"example": "Multi-tasking, multi-shot, multilingual."
	},
	{
		"word": "Un-",
		"type": "Prefix",
		"level": "B1",
		"question_type": "meaning",
		"stat": "pierce",
		"value": 1.0,
		"cost": 12,
		"description": "+1 Delici Mermi (Un-stoppable)",
		"question": "'Unstoppable' kelimesindeki 'Un-' ön eki ne katar?",
		"options": ["Olumsuzluk / Karşıtlık (-me/-ma, Durdurul-amaz)", "Küçültme", "Geçmiş zaman", "Çoğul eki"],
		"correct_index": 0,
		"example": "Prefix 'Un-' turns 'stoppable' into 'unstoppable'."
	},
	{
		"word": "Spell: Definitely",
		"type": "Grammar",
		"level": "B1",
		"question_type": "spelling",
		"stat": "crit_chance",
		"value": 0.12,
		"cost": 13,
		"description": "+%12 Kritik Vuruş Şansı",
		"question": "Hangisinin yazımı DOĞRUDUR? (En sık yapılan hata!)",
		"options": ["Definitely", "Definately", "Definitly", "Defenetly"],
		"correct_index": 0,
		"example": "It is spelled D-E-F-I-N-I-T-E-L-Y (has 'finite' inside)."
	},
	{
		"word": "Prep: Depend on",
		"type": "Collocation",
		"level": "B1",
		"question_type": "collocation",
		"stat": "armor",
		"value": 0.12,
		"cost": 12,
		"description": "+%12 Hasar Direnci",
		"question": "'Our survival depends ___ your grammar knowledge.' Boşluğa ne gelmelidir?",
		"options": ["at", "on", "from", "with"],
		"correct_index": 1,
		"example": "Always remember: 'depend ON' someone or something."
	},
	{
		"word": "Abundant",
		"type": "Adjective",
		"level": "B1",
		"question_type": "antonym",
		"stat": "pickup_radius",
		"value": 65.0,
		"cost": 12,
		"description": "+65 Mürekkep Çekim Alanı",
		"question": "'Abundant' (Bol / Bereketli) kelimesinin zıt anlamlısı hangisidir?",
		"options": ["Plentiful", "Scarce / Limited (Kıt / Yetersiz)", "Ample", "Rich"],
		"correct_index": 1,
		"example": "Ink drops were abundant after the wave."
	},
	{
		"word": "Spell: Separate",
		"type": "Grammar",
		"level": "B1",
		"question_type": "spelling",
		"stat": "attack_speed",
		"value": 0.22,
		"cost": 13,
		"description": "+%22 Saldırı Hızı",
		"question": "Hangisinin yazımı DOĞRUDUR?",
		"options": ["Seperate", "Separate", "Sepparate", "Seprate"],
		"correct_index": 1,
		"example": "There is 'a rat' in sep-a-rat-e!"
	},
	{
		"word": "Hesitant",
		"type": "Adjective",
		"level": "B1",
		"question_type": "meaning",
		"stat": "move_speed",
		"value": 35.0,
		"cost": 11,
		"description": "+35 Hareket Hızı",
		"question": "'Hesitant' kelimesinin Türkçe anlamı nedir?",
		"options": ["Tereddütlü / Kararsız", "Kararlı", "Cüretkar", "Aceleci"],
		"correct_index": 0,
		"example": "Do not be hesitant when dodging enemy projectiles."
	},
	{
		"word": "Prep: Responsible",
		"type": "Collocation",
		"level": "B1",
		"question_type": "collocation",
		"stat": "max_hp",
		"value": 30.0,
		"cost": 12,
		"description": "+30 Maksimum Can",
		"question": "'Who is responsible ___ this mistake?' Boşluğa ne gelmelidir?",
		"options": ["for", "of", "to", "by"],
		"correct_index": 0,
		"example": "We say: 'responsible FOR something'."
	},
	{
		"word": "Eliminate",
		"type": "Verb",
		"level": "B1",
		"question_type": "synonym",
		"stat": "damage",
		"value": 0.24,
		"cost": 14,
		"description": "+%24 Mermi Hasarı",
		"question": "'Eliminate' fiilinin eş anlamlısı hangisidir?",
		"options": ["Eradicate / Remove", "Create", "Preserve", "Invite"],
		"correct_index": 0,
		"example": "Eliminate all typo goblins before time runs out."
	},
	{
		"word": "Crucial",
		"type": "Adjective",
		"level": "B1",
		"question_type": "meaning",
		"stat": "damage",
		"value": 0.26,
		"cost": 14,
		"description": "+%26 Mermi Hasarı",
		"question": "'Crucial' kelimesinin Türkçe anlamı nedir?",
		"options": ["Hayati önem taşıyan / Çok kritik", "Önemsiz", "Gereksiz", "Sıradan"],
		"correct_index": 0,
		"example": "Accurate vocabulary is crucial for high scores."
	},
	{
		"word": "Over-",
		"type": "Prefix",
		"level": "B1",
		"question_type": "meaning",
		"stat": "attack_speed",
		"value": 0.28,
		"cost": 15,
		"description": "+%28 Saldırı Hızı (Overdrive)",
		"question": "'Overwhelm' veya 'Overcook' kelimelerindeki 'Over-' ön eki ne katar?",
		"options": ["Aşırılık / Fazlalık", "Yetersizlik", "Zaman", "Tekrar"],
		"correct_index": 0,
		"example": "The prefix 'Over-' indicates excess or surpassing limits."
	},
	{
		"word": "Spell: Necessary",
		"type": "Grammar",
		"level": "B1",
		"question_type": "spelling",
		"stat": "heal",
		"value": 35.0,
		"cost": 12,
		"description": "+35 Anında Can Yenile",
		"question": "Hangisinin yazımı DOĞRUDUR?",
		"options": ["Neccessary", "Necessary", "Necesary", "Neccesary"],
		"correct_index": 1,
		"example": "Remember: 1 Collar (C) and 2 Sleeves (SS) = Necessary!"
	},
	{
		"word": "Prep: Look forward to",
		"type": "Collocation",
		"level": "B1",
		"question_type": "collocation",
		"stat": "move_speed",
		"value": 40.0,
		"cost": 13,
		"description": "+40 Hareket Hızı",
		"question": "'I look forward to ___ you again.' Boşluğa ne gelmelidir?",
		"options": ["seeing", "see", "saw", "be seen"],
		"correct_index": 0,
		"example": "In 'look forward to', 'to' is a preposition, followed by V-ing!"
	},
	{
		"word": "Dis-",
		"type": "Prefix",
		"level": "B1",
		"question_type": "meaning",
		"stat": "pierce",
		"value": 1.0,
		"cost": 14,
		"description": "+1 Delici Atış (Dis-rupt)",
		"question": "'Disconnect' veya 'Disagree' kelimelerindeki 'Dis-' ön eki ne anlam katar?",
		"options": ["Ayrılma / Olumsuzluk / Karşıtlık", "Birliktelik", "Tekrar", "Büyütme"],
		"correct_index": 0,
		"example": "Prefix 'Dis-' denotes reversal or negation."
	},

	# ==========================================
	# --- B2 & C1 (ZOR / IELTS-TOEFL / ADVANCED) ---
	# ==========================================
	{
		"word": "Relentless",
		"type": "Adjective",
		"level": "B2",
		"question_type": "meaning",
		"stat": "attack_speed",
		"value": 0.35,
		"cost": 18,
		"description": "+%35 Saldırı Hızı",
		"question": "'Relentless' kelimesinin Türkçe anlamı nedir?",
		"options": ["Aman vermez / Durmaksızın devam eden", "Tembel ve yavaş", "Kararsız", "Utangaç"],
		"correct_index": 0,
		"example": "A relentless assault left no grammar error standing."
	},
	{
		"word": "Tenacious",
		"type": "Adjective",
		"level": "B2",
		"question_type": "synonym",
		"stat": "max_hp",
		"value": 50.0,
		"cost": 18,
		"description": "+50 Maksimum Can",
		"question": "'Tenacious' kelimesinin eş anlamlısı hangisidir?",
		"options": ["Persistent / Determined (Azimli/Vazgeçmeyen)", "Weak / Fragile", "Careless", "Timid"],
		"correct_index": 0,
		"example": "The tenacious bookworm refused to give up."
	},
	{
		"word": "Vanquish",
		"type": "Verb",
		"level": "B2",
		"question_type": "synonym",
		"stat": "damage",
		"value": 0.35,
		"cost": 20,
		"description": "+%35 Hasar Artışı",
		"question": "'Vanquish' fiilinin en yakın eş anlamlısı hangisidir?",
		"options": ["Defeat / Conquer", "Surrender", "Retreat", "Negotiate"],
		"correct_index": 0,
		"example": "Our hero will vanquish all grammar demons."
	},
	{
		"word": "Substantial",
		"type": "Adjective",
		"level": "B2",
		"question_type": "meaning",
		"stat": "move_speed",
		"value": 50.0,
		"cost": 16,
		"description": "+50 Hareket Hızı",
		"question": "'Substantial' kelimesinin Türkçe karşılığı nedir?",
		"options": ["Önemli ölçüde / Kayda değer", "Önemsiz", "Görünmez", "Geçici"],
		"correct_index": 0,
		"example": "The player gained a substantial speed advantage."
	},
	{
		"word": "Fortitude",
		"type": "Noun",
		"level": "B2",
		"question_type": "meaning",
		"stat": "armor",
		"value": 0.15,
		"cost": 18,
		"description": "+%15 Hasar Direnci",
		"question": "'Fortitude' kelimesi ne anlama gelir?",
		"options": ["Ruhsal güç / Metanet / Zorluklara dayanma gücü", "Zayıflık", "Hiddet", "Telaş"],
		"correct_index": 0,
		"example": "Facing the giant Typo Boss requires great fortitude."
	},
	{
		"word": "Spell: Accommodate",
		"type": "Grammar",
		"level": "B2",
		"question_type": "spelling",
		"stat": "max_hp",
		"value": 45.0,
		"cost": 17,
		"description": "+45 Maksimum Can",
		"question": "Hangisinin yazımı DOĞRUDUR? (Çift 'c' ve çift 'm')",
		"options": ["Accommodate", "Acommodate", "Accomodate", "Acomodate"],
		"correct_index": 0,
		"example": "Accommodate has two 'c's and two 'm's!"
	},
	{
		"word": "Meticulous",
		"type": "Adjective",
		"level": "B2",
		"question_type": "synonym",
		"stat": "crit_chance",
		"value": 0.15,
		"cost": 17,
		"description": "+%15 Kritik Vuruş Şansı",
		"question": "'Meticulous' kelimesinin eş anlamlısı nedir?",
		"options": ["Careful / Precise (Kılı kırk yaran/Titiz)", "Careless / Sloppy", "Hasty", "Boring"],
		"correct_index": 0,
		"example": "A meticulous scholar notices every punctuation flaw."
	},
	{
		"word": "Ephemeral",
		"type": "Adjective",
		"level": "C1",
		"question_type": "antonym",
		"stat": "move_speed",
		"value": 55.0,
		"cost": 20,
		"description": "+55 Hareket Hızı",
		"question": "'Ephemeral' (Kısa ömürlü / Geçici) kelimesinin zıt anlamlısı nedir?",
		"options": ["Permanent / Eternal (Kalıcı/Sonsuz)", "Transient", "Fleeting", "Brief"],
		"correct_index": 0,
		"example": "Typo errors are ephemeral, but pure literature is eternal."
	},
	{
		"word": "Pragmatic",
		"type": "Adjective",
		"level": "B2",
		"question_type": "meaning",
		"stat": "damage",
		"value": 0.30,
		"cost": 18,
		"description": "+%30 Mermi Hasarı",
		"question": "'Pragmatic' kelimesinin Türkçe karşılığı nedir?",
		"options": ["Pratik / Yararcı / Gerçekçi", "Hayalperest", "Kural tanımaz", "Duygusal"],
		"correct_index": 0,
		"example": "Take a pragmatic approach to upgrade choices."
	},
	{
		"word": "Spell: Embarrass",
		"type": "Grammar",
		"level": "B2",
		"question_type": "spelling",
		"stat": "attack_speed",
		"value": 0.30,
		"cost": 18,
		"description": "+%30 Saldırı Hızı",
		"question": "Hangisinin yazımı DOĞRUDUR? (Çift 'r' ve çift 's')",
		"options": ["Embarrass", "Embarass", "Emberrass", "Embaras"],
		"correct_index": 0,
		"example": "'Embarrass' has two 'r's and two 's's!"
	},
	{
		"word": "Eloquent",
		"type": "Adjective",
		"level": "C1",
		"question_type": "meaning",
		"stat": "projectile_count",
		"value": 1.0,
		"cost": 26,
		"description": "+1 Ekstra Mermi Atışı",
		"question": "'Eloquent' sıfatının Türkçe anlamı nedir?",
		"options": ["Güzel ve etkili konuşan / Dili akıcı", "Kekeme", "Sessiz", "Kaba"],
		"correct_index": 0,
		"example": "Her eloquent delivery mesmerized the entire lecture hall."
	},
	{
		"word": "Omni-",
		"type": "Prefix",
		"level": "C1",
		"question_type": "meaning",
		"stat": "pierce",
		"value": 2.0,
		"cost": 24,
		"description": "+2 Delici Mermi (Omni-Pierce)",
		"question": "'Omnipresent' veya 'Omnipotent' kelimelerindeki 'Omni-' ön ekinin anlamı nedir?",
		"options": ["Her / Bütün / Tümü (All / Every)", "Hiçbir", "Yarı", "Karşıt"],
		"correct_index": 0,
		"example": "Omniscient (her şeyi bilen), Omnipresent (her yerde var olan)."
	},
	{
		"word": "Spell: Conscientious",
		"type": "Grammar",
		"level": "C1",
		"question_type": "spelling",
		"stat": "crit_chance",
		"value": 0.18,
		"cost": 22,
		"description": "+%18 Kritik Vuruş Şansı",
		"question": "Hangisinin yazımı DOĞRUDUR? (Vicdanlı/Özenli)",
		"options": ["Conscientious", "Consciencious", "Consentious", "Conscensious"],
		"correct_index": 0,
		"example": "Conscientious comes from 'conscience' + 'tious'."
	},
	{
		"word": "Benevolent",
		"type": "Adjective",
		"level": "B2",
		"question_type": "antonym",
		"stat": "heal",
		"value": 60.0,
		"cost": 18,
		"description": "+60 Anında Can Yenile",
		"question": "'Benevolent' (İyiliksever/Hayırsever) kelimesinin zıt anlamlısı nedir?",
		"options": ["Malevolent / Malicious (Kötü niyetli)", "Kind", "Generous", "Helpful"],
		"correct_index": 0,
		"example": "A benevolent guardian restores vigor to the weary."
	},
	{
		"word": "Exacerbate",
		"type": "Verb",
		"level": "C1",
		"question_type": "meaning",
		"stat": "damage",
		"value": 0.40,
		"cost": 24,
		"description": "+%40 Hasar Çarpanı",
		"question": "'Exacerbate' fiilinin Türkçe karşılığı nedir?",
		"options": ["Kötüleştirmek / Durumu daha da vahimleştirmek", "İyileştirmek", "Hızlandırmak", "Açıklamak"],
		"correct_index": 0,
		"example": "Ignoring basic grammar rules will exacerbate your writing errors."
	},
	{
		"word": "Ubiquitous",
		"type": "Adjective",
		"level": "C1",
		"question_type": "synonym",
		"stat": "pickup_radius",
		"value": 80.0,
		"cost": 22,
		"description": "+80 Mürekkep Çekim Alanı",
		"question": "'Ubiquitous' kelimesinin eş anlamlısı nedir?",
		"options": ["Omnipresent / Pervasive (Her yerde bulunan)", "Rare", "Isolated", "Ancient"],
		"correct_index": 0,
		"example": "Ink drops became ubiquitous across the parchment battlefield."
	},
	{
		"word": "Persevere",
		"type": "Verb",
		"level": "B2",
		"question_type": "meaning",
		"stat": "armor",
		"value": 0.18,
		"cost": 18,
		"description": "+%18 Hasar Direnci",
		"question": "'Persevere' fiilinin Türkçe anlamı nedir?",
		"options": ["Azimle sürdürmek / Yılmamak", "Pes etmek", "Vazgeçmek", "Şüphelenmek"],
		"correct_index": 0,
		"example": "Persevere through tough waves to unlock the Lexicon Master title."
	},
	{
		"word": "Spell: Millennium",
		"type": "Grammar",
		"level": "C1",
		"question_type": "spelling",
		"stat": "max_hp",
		"value": 60.0,
		"cost": 22,
		"description": "+60 Maksimum Can",
		"question": "Hangisinin yazımı DOĞRUDUR? (Bin yıl)",
		"options": ["Millennium", "Millenium", "Milennium", "Milenium"],
		"correct_index": 0,
		"example": "Double 'l' and double 'n': M-I-L-L-E-N-N-I-U-M!"
	}
]

func get_random_cards_for_wave(wave: int, count: int = 4) -> Array:
	return get_random_cards(wave, "normal", count)

func get_random_cards(wave: int, difficulty: String = "normal", count: int = 4) -> Array:
	var pool = []
	var target_level := "A1"
	if is_inside_tree() and get_tree().root.has_node("StatsManager"):
		target_level = str(get_tree().root.get_node("StatsManager").learning_level)
	for w in words:
		if str(w.get("level", "A1")) == target_level:
			pool.append(w)

	# Prioritize unlearned words to keep questions fresh
	var unlearned = []
	for w in pool:
		if is_inside_tree() and get_tree().root.has_node("StatsManager"):
			var sm = get_tree().root.get_node("StatsManager")
			if not (w["word"] in sm.words_learned):
				unlearned.append(w)
		else:
			unlearned.append(w)

	if unlearned.size() >= count:
		pool = unlearned
	elif pool.size() < count:
		pool = words.duplicate()

	pool.shuffle()
	var result = pool.slice(0, min(count, pool.size()))

	# If player has unredeemed mistake words, guarantee 1 redemption card slot
	if is_inside_tree() and get_tree().root.has_node("StatsManager"):
		var sm = get_tree().root.get_node("StatsManager")
		if sm.mistake_words.size() > 0 and result.size() > 0:
			var mistake_pool = sm.mistake_words.duplicate()
			mistake_pool.shuffle()
			var m_card = mistake_pool[0].duplicate(true)
			m_card["is_redemption"] = true
			m_card["cost"] = max(1, int(ceil(m_card.get("cost", 8) * 0.5)))
			m_card["description"] = "[★ TELAFİ BONUSU +%75 GÜÇ] " + m_card.get("description", "")
			result[0] = m_card

	return result

func get_word_info(word_name: String) -> Dictionary:
	for w in words:
		if w["word"] == word_name:
			return w
	for w in words:
		var w_str = w.get("word", "").to_lower()
		var target = word_name.to_lower()
		if target.contains(w_str) or w_str.contains(target):
			return w
	return {}

func _init():
	load_from_json()

func _ready():
	load_from_json()

func load_from_json():
	var question_path := "res://assets/data/questions.json"
	if not FileAccess.file_exists(question_path):
		question_path = "res://build/web/questions.json"
	if FileAccess.file_exists(question_path):
		var f = FileAccess.open(question_path, FileAccess.READ)
		if f:
			var text = f.get_as_text()
			f.close()
			var json = JSON.parse_string(text)
			if json and json is Array and json.size() > 0:
				if json.size() >= 200:
					# The complete authored campaign bank is the single source for both runtimes.
					words = json.duplicate(true)
				else:
					# Older exported banks can still be supplemented from the embedded fallback.
					var fallback_words := words.duplicate(true)
					var merged_words: Array = json.duplicate(true)
					var seen_words := {}
					for card in merged_words:
						var key := str(card.get("word", "")).strip_edges().to_lower()
						if not key.is_empty():
							seen_words[key] = true
					for card in fallback_words:
						var key := str(card.get("word", "")).strip_edges().to_lower()
						if not key.is_empty() and not seen_words.has(key):
							merged_words.append(card)
							seen_words[key] = true
					words = merged_words

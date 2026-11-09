import { TacticalQuestion, UnitStats } from '@/types/game';

export const UNIT_CATALOG: UnitStats[] = [
  {
    id: 'knight',
    name: 'Kilyos Muhafızı',
    icon: '🛡️',
    cost: 2,
    hp: 150,
    dmg: 1.5,
    speed: 1.45,
    color: '#38bdf8',
    desc: 'Ön saflarda rüzgara ve strese göğüs geren dayanıklı piyade.'
  },
  {
    id: 'mage',
    name: 'Türev Büyücüsü',
    icon: '🔮',
    cost: 4,
    hp: 95,
    dmg: 2.7,
    speed: 1.15,
    color: '#a855f7',
    desc: 'Uzaktan parabolik enerji topları fırlatan yüksek hasarlı birim.'
  },
  {
    id: 'golem',
    name: 'BUEPT Golemi',
    icon: '🤖',
    cost: 6,
    hp: 320,
    dmg: 3.6,
    speed: 0.78,
    color: '#f59e0b',
    desc: 'Akademik makalelerden dövülmüş, kule yıkan dev kuşatma birimi.'
  },
  {
    id: 'dragon',
    name: 'Güney Kampüs Ejderi',
    icon: '🐉',
    cost: 8,
    hp: 240,
    dmg: 4.8,
    speed: 1.75,
    color: '#ec4899',
    desc: '3x Kombo yapıldığında bedava çağrılan efsanevi Boğaziçi ejderhası!'
  }
];

export const YKS_QUESTIONS: TacticalQuestion[] = [
  // --- Preserved Legacy Questions (yks-1 to yks-6) ---
  {
    id: 'yks-1',
    act: 'yks',
    category: 'TYT Matematik',
    subtopic: 'Temel Kavramlar & Ardışık Sayılar',
    type: 'multiple_choice',
    difficulty: 1,
    prompt: 'Ardışık 5 tek tam sayının toplamı 85 olduğuna göre, bu sayıların en büyüğü kaçtır?',
    options: ['17 (Ortanca)', '19', '21 (En Büyük)', '23'],
    correctIndex: 2,
    mnemonic: '💡 Boğaziçili Koç Taktiği: Toplamı terim sayısına böl (85/5 = 17 → Ortanca). En büyük için 2 adım (+4) ekle: 17 + 4 = 21!',
    timeLimitSec: 20
  },
  {
    id: 'yks-2',
    act: 'yks',
    category: 'AYT Fen',
    subtopic: 'Fizik / Newton Mekaniği & Eylemsizlik',
    type: 'multiple_choice',
    difficulty: 2,
    prompt: 'Doğrusal bir yolda hareket eden cisme etki eden NET KUVVET sıfır (F_net = 0) ise cisim için hangisi kesinlikle doğrudur?',
    options: [
      'Cisim hemen durur',
      'İvmesi sıfırdır, sabit hızla gider',
      'Kinetik enerjisi düzgün artar',
      'Yön değiştirerek yavaşlar'
    ],
    correctIndex: 1,
    mnemonic: '💡 Boğaziçili Koç Taktiği: F_net = 0 demek "durur" demek DEĞİLDİR! Hareketliyse sabit hızla sonsuza dek devam eder (Eylemsizlik).',
    timeLimitSec: 18
  },
  {
    id: 'yks-3',
    act: 'yks',
    category: 'TYT Türkçe',
    subtopic: 'Paragraf / Kırılma ve Zıtlık Bağlaçları',
    type: 'evidence_hunt',
    difficulty: 3,
    prompt: '🛡️ BOSS KALKANI AKTİF! Paragrafta yazarın asıl karşı çıktığı görüşü ele veren "Kırılma / Zıtlık" kelimesine tıkla!',
    passageTokens: [
      { text: 'Pek çok eleştirmen modern şiirin gelenekten tamamen koptuğunu savunur;' },
      { text: 'oysaki', isClue: true },
      { text: 'her yeni imge, geçmişin ses birikimini görünmez bir damarla bugüne taşır.' }
    ],
    mnemonic: '💡 Boğaziçili Koç Taktiği: TYT Türkçe paragraflarında ana düşünce "ama, fakat, oysaki, ne var ki" bağlaçlarından hemen sonraki cümlede gizlidir!',
    timeLimitSec: 25
  },
  {
    id: 'yks-4',
    act: 'yks',
    category: 'AYT Fen',
    subtopic: 'Sayısal Analiz / Türev Ekstremum Noktaları',
    type: 'multiple_choice',
    difficulty: 2,
    prompt: 'f(x) = x³ - 3x² + 5 fonksiyonunun yerel ekstremum (türev sıfır) noktalarının apsisleri toplamı kaçtır?',
    options: ['0', '2', '3', '6'],
    correctIndex: 1,
    mnemonic: "💡 Boğaziçili Koç Taktiği: f'(x) = 3x² - 6x = 0 → Kökler x=0 ve x=2. Toplamı = 2! (-b/a formülüyle kök bulmadan da 6/3 = 2 çıkar).",
    timeLimitSec: 20
  },
  {
    id: 'yks-5',
    act: 'yks',
    category: 'AYT Fen',
    subtopic: 'Fizik / Termodinamik & Hal Değişimi Tuzağı',
    type: 'evidence_hunt',
    difficulty: 3,
    prompt: '🛡️ ÖSYM TUZAK KALKANI! Soru kökünde öğrenciyi düşürmek için konulan "Kesinlik / Tuzak" ifadesine tıklayarak kalkanı kır!',
    passageTokens: [
      { text: 'Isıca yalıtılmış bir kapta bulunan buz kalıbına ısı verildiğinde, buzun sıcaklığı' },
      { text: 'her zaman', isClue: true },
      { text: 'artar önermesi hal değişimi (0°C erime anı) nedeniyle yanlıştır.' }
    ],
    mnemonic: '💡 Boğaziçili Koç Taktiği: Fen sorularında "her zaman, kesinlikle, tümü" gibi mutlak ifadeler %90 hal değişimi veya istisna tuzağıdır!',
    timeLimitSec: 22
  },
  {
    id: 'yks-6',
    act: 'yks',
    category: 'TYT Matematik',
    subtopic: 'Sayı & Denklem Problemleri (Net Hesabı)',
    type: 'multiple_choice',
    difficulty: 2,
    prompt: 'Bir sınavda her doğru +4 puan, her yanlış -1 puandır (4 yanlış 1 doğruyu götürür). 40 soruyu işaretleyip 110 puan alan öğrenci kaç doğru yapmıştır?',
    options: ['26 Doğru', '28 Doğru', '30 Doğru', '32 Doğru'],
    correctIndex: 2,
    mnemonic: '💡 Boğaziçili Koç Taktiği: Hepsini doğru yapsa 40x4 = 160 puan alırdı. Her yanlış 5 puan kaybettirir (4+1). (160-110)/5 = 10 yanlış → 30 Doğru!',
    timeLimitSec: 22
  },

  // --- Discipline 1: TYT Türkçe (5 New Questions to reach 6 total) ---
  {
    id: 'yks-turk-2',
    act: 'yks',
    category: 'TYT Türkçe',
    subtopic: 'Anlatım Bozukluğu / Özne-Yüklem Uyumu',
    type: 'multiple_choice',
    difficulty: 2,
    prompt: 'Aşağıdaki cümlelerin hangisinde özne-yüklem uyumsuzluğundan kaynaklanan bir anlatım bozukluğu vardır?',
    options: [
      'Toplantıda herkes kendi fikrini savundu, kimse geri adım atmadı.',
      'Salondaki herkes ayağa kalktı ve marşı coşkuyla söylediler.',
      'Bu zorlu sınav sürecinde ne sen beni anladın ne de ben seni.',
      'Kuşlar akşam kızıllığında gökyüzünde kanat çırparak uzaklaştı.'
    ],
    correctIndex: 1,
    mnemonic: '💡 Boğaziçili Koç Taktiği: "Herkes, hiçbiri, hepsi" gibi belgisiz zamirler özne olduğunda yüklem daima TEKİL olur. "Herkes söylediler" ÖSYM\'nin en sevdiği çeldiricidir!',
    timeLimitSec: 20
  },
  {
    id: 'yks-turk-3',
    act: 'yks',
    category: 'TYT Türkçe',
    subtopic: 'Yazım Kuralları / "de/da" Bağlacı',
    type: 'multiple_choice',
    difficulty: 1,
    prompt: 'Aşağıdaki cümlelerin hangisinde "de / da" bağlacının yazımıyla ilgili bir YAZIM YANLIŞI yapılmıştır?',
    options: [
      'Sen de bizimle birlikte kütüphaneye gelecek misin?',
      'Kitapta anlatılan olaylar da gerçek hayattan alınmıştı.',
      'Durumun böyle olacağını sende çok iyi biliyordun.',
      'Evde hiç kimsenin olmaması onu biraz tedirgin etti.'
    ],
    correctIndex: 2,
    mnemonic: '💡 Boğaziçili Koç Taktiği: "de/da"yı cümleden çıkarıp oku! Anlam bozulmuyorsa bağlaçtır ve AYRI yazılır. "Durumun böyle olacağını sen çok iyi biliyordun" bozulmaz, ayrı yazılmalıdır!',
    timeLimitSec: 18
  },
  {
    id: 'yks-turk-4',
    act: 'yks',
    category: 'TYT Türkçe',
    subtopic: 'Paragrafta Ana Düşünce & Çıkarım',
    type: 'multiple_choice',
    difficulty: 2,
    prompt: 'Bir yazar: "Ben romanlarımı bir haritaya göre yazmam; karakterlerimin elinden tutar, onların beni götürdüğü sokaklarda kaybolurum." demektedir. Bu yazarın asıl anlatmak istediği nedir?',
    options: [
      'Başarılı bir kurgu, ayrıntılı bir taslak hazırlamaktan geçer.',
      'Karakterlerin gerçek hayattan seçilmesi eserin inandırıcılığını artırır.',
      'Yazma süreci önceden katı biçimde planlanamaz; organik ve sezgisel akar.',
      'Okuyucunun beklentilerini karşılamak romanın temel amacıdır.'
    ],
    correctIndex: 2,
    mnemonic: '💡 Boğaziçili Koç Taktiği: Paragraf sorularında benzetmeye odaklan: "Harita olmaması" = plansızlık/taslaksızlık; "kaybolmak" = organik, sezgisel akış demektir.',
    timeLimitSec: 20
  },
  {
    id: 'yks-turk-5',
    act: 'yks',
    category: 'TYT Türkçe',
    subtopic: 'Cümle Ögeleri / Vurgulanan Öge',
    type: 'multiple_choice',
    difficulty: 2,
    prompt: '"Dün akşam kütüphanede bulduğu eski tarih kitabını büyük bir merakla okudu." cümlesinde VURGULANAN öge hangisidir?',
    options: [
      'Zarf Tümleci (Büyük bir merakla)',
      'Belirtili Nesne (Eski tarih kitabını)',
      'Dolaylı Tümleç / Yer Tamlayıcısı (Kütüphanede)',
      'Özne (Gizli Özne O)'
    ],
    correctIndex: 0,
    mnemonic: '💡 Boğaziçili Koç Taktiği: Fiil cümlelerinde vurgulanan öge, yüklemden HEMEN ÖNCE gelen ögedir! "Okudu" fiilinden hemen önce "büyük bir merakla" (Zarf Tümleci) yer alır.',
    timeLimitSec: 18
  },
  {
    id: 'yks-turk-6',
    act: 'yks',
    category: 'TYT Türkçe',
    subtopic: 'Ses Olayları / Ünlü Düşmesi',
    type: 'evidence_hunt',
    difficulty: 1,
    prompt: '🛡️ SES BİLGİSİ KALKANI! Cümlede "Ünlü Düşmesi" gerçekleşmiş olan sözcüğe tıkla ve kalkanı kır!',
    passageTokens: [
      { text: 'Genç yazar son romanında' },
      { text: 'şehrin', isClue: true },
      { text: 'tarihî sokaklarını büyük bir ustalıkla tasvir etmişti.' }
    ],
    mnemonic: '💡 Boğaziçili Koç Taktiği: "Şehir-i -> Şehri", "Akıl-ı -> Aklı". İki heceli sözcüklere ünlüyle başlayan ek geldiğinde ikinci hecedeki dar ünlü düşer!',
    timeLimitSec: 20
  },

  // --- Discipline 2: TYT Matematik (4 New Questions to reach 6 total) ---
  {
    id: 'yks-mat-3',
    act: 'yks',
    category: 'TYT Matematik',
    subtopic: 'Hız & Karşılaşma Problemleri',
    type: 'multiple_choice',
    difficulty: 2,
    prompt: 'Aralarında 480 km mesafe bulunan iki araç, saatte 70 km ve 50 km hızlarla birbirlerine doğru aynı anda harekete geçiyorlar. Bu iki araç kaç saat sonra karşılaşır?',
    options: ['3 saat', '4 saat', '4.5 saat', '5 saat'],
    correctIndex: 1,
    mnemonic: '💡 Boğaziçili Koç Taktiği: Birbirine doğru gelen araçlarda hızlar TOPLANIR! Yol = (V1 + V2) * t → 480 = (70 + 50) * t → t = 4 saat!',
    timeLimitSec: 20
  },
  {
    id: 'yks-mat-4',
    act: 'yks',
    category: 'TYT Matematik',
    subtopic: 'Yaş Problemleri & Oran-Orantı',
    type: 'multiple_choice',
    difficulty: 1,
    prompt: 'Bir babanın yaşı, iki çocuğunun yaşları toplamının 3 katıdır. 4 yıl sonra babanın yaşı, çocukların yaşları toplamının 2 katı olacağına göre, babanın bugünkü yaşı kaçtır?',
    options: ['32', '36', '40', '44'],
    correctIndex: 1,
    mnemonic: '💡 Boğaziçili Koç Taktiği: ÖSYM yaş problemleri tuzağı: 4 yıl geçtiğinde 2 çocuğun yaş toplamı 4 değil 2x4 = 8 artar! 3x + 4 = 2(x + 8) → x = 12 → Baba = 36!',
    timeLimitSec: 22
  },
  {
    id: 'yks-mat-5',
    act: 'yks',
    category: 'TYT Matematik',
    subtopic: 'Kümeler & De Morgan Kuralları',
    type: 'multiple_choice',
    difficulty: 2,
    prompt: 'A ve B aynı evrensel kümenin alt kümeleridir. (A ∪ B)\' ifadesinin De Morgan kuralına göre eşiti aşağıdakilerden hangisidir?',
    options: ["A' ∪ B'", "A' ∩ B'", "A ∩ B'", "(A ∩ B)'"],
    correctIndex: 1,
    mnemonic: '💡 Boğaziçili Koç Taktiği: De Morgan türevi ters çevirir: Birleşimin tümleyeni, tümleyenlerin KESİŞİMİDİR! (∪ işareti ∩ işaretine döner).',
    timeLimitSec: 18
  },
  {
    id: 'yks-mat-6',
    act: 'yks',
    category: 'TYT Matematik',
    subtopic: 'Fonksiyonlar & Bileşke / Ters Fonksiyon',
    type: 'multiple_choice',
    difficulty: 3,
    prompt: 'f(x) = 2x + 3 ve g(x) = 3x - 1 olduğuna göre, (f o g⁻¹)(8) ifadesinin değeri kaçtır?',
    options: ['7', '9', '11', '13'],
    correctIndex: 1,
    mnemonic: '💡 Boğaziçili Koç Taktiği: Ters fonksiyon denklemini çıkarma! g(x) = 8 yapan x değerini bul (3x - 1 = 8 → x = 3), sonra f(3) hesapla: 2(3) + 3 = 9!',
    timeLimitSec: 25
  },

  // --- Discipline 3: AYT Fen Bilimleri (3 New Questions to reach 6 total) ---
  {
    id: 'yks-fen-4',
    act: 'yks',
    category: 'AYT Fen',
    subtopic: 'Kimya / Periyodik Tablo & Atom Yarıçapı',
    type: 'multiple_choice',
    difficulty: 1,
    prompt: 'Periyodik sistemde aynı periyotta soldan sağa doğru gidildikçe genellikle aşağıdakilerden hangisi AZALIR?',
    options: ['Elektronegatiflik', 'Atom yarıçapı', 'İyonlaşma enerjisi', 'Ametalik aktiflik'],
    correctIndex: 1,
    mnemonic: '💡 Boğaziçili Koç Taktiği: "Kardan Adam" modeli! Soldan sağa proton çekimi arttığı için yarıçap küçülür (kardan adamın burnu erir), yukarıdan aşağıya katman arttığı için şişmanlar!',
    timeLimitSec: 18
  },
  {
    id: 'yks-fen-5',
    act: 'yks',
    category: 'AYT Fen',
    subtopic: 'Kimya / Kimyasal Bağlar & Hidrojen Bağı',
    type: 'multiple_choice',
    difficulty: 2,
    prompt: 'H₂O bileşiğinin aynı gruptaki H₂S bileşiğine göre çok daha yüksek kaynama noktasına sahip olmasının temel nedeni hangisidir?',
    options: [
      'H₂O molekül kütlesinin büyük olması',
      'H₂O molekülleri arasında güçlü Hidrojen bağlarının bulunması',
      'Oksijen atomunun kükürtten daha az elektronegatif olması',
      'H₂O moleküllerinin apolar geometriye sahip olması'
    ],
    correctIndex: 1,
    mnemonic: '💡 Boğaziçili Koç Taktiği: FON kuralı! Hidrojen atomu Flor, Oksijen veya Azot\'a (F, O, N) doğrudan bağlıysa moleküller arası Hidrojen Bağı kurulur. Bu en güçlü zayıf etkileşimdir!',
    timeLimitSec: 20
  },
  {
    id: 'yks-fen-6',
    act: 'yks',
    category: 'AYT Fen',
    subtopic: 'Biyoloji / Mayoz Krossing-Over & Varyasyon',
    type: 'multiple_choice',
    difficulty: 3,
    prompt: 'Mayoz bölünmede genetik çeşitliliği (varyasyonu) artıran "krossing-over" ve "homolog kromozomların rastgele kutuplara ayrılması" olayları sırasıyla hangi evrelerde gerçekleşir?',
    options: [
      'Profaz I ve Anafaz I',
      'Metafaz I ve Anafaz II',
      'Profaz II ve Telofaz I',
      'Anafaz I ve Sitokinez II'
    ],
    correctIndex: 0,
    mnemonic: '💡 Boğaziçili Koç Taktiği: Krossing-over daima ilk evre olan Profaz I\'de tetrat anında; homolog kromozomların bağımsız ayrılması ise Anafaz I\'dedir. Kardeş kromatitler Anafaz II\'de ayrılır!',
    timeLimitSec: 22
  },

  // --- Discipline 4: TYT Sosyal Bilimler (6 New Questions) ---
  {
    id: 'yks-sos-1',
    act: 'yks',
    category: 'TYT Sosyal',
    subtopic: 'Tarih / İlk Türk Devletlerinde Kut Anlayışı',
    type: 'multiple_choice',
    difficulty: 1,
    prompt: 'İlk Türk devletlerinde hükümdara yönetme yetkisinin Gök Tengri tarafından verildiğine inanılan "Kut" anlayışının en önemli siyasi sonucu aşağıdakilerden hangisidir?',
    options: [
      'Sınıf ayrımının ve köleliğin katı kurallarla yerleşmesi',
      'Hanedan üyelerinin taht üzerinde hak iddia etmesiyle sık sık taht kavgalarının yaşanması',
      'Düzenli ve disiplinli daimi bir ordunun kurulamaması',
      'Devletin teokratik baskıcı bir din devleti haline gelmesi'
    ],
    correctIndex: 1,
    mnemonic: '💡 Boğaziçili Koç Taktiği: "Kut kanda vardır, kan tüm hanedandadır!" Bu yüzden amca, kardeş, yeğen tahta hak iddia eder ve Türk devletleri hızla parçalanır!',
    timeLimitSec: 18
  },
  {
    id: 'yks-sos-2',
    act: 'yks',
    category: 'TYT Sosyal',
    subtopic: 'Tarih / Kurtuluş Savaşı & Amasya Genelgesi',
    type: 'multiple_choice',
    difficulty: 2,
    prompt: 'Amasya Genelgesi\'nde yer alan: "Milletin bağımsızlığını yine milletin azim ve kararı kurtaracaktır." maddesi Kurtuluş Savaşı\'nın hangi yönünü ilk kez ortaya koymuştur?',
    options: [
      'Savaşın gerekçesini ve dış güçlerin planını',
      'Milli Mücadele\'nin amaç, yöntemini ve milli egemenlik ilkesini',
      'İstanbul Hükümeti ile derhal uzlaşılacağını',
      'Manda ve himayenin kesin olarak kabul edileceğini'
    ],
    correctIndex: 1,
    mnemonic: '💡 Boğaziçili Koç Taktiği: "Milletin bağımsızlığı" = AMAÇ, "Milletin azim ve kararı" = YÖNTEM! Aynı zamanda üstü kapalı milli egemenlik / cumhuriyet ihtilal bildirgesidir!',
    timeLimitSec: 20
  },
  {
    id: 'yks-sos-3',
    act: 'yks',
    category: 'TYT Sosyal',
    subtopic: 'Coğrafya / İklim Tipleri & Yağış Rejimi',
    type: 'multiple_choice',
    difficulty: 1,
    prompt: '"Yazları sıcak ve kurak, kışları ılık ve yağışlı geçen; bitki örtüsü zeytin, defne, mersin gibi bodur çalılardan (maki) oluşan" iklim tipi hangisidir?',
    options: ['Karadeniz İklimi', 'Step (Bozkır) İklimi', 'Akdeniz İklimi', 'Sert Karasal İklim'],
    correctIndex: 2,
    mnemonic: '💡 Boğaziçili Koç Taktiği: "Kışın ılık-yağışlı + Yazın sıcak-kurak + Maki bitki örtüsü" gördüğün an tereddütsüz Akdeniz İklimi\'ni işaretle!',
    timeLimitSec: 18
  },
  {
    id: 'yks-sos-4',
    act: 'yks',
    category: 'TYT Sosyal',
    subtopic: 'Coğrafya / Nüfus Piramitleri & Demografik Analiz',
    type: 'multiple_choice',
    difficulty: 2,
    prompt: 'Tabanı daralan, üst yaş grubu (65 yaş üstü) oranı belirgin şekilde yüksek olan "Arı Kovanı" şeklindeki nüfus piramidine sahip bir ülke için hangisi kesinlikle söylenebilir?',
    options: [
      'Doğum oranları hızla artmaktadır',
      'Gelişmişlik düzeyi yüksektir ve ortalama yaşam süresi uzundur',
      'Nüfusun çoğunluğu tarım sektöründe istihdam edilmektedir',
      'Genç bağımlı nüfus oranı çok yüksektir'
    ],
    correctIndex: 1,
    mnemonic: '💡 Boğaziçili Koç Taktiği: Taban genişse (üçgen) = az gelişmiş, çok çocuk! Taban darsa (arı kovanı) = gelişmiş ülke, yaşlı nüfus oranı yüksek, sağlık ve refah üst düzey!',
    timeLimitSec: 20
  },
  {
    id: 'yks-sos-5',
    act: 'yks',
    category: 'TYT Sosyal',
    subtopic: 'Felsefe / Epistemoloji (Bilgi Felsefesi)',
    type: 'multiple_choice',
    difficulty: 2,
    prompt: 'John Locke\'un: "İnsan zihni doğuştan boş bir levhadır (Tabula Rasa); bütün bilgilerimiz sonradan deney ve duyular yoluyla edinilir." görüşü hangi felsefi akımı temsil eder?',
    options: [
      'Rasyonalizm (Akılcılık)',
      'Empirizm (Deneycilik)',
      'Kritisizm (Eleştiricilik)',
      'Nihilizm (Hiççilik)'
    ],
    correctIndex: 1,
    mnemonic: '💡 Boğaziçili Koç Taktiği: "Tabula Rasa = Boş Levha = Deney ve Duyu = Empirizm (John Locke)". Doğuştan akıl diyen Descartes Rasyonalisttir; ikisini birleştiren Kant Kritisisttir!',
    timeLimitSec: 20
  },
  {
    id: 'yks-sos-6',
    act: 'yks',
    category: 'TYT Sosyal',
    subtopic: 'Felsefe / Etik (Kant Ödev Ahlakı)',
    type: 'multiple_choice',
    difficulty: 3,
    prompt: 'Kant\'a göre bir eylemin ahlaki değerini eylemin sonucu değil, arkasındaki saf "ödev bilinci ve iyi niyet" belirler. Kant\'ın bu yaklaşımı hangi ahlak kuramıdır?',
    options: [
      'Faydacılık (Utilitarizm)',
      'Ödev Ahlakı (Deontoloji / Koşulsuz Buyruk)',
      'Hedonizm (Hazcılık)',
      'Egoizm (Bencillik)'
    ],
    correctIndex: 1,
    mnemonic: '💡 Boğaziçili Koç Taktiği: Kant gördüğünde aklına "Sonuç değil niyet!", "Çıkar değil ödev!" ve "Kategorik İmperatif (Koşulsuz Buyruk)" gelsin. Sonuç/fayda arayanlar Utilitaristtir!',
    timeLimitSec: 22
  }
];

export const BUEPT_QUESTIONS: TacticalQuestion[] = [
  // --- Preserved BUEPT Academic English Questions (6 Questions) ---
  {
    id: 'buept-1',
    act: 'buept',
    category: 'BUEPT Vocab',
    subtopic: 'Academic Vocabulary / Mitigate vs Exacerbate',
    type: 'multiple_choice',
    difficulty: 2,
    prompt: '"Strict urban policies were implemented to _______ the devastating effects of air pollution."',
    options: [
      'mitigate (hafifletmek / azaltmak)',
      'exacerbate (kötüleştirmek)',
      'proliferate (hızla çoğalmak)',
      'ambiguous (muğlak)'
    ],
    correctIndex: 0,
    mnemonic: '💡 BUEPT Kilyos Notu: "Mitigate = Mild hale getirmek / Hafifletmek". Zıttı ise "Exacerbate / Aggravate" (Kötüleştirmek). Her BUEPT sınavında çıkar!',
    timeLimitSec: 18
  },
  {
    id: 'buept-2',
    act: 'buept',
    category: 'BUEPT Reading',
    subtopic: 'Academic Reading / Concession Markers (Albeit)',
    type: 'evidence_hunt',
    difficulty: 3,
    prompt: '🛡️ KİLYOS BOSS KALKANI! Akademik metinde yazarın "beklenmedik taviz / zıtlık" verdiğini kanıtlayan bağlaca tıkla!',
    passageTokens: [
      { text: 'The new solar prototype demonstrated remarkable thermal efficiency during winter trials,' },
      { text: 'albeit', isClue: true },
      { text: 'at a manufacturing cost that currently prohibits mass commercial adoption.' }
    ],
    mnemonic: '💡 BUEPT Kilyos Notu: "Albeit = Although it be (Her ne kadar ... olsa da)". Olumlu bir bulgunun hemen ardından gelen kısıtlamayı işaret eder!',
    timeLimitSec: 25
  },
  {
    id: 'buept-3',
    act: 'buept',
    category: 'BUEPT Vocab',
    subtopic: 'Academic Vocabulary / Ubiquitous',
    type: 'multiple_choice',
    difficulty: 2,
    prompt: '"Smartphones have become so _______ in modern society that it is rare to see a commuter without one."',
    options: [
      'ephemeral (kısa ömürlü)',
      'ubiquitous (her yerde bulunan)',
      'scanty (kıt / yetersiz)',
      'clandestine (gizli)'
    ],
    correctIndex: 1,
    mnemonic: '💡 BUEPT Kilyos Notu: "Ubiquitous = Her yerde hazır ve nazır (Omnipresent)". "Ephemeral" ise kelebek ömrü gibi geçici demektir.',
    timeLimitSec: 18
  },
  {
    id: 'buept-4',
    act: 'buept',
    category: 'BUEPT Logic',
    subtopic: 'Academic Logic / Concessive Prepositions',
    type: 'multiple_choice',
    difficulty: 2,
    prompt: '"_______ the overwhelming empirical evidence supporting climate shifts, a vocal minority continues to dispute the data."',
    options: [
      'Notwithstanding (Rağmen / Karşın)',
      'Consequently (Sonuç olarak)',
      'Furthermore (Ayrıca)',
      'Provided that (Şartıyla)'
    ],
    correctIndex: 0,
    mnemonic: '💡 BUEPT Kilyos Notu: "Notwithstanding = In spite of / Despite (-e rağmen)". İsim öbeğinden önce gelir ve güçlü zıtlık kurar.',
    timeLimitSec: 18
  },
  {
    id: 'buept-5',
    act: 'buept',
    category: 'BUEPT Reading',
    subtopic: 'Academic Reading / Hypothesis Corroboration',
    type: 'evidence_hunt',
    difficulty: 3,
    prompt: '🛡️ BUEPT PARAGRAF KALKANI! Hipotezin deneysel verilerle "doğrulandığını / desteklendiğini" gösteren akademik fiile tıkla!',
    passageTokens: [
      { text: 'Subsequent neurological scans from three independent laboratories served to' },
      { text: 'corroborate', isClue: true },
      { text: 'the initial hypothesis regarding bilingual cognitive flexibility.' }
    ],
    mnemonic: '💡 BUEPT Kilyos Notu: "Corroborate = Kanıtlarla doğrulamak / desteklemek (Confirm / Substantiate)". Zıttı: "Refute / Debunk" (Çürütmek).',
    timeLimitSec: 24
  },
  {
    id: 'buept-6',
    act: 'buept',
    category: 'BUEPT Vocab',
    subtopic: 'Academic Vocabulary / Paradoxical & Counter-Intuitive Systems',
    type: 'multiple_choice',
    difficulty: 3,
    prompt: '"More roads often lead to more traffic rather than less—a _______ phenomenon known as induced demand."',
    options: [
      'paradoxical (çelişkili / paradoksal)',
      'complacent (halinden memnun / rehavette)',
      'mundane (sıradan / dünyevi)',
      'obsolete (modası geçmiş)'
    ],
    correctIndex: 0,
    mnemonic: '💡 BUEPT Kilyos Notu: "Daha çok yol = Daha çok trafik" beklentinin tam tersi olduğu için "Paradoxical / Counterintuitive" (Çelişkili) cevaptır!',
    timeLimitSec: 20
  }
];

export const ALL_QUESTIONS: TacticalQuestion[] = [...YKS_QUESTIONS, ...BUEPT_QUESTIONS];

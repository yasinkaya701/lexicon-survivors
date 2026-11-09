/**
 * storyQuests.ts
 *
 * The Canonical Narrative & Relic Database for the "Boş Sayfa" Roguelite:
 * 1. Rune Sorceress — "Lale’nin Haritası" (Waves 5 - 100, 20 Milestones)
 * 2. Lexicon Alchemist — "Paylaşılmış Hatıra" (Waves 5 - 100, 20 Milestones)
 * 3. Shadow Scribe — "Silgiyi Tutan El" (Waves 5 - 100, 20 Milestones)
 *
 * Each milestone contains:
 * - wave: number (5, 10, 15, ..., 100)
 * - title: string
 * - premise: string (atmospheric setting)
 * - dialogues: Array of speaker-text pairs
 * - relic: StoryRelic definition (name, description, passiveEffect)
 * - outcome: string (for the climax at wave 100)
 */

import { PlayerRPGStats } from '@/types/brotato';

export type CharacterQuestId = 'rune_sorceress' | 'lexicon_alchemist' | 'shadow_scribe';

export interface DialogueLine {
  speaker: 'Rune' | 'Alchemist' | 'Shadow' | 'Neris' | 'Lale' | 'Boss' | 'Anı' | 'Tanık' | 'Öğrenci' | 'Boş Sayfa';
  text: string;
}

export interface StoryRelic {
  id: string;
  name: string;
  wave: number;
  questId: CharacterQuestId;
  description: string;
  loreSnippet: string;
  iconType: 'compass' | 'starlight' | 'vial' | 'quill' | 'lens' | 'mirror' | 'seal' | 'catalyst' | 'drop' | 'book';
  color: string;
  statBuffs?: Partial<PlayerRPGStats>;
  combatEffectKey?:
    | 'compass_shatter_burst'
    | 'star_lining_chain_bounce'
    | 'parallax_bullet_slow'
    | 'star_glass_chain_range'
    | 'celestial_pierce'
    | 'blind_drop_ink'
    | 'share_catalyst_drop_ink'
    | 'neris_alembic_harvest_boost'
    | 'open_vial_vacuum'
    | 'open_table_choice'
    | 'erased_nib_ink_mark'
    | 'palimpsest_dash_slow'
    | 'joint_eraser_cooldown'
    | 'nameless_editor_boss_stun'
    | 'open_registry_execute';
}

export interface StoryMilestone {
  wave: number;
  title: string;
  subtitle: string;
  premise: string;
  dialogues: DialogueLine[];
  relic?: StoryRelic;
  climaxResolution?: string;
}

export interface CharacterQuestStory {
  id: CharacterQuestId;
  heroName: string;
  title: string;
  questSubtitle: string;
  colorTheme: {
    primary: string;
    secondary: string;
    glow: string;
    bgGradient: string;
    border: string;
  };
  summary: string;
  startingWeaponName: string;
  startingWeaponId: string;
  baseStats: Partial<PlayerRPGStats>;
  milestones: StoryMilestone[];
}

// ============================================================================
// 1. RUNE SORCERESS — “Lale’nin Haritası”
// ============================================================================
export const RUNE_SORCERESS_QUEST: CharacterQuestStory = {
  id: 'rune_sorceress',
  heroName: 'Rune Sorceress',
  title: 'Rune Sorceress',
  questSubtitle: 'Lale’nin Haritası',
  colorTheme: {
    primary: '#38bdf8', // Astral Sky Cyan
    secondary: '#818cf8', // Nebula Indigo
    glow: '#fef08a', // Celestial Starlight Gold
    bgGradient: 'from-sky-950 via-slate-900 to-indigo-950',
    border: 'border-sky-500/40',
  },
  summary:
    'Gözlemevi haritacısı olan annesi Lale’nin kayboluşunu çözmek. Lale, Boş Sayfa’ya hapsedilmemiştir; silinecek olası hayatları bir haritada tutabilmek için kendi isteğiyle onun içine girmiştir. Neris annesinin yolunu saklamış, ama gerçeği söylemeye cesaret edememiştir.',
  startingWeaponName: 'Astral Usturlap (Runic Sphere)',
  startingWeaponId: 'wand_1',
  baseStats: {
    maxHp: 90,
    speedPercent: 8,
    range: 50,
    attackSpeed: 12,
    dodgePercent: 10,
    pickupRange: 130,
  },
  milestones: [
    {
      wave: 5,
      title: 'Ters katalog',
      subtitle: 'Kütüphane dizinindeki yıldızlar tavana değil yere bakar.',
      premise: 'Kütüphanenin tavanındaki takımyıldızları baş aşağı dönmüş, ışıkları zemindeki taşlara dökülüyor.',
      dialogues: [
        { speaker: 'Rune', text: 'Annemin haritasında da kuzey aşağıdaydı.' },
        { speaker: 'Neris', text: 'Lale yönü kaybetmedi. Bir şeyi saklıyordu.' },
      ],
      relic: {
        id: 'pusula_kirigi',
        name: 'Pusula Kırığı',
        wave: 5,
        questId: 'rune_sorceress',
        description: 'Kritik vuruşlar minik göksel şok dalgaları saçar; haritadaki işaretler sayfada parıldar.',
        loreSnippet: 'Kuzeyi değil, unutulanları gösteren pirinç pusulanın kırık camı.',
        iconType: 'compass',
        color: '#38bdf8',
        statBuffs: { critChancePercent: 8, range: 25 },
        combatEffectKey: 'compass_shatter_burst',
      },
    },
    {
      wave: 10,
      title: 'Cam merdiven',
      subtitle: 'Merdiven basamakları her çıkışta farklı bir yıla açılır.',
      premise: 'Basamaklar havada asılı cam prizmalardan örülmüş; her adımda eski bir gözlem notu yankılanıyor.',
      dialogues: [
        { speaker: 'Rune', text: 'Bu basamak, annemin gittiği geceye çıkıyor.' },
        { speaker: 'Neris', text: 'O gece sana veda etmedi; seni korumaya çalıştı.' },
        { speaker: 'Boss', text: 'Lale geride tek bir not bıraktı: “Geri dönme.”' },
      ],
      relic: {
        id: 'cam_basamak_ani',
        name: 'Veda Notu Parşömeni',
        wave: 10,
        questId: 'rune_sorceress',
        description: 'Hareket hızı ve kaçınma şansını artırır.',
        loreSnippet: 'Lale’nin son acele el yazısı: “Beni aramak yerine göğe bak.”',
        iconType: 'lens',
        color: '#818cf8',
        statBuffs: { speedPercent: 10, dodgePercent: 8 },
      },
    },
    {
      wave: 15,
      title: 'Sessiz cephe',
      subtitle: 'Raflar yıldız dizilimi biçiminde devrilmiştir.',
      premise: 'Kütüphane rafları rastgele devrilmemiş; Orion ve Ejderha takımyıldızlarının geometrisini çiziyor.',
      dialogues: [
        { speaker: 'Rune', text: 'Bu bir saldırı izi değil. Bir takımyıldız.' },
        { speaker: 'Neris', text: 'Lale tehlikeyi önceden görmüştü.' },
        { speaker: 'Boss', text: 'Annenin sana uyumadan önce mırıldandığı o üç notayı hatırla...' },
      ],
      relic: {
        id: 'uc_nota_relic',
        name: 'Üç Notalı Çan',
        wave: 15,
        questId: 'rune_sorceress',
        description: 'Saldırı hızını artırır ve periyodik göksel melodiyle düşmanları sersemletir.',
        loreSnippet: 'Gözlemevi kulesindeki rüzgar çanının melodisi.',
        iconType: 'starlight',
        color: '#fef08a',
        statBuffs: { attackSpeed: 15, damagePercent: 6 },
      },
    },
    {
      wave: 20,
      title: 'Harita odası',
      subtitle: 'Boş bir harita masasında yalnızca pusulanın gölgesi vardır.',
      premise: 'Masanın üzeri bomboş; fakat tavan penceresinden süzülen ay ışığı görünmeyen bir adanın silüetini çiziyor.',
      dialogues: [
        { speaker: 'Rune', text: 'Haritayı tamamlamamı bekliyor.' },
        { speaker: 'Neris', text: 'Bazı yolları çizmek, onları geri getirmez.' },
      ],
      relic: {
        id: 'golge_pusula',
        name: 'Gölge Pusula İğnesi',
        wave: 20,
        questId: 'rune_sorceress',
        description: 'Menzilli saldırıların doğruluğunu ve hasarını artırır.',
        loreSnippet: 'Yalnızca karanlıkta yön gösteren gümüş iğne.',
        iconType: 'compass',
        color: '#38bdf8',
        statBuffs: { damagePercent: 12, range: 40 },
      },
    },
    {
      wave: 25,
      title: 'Kırmızı eşik',
      subtitle: 'Dehlize açılan kapı gökyüzüne doğru açılır.',
      premise: 'Kızıl bir aura dehliz kapısını sarıyor; eşiğin ötesinde bulutlar ayakların altında uzanıyor.',
      dialogues: [
        { speaker: 'Lale', text: 'Beni arıyorsan, beni bulduğunda ne yapacağını da seç.' },
        { speaker: 'Rune', text: 'Onu eve getirmek istiyorum; ama kararını da duymak istiyorum.' },
      ],
      relic: {
        id: 'yildiz_astari',
        name: 'Yıldız Astarı',
        wave: 25,
        questId: 'rune_sorceress',
        description: 'Rün Küresi zincirine kısa menzilli 2 ek sekme ve zincirleme hasar ekler.',
        loreSnippet: 'Lale’nin gözlem pelerininin içine diktiği gümüş astardan bir parça.',
        iconType: 'starlight',
        color: '#fef08a',
        statBuffs: { damagePercent: 15, attackSpeed: 8 },
        combatEffectKey: 'star_lining_chain_bounce',
      },
    },
    {
      wave: 30,
      title: 'Taş gök',
      subtitle: 'Duvarlara yıldız adları kazınmış, hepsi birer birer silinmektedir.',
      premise: 'Taş duvarlarda parlayan harfler yavaşça dökülüyor; unutulan isimler toza dönüşüyor.',
      dialogues: [
        { speaker: 'Rune', text: 'Bunlar kayıp yıldızlar değil, silinen insanların adları.' },
        { speaker: 'Neris', text: 'Harita, göğü değil, kimlerin hatırlanacağını tutuyor.' },
        { speaker: 'Boss', text: 'Lale’nin en sevdiği çırağı bendim... Adımı unuttu.' },
      ],
      relic: {
        id: 'kazili_tas_tableti',
        name: 'Silinmeyen İsim Tableti',
        wave: 30,
        questId: 'rune_sorceress',
        description: 'Zırh ve can yenilenmesi sağlar.',
        loreSnippet: 'Üzerine kazınan isimlerin silinmeye direndiği granit parçası.',
        iconType: 'book',
        color: '#94a3b8',
        statBuffs: { armor: 4, hpRegen: 3 },
      },
    },
    {
      wave: 35,
      title: 'Sarkaç kuyusu',
      subtitle: 'Kuyunun içinde yıldızlar aşağı düşüyormuş gibi görünür.',
      premise: 'Devasa tunç sarkaç derin bir kuyu üzerinde salınıyor; dipte gökyüzünün aksi parlıyor.',
      dialogues: [
        { speaker: 'Rune', text: 'Annem bu kuyuyu işaretlemiş.' },
        { speaker: 'Neris', text: 'Lale burada kendi anısını bıraktı.' },
      ],
      relic: {
        id: 'sarkac_agirligi',
        name: 'Gözlemevi Sarkacı',
        wave: 35,
        questId: 'rune_sorceress',
        description: 'Düşman savurma (knockback) gücünü ve hasarını artırır.',
        loreSnippet: 'Dünyanın dönüşünü ölçen ağır pirinç küre.',
        iconType: 'lens',
        color: '#e2e8f0',
        statBuffs: { damagePercent: 14, meleeDamage: 6 },
      },
    },
    {
      wave: 40,
      title: 'Üçüncü gölge',
      subtitle: 'Gözlemevi çizimlerinde Lale’nin gölgesi ondan ayrıdır.',
      premise: 'Işık tek bir kaynaktan gelse de duvarda iki farklı gölge kımıldıyor.',
      dialogues: [
        { speaker: 'Rune', text: 'Bu gölge annem değil; onun geride bıraktığı karar.' },
        { speaker: 'Neris', text: 'İnsan bazen kendinden bir parçayı yol göstermek için bırakır.' },
        { speaker: 'Boss', text: 'Adımların annenin adımlarını bir saniye gecikmeyle takip ediyor...' },
      ],
      relic: {
        id: 'ayrik_golge_lens',
        name: 'Ayrık Gölge Merceği',
        wave: 40,
        questId: 'rune_sorceress',
        description: 'Sıyrılma (Dodge) tavanını yükseltir ve kaçınma sonrası karşı saldırı tetikler.',
        loreSnippet: 'Bedenden bağımsız hareket edebilen bir kararın yansıması.',
        iconType: 'mirror',
        color: '#6366f1',
        statBuffs: { dodgePercent: 12, speedPercent: 8 },
      },
    },
    {
      wave: 45,
      title: 'Ayna meridyen',
      subtitle: 'Aynalarda Rune’un çocukluğu değil, geleceği belirir.',
      premise: 'Dev meridyen aynalarında Rune’un yıldızları yöneten yetişkin sureti parlıyor.',
      dialogues: [
        { speaker: 'Rune', text: 'Onun yerini alırsam bu harita tamamlanır.' },
        { speaker: 'Neris', text: 'Tamamlanmış olmak, doğru olmak demek değildir.' },
        { speaker: 'Boss', text: 'Annenin kaderini mi yaşayacaksın, yoksa haritayı mı yakacaksın?' },
      ],
      relic: {
        id: 'meridyen_aynasi',
        name: 'Gelecek Meridyeni Aynası',
        wave: 45,
        questId: 'rune_sorceress',
        description: 'Kritik hasar çarpanını ve can çalmayı artırır.',
        loreSnippet: 'Kişinin olabileceği en kararlı halini gösteren pürüzsüz ayna.',
        iconType: 'mirror',
        color: '#38bdf8',
        statBuffs: { critChancePercent: 10, lifeSteal: 5 },
      },
    },
    {
      wave: 50,
      title: 'Yedi yıldız mührü',
      subtitle: 'Gözlemevinin kubbesinde kapı yerine bir takımyıldız vardır.',
      premise: 'Yedi parlayan yıldız mühür gibi dizilmiş; kubbe dönerek göğü yarık gibi açıyor.',
      dialogues: [
        { speaker: 'Lale', text: 'Ben kaybolmadım. Haritanın içine geçtim.' },
        { speaker: 'Rune', text: 'Beni terk etmedin; beni seçiminin dışında bıraktın.' },
      ],
      relic: {
        id: 'paralaks_astrolabi',
        name: 'Paralaks Astrolabı',
        wave: 50,
        questId: 'rune_sorceress',
        description: 'Tüm düşman mermilerini %30 yavaşlatır; Lale’nin rotasını haritada açar.',
        loreSnippet: 'İki farklı noktadan bakıldığında gerçeğin yerini gösteren antik pirinç alet.',
        iconType: 'compass',
        color: '#38bdf8',
        statBuffs: { attackSpeed: 18, dodgePercent: 10 },
        combatEffectKey: 'parallax_bullet_slow',
      },
    },
    {
      wave: 55,
      title: 'Açık kubbe',
      subtitle: 'Kubbe açıldığında yıldızların arasında boş bir alan belirir.',
      premise: 'Gece göğünün ortasında yıldızsız, simsiyah, kadife gibi bir boşluk uzanıyor.',
      dialogues: [
        { speaker: 'Rune', text: 'Orası karanlık değil; henüz adı olmayan bir yer.' },
        { speaker: 'Neris', text: 'Boş Sayfa, orayı kendi adıyla doldurmak istiyor.' },
        { speaker: 'Boss', text: 'Lale orayı boş bıraktı; çünkü seni oraya çizmekten korktu!' },
      ],
      relic: {
        id: 'bos_alan_kristali',
        name: 'İsimsiz Gökyüzü Kristali',
        wave: 55,
        questId: 'rune_sorceress',
        description: 'Toplama menzilini ve şans statüsünü büyük oranda artırır.',
        loreSnippet: 'Işığı emen değil, yeni yıldızlar doğurmaya hazır karanlık parça.',
        iconType: 'lens',
        color: '#fef08a',
        statBuffs: { luck: 25, pickupRange: 60 },
      },
    },
    {
      wave: 60,
      title: 'Yankı takımyıldızı',
      subtitle: 'Yıldızlar Rune’un annesinin sesini bir kez tekrarlar.',
      premise: 'Işık parlamalarıyla birlikte kulaklarda yankılanan tanıdık bir ses.',
      dialogues: [
        { speaker: 'Lale', text: 'Beni duyuyorsan, beni çağırma; haritayı oku.' },
        { speaker: 'Rune', text: 'Seni çağırmak yerine yolunu anlayacağım.' },
      ],
      relic: {
        id: 'yanki_harita_rulosu',
        name: 'Yankılanan Harita Rulosu',
        wave: 60,
        questId: 'rune_sorceress',
        description: 'Tüm silahlara +%18 hasar ve +%15 menzil kazandırır.',
        loreSnippet: 'Ses titreşimleriyle parlayan parşömen harita.',
        iconType: 'book',
        color: '#818cf8',
        statBuffs: { damagePercent: 18, range: 45 },
      },
    },
    {
      wave: 65,
      title: 'İkiz mercekler',
      subtitle: 'Bir mercek geçmişi, diğeri henüz verilmemiş kararı gösterir.',
      premise: 'Teleskobun iki oküleri var; birinde bir el sallanıyor, diğerinde sonsuz bir şafak.',
      dialogues: [
        { speaker: 'Rune', text: 'Birinde annem dönüyor, diğerinde yıldızlar dağılmıyor.' },
        { speaker: 'Neris', text: 'İkisi de mümkün. Henüz hiçbirini yazmadık.' },
        { speaker: 'Boss', text: 'Gelecek tek bir çizgi değildir; seçim seni ezecek!' },
      ],
      relic: {
        id: 'ikiz_mercek_relic',
        name: 'Olasılık Mercekleri',
        wave: 65,
        questId: 'rune_sorceress',
        description: 'Kritik vuruş şansını %15 artırır ve hasar absorbsiyonu verir.',
        loreSnippet: 'Çifte geleceği aynı anda odaklayan kuvars camlar.',
        iconType: 'lens',
        color: '#38bdf8',
        statBuffs: { critChancePercent: 15, armor: 5 },
      },
    },
    {
      wave: 70,
      title: 'Kara ay',
      subtitle: 'Kara ayın yüzeyinde silinmiş isimler görünür.',
      premise: 'Ay tutulmuş; fakat karanlık yüzeyinde binlerce parlayan isim kabartma gibi okunuyor.',
      dialogues: [
        { speaker: 'Rune', text: 'Annem bunları tutmak için kendini haritanın parçası yaptı.' },
        { speaker: 'Neris', text: 'Lale bir mahkûm değil. Bir bekçi.' },
        { speaker: 'Boss', text: 'O kurtarılmak istemiyor, küçük kız. Yeni bir kapı açmanı istiyor!' },
      ],
      relic: {
        id: 'kara_ay_parcasi',
        name: 'Kara Ay Kabartması',
        wave: 70,
        questId: 'rune_sorceress',
        description: 'Maksimum canı 35 artırır ve güçlü can yenilenmesi sağlar.',
        loreSnippet: 'Üzerinde binlerce hatıranın titreştiği bazalt ay taşı.',
        iconType: 'starlight',
        color: '#64748b',
        statBuffs: { maxHp: 35, hpRegen: 5 },
      },
    },
    {
      wave: 75,
      title: 'Kırılan meridyen',
      subtitle: 'Boş Sayfa’nın içinde Lale’nin sesi ilk kez doğrudan duyulur.',
      premise: 'Uzay yırtılıyor; cam kırılma sesleri arasında Lale’nin silüeti beliriyor.',
      dialogues: [
        { speaker: 'Lale', text: 'Beni seçersen, bu isimlerin hepsi yeniden kaybolabilir.' },
        { speaker: 'Rune', text: 'Seni buldum. Şimdi sana ne yapacağını sormam gerekiyor.' },
      ],
      relic: {
        id: 'lalenin_yildiz_cami',
        name: 'Lale’nin Yıldız Camı',
        wave: 75,
        questId: 'rune_sorceress',
        description: 'Rün Küresi zincir menzilini %50 artırır; zincir hedefleri alev alır.',
        loreSnippet: 'Lale’nin gözlem masasında bıraktığı en berrak yıldız merceği.',
        iconType: 'lens',
        color: '#38bdf8',
        statBuffs: { damagePercent: 20, range: 60 },
        combatEffectKey: 'star_glass_chain_range',
      },
    },
    {
      wave: 80,
      title: 'Sayfa denizi',
      subtitle: 'Yıldızlar kâğıt adalara tutturulmuştur.',
      premise: 'Sonsuz bir boşlukta yüzen kâğıt adalar; her adada bir kütüphane masası ve lamba yanıyor.',
      dialogues: [
        { speaker: 'Rune', text: 'Harita artık gökyüzü değil; insanların birbirine çizdiği yollar.' },
        { speaker: 'Lale', text: 'Burada kaldım çünkü her yolun kapanmasını istemedim.' },
        { speaker: 'Boss', text: 'Bu sayfayı yırtıp sizin mezarınız yapacağım!' },
      ],
      relic: {
        id: 'kagit_ada_pusulasi',
        name: 'Sayfa Denizi Pusulası',
        wave: 80,
        questId: 'rune_sorceress',
        description: 'Saldırı hızını ve hareket hızını büyük oranda artırır.',
        loreSnippet: 'Mürekkep okyanusunda rotayı bulan hafif pusula.',
        iconType: 'compass',
        color: '#fef08a',
        statBuffs: { attackSpeed: 20, speedPercent: 12 },
      },
    },
    {
      wave: 85,
      title: 'Haritasız yol',
      subtitle: 'Bir ada hiçbir çizgiyle bağlı değildir.',
      premise: 'Hiçbir haritada yer almayan, kendi ışığıyla parlayan ıssız bir ada.',
      dialogues: [
        { speaker: 'Rune', text: 'Bunu bulmak için yönümü bırakmam gerekiyor.' },
        { speaker: 'Neris', text: 'İlk kez Lale’nin haritasını izlemek yerine kendi rotanı çiz.' },
      ],
      relic: {
        id: 'runenin_yildiz_isareti',
        name: 'Rune’un Yıldız Mührü',
        wave: 85,
        questId: 'rune_sorceress',
        description: 'Tüm silahlara delme (+2 pierce) ve %20 kritik şansı kazandırır.',
        loreSnippet: 'Rune’un haritaya kendi eliyle çizdiği ilk takımyıldız.',
        iconType: 'starlight',
        color: '#38bdf8',
        statBuffs: { critChancePercent: 20, damagePercent: 15 },
        combatEffectKey: 'celestial_pierce',
      },
    },
    {
      wave: 90,
      title: 'Son ölçüm',
      subtitle: 'Lale, bir kapının iki yanında aynı anda görünür.',
      premise: 'İki kapı aralık duruyor; birinin eşiğinde eski evlerinin bahçesi, diğerinde bilinmeyen bir şafak.',
      dialogues: [
        { speaker: 'Lale', text: 'Bir kapı eve, diğeri yeni bir göğe açılıyor.' },
        { speaker: 'Rune', text: 'Hangisini seçsem, diğerini kaybedebilir miyim?' },
        { speaker: 'Lale', text: 'Yalnızca ikisini de tek bir sonuca zorlamaya çalışırsan.' },
      ],
      relic: {
        id: 'cift_kapi_anahtari',
        name: 'İkili Eşik Anahtarı',
        wave: 90,
        questId: 'rune_sorceress',
        description: 'Zırhı 8 artırır ve can yenilenmesini iki katına çıkarır.',
        loreSnippet: 'Hem geçmişi hem geleceği aynı anda kilitleyen ya da açan altın anahtar.',
        iconType: 'seal',
        color: '#f59e0b',
        statBuffs: { armor: 8, hpRegen: 8 },
      },
    },
    {
      wave: 95,
      title: 'Haritanın dikişi',
      subtitle: 'Altı ayrı el yazısı tek yıldızda kesişir.',
      premise: 'Altı farklı çağdan haritacıların el yazıları gökte birleşip tek bir yıldıza düğümleniyor.',
      dialogues: [
        { speaker: 'Rune', text: 'Artık annemin haritasını tamamlamıyorum.' },
        { speaker: 'Lale', text: 'Güzel. Haritalar yol gösterir; yolu seçmez.' },
        { speaker: 'Boss', text: 'Bu son çizim boş! Bir hiç için savaştınız!' },
      ],
      relic: {
        id: 'lalenin_son_cizimi',
        name: 'Lale’nin Son Çizimi',
        wave: 95,
        questId: 'rune_sorceress',
        description: 'Tüm statları %15 artırır; mermilere kozmik çekim gücü ekler.',
        loreSnippet: 'İçi kasıtlı olarak boş bırakılmış, doldurulmayı bekleyen parıldayan bir yıldız.',
        iconType: 'book',
        color: '#fef08a',
        statBuffs: { damagePercent: 25, attackSpeed: 15, maxHp: 30 },
      },
    },
    {
      wave: 100,
      title: 'Yeni takımyıldız',
      subtitle: 'Rune son sayfaya bir yıldız ekler ama adını yazmaz.',
      premise: 'Boş Sayfa’nın kubbesi çatlıyor; Lale elini uzatıyor ve ikisi birlikte son yıldızı çiziyor.',
      dialogues: [
        { speaker: 'Rune', text: 'Bu yıldızın adı, onu görenlerin seçimi olsun.' },
        { speaker: 'Lale', text: 'Böylece kimse tek bir geleceğe kilitlenmez.' },
      ],
      climaxResolution:
        'Lale haritadan çıkar, fakat eskisi gibi değildir; Rune annesini geri “almış” olmaz, onunla yeni bir yol seçer.',
    },
  ],
};

// ============================================================================
// 2. LEXICON ALCHEMIST — “Paylaşılmış Hatıra”
// ============================================================================
export const LEXICON_ALCHEMIST_QUEST: CharacterQuestStory = {
  id: 'lexicon_alchemist',
  heroName: 'Lexicon Alchemist',
  title: 'Lexicon Alchemist',
  questSubtitle: 'Paylaşılmış Hatıra',
  colorTheme: {
    primary: '#f59e0b', // Alchemical Amber
    secondary: '#14b8a6', // Memory Teal
    glow: '#e11d48', // Distilled Ruby
    bgGradient: 'from-amber-950 via-stone-900 to-teal-950',
    border: 'border-amber-500/40',
  },
  summary:
    'Unutulan köyünün anılarını geri getirecek formülü tamamlamak. Neris yıllar önce Alchemist’ten acıyı azaltan bir mürekkep özü istemiştir. Öz, insanların anılarını saklamış; Boş Sayfa onları tek bir şişede kilitleyerek kendi gücünü kazanmıştır.',
  startingWeaponName: 'Hafıza İmbiki (Memory Alembic)',
  startingWeaponId: 'pistol_1',
  baseStats: {
    maxHp: 105,
    harvesting: 25,
    luck: 15,
    damagePercent: 5,
    pickupRange: 140,
    hpRegen: 2,
  },
  milestones: [
    {
      wave: 5,
      title: 'Ölçüsüz tarif',
      subtitle: 'Katalogda bir formül vardır ama son bileşen boş bırakılmıştır.',
      premise: 'Kütüphane masasında tozlu bir simya defteri; son satırda mürekkep kurumadan silinmiş.',
      dialogues: [
        { speaker: 'Alchemist', text: 'Bunu ben yazmışım; fakat ölçüyü ben silmemişim.' },
        { speaker: 'Neris', text: 'Tarifin amacı unutmak değildi. Acıyı taşınabilir kılmaktı.' },
      ],
      relic: {
        id: 'kor_damla',
        name: 'Kör Damla Özü',
        wave: 5,
        questId: 'lexicon_alchemist',
        description: 'Boss öldüğünde ekstra mürekkep ve materyal damlaları saçar.',
        loreSnippet: 'Acıyı dindirmek için damıtılan ilk ve eksik damla.',
        iconType: 'drop',
        color: '#f59e0b',
        statBuffs: { harvesting: 15, luck: 10 },
        combatEffectKey: 'blind_drop_ink',
      },
    },
    {
      wave: 10,
      title: 'Kırık şişe',
      subtitle: 'Kırılmış şişenin içinden hiç kurumayan bir mektup çıkar.',
      premise: 'Cam kırıkları arasından sızan amber rengi sıvı, havada kelimeler oluşturuyor.',
      dialogues: [
        { speaker: 'Alchemist', text: 'Bu babamın el yazısı. Ben onu hatırlamıyordum.' },
        { speaker: 'Neris', text: 'Hatırlayamaman, onun hiç var olmadığı anlamına gelmiyor.' },
        { speaker: 'Boss', text: 'O şişeyi köyün her hanesine taşıdım; hepsi birer birer unuttu!' },
      ],
      relic: {
        id: 'babamin_mektubu',
        name: 'Kurumayan Mektup',
        wave: 10,
        questId: 'lexicon_alchemist',
        description: 'Can yenilenmesi ve zırh kazandırır.',
        loreSnippet: 'Babacan bir sesin hiç silinmeyen hatırası.',
        iconType: 'book',
        color: '#14b8a6',
        statBuffs: { hpRegen: 3, armor: 3 },
      },
    },
    {
      wave: 15,
      title: 'Kuru laboratuvar',
      subtitle: 'Raflardaki şişeler boş, etiketleri doludur.',
      premise: 'Yüzlerce cam şişe rafta dizili; içleri kuru hava, etiketlerinde ise yaşayan insanların isimleri var.',
      dialogues: [
        { speaker: 'Alchemist', text: 'İnsanların isimleri şişelerde saklanmış.' },
        { speaker: 'Neris', text: 'Ben her etiketi tek tek yazdım.' },
        { speaker: 'Boss', text: 'Şişeleri kırarsanız hatıralar çığlık atar!' },
      ],
      relic: {
        id: 'etiketli_reaktif_sisesi',
        name: 'Reaktif Şişesi',
        wave: 15,
        questId: 'lexicon_alchemist',
        description: 'Menzilli saldırıların alan etkisini genişletir.',
        loreSnippet: 'Üzerinde bir komşunun gülüşü yazılı olan cam şişe.',
        iconType: 'vial',
        color: '#e11d48',
        statBuffs: { damagePercent: 12, range: 35 },
      },
    },
    {
      wave: 20,
      title: 'Tadım odası',
      subtitle: 'Mürekkep kuyusu tatlı, acı ve tuzlu katmanlara ayrılır.',
      premise: 'Kuyudaki sıvı üç belirgin renge ayrılmış; koku hafızayı zorluyor.',
      dialogues: [
        { speaker: 'Alchemist', text: 'Bu karışım acıyı almıyor; hatırlama biçimini değiştiriyor.' },
        { speaker: 'Neris', text: 'Bunu birlikte yaptık. Sonra korkup kapattım.' },
      ],
      relic: {
        id: 'uc_katmanli_oz',
        name: 'Üç Katmanlı Öz',
        wave: 20,
        questId: 'lexicon_alchemist',
        description: 'Tüm elementel statları dengeler; hasar ve saldırı hızını artırır.',
        loreSnippet: 'Tatlı sevinç, acı yas ve tuzlu gözyaşının dengeli karışımı.',
        iconType: 'vial',
        color: '#f59e0b',
        statBuffs: { damagePercent: 10, attackSpeed: 10, maxHp: 15 },
      },
    },
    {
      wave: 25,
      title: 'İlk katalizör',
      subtitle: 'Dehliz kapısının dibinde aile mutfağından kalma ölçü kaşığı vardır.',
      premise: 'Pirinç bir ölçü kaşığı; sapında aşınmış bir aile arması.',
      dialogues: [
        { speaker: 'Alchemist', text: 'Formülümün ilk parçası köyde başlamış.' },
        { speaker: 'Neris', text: 'Gerçek bileşen bir nesne değil; paylaşmaya razı bir tanıktır.' },
      ],
      relic: {
        id: 'paylasim_katalizoru',
        name: 'Paylaşım Katalizörü',
        wave: 25,
        questId: 'lexicon_alchemist',
        description: 'İyileştirme meyveleri ve parşömenler az miktarda mürekkep/materyal de verir.',
        loreSnippet: 'Bir komşunun çorbasını bölüşürken kullanılan küçük pirinç kaşık.',
        iconType: 'catalyst',
        color: '#14b8a6',
        statBuffs: { hpRegen: 4, harvesting: 20 },
        combatEffectKey: 'share_catalyst_drop_ink',
      },
    },
    {
      wave: 30,
      title: 'Taş imbik',
      subtitle: 'Taş duvarlarda kayıp köyün yemek tarifleri yazılıdır.',
      premise: 'Duvarlara kazınmış un, maya ve tuz ölçüleri; her tarif bir hanenin sofrasını anlatıyor.',
      dialogues: [
        { speaker: 'Alchemist', text: 'Bunlar iksir değil; ailelerin birbirine bıraktığı tarifler.' },
        { speaker: 'Neris', text: 'Her formül birinin başkasına güvenmesiydi.' },
        { speaker: 'Boss', text: 'O tarifleri yakıyorum! Küllerinden besleneceğim!' },
      ],
      relic: {
        id: 'tas_imbik_parcasi',
        name: 'Taş İmbik Kalıntısı',
        wave: 30,
        questId: 'lexicon_alchemist',
        description: 'Zırhı 5 artırır ve can çalma kazandırır.',
        loreSnippet: 'Yüzyıllardır ateşe dayanmış mutfak taşından bir parça.',
        iconType: 'vial',
        color: '#94a3b8',
        statBuffs: { armor: 5, lifeSteal: 6 },
      },
    },
    {
      wave: 35,
      title: 'İki çökelti',
      subtitle: 'Aynı sıvı iki farklı anıyı gösterir.',
      premise: 'Şişenin dibinde iki katman: üstte parlayan bir düğün ateşi, altta hüzünlü bir veda.',
      dialogues: [
        { speaker: 'Alchemist', text: 'Bir anıyı silmeden acısını azaltabilirim.' },
        { speaker: 'Neris', text: 'Ben bunu o zaman öğrenemedim.' },
      ],
      relic: {
        id: 'iki_cokelti_sisesi',
        name: 'Çifte Çökelti Şişesi',
        wave: 35,
        questId: 'lexicon_alchemist',
        description: 'Kritik vuruş şansını ve maksimum canı artırır.',
        loreSnippet: 'Öfke ve kederin birbirini nötrleyerek güç verdiği özel karışım.',
        iconType: 'vial',
        color: '#e11d48',
        statBuffs: { critChancePercent: 12, maxHp: 20 },
      },
    },
    {
      wave: 40,
      title: 'Etiketsiz raf',
      subtitle: 'Etiketsiz bir şişe Alchemist’in elinde ısınır.',
      premise: 'Bütün raflar soğukken, tek bir şişe avuçta ılık bir nefes gibi çarpıyor.',
      dialogues: [
        { speaker: 'Alchemist', text: 'Bu, babamın son anısı. Ama yalnızca benim değil.' },
        { speaker: 'Neris', text: 'Onu kendi hatıran olarak saklamak zorunda değilsin.' },
        { speaker: 'Boss', text: 'O anıyı köyün bütün gençleri taşıyor!' },
      ],
      relic: {
        id: 'sicak_hafiza_sisesi',
        name: 'Ilık Hatıra Şişesi',
        wave: 40,
        questId: 'lexicon_alchemist',
        description: 'Saldırı hızını ve can yenilenmesini artırır.',
        loreSnippet: 'Avuçta sıcak kalan ortak bir sevgi hatırası.',
        iconType: 'vial',
        color: '#f59e0b',
        statBuffs: { attackSpeed: 14, hpRegen: 4 },
      },
    },
    {
      wave: 45,
      title: 'Yanlış doz',
      subtitle: 'Bir oda aynı kayıp anıyı herkese farklı biçimde gösterir.',
      premise: 'Odadaki buhar her göze farklı bir geçmiş yansıtıyor.',
      dialogues: [
        { speaker: 'Alchemist', text: 'Herkese aynı ilacı verirsem herkesi aynı kişiye dönüştürürüm.' },
        { speaker: 'Neris', text: 'İşte Boş Sayfa tam olarak bunu vaat ediyor.' },
      ],
      relic: {
        id: 'secim_recetesi',
        name: 'Kişinin Seçimi Reçetesi',
        wave: 45,
        questId: 'lexicon_alchemist',
        description: 'Hasar yüzdesini ve şansı önemli ölçüde artırır.',
        loreSnippet: 'Reçetenin kenarındaki el yazısı: “Kararı daima sahibine bırak.”',
        iconType: 'book',
        color: '#14b8a6',
        statBuffs: { damagePercent: 16, luck: 18 },
      },
    },
    {
      wave: 50,
      title: 'Karanlık damıtma',
      subtitle: 'Son tarifin üzerinde Neris’in adı bileşen gibi yazılmıştır.',
      premise: 'Damıtma imbiklerinin üzerinde Neris’in eski mühürleri parlıyor.',
      dialogues: [
        { speaker: 'Alchemist', text: 'Kendini ilaca kattın.' },
        { speaker: 'Neris', text: 'İsimlerimi feda ettim; çünkü acının kaynağını ben açmıştım.' },
      ],
      relic: {
        id: 'nerisin_damitma_kabi',
        name: 'Neris’in Damıtma Kabı',
        wave: 50,
        questId: 'lexicon_alchemist',
        description: 'Her ikinci boss ödülünün mürekkep ve materyalini %40 artırır.',
        loreSnippet: 'Neris’in kendi adını unutturmak pahasına kullandığı bakır damıtma haznesi.',
        iconType: 'catalyst',
        color: '#14b8a6',
        statBuffs: { harvesting: 30, maxHp: 25 },
        combatEffectKey: 'neris_alembic_harvest_boost',
      },
    },
    {
      wave: 55,
      title: 'Yıldız ölçeri',
      subtitle: 'Gözlemevi, sıvının içindeki anıları yıldız gibi ayırır.',
      premise: 'Merceklerden geçen ışık, şişedeki anıları gökyüzü takımyıldızları gibi ayrıştırıyor.',
      dialogues: [
        { speaker: 'Alchemist', text: 'Hatıralar aynı kapta ama birbirine karışmak zorunda değiller.' },
        { speaker: 'Neris', text: 'Lale bunu gökyüzünden görmüştü.' },
      ],
      relic: {
        id: 'ayristirici_olcek',
        name: 'Ayrıştırıcı Ölçü Kabı',
        wave: 55,
        questId: 'lexicon_alchemist',
        description: 'Toplama menzilini ve kaçınma şansını artırır.',
        loreSnippet: 'Her anıyı kendi saflığında tutan kristal dereceli kap.',
        iconType: 'lens',
        color: '#38bdf8',
        statBuffs: { pickupRange: 50, dodgePercent: 8 },
      },
    },
    {
      wave: 60,
      title: 'Soğutma banyosu',
      subtitle: 'Buz gibi suyun altında eski bir kahkaha duyulur.',
      premise: 'Kristalize suyun içinden yükselen berrak bir çocuk kahkahası.',
      dialogues: [
        { speaker: 'Alchemist', text: 'Hatırlamak geri dönmek değil; bazen yalnızca gülüşü duyabilmek.' },
        { speaker: 'Neris', text: 'Köyün anıları hâlâ kendi sahiplerini bekliyor.' },
        { speaker: 'Boss', text: 'Canınızı mürekkep gibi akıtacağım!' },
      ],
      relic: {
        id: 'donmus_kahkaha_kristali',
        name: 'Donmuş Kahkaha Kristali',
        wave: 60,
        questId: 'lexicon_alchemist',
        description: 'Maksimum canı 40 artırır ve hasar aldığında dondurucu dalga saçar.',
        loreSnippet: 'Hiçbir acının donduramadığı eski bir sevinç tınısı.',
        iconType: 'lens',
        color: '#14b8a6',
        statBuffs: { maxHp: 40, armor: 6 },
      },
    },
    {
      wave: 65,
      title: 'Deney ortağı',
      subtitle: 'Defterde iki kişinin imzası vardır; biri silinmiştir.',
      premise: 'Defterin kapağında Alchemist’in ve Neris’in eski ortak mührü beliriyor.',
      dialogues: [
        { speaker: 'Alchemist', text: 'İkinci imza senin, Neris.' },
        { speaker: 'Neris', text: 'Birlikte başladık. Sonra ben tek başıma karar verdim.' },
      ],
      relic: {
        id: 'ortak_defter_sayfasi',
        name: 'Ortak Defter Sayfası',
        wave: 65,
        questId: 'lexicon_alchemist',
        description: 'Tüm silahlara %18 saldırı hızı ve %12 hasar kazandırır.',
        loreSnippet: 'İki ustanın birlikte yazdığı, güveni mühürleyen son sayfa.',
        iconType: 'book',
        color: '#f59e0b',
        statBuffs: { attackSpeed: 18, damagePercent: 12 },
      },
    },
    {
      wave: 70,
      title: 'Acı ölçeği',
      subtitle: 'Terazi bir kefede kayıp, diğerinde unutmayı tartar.',
      premise: 'Pirinç terazinin iki kefesi sallanıyor; kefeler dengelendikçe oda aydınlanıyor.',
      dialogues: [
        { speaker: 'Alchemist', text: 'Kayıp hafiflemiyor. Yalnızca tek kişinin omzundan iniyor.' },
        { speaker: 'Neris', text: 'Bunu daha önce duymalıydım.' },
      ],
      relic: {
        id: 'koy_halki_sicili',
        name: 'Köy Halkı Rıza Sicili',
        wave: 70,
        questId: 'lexicon_alchemist',
        description: 'Zırhı ve can çalmayı artırır.',
        loreSnippet: 'Köy halkının kendi rızasıyla attığı parmak izleri.',
        iconType: 'seal',
        color: '#94a3b8',
        statBuffs: { armor: 8, lifeSteal: 8 },
      },
    },
    {
      wave: 75,
      title: 'Açık şişe',
      subtitle: 'Boş Sayfa’nın içinde bütün köyün ortak kokusu vardır.',
      premise: 'Tandır ekmeği, kekik ve yağmur kokusu; Boş Sayfa’nın karanlığını yarıp geçiyor.',
      dialogues: [
        { speaker: 'Alchemist', text: 'Bunu açarsam hiçbir anıyı seçemeyeceğim.' },
        { speaker: 'Neris', text: 'O zaman seçme. İnsanlara kendileri seçsin diye geri ver.' },
      ],
      relic: {
        id: 'acik_hafiza_sisesi',
        name: 'Açık Hafıza Şişesi',
        wave: 75,
        questId: 'lexicon_alchemist',
        description: 'Boss öldüğünde yakındaki tüm parşömen ve mürekkep damlalarını manyetik olarak oyuncuya çeker.',
        loreSnippet: 'Tıpası çıkarılmış, anıların sahibine dönmesine izin veren şişe.',
        iconType: 'vial',
        color: '#f59e0b',
        statBuffs: { pickupRange: 100, luck: 25 },
        combatEffectKey: 'open_vial_vacuum',
      },
    },
    {
      wave: 80,
      title: 'Paylaşım masası',
      subtitle: 'Sayfa denizindeki adalarda farklı tarifler pişer.',
      premise: 'Sayfa denizinde yüzen masalarda eski yemekler yeniden tütüyor.',
      dialogues: [
        { speaker: 'Alchemist', text: 'Köyün mutfağı bu dünyada hâlâ yaşıyor.' },
        { speaker: 'Anı', text: 'Bunu unutmuş olabiliriz; ama yeniden yapabiliriz.' },
        { speaker: 'Boss', text: 'Masayı dağıtıp anıları çiğneyeceğim!' },
      ],
      relic: {
        id: 'ortak_sofra_ortusu',
        name: 'Ortak Sofra Örtüsü',
        wave: 80,
        questId: 'lexicon_alchemist',
        description: 'Hasat bonusunu ve hareket hızını büyük oranda artırır.',
        loreSnippet: 'Bütün köyün bir araya geldiği şenlik masasının keten örtüsü.',
        iconType: 'catalyst',
        color: '#14b8a6',
        statBuffs: { harvesting: 35, speedPercent: 12 },
      },
    },
    {
      wave: 85,
      title: 'Son şişe',
      subtitle: 'Tek şişe tüm köyü geri getirecek kadar doludur.',
      premise: 'Ağır, koyu altın rengi tek bir şişe; içinde yüzlerce hayat kıpırdıyor.',
      dialogues: [
        { speaker: 'Alchemist', text: 'Hepsini tek seferde dökersem, yine onlar adına karar vermiş olurum.' },
        { speaker: 'Neris', text: 'İlaç, kapı açar; kimsenin içeri girmesini zorlamaz.' },
      ],
      relic: {
        id: 'secim_kapagi',
        name: 'Seçim Kapağı',
        wave: 85,
        questId: 'lexicon_alchemist',
        description: 'Tüm silahlara %25 kritik hasar ve ek saldırı hızı kazandırır.',
        loreSnippet: 'Mühürlü değil, dileyenin açabileceği esnek pirinç kapak.',
        iconType: 'seal',
        color: '#f59e0b',
        statBuffs: { critChancePercent: 18, attackSpeed: 16 },
        combatEffectKey: 'open_table_choice',
      },
    },
    {
      wave: 90,
      title: 'Tadına bakmadan',
      subtitle: 'Köy halkının anıları ayrı ayrı ışıklar halinde belirir.',
      premise: 'Yüzlerce farklı renkli ışık küresi masanın etrafında dönüyor.',
      dialogues: [
        { speaker: 'Alchemist', text: 'Her biri kendi acısını ve sevincini seçebilir.' },
        { speaker: 'Anı', text: 'Beni geri çağırma. Bana yolu göster.' },
      ],
      relic: {
        id: 'yol_gosteren_kandil',
        name: 'Hafıza Kandili',
        wave: 90,
        questId: 'lexicon_alchemist',
        description: 'Zırhı ve maksimum canı büyük oranda yükseltir.',
        loreSnippet: 'Anıların kendi yolunu bulmasını sağlayan hafif simya kandili.',
        iconType: 'catalyst',
        color: '#14b8a6',
        statBuffs: { maxHp: 45, armor: 8 },
      },
    },
    {
      wave: 95,
      title: 'Tarifin son satırı',
      subtitle: 'Formülün sonunda miktar değil, bir cümle yazılıdır.',
      premise: 'Kitaptaki son boşluk kendiliğinden altın harflerle doluyor.',
      dialogues: [
        { speaker: 'Alchemist', text: 'Anıyı saklama; paylaş ki çoğalsın.' },
        { speaker: 'Neris', text: 'Bu kez son satırı sen yaz.' },
      ],
      relic: {
        id: 'paylasilmis_formül_muhru',
        name: 'Paylaşılmış Formül Mührü',
        wave: 95,
        questId: 'lexicon_alchemist',
        description: 'Tüm statları %20 artırır; materyal kazanımını ikiye katlar.',
        loreSnippet: 'Tek kişiye ait olmayan, paylaşıldıkça acıyı hafifleten kutsal reçete.',
        iconType: 'book',
        color: '#f59e0b',
        statBuffs: { damagePercent: 25, harvesting: 40, luck: 30 },
      },
    },
    {
      wave: 100,
      title: 'Açık masa',
      subtitle: 'Şişe kırılır; içindeki anılar sahiplerine doğru dağılır.',
      premise: 'Cam kırılma sesi odayı dolduruyor; altın renkli damlalar havaya karışıp köye doğru uçuyor.',
      dialogues: [
        { speaker: 'Alchemist', text: 'Kimseyi eski hâline getiremem. Onlara seçimlerini geri verebilirim.' },
        { speaker: 'Neris', text: 'Bu, benim yapamadığım düzeltmeydi.' },
      ],
      climaxResolution:
        'Köy tek bir anı olarak geri dönmez; hayatta kalanların ayrı ayrı kararlarıyla yeniden kurulur.',
    },
  ],
};

// ============================================================================
// 3. SHADOW SCRIBE — “Silgiyi Tutan El”
// ============================================================================
export const SHADOW_SCRIBE_QUEST: CharacterQuestStory = {
  id: 'shadow_scribe',
  heroName: 'Shadow Scribe',
  title: 'Shadow Scribe',
  questSubtitle: 'Silgiyi Tutan El',
  colorTheme: {
    primary: '#a855f7', // Void Shadow Purple
    secondary: '#fde047', // Illuminated Calligraphy Gold
    glow: '#e2e8f0', // Parchment Ash White
    bgGradient: 'from-purple-950 via-zinc-900 to-slate-950',
    border: 'border-purple-500/40',
  },
  summary:
    'Neris’in eski çırağı olarak ilk büyük silintinin sorumluluğunu üstlenmek. Shadow, “güvenli son” vaadiyle insanların adlarını geçici olarak kayıttan çıkarmıştır. Neris’in adı da o işlemde silinmiş, Boş Sayfa ise bu işlemi sonsuza dek sürdürmek üzere doğmuştur.',
  startingWeaponName: 'Palimpsest Diviti (Calligraphy Quill)',
  startingWeaponId: 'knife_1',
  baseStats: {
    maxHp: 85,
    speedPercent: 12,
    critChancePercent: 15,
    dodgePercent: 15,
    attackSpeed: 10,
    meleeDamage: 5,
  },
  milestones: [
    {
      wave: 5,
      title: 'İlk silgi izi',
      subtitle: 'Boş katalogda Shadow’un eski kalem ucuna uyan çizik vardır.',
      premise: 'Katalog sayfasında kazınmış bir oluk; Shadow’un divit ucu tam o yarığa oturuyor.',
      dialogues: [
        { speaker: 'Shadow', text: 'Bu izi ben bıraktım.' },
        { speaker: 'Neris', text: 'Bir iz, bütün hikâye değildir.' },
      ],
      relic: {
        id: 'silinmis_uc',
        name: 'Silinmiş Uç',
        wave: 5,
        questId: 'shadow_scribe',
        description: 'Kritik isabetler düşman üzerinde mürekkep işareti bırakır (+%15 hasar çarpanı).',
        loreSnippet: 'İlk büyük silintiyi başlatan aşınmış çelik divit ucu.',
        iconType: 'quill',
        color: '#a855f7',
        statBuffs: { critChancePercent: 8, attackSpeed: 8 },
        combatEffectKey: 'erased_nib_ink_mark',
      },
    },
    {
      wave: 10,
      title: 'Çıraklık sırası',
      subtitle: 'Duvara beş isim kazınmış; biri kazınmak üzeredir.',
      premise: 'Kâtipler loncasının taş duvarında beş çırağın adı; beşincinin üzeri yarı yarıya kazınmış.',
      dialogues: [
        { speaker: 'Shadow', text: 'Neris bana boşlukları okumayı öğretmişti.' },
        { speaker: 'Neris', text: 'Ama neyi silmeyeceğini öğretmedim.' },
        { speaker: 'Boss', text: 'İşte senin ilk sınav kâğıdın! Başarısızlığın belgesi!' },
      ],
      relic: {
        id: 'ilk_sinav_kagidi',
        name: 'Kâtip Sınav Kâğıdı',
        wave: 10,
        questId: 'shadow_scribe',
        description: 'Sıyrılma şansı ve hareket hızını artırır.',
        loreSnippet: 'Kenarında Neris’in kırmızı mürekkeple düştüğü uyarı notu.',
        iconType: 'book',
        color: '#fde047',
        statBuffs: { dodgePercent: 8, speedPercent: 10 },
      },
    },
    {
      wave: 15,
      title: 'Güvenli son',
      subtitle: 'Her kitapta aynı mutlu son, aynı karakterleri yok eder.',
      premise: 'Kütüphanedeki tüm romanların son sayfası aynı; kahramanlar adları silindiği için acı çekmiyor, ama yaşamıyorlar da.',
      dialogues: [
        { speaker: 'Shadow', text: 'Ben acıyı önlemek için onların adını sildim.' },
        { speaker: 'Neris', text: 'Onlara acıyı seçme hakkını da sildin.' },
        { speaker: 'Boss', text: 'Silinen kahramanların gölgeleriyle savaşacaksın!' },
      ],
      relic: {
        id: 'guvenli_son_parsameni',
        name: 'Sahte Mutlu Son Parşömeni',
        wave: 15,
        questId: 'shadow_scribe',
        description: 'Kritik hasarı ve yakın dövüş hasarını artırır.',
        loreSnippet: 'Herkesi korumak isterken herkesi silen kurgusal son.',
        iconType: 'book',
        color: '#a855f7',
        statBuffs: { critChancePercent: 10, meleeDamage: 8 },
      },
    },
    {
      wave: 20,
      title: 'Sorumlu satır',
      subtitle: 'Neris’in imzası görünür, altındaki çırağın imzası kazınmıştır.',
      premise: 'Resmi kütükte Neris’in mührü tek başına duruyor; çırağın adı bilerek korunmak için kazınmış.',
      dialogues: [
        { speaker: 'Shadow', text: 'Beni korumuşsun.' },
        { speaker: 'Neris', text: 'Seni suçtan değil, seçiminin sonuçlarından sakladım.' },
      ],
      relic: {
        id: 'kazili_imza_tasi',
        name: 'Kazılı İmza Taşı',
        wave: 20,
        questId: 'shadow_scribe',
        description: 'Zırhı ve maksimum canı artırır.',
        loreSnippet: 'Suçu çıraktan alıp kendi üzerine mühürleyen taş kütük.',
        iconType: 'seal',
        color: '#94a3b8',
        statBuffs: { armor: 5, maxHp: 20 },
      },
    },
    {
      wave: 25,
      title: 'Mühür tutanağı',
      subtitle: 'Dehliz kapısının kaydında Shadow’un eli ve Neris’in adı yoktur.',
      premise: 'Dehliz kapısındaki bronz levhada formül duruyor; fakat mühürleyen isim boş bırakılmış.',
      dialogues: [
        { speaker: 'Shadow', text: 'Mührün formülünü ben yazdım. Adını sen verdin.' },
        { speaker: 'Neris', text: 'Ben kendi adımı mühür yapmayı seçtim.' },
      ],
      relic: {
        id: 'palimpsest_ucu',
        name: 'Palimpsest Ucu',
        wave: 25,
        questId: 'shadow_scribe',
        description: 'Atılım (dodge/dash) izi arkasında düşmanları yavaşlatan silgi tozu bırakır.',
        loreSnippet: 'Eski metinleri kazıyıp üzerine yenisini yazan keskin kâtip bıçağı.',
        iconType: 'quill',
        color: '#a855f7',
        statBuffs: { dodgePercent: 10, speedPercent: 12 },
        combatEffectKey: 'palimpsest_dash_slow',
      },
    },
    {
      wave: 30,
      title: 'Yanlış düzeltme',
      subtitle: 'Taş duvarda her düzeltme bir başka cümleyi bozmuştur.',
      premise: 'Granit duvarda bir kelime düzeltilmiş; fakat altındaki üç cümle anlamını yitirip çatlamış.',
      dialogues: [
        { speaker: 'Shadow', text: 'Bir kelimeyi düzeltirken cümlenin sahibine sormadım.' },
        { speaker: 'Neris', text: 'Bir kâtip yalnızca işaret koyabilir. Kararı yazara bırakmalı.' },
        { speaker: 'Boss', text: 'Yeniden yazılmış yalanlarla kalkan öreceğim!' },
      ],
      relic: {
        id: 'duzeltme_isareti_cetveli',
        name: 'Kâtip Düzeltme Cetveli',
        wave: 30,
        questId: 'shadow_scribe',
        description: 'Menzili ve saldırı hızını artırır.',
        loreSnippet: 'Kelimelerin sınırını çizen pirinç kenarlı cetvel.',
        iconType: 'seal',
        color: '#fde047',
        statBuffs: { range: 35, attackSpeed: 12 },
      },
    },
    {
      wave: 35,
      title: 'Kâtip mahkemesi',
      subtitle: 'Shadow’un yargıcı kendi el yazısıyla konuşur.',
      premise: 'Boş kürsüde açılan dev sicil defteri; sayfadaki el yazısı Shadow’un gençliğine ait.',
      dialogues: [
        { speaker: 'Shadow', text: 'Kendimi cezalandırmak, onları geri getirmiyor.' },
        { speaker: 'Neris', text: 'Hayır. Ama sorumluluğu kabul etmek yeni bir şey başlatabilir.' },
      ],
      relic: {
        id: 'mahkeme_sicil_kocani',
        name: 'Kâtip Mahkeme Koçanı',
        wave: 35,
        questId: 'shadow_scribe',
        description: 'Kritik vuruş şansını ve hasarını artırır.',
        loreSnippet: 'Vicdanın kendi el yazısıyla verdiği hüküm koçanı.',
        iconType: 'book',
        color: '#a855f7',
        statBuffs: { critChancePercent: 12, damagePercent: 14 },
      },
    },
    {
      wave: 40,
      title: 'Boş ad',
      subtitle: 'Kütükte Shadow’un adı vardır ama hiç kimse onu hatırlamaz.',
      premise: 'Kütükte bir isim parlıyor; fakat seslendirildiğinde odadaki kimse tınısını duyamıyor.',
      dialogues: [
        { speaker: 'Shadow', text: 'Ben de kendimi sildirmişim.' },
        { speaker: 'Neris', text: 'Sana kalacak bir isim bırakmamıştım.' },
        { speaker: 'Boss', text: 'Gerçek adını bu sandığın içinde kilitledim!' },
      ],
      relic: {
        id: 'kilitli_ad_kapagi',
        name: 'İsimsiz Kapak Mührü',
        wave: 40,
        questId: 'shadow_scribe',
        description: 'Zırhı ve can çalmayı artırır.',
        loreSnippet: 'Bir insanın kendi adını unutma pahasına kazandığı gölge zırhı.',
        iconType: 'seal',
        color: '#64748b',
        statBuffs: { armor: 6, lifeSteal: 6 },
      },
    },
    {
      wave: 45,
      title: 'Tanık sandalyesi',
      subtitle: 'Boş sandalyede Shadow’un eski öğrencisinin notu durur.',
      premise: 'Işık altında tek bir ahşap sandalye; üzerinde katlanmış sarı bir not kâğıdı.',
      dialogues: [
        { speaker: 'Öğrenci', text: 'Bize güvenli son değil, kendi sonumuzu seçme hakkı ver.' },
        { speaker: 'Shadow', text: 'Bunu onlara söylemeliydim.' },
      ],
      relic: {
        id: 'ogrenci_notu',
        name: 'Tanık Öğrenci Notu',
        wave: 45,
        questId: 'shadow_scribe',
        description: 'Saldırı hızını ve şansı artırır.',
        loreSnippet: 'Bir öğrencinin kendi kaderini seçme cesaretini anlatan not.',
        iconType: 'book',
        color: '#fde047',
        statBuffs: { attackSpeed: 15, luck: 20 },
      },
    },
    {
      wave: 50,
      title: 'İki imza',
      subtitle: 'Neris ve Shadow’un imzaları aynı mühür altında buluşur.',
      premise: 'Aynı balmumu mührün üzerinde hem ustanın hem çırağın yüzük izi birleşiyor.',
      dialogues: [
        { speaker: 'Neris', text: 'Ben de imzaladım. Suçu sana bırakmayacağım.' },
        { speaker: 'Shadow', text: 'Bunu paylaşmak beni masum yapmaz.' },
      ],
      relic: {
        id: 'ortak_silgi_muhru',
        name: 'Ortak Silgi Mührü',
        wave: 50,
        questId: 'shadow_scribe',
        description: 'Tüm aktif gadget ve soru freeze bekleme sürelerini %25 kısaltır.',
        loreSnippet: 'Usta ve çırağın ortak sorumluluğunu belgeleyen kırmızı balmumu mühür.',
        iconType: 'seal',
        color: '#e11d48',
        statBuffs: { dodgePercent: 10, speedPercent: 10 },
        combatEffectKey: 'joint_eraser_cooldown',
      },
    },
    {
      wave: 55,
      title: 'Yıldız arşivi',
      subtitle: 'Her yıldız, silinmiş bir cümleyi aydınlatır.',
      premise: 'Tavandaki yıldızlar yandıkça aşağıdaki zeminde silinmiş cümleler beyaz mürekkeple parlıyor.',
      dialogues: [
        { speaker: 'Shadow', text: 'Silmek, yok etmek değilmiş; karanlıkta tutmakmış.' },
        { speaker: 'Neris', text: 'Boş Sayfa karanlığı kendine ait sanıyor.' },
      ],
      relic: {
        id: 'beyaz_murekkep_hokkasi',
        name: 'Beyaz Mürekkep Hokkası',
        wave: 55,
        questId: 'shadow_scribe',
        description: 'Toplama menzilini ve menzilli hasarı artırır.',
        loreSnippet: 'Yalnızca karanlık sayfalarda parıldayan ay ışığı mürekkebi.',
        iconType: 'vial',
        color: '#fde047',
        statBuffs: { pickupRange: 50, damagePercent: 16 },
      },
    },
    {
      wave: 60,
      title: 'Neris’in dersi',
      subtitle: 'Defterde Neris’in düzeltilmemiş ilk dersi bulunur.',
      premise: 'Eski bir defter sayfası; üzerinde kırık bir divit izi ve Neris’in ilk tavsiyesi.',
      dialogues: [
        { speaker: 'Neris', text: 'Öğretmen olmak, öğrencinin hatasını onun adına düzeltmek değildir.' },
        { speaker: 'Shadow', text: 'Beni durdurmak için değil, geri dönmem için beklemişsin.' },
        { speaker: 'Boss', text: 'O dersi sana mezarında tekrar ettireceğim!' },
      ],
      relic: {
        id: 'nerisin_ilk_dersi',
        name: 'Düzeltilmemiş Ders Notu',
        wave: 60,
        questId: 'shadow_scribe',
        description: 'Maksimum canı 35 artırır ve hasar absorbsiyonu kazandırır.',
        loreSnippet: 'Hatanın öğrenmenin bir parçası olduğunu kabullenen ilk ders.',
        iconType: 'book',
        color: '#a855f7',
        statBuffs: { maxHp: 35, armor: 6 },
      },
    },
    {
      wave: 65,
      title: 'Silinmiş ses',
      subtitle: 'Bir tanık konuşamadan ağzındaki kelimeler kaybolur.',
      premise: 'Gölge bir tanık duruyor; kelimeler dudaklarından dökülürken havada silgi tozu gibi uçuşuyor.',
      dialogues: [
        { speaker: 'Shadow', text: 'Bu kez cümlesini tamamlamayacağım.' },
        { speaker: 'Tanık', text: 'Sadece dinle.' },
      ],
      relic: {
        id: 'tanik_ses_kutusu',
        name: 'Tanık Sesi Kristali',
        wave: 65,
        questId: 'shadow_scribe',
        description: 'Kritik şansını ve saldırı hızını artırır.',
        loreSnippet: 'Hiçbir silginin yok edemediği fısıldanan bir hakikat.',
        iconType: 'lens',
        color: '#fde047',
        statBuffs: { critChancePercent: 15, attackSpeed: 15 },
      },
    },
    {
      wave: 70,
      title: 'Yazılmamış özür',
      subtitle: 'Shadow’un özür mektubu defalarca silinmiştir.',
      premise: 'Yüzlerce yırtılmış ve silinmiş mektup parçası havada savruluyor.',
      dialogues: [
        { speaker: 'Shadow', text: 'Özrüm onların yükünü azaltmak için değil, benimkini değil.' },
        { speaker: 'Neris', text: 'O zaman özrü söyle ve cevabı bekle.' },
        { speaker: 'Boss', text: 'O kâğıdı yakıyorum! Cevap alamayacaksın!' },
      ],
      relic: {
        id: 'yanmis_ozur_parsameni',
        name: 'Yazılmamış Özür Parşömeni',
        wave: 70,
        questId: 'shadow_scribe',
        description: 'Zırhı ve can yenilenmesini artırır.',
        loreSnippet: 'Kelimeleri yakılsa da samimiyeti havada kalan mektup.',
        iconType: 'book',
        color: '#94a3b8',
        statBuffs: { armor: 8, hpRegen: 6 },
      },
    },
    {
      wave: 75,
      title: 'Kendi adı',
      subtitle: 'Boş Sayfa Shadow’a gerçek adını geri sunar.',
      premise: 'Boş Sayfa’nın karanlık kalbinden yükselen altın bir levha; Shadow’un çocukluk adı parlıyor.',
      dialogues: [
        { speaker: 'Shadow', text: 'Bunu verirsen, senin yerine karar vermiş olurum.' },
        { speaker: 'Boş Sayfa', text: 'Bana bir ad ver. İtaat ederim.' },
      ],
      relic: {
        id: 'isimsiz_duzeltmen',
        name: 'İsimsiz Düzeltmen',
        wave: 75,
        questId: 'shadow_scribe',
        description: 'İlk kritik vuruş her boss dalgasında hedefe 2.5 saniye felç ve yavaşlatma uygular.',
        loreSnippet: 'İtaat teklifini reddedip kendi sorumluluğunu seçen kâtibin mührü.',
        iconType: 'seal',
        color: '#a855f7',
        statBuffs: { critChancePercent: 18, damagePercent: 20 },
        combatEffectKey: 'nameless_editor_boss_stun',
      },
    },
    {
      wave: 80,
      title: 'İtiraf odası',
      subtitle: 'Silinen bütün cümleler Shadow’un çevresinde belirir.',
      premise: 'Duvarda binlerce silinmiş cümle bir anda karanlığı yarıp ortaya çıkıyor.',
      dialogues: [
        { speaker: 'Shadow', text: 'Hepsini geri yazamam.' },
        { speaker: 'Neris', text: 'Ama her birini kimin yazdığını kabul edebilirsin.' },
        { speaker: 'Boss', text: 'İtirafların beni zayıflatıyor... Sus!' },
      ],
      relic: {
        id: 'itiraf_sicili',
        name: 'Hakikat Sicil Defteri',
        wave: 80,
        questId: 'shadow_scribe',
        description: 'Tüm silahlara +%22 hasar ve delme kazandırır.',
        loreSnippet: 'Her cümlenin gerçek yazarını kayda geçiren kalın deri defter.',
        iconType: 'book',
        color: '#fde047',
        statBuffs: { damagePercent: 22, range: 40 },
      },
    },
    {
      wave: 85,
      title: 'Neris’in seçimi',
      subtitle: 'Neris, Shadow’dan kendisini kurtarmasını istemez.',
      premise: 'Neris kapının eşiğinde duruyor; silinmiş portresi arkasında bir kalkan gibi duruyor.',
      dialogues: [
        { speaker: 'Neris', text: 'Benim adıma karar verme. Sadece kapıyı aç.' },
        { speaker: 'Shadow', text: 'Sonra ne yapacağını kendin seçeceksin.' },
      ],
      relic: {
        id: 'nerisin_silinmis_portresi',
        name: 'Neris’in Açık Portresi',
        wave: 85,
        questId: 'shadow_scribe',
        description: 'Kaçınma şansını %15 ve saldırı hızını %20 artırır.',
        loreSnippet: 'Yüzü netleşen, kendi kaderini kendi ellerine alan ustanın resmi.',
        iconType: 'mirror',
        color: '#e11d48',
        statBuffs: { dodgePercent: 15, attackSpeed: 20 },
      },
    },
    {
      wave: 90,
      title: 'Cevap beklemek',
      subtitle: 'Shadow’un eski öğrencileri sahneye gelir; hiçbiri aynı şeyi söylemez.',
      premise: 'Öğrenciler etrafta toplanıyor; bazıları öfkeli, bazıları minnettar, hepsi canlı.',
      dialogues: [
        { speaker: 'Öğrenci', text: 'Seni affetmiyorum.' },
        { speaker: 'Tanık', text: 'Ama söylediğini duydum.' },
        { speaker: 'Shadow', text: 'İkisini de kabul edeceğim.' },
      ],
      relic: {
        id: 'ogrenciler_meclisi',
        name: 'Çoğul Sesler Mührü',
        wave: 90,
        questId: 'shadow_scribe',
        description: 'Zırhı ve maksimum canı artırır.',
        loreSnippet: 'Farklı görüşlerin aynı masada var olabildiğini belgeleyen karar.',
        iconType: 'seal',
        color: '#a855f7',
        statBuffs: { maxHp: 50, armor: 8 },
      },
    },
    {
      wave: 95,
      title: 'Son düzeltme',
      subtitle: 'Silgi masanın ortasında kalır; yanında boş bir kalem vardır.',
      premise: 'Masada aşınmış bir kauçuk silgi ve yeni doldurulmuş bir divit.',
      dialogues: [
        { speaker: 'Neris', text: 'İstersen yine kullanabilirsin.' },
        { speaker: 'Shadow', text: 'Bu kez önce sahibine soracağım.' },
        { speaker: 'Boss', text: 'Düzeltmeler iz bırakmamalıydı!' },
      ],
      relic: {
        id: 'iz_birakan_divit',
        name: 'İz Bırakan Divit',
        wave: 95,
        questId: 'shadow_scribe',
        description: 'Kritik vuruş şansını %25 artırır; canı %25 altındaki düşmanları anında infaz eder.',
        loreSnippet: 'Düzeltmenin silmek değil, yanına şerh düşmek olduğunu bilen divit.',
        iconType: 'quill',
        color: '#fde047',
        statBuffs: { critChancePercent: 25, damagePercent: 20 },
        combatEffectKey: 'open_registry_execute',
      },
    },
    {
      wave: 100,
      title: 'Açık kayıt',
      subtitle: 'Neris’in adı sayfaya geri yazılır; yanına Shadow’un imzası eklenir.',
      premise: 'Boş Sayfa’nın son yaprağı; iki imza yan yana parlıyor, silgi sonsuza dek bırakılmış.',
      dialogues: [
        { speaker: 'Shadow', text: 'Beni affetmeni istemiyorum. Yaptığım şey kayıtta kalsın.' },
        { speaker: 'Neris', text: 'Kalacak. Benim seçtiğim cevap da yanında duracak.' },
      ],
      climaxResolution:
        'Shadow suçunu silmez; yeni kâtip olur ve hiçbir kaydı tek başına değiştirmez.',
    },
  ],
};

// ============================================================================
// 4. MASTER EXPORT & HELPER LOOKUPS
// ============================================================================
export const ALL_CHARACTER_QUESTS: Record<CharacterQuestId, CharacterQuestStory> = {
  rune_sorceress: RUNE_SORCERESS_QUEST,
  lexicon_alchemist: LEXICON_ALCHEMIST_QUEST,
  shadow_scribe: SHADOW_SCRIBE_QUEST,
};

export function getStoryMilestone(
  questId: CharacterQuestId,
  wave: number
): StoryMilestone | undefined {
  const quest = ALL_CHARACTER_QUESTS[questId];
  if (!quest) return undefined;
  return quest.milestones.find((m) => m.wave === wave);
}

export function isMilestoneWave(wave: number): boolean {
  return wave > 0 && wave <= 100 && wave % 5 === 0;
}

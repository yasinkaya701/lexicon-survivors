# Oyun akışı ve seslendirme tasarımı

## Amaç

Quiz açıkken otomatik dalganın başlamasını engellemek, silahların menzilli tehditleri zamanında hedeflemesini sağlamak ve oyundaki İngilizce kelime telaffuzlarıyla hikâye/boss repliklerine ses eklemek.

## Kapsam ve sınırlar

- Quiz açılışında dükkânın otomatik dalga sayacı iptal edilir; quiz kapandıktan sonra sayaç kendiliğinden yeniden başlamaz.
- Genel silah hedeflemesi menzilli düşmanları yakın düşmanlardan önce değerlendirir. Boss/elit önceliği ve mesafe sıralaması korunur.
- Web Speech API uygun İngilizce ve Türkçe sesleri seçer. Quiz kelimesi açılışta okunur ve tekrar düğmesi sunulur; bölüm anlatıları ve hikâye kareleri otomatik okunur. Hikâye konuşmacılarına göre ton, boss repliklerinde daha pes/yavaş ayarlanır.
- Boss savaş girişinde ve mevcut hikâye diyaloglarında sesli replik verir. Kullanıcı arayüzü, müzik ve ses efektleri mevcut davranışını sürdürür.
- Ses sentezi/ses yoksa oyun normal çalışır. Kalite ve kullanılabilir diller tarayıcı/cihaz seslerine bağlıdır; harici TTS servisi veya kayıtlı ses paketi eklenmez.

## Yaklaşımlar

- **Cihaz Web Speech API’si (seçilen):** Ek servis ve varlık gerektirmez, İngilizce/Türkçe sesleri anında kullanır. Doğallık cihazdaki seslere göre değişir.
- **Hazır ses dosyaları:** Daha tutarlı yönetmenlik sağlar; her kelime, hikâye ve boss repliği için üretim/dağıtım ve boyut maliyeti getirir.

Kullanıcı cihazdaki Web Speech seslerini seçti. Proje zaten tarayıcı tabanlı ve kullanıcı özellikle Web Speech telaffuz desteği istediği için ilk yaklaşım kullanılacak.

## Uygulama kararları

- Uygulama hedefi: referans satırları içeren `pages-boss-zoom-20261108` worktree’sindeki `game.js` ve `index.html`.
- Genel hedef puanlamasında boss/elit önceliği korunur; Grammar Goblin ve Punctuation Phantom açık tehdit sınıfı olarak bunların ardından ve sıradan yakın sürülerin önünde seçilir. Menzilli/elit önceliği, yakın dövüş silahlarının mevcut erişim mesafesi içindeki hedeflere uygulanır.
- Konuşma dili içerikten belirlenir: kelimeler İngilizce, yerelleştirilmiş hikâye ve anlatılar Türkçe. Ton ve hız konuşmacı türüne göre ayarlanır; en uygun kullanılabilir ses bulunamazsa aynı dilde varsayılan sese düşülür.
- Otomatik konuşma tarayıcı tarafından engellenirse tekrar düğmesi kullanıcı etkileşimiyle okumayı başlatabilir.
- Hikâye tekrar düğmesi klavye ile kullanılabilir; Tab odağı, Enter/Space düğme etkinleştirmesi korunur.

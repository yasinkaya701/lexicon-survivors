# 600 hikâye paneli için ana üretim promptu

Bu ana prompt, manifestteki 600 ayrı isteğin ortak sanat yönetimidir. Her kayıt tek bir görsel üretir; karakter, mekân ve olay ayrıntıları ilgili panel kaydından alınır.

> Lexicon Survivors için tek bir yüksek kaliteli, elle işlenmiş pixel-art çizgi roman paneli üret. Kaynak olarak verilen gerçek oyun sprite'ını karakterin silueti, kıyafeti, ana renkleri ve imza silahı/aksesuarı için kesin kimlik referansı kabul et; bu karakteri yeniden tasarlama. Ayrıntılı model sayfası yüz, malzeme ve orantı referansıdır. Adı geçen boss ve NPC'ler yalnız kendi onaylı model referanslarına göre çizilmelidir.
>
> Paneldeki fiziksel eylem ve duygu, bu kayıttaki sahne kanonuna tam uysun. Tek ve okunaklı bir odak seç: örneğin yırtık katalog kartı, pirinç teleskop, sönmüş mum, çatlak ölçü kabı, mühürlü kapı ya da bossun bıraktığı küçük kanıt. Mekânı boş fon gibi bırakma: raf mimarisi, merdiven, ahşap işçiligi, vitray, harita, ciltli kitap, kandil, yıpranmış kumaş, metal bağlantı, toz ve ışık katmanlarıyla zengin kur; fakat her varlığın sahneye hikâye gerekçesi olsun. Dekoratif gürültü veya rastgele sembol doldurma.
>
> Çizim profesyonel pixel-art sanatçısının eliyle yapılmış gibi görünmeli: belirgin piksel kümeleri, kontrollü basamaklı kontur, tutarlı piksel ölçeği, temiz ışık-gölge ayrımı, ifade taşıyan göz ve eller, farklı malzemeler için farklı piksel dokusu. Karanlık fantezi kütüphane atmosferi kur; silüetleri okunur ve duyguyu görünür tut. 640×360 mantıksal tuvalde tasarla, sonra keskin kenarları koruyarak nearest-neighbor ile tam 2× büyüt ve 1280×720 PNG ver.
>
> Bu 600 panelin hiçbirinde aynı kamera açısını, karakter yerleşimini, ışık desenini veya ana kompozisyonu tekrar etme. Önceki panele benzer bir kadraj görürsen sahne kanonunu koruyup açıyı ve görsel odağı değiştir. Boss karşılaşması tek başına savaşılmış ve bitmiştir; yeni bir boss dövüşü çizme. Savaş mekaniğini yalnız sahne kanonunun istediği ölçüde iz, malzeme veya mekân metaforuna dönüştür.
>
> Görselin içine hiçbir yazı, harf, sayı, sahte yazı, okunur mühür, başlık, konuşma balonu, altyazı, arayüz, dosya/klasör ikonu, emoji, logo veya filigran koyma. Diyalog oyunun ayrı comic UI katmanında gösterilecek; yazı için panelin içine boş kart yerleştirme. Uydurma karakter, yeni kostüm, eksik imza eşyası, anatomik bozukluk, yumuşak airbrush, bulanık kenar, fotogerçekçilik, vektör gradyanı, aşırı parıltı, neon, rastgele gürültü, yapay detay kümeleri ve jenerik AI-fantasy görünümünden kaçın.

## Her isteğe eklenecek değişkenler

- Oynanabilir karakter kimliği ve oyun sprite'ı
- O karakterin yüksek ayrıntılı hikâye referansı
- Sahneye katılan konuşmacı ve onun sabit model referansı
- Dalga, bölüm adı, yer, sahne kanonu ve fiziksel eylem
- O dalganın boss kimliği, saldırı teması, yenilgi sonrası tanıklığı ve kanıttan/emanetten doğan sonuç
- Panel sırası için ayrı kamera ve kompozisyon notu

Tam prompt üretimi scripts/build_story_art_600_commission.py ile yapılır. Bu dosya 600 ayrı isteği hazırlar; kendisi görsel üretmez. Görseller, oyunun kalan oynanış ve arayüz işleri doğrulandıktan sonra tek tek üretilip görsel kalite kontrolünden geçirilecektir.

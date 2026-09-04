# Sportschool Web

Türk Ocağı Elit Futbol Akademisi için bağımlılıksız statik tanıtım sitesi.
API, React yönetim paneli ve Expo uygulamasından ayrı dağıtılır.

## Dizin

- `public/index.html`: Tanıtım sayfası.
- `public/destek.html`: Destek e-postası ve sık sorulan sorular.
- `public/gizlilik.html`: Doğrulanması gereken gizlilik taslağı.
- `public/styles.css`: Mobil uygulamanın sarı/siyah renkleriyle ortak stiller.
- `public/assets`: Mobil projeden alınan mevcut logo ve antrenman görseli.
- `build.mjs`: Yalnızca herkese açık dosyaları `dist/` içine kopyalar.

## Çalıştırma

Bu dizinde `npm run dev` çalıştırın; Node.js ve Python 3 yeterlidir.
Önizleme: http://127.0.0.1:5180. Paket kurulumu gerekmez.
Dağıtım dosyaları için `npm run build` çalıştırın. `dist/` herhangi bir
statik web sunucusuyla yayınlanabilir. Mevcut API yönlendirmeleri değiştirilmez.

## Herkese açık yayın ve App Store öncesi

Gizlilik sayfası nihai politika değildir. Sorumlu kişi/kurumun resmi adı,
saklama ve silme süreçleri, canlı altyapı sağlayıcıları, veri aktarımı ve
çocuk verileriyle ilgili uygulamalar doğrulanarak metin tamamlanmalıdır.
Ardından taslak uyarısı ve `noindex` kaldırılmalı, politikaya tarih eklenmelidir.
Destek e-postası kullanıcı tarafından `asim.tokmak@hotmail.com` olarak verilmiştir.

App Store bağlantıları Apple tarafından oturum açmadan erişilebilir olmalıdır.
Özel Sites önizlemesi bu gerekliliği karşılamaz. Uygulamanın içinden de nihai
gizlilik sayfasına bağlantı verilmelidir; bu çalışma mobil uygulamayı değiştirmez.

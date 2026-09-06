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

## Coolify / Hetzner

Mevcut API ve yönetim panelinden ayrı bir Application oluşturun:

- Repository: Bu depo; landing page dosyalarını içeren branch.
- Build Pack: `Dockerfile`.
- Base Directory: `/src/Sportschool.Web`.
- Dockerfile Location: `/Dockerfile`.
- Ports Exposes: `80`.
- Domains: Yayınlanacak ana domainin `https://` adresi; kök yol `/`.

Domainin DNS kaydı Hetzner sunucusuna yönelmelidir. HTTPS ve dış yönlendirmeyi
Coolify proxy yönetir; uygulama için doğrudan host portu açmaya gerek yoktur.
Bu Dockerfile yalnızca `public/` içeriğini taşır; API, veritabanı, Sites
ayarları ve ortam dosyaları imaja dahil edilmez.

Yerel container kontrolü:

```bash
docker build -t sportschool-web .
docker run --rm -p 127.0.0.1:5181:80 sportschool-web
```

Ana sayfa `/`, destek `/destek.html`, gizlilik `/gizlilik.html` adresindedir.

## Herkese açık yayın ve App Store öncesi

Gizlilik politikasının sorumlu kurumu kullanıcı tarafından
`Türk Ocağı Elit Akademi` olarak belirtilmiştir. Politika 5 Eylül 2026 tarihinde
yürürlüğe girmiştir.
Destek e-postası kullanıcı tarafından `asim.tokmak@hotmail.com` olarak verilmiştir.
Kayıt sırasında reşit olmayan sporcuların kişisel bilgileri, profil fotoğrafları
ve antrenman videoları için veli onayı alındığı kullanıcı tarafından doğrulanmıştır.

Saklama kararı: Sporcu ayrıldıktan sonra kişisel kayıtlar ve medya en fazla
12 ay tutulur. Ardından kimlik alanları anonimleştirilir; medya, ölçümler,
oturumlar ve serbest metinli rapor içerikleri silinir. Onaylanan başvuru formu
hesap oluşturulunca, reddedilen başvurular 30 gün, bekleyen başvurular 90 gün
ve güvenlik kayıtları 90 gün sonra silinir. Haftalık R2 veritabanı yedekleri
Coolify üzerinde en fazla 30 günle sınırlandırılmıştır.

App Store bağlantıları Apple tarafından oturum açmadan erişilebilir olmalıdır.
Özel Sites önizlemesi bu gerekliliği karşılamaz. Uygulamanın içinden de nihai
gizlilik sayfasına bağlantı verilmelidir; bu çalışma mobil uygulamayı değiştirmez.

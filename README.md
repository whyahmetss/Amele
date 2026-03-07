# 🛠️ UstaGo Geliştirici Bot

Telegram üzerinden çalışan, UstaGo projesini yönetmek için tasarlanmış production-ready bot sistemi.

---

## 📁 Klasör Yapısı

```
src/
├── bot/
│   ├── commands/          # Telegram komutları
│   │   ├── genelKomutlar.ts
│   │   ├── gorevKomutlari.ts
│   │   ├── sunucuKomutlari.ts
│   │   └── aiKomutlari.ts
│   ├── middlewares/
│   │   ├── auth.ts        # Admin yetkilendirme
│   │   └── rateLimiter.ts # Redis rate limiting
│   └── index.ts           # Bot başlatma
├── controllers/           # (genişletme için hazır)
├── services/
│   ├── gorevService.ts
│   ├── deployService.ts
│   ├── hataService.ts
│   └── bugService.ts
├── integrations/
│   └── claudeAI.ts        # Claude API entegrasyonu
├── models/
│   ├── database.ts        # PostgreSQL pool
│   └── redis.ts           # Redis istemcisi
├── routes/
│   └── internal.ts        # Backend → Bot endpoint'leri
├── webhooks/
│   └── github.ts          # GitHub webhook handler
├── jobs/
│   └── gunlukRapor.ts     # Cron: günlük rapor
├── utils/
│   ├── logger.ts          # Winston logger
│   └── migrate.ts         # DB şeması
├── config/
│   └── index.ts           # Tüm ayarlar
└── index.ts               # Ana giriş noktası
```

---

## 🚀 Kurulum

### 1. Gereksinimler
- Node.js 20+
- PostgreSQL 14+
- Redis 7+
- Docker (opsiyonel)

### 2. Kurulum Adımları

```bash
# Projeyi klonla
git clone https://github.com/kullanici/ustago-bot
cd ustago-bot

# Bağımlılıkları yükle
npm install

# .env dosyası oluştur
cp .env.example .env
# .env'i düzenle — TOKEN ve şifreleri gir

# Veritabanı migrasyonu
npm run migrate

# Geliştirme modunda başlat
npm run dev
```

### 3. Docker ile Başlatma

```bash
# .env dosyasını oluştur
cp .env.example .env

# Docker ile başlat (PostgreSQL + Redis dahil)
docker-compose up -d

# Migrasyon çalıştır
docker-compose exec bot node dist/utils/migrate.js

# Logları izle
docker-compose logs -f bot
```

---

## 🔗 GitHub Webhook Kurulumu

1. GitHub repo → **Settings → Webhooks → Add webhook**
2. Payload URL: `https://SUNUCUN/webhook/github`
3. Content type: `application/json`
4. Secret: `.env`'deki `GITHUB_WEBHOOK_SECRET`
5. Events: `Pushes` + `Deployment statuses`

---

## 📡 Internal API Kullanımı

Backend'den hata bildirmek için:

```bash
curl -X POST https://SUNUCUN/internal/error-log \
  -H "Content-Type: application/json" \
  -H "x-api-key: INTERNAL_API_KEY_DEGER" \
  -d '{
    "servis": "backend",
    "endpoint": "/api/order",
    "hata_mesaji": "Prisma bağlantı hatası",
    "onem": "yuksek"
  }'
```

---

## 📋 Bot Komutları

### Görev Yönetimi
```
/gorev ekle Login API düzelt
/gorev liste
/gorev bitir 3
/gorev sil 3
```

### Sunucu (Admin)
```
/server durum
/server sağlık
/server log
/server restart
/deploy
```

### Diğer
```
/ai Redis nasıl kullanılır?
/bug Login iOS'ta çalışmıyor
/sinyal LONG BTC
```

---

## ⚙️ Ortam Değişkenleri

| Değişken | Açıklama |
|---|---|
| `TG_BOT_TOKEN` | BotFather'dan alınan token |
| `TG_CHAT_ID` | Grubun chat ID'si |
| `TG_ADMIN_IDS` | Admin kullanıcı ID'leri (virgülle) |
| `DB_PASSWORD` | PostgreSQL şifresi |
| `REDIS_URL` | Redis bağlantı URL'i |
| `CLAUDE_API_KEY` | Anthropic API anahtarı |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhook secret |
| `RENDER_DEPLOY_HOOK` | Render deploy hook URL'i |
| `INTERNAL_API_KEY` | Backend → Bot API anahtarı |

---

## 📊 Veritabanı Tabloları

- `gorevler` — Görev yönetimi
- `deployler` — Deploy geçmişi
- `hata_loglari` — API hata logları
- `bug_raporlari` — Bug raporları
- `gunluk_istatistik` — Günlük özet view

---

_UstaGo Bot v1.0 · Node.js + TypeScript + PostgreSQL + Redis_

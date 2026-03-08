import { db } from '../models/database';
import { logger } from './logger';

const SCHEMA = `
-- Görevler tablosu
CREATE TABLE IF NOT EXISTS gorevler (
  id          SERIAL PRIMARY KEY,
  metin       TEXT NOT NULL,
  durum       VARCHAR(20) DEFAULT 'bekliyor' CHECK (durum IN ('bekliyor', 'devam', 'tamamlandi')),
  oncelik     VARCHAR(10) DEFAULT 'orta' CHECK (oncelik IN ('dusuk', 'orta', 'yuksek', 'kritik')),
  etiketler   TEXT[] DEFAULT '{}',
  kategori    VARCHAR(50),
  atanan_id   BIGINT,
  atanan_ad   VARCHAR(100),
  ekleyen_id  BIGINT NOT NULL,
  ekleyen_ad  VARCHAR(100),
  github_issue_url TEXT,
  olusturuldu TIMESTAMPTZ DEFAULT NOW(),
  tamamlandi  TIMESTAMPTZ,
  CONSTRAINT metin_bos_degil CHECK (LENGTH(TRIM(metin)) > 0)
);

-- Yeni sütunları güvenli şekilde ekle (zaten varsa hata vermez)
DO $$ BEGIN
  ALTER TABLE gorevler ADD COLUMN IF NOT EXISTS oncelik VARCHAR(10) DEFAULT 'orta';
  ALTER TABLE gorevler ADD COLUMN IF NOT EXISTS etiketler TEXT[] DEFAULT '{}';
  ALTER TABLE gorevler ADD COLUMN IF NOT EXISTS kategori VARCHAR(50);
  ALTER TABLE gorevler ADD COLUMN IF NOT EXISTS atanan_id BIGINT;
  ALTER TABLE gorevler ADD COLUMN IF NOT EXISTS atanan_ad VARCHAR(100);
  ALTER TABLE gorevler ADD COLUMN IF NOT EXISTS github_issue_url TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Deploy geçmişi tablosu
CREATE TABLE IF NOT EXISTS deployler (
  id          SERIAL PRIMARY KEY,
  proje       VARCHAR(100) DEFAULT 'UstaGo',
  branch      VARCHAR(100),
  commit_sha  VARCHAR(40),
  commit_msg  TEXT,
  yapan       VARCHAR(100),
  durum       VARCHAR(20) CHECK (durum IN ('basliyor', 'basarili', 'basarisiz')),
  olusturuldu TIMESTAMPTZ DEFAULT NOW()
);

-- Hata logları tablosu
CREATE TABLE IF NOT EXISTS hata_loglari (
  id          SERIAL PRIMARY KEY,
  servis      VARCHAR(100),
  endpoint    VARCHAR(200),
  hata_mesaji TEXT,
  stack_trace TEXT,
  onem        VARCHAR(20) DEFAULT 'orta' CHECK (onem IN ('dusuk', 'orta', 'yuksek', 'kritik')),
  olusturuldu TIMESTAMPTZ DEFAULT NOW()
);

-- Bug raporları tablosu
CREATE TABLE IF NOT EXISTS bug_raporlari (
  id            SERIAL PRIMARY KEY,
  aciklama      TEXT NOT NULL,
  bildiren_id   BIGINT,
  bildiren_ad   VARCHAR(100),
  durum         VARCHAR(20) DEFAULT 'acik' CHECK (durum IN ('acik', 'inceleniyor', 'cozuldu')),
  olusturuldu   TIMESTAMPTZ DEFAULT NOW()
);

-- Günlük istatistikler view
CREATE OR REPLACE VIEW gunluk_istatistik AS
SELECT
  DATE(NOW()) AS tarih,
  (SELECT COUNT(*) FROM gorevler WHERE durum = 'tamamlandi' AND DATE(tamamlandi) = DATE(NOW())) AS tamamlanan_gorev,
  (SELECT COUNT(*) FROM bug_raporlari WHERE DATE(olusturuldu) = DATE(NOW())) AS yeni_bug,
  (SELECT COUNT(*) FROM deployler WHERE DATE(olusturuldu) = DATE(NOW())) AS deploy_sayisi,
  (SELECT COUNT(*) FROM hata_loglari WHERE DATE(olusturuldu) = DATE(NOW())) AS hata_sayisi;

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_gorevler_durum ON gorevler(durum);
CREATE INDEX IF NOT EXISTS idx_deployler_tarih ON deployler(olusturuldu DESC);
CREATE INDEX IF NOT EXISTS idx_hatalar_tarih ON hata_loglari(olusturuldu DESC);
CREATE INDEX IF NOT EXISTS idx_buglar_durum ON bug_raporlari(durum);

-- Nöbet takvimi tablosu
CREATE TABLE IF NOT EXISTS nobet_takvimi (
  id            SERIAL PRIMARY KEY,
  kullanici_id  BIGINT NOT NULL,
  kullanici_ad  VARCHAR(100),
  tarih         DATE NOT NULL UNIQUE,
  olusturuldu   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nobet_tarih ON nobet_takvimi(tarih);

-- Audit log tablosu
CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL PRIMARY KEY,
  kullanici_id BIGINT NOT NULL,
  kullanici_ad VARCHAR(100),
  islem       VARCHAR(50) NOT NULL,
  detay       TEXT,
  hedef_tip   VARCHAR(30),
  hedef_id    INTEGER,
  olusturuldu TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_tarih ON audit_log(olusturuldu DESC);

-- Webhook ayarları tablosu
CREATE TABLE IF NOT EXISTS webhooklar (
  id          SERIAL PRIMARY KEY,
  url         TEXT NOT NULL,
  olaylar     TEXT[] DEFAULT '{gorev_eklendi,gorev_bitti,bug_eklendi}',
  aktif       BOOLEAN DEFAULT true,
  olusturuldu TIMESTAMPTZ DEFAULT NOW()
);
`;

async function migrate() {
  try {
    logger.info('Veritabanı migrasyonu başlıyor...');
    await db.query(SCHEMA);
    logger.info('✅ Migrasyon tamamlandı!');
  } catch (hata) {
    logger.error('❌ Migrasyon hatası:', hata);
    process.exit(1);
  } finally {
    await db.end();
  }
}

migrate();

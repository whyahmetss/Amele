import { db } from '../models/database';
import { logger } from './logger';

const SCHEMA = `
-- Görevler tablosu
CREATE TABLE IF NOT EXISTS gorevler (
  id          SERIAL PRIMARY KEY,
  metin       TEXT NOT NULL,
  durum       VARCHAR(20) DEFAULT 'bekliyor' CHECK (durum IN ('bekliyor', 'devam', 'tamamlandi')),
  ekleyen_id  BIGINT NOT NULL,
  ekleyen_ad  VARCHAR(100),
  olusturuldu TIMESTAMPTZ DEFAULT NOW(),
  tamamlandi  TIMESTAMPTZ,
  CONSTRAINT metin_bos_degil CHECK (LENGTH(TRIM(metin)) > 0)
);

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

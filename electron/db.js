// Data Layer — better-sqlite3
// Membaca/menulis file database SQLite lokal (single source of truth).
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let db = null;

export function getDbPath() {
  if (process.env.NOTAPEDIA_DATA_DIR) {
    return path.join(process.env.NOTAPEDIA_DATA_DIR, 'notapedia.db');
  }
  // require('electron') hanya dipakai di runtime Electron; di luar Electron
  // (mis. unit test) pakai NOTAPEDIA_DATA_DIR.
  const { app } = require('electron');
  return path.join(app.getPath('userData'), 'notapedia.db');
}

export function openDb(filePath = getDbPath()) {
  if (db) {
    try { db.close(); } catch { /* ignore */ }
    db = null;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database belum dibuka.');
  return db;
}

export function closeDb() {
  if (db) { db.close(); db = null; }
}

function migrate(d) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS client (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nama       TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS po (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      no_po       TEXT NOT NULL UNIQUE,
      client_id   INTEGER NOT NULL REFERENCES client(id),
      tanggal_po  TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'Open',
      catatan     TEXT,
      created_at  TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS po_item (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      po_id        INTEGER NOT NULL REFERENCES po(id) ON DELETE CASCADE,
      nama_barang  TEXT NOT NULL,
      satuan       TEXT,
      qty_pesan    REAL NOT NULL DEFAULT 0,
      qty_terkirim REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS surat_jalan (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      no_sj         TEXT NOT NULL UNIQUE,
      po_id         INTEGER NOT NULL REFERENCES po(id),
      tanggal_kirim TEXT NOT NULL,
      nama_pengirim TEXT,
      status        TEXT NOT NULL DEFAULT 'Terkirim',
      catatan       TEXT,
      created_at    TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS sj_item (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      sj_id        INTEGER NOT NULL REFERENCES surat_jalan(id) ON DELETE CASCADE,
      po_item_id   INTEGER NOT NULL REFERENCES po_item(id),
      qty_kirim    REAL NOT NULL DEFAULT 0,
      qty_diterima REAL NOT NULL DEFAULT 0,
      berat        REAL NOT NULL DEFAULT 0,
      keterangan   TEXT
    );

    CREATE TABLE IF NOT EXISTS retur (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sj_item_id  INTEGER NOT NULL REFERENCES sj_item(id) ON DELETE CASCADE,
      qty_ditolak REAL NOT NULL DEFAULT 0,
      alasan      TEXT,
      tanggal     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoice (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      no_invoice      TEXT NOT NULL UNIQUE,
      po_id           INTEGER NOT NULL REFERENCES po(id),
      sj_id           INTEGER NOT NULL REFERENCES surat_jalan(id),
      tanggal_invoice TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'Terkirim',
      tanggal_ditagih TEXT,
      tanggal_dibayar TEXT,
      resi            TEXT,
      rest            TEXT,
      total           REAL NOT NULL DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS invoice_item (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id    INTEGER NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
      nama_barang   TEXT NOT NULL,
      satuan        TEXT,
      qty           REAL NOT NULL DEFAULT 0,
      harga_satuan  REAL NOT NULL DEFAULT 0,
      subtotal      REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tanda_terima (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      no_dokumen     TEXT NOT NULL UNIQUE,
      tanggal        TEXT NOT NULL,
      diserahkan_oleh TEXT,
      diterima_oleh  TEXT,
      total          REAL NOT NULL DEFAULT 0,
      created_at     TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS tanda_terima_item (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      tanda_terima_id INTEGER NOT NULL REFERENCES tanda_terima(id) ON DELETE CASCADE,
      invoice_id      INTEGER NOT NULL REFERENCES invoice(id),
      no_sbi          TEXT,
      jumlah          REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS backup_log (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal TEXT NOT NULL,
      lokasi  TEXT NOT NULL,
      ukuran  INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_po_client ON po(client_id);
    CREATE INDEX IF NOT EXISTS idx_po_item_po ON po_item(po_id);
    CREATE INDEX IF NOT EXISTS idx_sj_po ON surat_jalan(po_id);
    CREATE INDEX IF NOT EXISTS idx_sj_item_sj ON sj_item(sj_id);
    CREATE INDEX IF NOT EXISTS idx_invoice_po ON invoice(po_id);
    CREATE INDEX IF NOT EXISTS idx_invoice_sj ON invoice(sj_id);
  `);

  try {
    d.prepare('ALTER TABLE sj_item ADD COLUMN keterangan TEXT').run();
  } catch (e) {
    // kolom sudah ada
  }

  // Migrasi: tambah kolom satuan pada invoice_item (untuk DB lama yang sudah terlanjur dibuat).
  const cols = d.prepare(`PRAGMA table_info(invoice_item)`).all().map((c) => c.name);
  if (!cols.includes('satuan')) {
    d.exec('ALTER TABLE invoice_item ADD COLUMN satuan TEXT');
  }

  const invCols = d.prepare(`PRAGMA table_info(invoice)`).all().map((c) => c.name);
  if (!invCols.includes('resi')) {
    d.exec('ALTER TABLE invoice ADD COLUMN resi TEXT');
  }
  if (!invCols.includes('rest')) {
    d.exec('ALTER TABLE invoice ADD COLUMN rest TEXT');
  }

  // Data demo dinonaktifkan untuk build produksi — aplikasi mulai dengan database kosong.
  // const seeded = d.prepare('SELECT COUNT(*) AS n FROM client').get().n > 0;
  // if (!seeded) seed(d);
}

// Fungsi seed dinonaktifkan untuk rilis produksi.
// function seed(d) { ... }
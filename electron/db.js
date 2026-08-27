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
      alamat     TEXT,
      no_telp    TEXT,
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
      berat        REAL NOT NULL DEFAULT 0
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
      total           REAL NOT NULL DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS invoice_item (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id    INTEGER NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
      nama_barang   TEXT NOT NULL,
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

  const seeded = d.prepare('SELECT COUNT(*) AS n FROM client').get().n > 0;
  if (!seeded) seed(d);
}

// Seed data demo (sama dengan data mock frontend) agar aplikasi langsung terlihat hidup.
function seed(d) {
  const tx = d.transaction(() => {
    const insClient = d.prepare('INSERT INTO client (nama, alamat, no_telp, created_at) VALUES (?,?,?,?)');
    const insPO = d.prepare('INSERT INTO po (no_po, client_id, tanggal_po, status, catatan, created_at) VALUES (?,?,?,?,?,?)');
    const insPOItem = d.prepare('INSERT INTO po_item (po_id, nama_barang, satuan, qty_pesan, qty_terkirim) VALUES (?,?,?,?,?)');
    const insSJ = d.prepare('INSERT INTO surat_jalan (no_sj, po_id, tanggal_kirim, nama_pengirim, status, catatan, created_at) VALUES (?,?,?,?,?,?,?)');
    const insSJItem = d.prepare('INSERT INTO sj_item (sj_id, po_item_id, qty_kirim, qty_diterima, berat) VALUES (?,?,?,?,?)');
    const insRetur = d.prepare('INSERT INTO retur (sj_item_id, qty_ditolak, alasan, tanggal) VALUES (?,?,?,?)');
    const insInv = d.prepare('INSERT INTO invoice (no_invoice, po_id, sj_id, tanggal_invoice, status, tanggal_ditagih, tanggal_dibayar, total, created_at) VALUES (?,?,?,?,?,?,?,?,?)');
    const insInvItem = d.prepare('INSERT INTO invoice_item (invoice_id, nama_barang, qty, harga_satuan, subtotal) VALUES (?,?,?,?,?)');
    const insTT = d.prepare('INSERT INTO tanda_terima (no_dokumen, tanggal, diserahkan_oleh, diterima_oleh, total, created_at) VALUES (?,?,?,?,?,?)');
    const insTTItem = d.prepare('INSERT INTO tanda_terima_item (tanda_terima_id, invoice_id, no_sbi, jumlah) VALUES (?,?,?,?)');

    const c1 = insClient.run('PT Maju Bersama', 'Jl. Industri Raya No. 88, Surabaya', '031-555-0101', '2026-08-01 09:00:00').lastInsertRowid;
    const c2 = insClient.run('CV Sinar Jaya', 'Jl. Gatot Subroto No. 12, Sidoarjo', '031-555-0202', '2026-08-01 09:05:00').lastInsertRowid;
    const c3 = insClient.run('UD Sumber Rezeki', 'Jl. Veteran No. 45, Gresik', '031-555-0303', '2026-08-01 09:10:00').lastInsertRowid;
    const c4 = insClient.run('PT Anugrah Sentosa', 'Jl. Diponegoro No. 17, Malang', '0341-555-0404', '2026-08-01 09:15:00').lastInsertRowid;

    const p1 = insPO.run('PO/2026/08/001', c1, '2026-08-02', 'Open', 'Pengiriman sebelum tgl 10', '2026-08-02 08:00:00').lastInsertRowid;
    const p1i1 = insPOItem.run(p1, 'Besi Beton 12mm', 'batang', 200, 120).lastInsertRowid;
    const p1i2 = insPOItem.run(p1, 'Semen Portland 50kg', 'sak', 100, 100).lastInsertRowid;
    const p1i3 = insPOItem.run(p1, 'Pasir Urug', 'kubik', 8, 3).lastInsertRowid;

    const p2 = insPO.run('PO/2026/08/002', c2, '2026-08-05', 'Selesai', '', '2026-08-05 08:30:00').lastInsertRowid;
    const p2i1 = insPOItem.run(p2, 'Cat Tembok 25kg', 'kaleng', 30, 30).lastInsertRowid;
    const p2i2 = insPOItem.run(p2, 'Kuas Roll 9 inch', 'pcs', 20, 20).lastInsertRowid;

    const p3 = insPO.run('PO/2026/08/003', c3, '2026-08-10', 'Open', 'Tolong kirim bertahap', '2026-08-10 10:00:00').lastInsertRowid;
    const p3i1 = insPOItem.run(p3, 'Paku 5cm', 'kg', 50, 0).lastInsertRowid;
    const p3i2 = insPOItem.run(p3, 'Triplek 9mm', 'lembar', 40, 40).lastInsertRowid;

    const p4 = insPO.run('PO/2026/08/004', c4, '2026-08-15', 'Open', '', '2026-08-15 09:00:00').lastInsertRowid;
    const p4i1 = insPOItem.run(p4, 'Keramik 40x40', 'dus', 60, 0).lastInsertRowid;

    const p5 = insPO.run('PO/2026/08/005', c2, '2026-08-25', 'Open', 'Belum ada SJ terbit — PO masih bisa diedit', '2026-08-25 11:00:00').lastInsertRowid;
    const p5i1 = insPOItem.run(p5, 'Pipa PVC 4 inch', 'batang', 25, 0).lastInsertRowid;
    const p5i2 = insPOItem.run(p5, 'Lem Pipa', 'kaleng', 10, 0).lastInsertRowid;

    const s1 = insSJ.run('SJ-0001', p1, '2026-08-04', 'Budi Santoso', 'Diterima Penuh', 'Disetor oleh ekspedisi A', '2026-08-04 08:00:00').lastInsertRowid;
    const s1i1 = insSJItem.run(s1, p1i1, 80, 80, 600).lastInsertRowid;
    const s1i2 = insSJItem.run(s1, p1i2, 100, 100, 5000).lastInsertRowid;

    const s2 = insSJ.run('SJ-0002', p1, '2026-08-08', 'Andi Wijaya', 'Diterima Sebagian', 'Sebagian barang ditolak', '2026-08-08 08:00:00').lastInsertRowid;
    const s2i1 = insSJItem.run(s2, p1i1, 50, 40, 300).lastInsertRowid;
    insRetur.run(s2i1, 10, 'Besi bengkok sebagian', '2026-08-09');
    const s2i2 = insSJItem.run(s2, p1i3, 3, 3, 0).lastInsertRowid;

    const s3 = insSJ.run('SJ-0003', p2, '2026-08-07', 'Budi Santoso', 'Diterima Penuh', '', '2026-08-07 08:00:00').lastInsertRowid;
    const s3i1 = insSJItem.run(s3, p2i1, 30, 30, 750).lastInsertRowid;
    const s3i2 = insSJItem.run(s3, p2i2, 20, 20, 10).lastInsertRowid;

    const s4 = insSJ.run('SJ-0004', p3, '2026-08-12', 'Andi Wijaya', 'Diterima Penuh', '', '2026-08-12 08:00:00').lastInsertRowid;
    const s4i1 = insSJItem.run(s4, p3i2, 40, 40, 800).lastInsertRowid;

    const s5 = insSJ.run('SJ-0005', p4, '2026-08-17', 'Budi Santoso', 'Terkirim', 'Belum konfirmasi', '2026-08-17 08:00:00').lastInsertRowid;
    const s5i1 = insSJItem.run(s5, p4i1, 25, 0, 0).lastInsertRowid;

    const v1 = insInv.run('INV-0001', p1, s1, '2026-08-05', 'Dibayar', '2026-08-12', '2026-08-20', 14300000, '2026-08-05 09:00:00').lastInsertRowid;
    insInvItem.run(v1, 'Besi Beton 12mm', 80, 85000, 6800000);
    insInvItem.run(v1, 'Semen Portland 50kg', 100, 75000, 7500000);

    const v2 = insInv.run('INV-0002', p1, s2, '2026-08-09', 'Ditagih', '2026-08-15', null, 4450000, '2026-08-09 09:00:00').lastInsertRowid;
    insInvItem.run(v2, 'Besi Beton 12mm', 40, 85000, 3400000);
    insInvItem.run(v2, 'Pasir Urug', 3, 350000, 1050000);

    const v3 = insInv.run('INV-0003', p2, s3, '2026-08-10', 'Dibayar', '2026-08-18', '2026-08-25', 8200000, '2026-08-10 09:00:00').lastInsertRowid;
    insInvItem.run(v3, 'Cat Tembok 25kg', 30, 250000, 7500000);
    insInvItem.run(v3, 'Kuas Roll 9 inch', 20, 35000, 700000);

    const v4 = insInv.run('INV-0004', p3, s4, '2026-08-14', 'Terkirim', null, null, 3800000, '2026-08-14 09:00:00').lastInsertRowid;
    insInvItem.run(v4, 'Triplek 9mm', 40, 95000, 3800000);

    const t1 = insTT.run('TT-0001', '2026-08-15', 'Admin Notapedia', 'Bagian Keuangan CV Sinar Jaya', 18750000, '2026-08-15 10:00:00').lastInsertRowid;
    insTTItem.run(t1, v1, 'SBI/2026/08/0033', 14300000);
    insTTItem.run(t1, v2, 'SBI/2026/08/0034', 4450000);

    const t2 = insTT.run('TT-0002', '2026-08-18', 'Admin Notapedia', 'Bagian Keuangan CV Sinar Jaya', 8200000, '2026-08-18 10:00:00').lastInsertRowid;
    insTTItem.run(t2, v3, 'SBI/2026/08/0040', 8200000);
  });
  tx();
}
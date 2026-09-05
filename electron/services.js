// Business Logic — semua operasi data aplikasi.
// Semua fungsi sinkron (better-sqlite3), dipanggil dari IPC handlers di main.js.
import { getDb } from './db.js';
import fs from 'node:fs';
import path from 'node:path';
import { getDbPath, openDb, closeDb } from './db.js';

const STATUS_PO = ['Open', 'Selesai'];
const STATUS_SJ = ['Terkirim', 'Diterima Penuh', 'Diterima Sebagian', 'Ditolak'];
const STATUS_INV = ['Terkirim', 'Ditagih', 'Dibayar'];
const SJ_DITERIMA = ['Diterima Penuh', 'Diterima Sebagian'];

const hariIni = () => new Date().toISOString().slice(0, 10);

function nextNo(prefix, table) {
  const d = getDb();
  let col = 'no_' + table;
  if (table === 'surat_jalan') col = 'no_sj';
  if (table === 'tanda_terima') col = 'no_dokumen';
  
  const prefixLen = prefix.length + 2;
  const row = d.prepare(`SELECT COALESCE(MAX(CAST(SUBSTR(${col}, ${prefixLen}) AS INTEGER)), 0) + 1 AS n FROM ${table} WHERE ${col} LIKE '${prefix}-%'`).get();
  return `${prefix}-${String(row.n).padStart(4, '0')}`;
}

function err(msg) {
  const e = new Error(msg);
  e.userMessage = msg;
  return e;
}

// ─────────────────────────── CLIENT ───────────────────────────

export function listClients() {
  return getDb().prepare('SELECT id, nama, created_at FROM client ORDER BY nama').all();
}

export function createClient({ nama }) {
  if (!nama?.trim()) throw err('Nama client wajib diisi.');
  const d = getDb();
  const r = d.prepare('INSERT INTO client (nama) VALUES (?)')
    .run(nama.trim());
  return { id: r.lastInsertRowid };
}

export function updateClient(id, { nama }) {
  if (!nama?.trim()) throw err('Nama client wajib diisi.');
  getDb().prepare('UPDATE client SET nama=? WHERE id=?')
    .run(nama.trim(), id);
  return { id };
}

export function deleteClient(id) {
  const d = getDb();
  const used = d.prepare('SELECT COUNT(*) AS n FROM po WHERE client_id=?').get(id).n;
  if (used > 0) throw err('Client masih memiliki PO dan tidak dapat dihapus.');
  d.prepare('DELETE FROM client WHERE id=?').run(id);
  return { id };
}

// ─────────────────────────── PO ───────────────────────────

function poItems(poId) {
  return getDb()
    .prepare(`
      SELECT pi.id, pi.nama_barang, pi.satuan, pi.qty_pesan, pi.qty_terkirim,
             COALESCE((
               SELECT SUM(si.qty_kirim) FROM sj_item si
               JOIN surat_jalan s ON s.id = si.sj_id
               WHERE si.po_item_id = pi.id AND s.status = 'Terkirim'
             ), 0) AS qty_sj
      FROM po_item pi WHERE pi.po_id=? ORDER BY pi.id
    `)
    .all(poId);
}

export function listPO() {
  const d = getDb();
  const rows = d.prepare(`
    SELECT p.id, p.no_po, p.client_id, c.nama AS client_nama, p.tanggal_po, p.status, p.catatan, p.created_at
    FROM po p JOIN client c ON c.id = p.client_id
    ORDER BY p.tanggal_po DESC, p.id DESC
  `).all();
  return rows.map((r) => ({ ...r, items: poItems(r.id) }));
}

export function getPO(id) {
  const d = getDb();
  const po = d.prepare(`
    SELECT p.id, p.no_po, p.client_id, c.nama AS client_nama,
           p.tanggal_po, p.status, p.catatan, p.created_at
    FROM po p JOIN client c ON c.id = p.client_id WHERE p.id=?
  `).get(id);
  if (!po) return null;
  return { ...po, items: poItems(id) };
}

export function createPO({ no_po, client_id, tanggal_po, catatan = '', items = [] }) {
  if (!no_po?.trim()) throw err('No PO wajib diisi.');
  if (!client_id) throw err('Client wajib dipilih.');
  if (!tanggal_po) throw err('Tanggal PO wajib diisi.');
  if (!items.length || items.some((i) => !i.nama_barang?.trim() || !(Number(i.qty_pesan) > 0)))
    throw err('Minimal satu item dengan nama barang dan qty > 0.');

  const d = getDb();
  const tx = d.transaction(() => {
    const exists = d.prepare('SELECT id FROM po WHERE no_po=?').get(no_po.trim());
    if (exists) throw err(`No PO "${no_po}" sudah terpakai.`);
    const r = d.prepare('INSERT INTO po (no_po, client_id, tanggal_po, status, catatan) VALUES (?,?,?,?,?)')
      .run(no_po.trim(), client_id, tanggal_po, 'Open', catatan.trim());
    const poId = r.lastInsertRowid;
    const ins = d.prepare('INSERT INTO po_item (po_id, nama_barang, satuan, qty_pesan) VALUES (?,?,?,?)');
    for (const it of items) {
      ins.run(poId, it.nama_barang.trim(), it.satuan?.trim() ?? '', Number(it.qty_pesan));
    }
    return poId;
  });
  return { id: tx() };
}

export function updatePO(id, { no_po, client_id, tanggal_po, catatan = '', items = [] }) {
  const d = getDb();
  const sudahSJ = d.prepare('SELECT COUNT(*) AS n FROM surat_jalan WHERE po_id=?').get(id).n > 0;
  if (sudahSJ) throw err('PO sudah memiliki Surat Jalan terbit sehingga tidak dapat diedit.');

  const tx = d.transaction(() => {
    const exists = d.prepare('SELECT id FROM po WHERE no_po=? AND id<>?').get(no_po.trim(), id);
    if (exists) throw err(`No PO "${no_po}" sudah terpakai.`);
    d.prepare('UPDATE po SET no_po=?, client_id=?, tanggal_po=?, catatan=? WHERE id=?')
      .run(no_po.trim(), client_id, tanggal_po, catatan.trim(), id);
    d.prepare('DELETE FROM po_item WHERE po_id=?').run(id);
    const ins = d.prepare('INSERT INTO po_item (po_id, nama_barang, satuan, qty_pesan) VALUES (?,?,?,?)');
    for (const it of items) {
      ins.run(id, it.nama_barang.trim(), it.satuan?.trim() ?? '', Number(it.qty_pesan));
    }
  });
  tx();
  return { id };
}
export function removePO(id) {
  const d = getDb();
  const sudahSJ = d.prepare('SELECT COUNT(*) AS n FROM surat_jalan WHERE po_id=?').get(id).n > 0;
  if (sudahSJ) throw err('PO tidak bisa dihapus karena sudah memiliki Surat Jalan.');

  const tx = d.transaction(() => {
    d.prepare('DELETE FROM po_item WHERE po_id=?').run(id);
    d.prepare('DELETE FROM po WHERE id=?').run(id);
  });
  tx();
  return { id };
}

// ─────────────────────────── SURAT JALAN ───────────────────────────

function sjDetail(sjId) {
  const d = getDb();
  const sj = d.prepare(`
    SELECT s.id, s.no_sj, s.po_id, p.no_po, c.nama AS client_nama,
           s.tanggal_kirim,
           s.nama_pengirim, s.status, s.catatan, s.created_at
    FROM surat_jalan s
    JOIN po p ON p.id = s.po_id
    JOIN client c ON c.id = p.client_id
    WHERE s.id=?
  `).get(sjId);
  if (!sj) return null;

  const items = d.prepare(`
    SELECT si.id, si.po_item_id, pi.nama_barang, pi.satuan, si.qty_kirim, si.qty_diterima, si.berat, si.keterangan
    FROM sj_item si JOIN po_item pi ON pi.id = si.po_item_id
    WHERE si.sj_id=? ORDER BY si.id
  `).all(sjId);
  const returs = d.prepare(`
    SELECT id, sj_item_id, qty_ditolak, alasan, tanggal FROM retur WHERE sj_item_id IN (
      SELECT id FROM sj_item WHERE sj_id=?
    ) ORDER BY id
  `).all(sjId);

  return {
    ...sj,
    items: items.map((it) => ({
      ...it,
      retur: returs.filter((r) => r.sj_item_id === it.id).map(({ sj_item_id, ...r }) => r),
    })),
  };
}

export function listSJ() {
  return getDb().prepare(`
    SELECT s.id, s.no_sj, s.po_id, p.no_po, c.nama AS client_nama, s.tanggal_kirim,
           s.nama_pengirim, s.status, s.catatan, s.created_at
    FROM surat_jalan s
    JOIN po p ON p.id = s.po_id
    JOIN client c ON c.id = p.client_id
    ORDER BY s.tanggal_kirim DESC, s.id DESC
  `).all();
}

export function getSJ(id) {
  return sjDetail(id);
}

export function listSJByPO(poId) {
  return getDb().prepare(`
    SELECT s.id, s.no_sj, s.po_id, p.no_po, c.nama AS client_nama, s.tanggal_kirim,
           s.nama_pengirim, s.status, s.catatan, s.created_at,
           COALESCE((SELECT SUM(r.qty_ditolak) FROM retur r
                     JOIN sj_item si ON si.id = r.sj_item_id WHERE si.sj_id = s.id), 0) AS retur_total
    FROM surat_jalan s
    JOIN po p ON p.id = s.po_id
    JOIN client c ON c.id = p.client_id
    WHERE s.po_id=? ORDER BY s.tanggal_kirim, s.id
  `).all(poId);
}

export function createSJ({ po_id, tanggal_kirim, nama_pengirim = '', catatan = '', items = [] }) {
  if (!po_id) throw err('Referensi PO wajib dipilih.');
  if (!tanggal_kirim) throw err('Tanggal kirim wajib diisi.');
  if (!items.length || items.every((i) => !(Number(i.qty_kirim) > 0)))
    throw err('Minimal satu item dengan qty kirim > 0.');

  const d = getDb();
  const tx = d.transaction(() => {
    const po = d.prepare('SELECT id, no_po FROM po WHERE id=?').get(po_id);
    if (!po) throw err('PO tidak ditemukan.');

    for (const it of items) {
      const qty = Number(it.qty_kirim);
      if (!(qty > 0)) continue;
      const pi = d.prepare(`
        SELECT qty_pesan, qty_terkirim,
               COALESCE((
                 SELECT SUM(si.qty_kirim) FROM sj_item si
                 JOIN surat_jalan s ON s.id = si.sj_id
                 WHERE si.po_item_id = po_item.id AND s.status = 'Terkirim'
               ), 0) AS qty_sj
        FROM po_item WHERE id=? AND po_id=?
      `).get(it.po_item_id, po_id);
      if (!pi) throw err('Item PO tidak valid.');
      const sisa = pi.qty_pesan - pi.qty_terkirim - pi.qty_sj;
      // if (qty > sisa) throw err(`Qty kirim melebihi sisa PO untuk "${it.nama_barang || 'item'}" (sisa ${sisa}).`);
    }

    const noSJ = nextNo('SJ', 'surat_jalan');
    const r = d.prepare(`
      INSERT INTO surat_jalan (no_sj, po_id, tanggal_kirim, nama_pengirim, status, catatan)
      VALUES (?,?,?,?,?,?)
    `).run(noSJ, po_id, tanggal_kirim, nama_pengirim.trim(), 'Terkirim', catatan.trim());
    const sjId = r.lastInsertRowid;

    const ins = d.prepare('INSERT INTO sj_item (sj_id, po_item_id, qty_kirim, qty_diterima, berat, keterangan) VALUES (?,?,?,0,?,?)');
    for (const it of items) {
      const qty = Number(it.qty_kirim);
      if (qty > 0) ins.run(sjId, it.po_item_id, qty, Number(it.berat) || 0, it.keterangan?.trim() || '');
    }
    return { id: sjId, no_sj: noSJ };
  });
  return tx();
}

export function updateSJ(id, { tanggal_kirim, nama_pengirim = '', catatan = '', items = [] }) {
  if (!tanggal_kirim) throw err('Tanggal kirim wajib diisi.');
  if (!items.length || items.every((i) => !(Number(i.qty_kirim) > 0)))
    throw err('Minimal satu item dengan qty kirim > 0.');

  const d = getDb();
  const sj = d.prepare('SELECT id, po_id, status FROM surat_jalan WHERE id=?').get(id);
  if (!sj) throw err('Surat Jalan tidak ditemukan.');
  if (sj.status !== 'Terkirim') throw err('Surat Jalan tidak dapat diedit karena statusnya sudah tidak Terkirim.');

  const sudahInvoice = d.prepare('SELECT COUNT(*) AS n FROM invoice WHERE sj_id=?').get(id).n > 0;
  if (sudahInvoice) throw err('Surat Jalan tidak dapat diedit karena sudah memiliki Invoice.');

  const tx = d.transaction(() => {
    for (const it of items) {
      const qty = Number(it.qty_kirim);
      if (!(qty > 0)) continue;

      const pi = d.prepare(`
        SELECT qty_pesan, qty_terkirim,
               COALESCE((
                 SELECT SUM(si.qty_kirim) FROM sj_item si
                 JOIN surat_jalan s ON s.id = si.sj_id
                 WHERE si.po_item_id = po_item.id AND s.status = 'Terkirim' AND s.id != ?
               ), 0) AS qty_sj
        FROM po_item WHERE id=? AND po_id=?
      `).get(id, it.po_item_id, sj.po_id);

      if (!pi) throw err('Item PO tidak valid.');
      const sisa = pi.qty_pesan - pi.qty_terkirim - pi.qty_sj;
      // if (qty > sisa) throw err(`Qty kirim melebihi sisa PO untuk item ini (sisa ${sisa}).`);
    }

    d.prepare('UPDATE surat_jalan SET tanggal_kirim=?, nama_pengirim=?, catatan=? WHERE id=?')
      .run(tanggal_kirim, nama_pengirim.trim(), catatan.trim(), id);

    d.prepare('DELETE FROM sj_item WHERE sj_id=?').run(id);

    const ins = d.prepare('INSERT INTO sj_item (sj_id, po_item_id, qty_kirim, qty_diterima, berat, keterangan) VALUES (?,?,?,0,?,?)');
    for (const it of items) {
      const qty = Number(it.qty_kirim);
      if (qty > 0) ins.run(id, it.po_item_id, qty, Number(it.berat) || 0, it.keterangan?.trim() || '');
    }
  });
  tx();
  return { id };
}

export function removeSJ(id) {
  const d = getDb();
  const sj = d.prepare('SELECT id, po_id FROM surat_jalan WHERE id=?').get(id);
  if (!sj) throw err('Surat Jalan tidak ditemukan.');

  const sudahInvoice = d.prepare('SELECT COUNT(*) AS n FROM invoice WHERE sj_id=?').get(id).n > 0;
  if (sudahInvoice) throw err('Surat Jalan tidak bisa dihapus karena sudah ditagihkan (memiliki Invoice).');

  const tx = d.transaction(() => {
    d.prepare('DELETE FROM retur WHERE sj_item_id IN (SELECT id FROM sj_item WHERE sj_id=?)').run(id);
    d.prepare('DELETE FROM sj_item WHERE sj_id=?').run(id);
    d.prepare('DELETE FROM surat_jalan WHERE id=?').run(id);

    const poItems = d.prepare('SELECT id FROM po_item WHERE po_id=?').all(sj.po_id);
    const updPOItem = d.prepare(`
      UPDATE po_item SET qty_terkirim = COALESCE((
        SELECT SUM(si.qty_diterima) FROM sj_item si
        JOIN surat_jalan s ON s.id = si.sj_id
        WHERE si.po_item_id = po_item.id AND s.status IN ('Diterima Penuh', 'Diterima Sebagian')
      ), 0) WHERE id=?
    `);
    for (const pItem of poItems) updPOItem.run(pItem.id);

    const sisa = d.prepare(`
      SELECT COUNT(*) AS n FROM po_item WHERE po_id=? AND qty_terkirim < qty_pesan
    `).get(sj.po_id).n;
    d.prepare('UPDATE po SET status=? WHERE id=?').run(sisa === 0 ? 'Selesai' : 'Open', sj.po_id);
  });
  tx();
  return { id };
}

export function confirmSJ(sjId, { items = [], alasan = '' }) {
  const d = getDb();
  const sj = d.prepare('SELECT id, po_id, status FROM surat_jalan WHERE id=?').get(sjId);
  if (!sj) throw err('Surat Jalan tidak ditemukan.');
  if (sj.status !== 'Terkirim') throw err('Surat Jalan ini sudah dikonfirmasi penerimaannya.');

  const totalDitolak = items.reduce((s, i) => s + (Number(i.qty_ditolak) || 0), 0);
  if (totalDitolak > 0 && !alasan.trim()) throw err('Alasan penolakan wajib diisi jika ada qty ditolak.');

  const tx = d.transaction(() => {
    const updItem = d.prepare('UPDATE sj_item SET qty_diterima=? WHERE id=?');
    const insRetur = d.prepare('INSERT INTO retur (sj_item_id, qty_ditolak, alasan, tanggal) VALUES (?,?,?,?)');

    let totalKirim = 0;
    let totalTerima = 0;
    let totalRetur = 0;

    for (const it of items) {
      const sji = d.prepare('SELECT id, sj_id, po_item_id, qty_kirim FROM sj_item WHERE id=?').get(it.sj_item_id);
      if (!sji || sji.sj_id !== sjId) throw err('Item Surat Jalan tidak valid.');
      const diterima = Number(it.qty_diterima) || 0;
      const ditolak = Number(it.qty_ditolak) || 0;
      if (diterima + ditolak > sji.qty_kirim)
        throw err('Qty diterima + ditolak tidak boleh melebihi qty kirim.');
      updItem.run(diterima, sji.id);
      if (ditolak > 0) insRetur.run(sji.id, ditolak, alasan.trim(), hariIni());

      totalKirim += sji.qty_kirim;
      totalTerima += diterima;
      totalRetur += ditolak;
    }

    // Rekomputasi qty_terkirim per po_item (total diterima dari seluruh SJ item PO tersebut)
    const poItems = d.prepare('SELECT id FROM po_item WHERE po_id=?').all(sj.po_id);
    const updPOItem = d.prepare(`
      UPDATE po_item SET qty_terkirim = (
        SELECT COALESCE(SUM(si.qty_diterima), 0) FROM sj_item si WHERE si.po_item_id = po_item.id
      ) WHERE id=?
    `);
    for (const pi of poItems) updPOItem.run(pi.id);

    // Status SJ
    let statusSJ = 'Diterima Penuh';
    if (totalRetur > 0 && totalTerima > 0) statusSJ = 'Diterima Sebagian';
    else if (totalRetur > 0 && totalTerima === 0) statusSJ = 'Ditolak';
    else if (totalTerima === 0) statusSJ = 'Ditolak';
    d.prepare('UPDATE surat_jalan SET status=? WHERE id=?').run(statusSJ, sjId);

    // Status PO: Selesai jika semua item terkirim penuh
    const sisa = d.prepare(`
      SELECT COUNT(*) AS n FROM po_item WHERE po_id=? AND qty_terkirim < qty_pesan
    `).get(sj.po_id).n;
    d.prepare('UPDATE po SET status=? WHERE id=?').run(sisa === 0 ? 'Selesai' : 'Open', sj.po_id);
  });
  tx();
  return sjDetail(sjId);
}

// ─────────────────────────── INVOICE ───────────────────────────

function invoiceDetail(invId) {
  const d = getDb();
  const inv = d.prepare(`
    SELECT i.id, i.no_invoice, i.po_id, p.no_po, i.sj_id, s.no_sj, c.id AS client_id,
           c.nama AS client_nama, COALESCE(i.rest, i.resi) AS rest,
           i.tanggal_invoice, i.status, i.tanggal_ditagih,
           i.tanggal_dibayar, i.total, i.created_at
    FROM invoice i
    JOIN po p ON p.id = i.po_id
    JOIN surat_jalan s ON s.id = i.sj_id
    JOIN client c ON c.id = p.client_id
    WHERE i.id=?
  `).get(invId);
  if (!inv) return null;
  const items = d.prepare(`
    SELECT id, nama_barang, satuan, qty, harga_satuan, subtotal FROM invoice_item WHERE invoice_id=? ORDER BY id
  `).all(invId);
  return { ...inv, items };
}

export function listInvoices() {
  return getDb().prepare(`
    SELECT i.id, i.no_invoice, i.po_id, p.no_po, i.sj_id, s.no_sj, c.nama AS client_nama, COALESCE(i.rest, i.resi) AS rest,
           i.tanggal_invoice, i.status, i.tanggal_ditagih, i.tanggal_dibayar, i.total
    FROM invoice i
    JOIN po p ON p.id = i.po_id
    JOIN surat_jalan s ON s.id = i.sj_id
    JOIN client c ON c.id = p.client_id
    ORDER BY i.tanggal_invoice DESC, i.id DESC
  `).all();
}

export function listInvoiceByPO(poId) {
  return getDb().prepare(`
    SELECT i.id, i.no_invoice, i.po_id, p.no_po, i.sj_id, s.no_sj, c.nama AS client_nama, COALESCE(i.rest, i.resi) AS rest,
           i.tanggal_invoice, i.status, i.tanggal_ditagih, i.tanggal_dibayar, i.total
    FROM invoice i
    JOIN po p ON p.id = i.po_id
    JOIN surat_jalan s ON s.id = i.sj_id
    JOIN client c ON c.id = p.client_id
    WHERE i.po_id=? ORDER BY i.tanggal_invoice, i.id
  `).all(poId);
}

export function getInvoice(id) {
  return invoiceDetail(id);
}

export function sjSudahDiinvoice(sjId) {
  return getDb().prepare('SELECT id FROM invoice WHERE sj_id=?').get(sjId);
}

export function createInvoice({ no_invoice, sj_id, tanggal_invoice, rest, resi, items = [] }) {
  const finalRest = rest || resi;
  if (!sj_id) throw err('Referensi Surat Jalan wajib dipilih.');
  if (!tanggal_invoice) throw err('Tanggal invoice wajib diisi.');
  if (!items.length || items.some((i) => !(Number(i.qty) > 0) || !(Number(i.harga_satuan) >= 0)))
    throw err('Minimal satu item dengan qty dan harga satuan valid.');

  const d = getDb();
  const tx = d.transaction(() => {
    const sj = d.prepare(`
      SELECT s.id, s.po_id, s.status, p.no_po FROM surat_jalan s JOIN po p ON p.id=s.po_id WHERE s.id=?
    `).get(sj_id);
    if (!sj) throw err('Surat Jalan tidak ditemukan.');
    if (!SJ_DITERIMA.includes(sj.status))
      throw err('Invoice hanya dapat dibuat dari Surat Jalan berstatus Diterima Penuh / Diterima Sebagian.');
    if (sjSudahDiinvoice(sj_id))
      throw err('Surat Jalan ini sudah memiliki invoice.');

    const finalNoInvoice = no_invoice?.trim() || nextNo('INV', 'invoice');
    const exists = d.prepare('SELECT id FROM invoice WHERE no_invoice=?').get(finalNoInvoice);
    if (exists) throw err(`No Invoice "${finalNoInvoice}" sudah terpakai.`);

    let total = 0;
    const rows = items.map((it) => {
      const subtotal = Number(it.qty) * Number(it.harga_satuan);
      total += subtotal;
      return {
        nama_barang: it.nama_barang.trim(),
        satuan: it.satuan?.trim() ?? '',
        qty: Number(it.qty),
        harga_satuan: Number(it.harga_satuan),
        subtotal,
      };
    });

    const r = d.prepare(`
      INSERT INTO invoice (no_invoice, po_id, sj_id, tanggal_invoice, rest, status, total)
      VALUES (?,?,?,?,?,?,?)
    `).run(finalNoInvoice, sj.po_id, sj_id, tanggal_invoice, finalRest ? finalRest.trim() : null, 'Terkirim', total);
    const invId = r.lastInsertRowid;
    const noInv = finalNoInvoice;

    const ins = d.prepare('INSERT INTO invoice_item (invoice_id, nama_barang, satuan, qty, harga_satuan, subtotal) VALUES (?,?,?,?,?,?)');
    for (const row of rows) ins.run(invId, row.nama_barang, row.satuan, row.qty, row.harga_satuan, row.subtotal);

    return { id: invId, no_invoice: noInv };
  });
  return tx();
}

export function updateInvoice(id, { no_invoice, tanggal_invoice, rest, resi, items = [] }) {
  const finalRest = rest || resi;
  if (!no_invoice?.trim()) throw err('Nomor invoice wajib diisi.');
  if (!tanggal_invoice) throw err('Tanggal invoice wajib diisi.');
  if (!items.length || items.some((i) => !(Number(i.qty) > 0) || !(Number(i.harga_satuan) >= 0)))
    throw err('Minimal satu item dengan qty dan harga satuan valid.');

  const d = getDb();
  const tx = d.transaction(() => {
    const inv = d.prepare('SELECT status, no_invoice FROM invoice WHERE id=?').get(id);
    if (!inv) throw err('Invoice tidak ditemukan.');

    if (inv.no_invoice !== no_invoice.trim()) {
      const exists = d.prepare('SELECT id FROM invoice WHERE no_invoice=?').get(no_invoice.trim());
      if (exists) throw err(`No Invoice "${no_invoice}" sudah terpakai.`);
    }

    let total = 0;
    const rows = items.map((it) => {
      const subtotal = Number(it.qty) * Number(it.harga_satuan);
      total += subtotal;
      return {
        nama_barang: it.nama_barang.trim(),
        satuan: it.satuan?.trim() ?? '',
        qty: Number(it.qty),
        harga_satuan: Number(it.harga_satuan),
        subtotal,
      };
    });

    d.prepare(`
      UPDATE invoice SET no_invoice=?, tanggal_invoice=?, rest=?, total=? WHERE id=?
    `).run(no_invoice.trim(), tanggal_invoice, finalRest ? finalRest.trim() : null, total, id);

    d.prepare('DELETE FROM invoice_item WHERE invoice_id=?').run(id);

    const ins = d.prepare('INSERT INTO invoice_item (invoice_id, nama_barang, satuan, qty, harga_satuan, subtotal) VALUES (?,?,?,?,?,?)');
    for (const row of rows) ins.run(id, row.nama_barang, row.satuan, row.qty, row.harga_satuan, row.subtotal);

    return { id, no_invoice: no_invoice.trim() };
  });
  return tx();
}

export function removeInvoice(id) {
  const d = getDb();
  const tx = d.transaction(() => {
    const inv = d.prepare('SELECT status FROM invoice WHERE id=?').get(id);
    if (!inv) throw err('Invoice tidak ditemukan.');

    d.prepare('DELETE FROM invoice_item WHERE invoice_id=?').run(id);
    d.prepare('DELETE FROM invoice WHERE id=?').run(id);
  });
  tx();
}

export function updateInvoiceStatus(id, status) {
  if (!STATUS_INV.includes(status)) throw err('Status invoice tidak valid.');
  const d = getDb();
  const inv = d.prepare('SELECT id, status FROM invoice WHERE id=?').get(id);
  if (!inv) throw err('Invoice tidak ditemukan.');
  const from = STATUS_INV.indexOf(inv.status);
  const to = STATUS_INV.indexOf(status);
  if (to <= from) throw err(`Status tidak dapat berubah dari ${inv.status} ke ${status}.`);

  const set = { Terkirim: {}, Ditagih: { tanggal_ditagih: hariIni() }, Dibayar: { tanggal_dibayar: hariIni() } }[status];
  const cols = Object.keys(set);
  const vals = cols.map((c) => set[c]);
  d.prepare(`UPDATE invoice SET status=?, ${cols.map((c) => `${c}=?`).join(', ')} WHERE id=?`)
    .run(status, ...vals, id);
  return invoiceDetail(id);
}

export function invoicesSiapTagih() {
  return getDb().prepare(`
    SELECT i.id, i.no_invoice, i.total, c.nama AS client_nama, i.status
    FROM invoice i
    JOIN po p ON p.id = i.po_id
    JOIN client c ON c.id = p.client_id
    WHERE i.status IN ('Terkirim','Ditagih')
    ORDER BY i.no_invoice
  `).all();
}

// ─────────────────────────── TANDA TERIMA ───────────────────────────

export function listTandaTerima() {
  const d = getDb();
  const rows = d.prepare('SELECT id, no_dokumen, tanggal, diserahkan_oleh, diterima_oleh, total, created_at FROM tanda_terima ORDER BY tanggal DESC, id DESC').all();
  return rows.map((tt) => ({
    ...tt,
    items: d.prepare(`
      SELECT tti.id, tti.invoice_id, i.no_invoice, i.tanggal_invoice, p.no_po, p.tanggal_po,
             tti.no_sbi, tti.jumlah
      FROM tanda_terima_item tti
      JOIN invoice i ON i.id = tti.invoice_id
      JOIN po p ON p.id = i.po_id
      WHERE tti.tanda_terima_id=? ORDER BY tti.id
    `).all(tt.id),
  }));
}

export function getTandaTerima(id) {
  const tt = getDb().prepare('SELECT id, no_dokumen, tanggal, diserahkan_oleh, diterima_oleh, total FROM tanda_terima WHERE id=?').get(id);
  if (!tt) return null;
  return {
    ...tt,
    items: getDb().prepare(`
      SELECT tti.id, tti.invoice_id, i.no_invoice, i.tanggal_invoice, p.no_po, p.tanggal_po,
             tti.no_sbi, tti.jumlah
      FROM tanda_terima_item tti
      JOIN invoice i ON i.id = tti.invoice_id
      JOIN po p ON p.id = i.po_id
      WHERE tti.tanda_terima_id=? ORDER BY tti.id
    `).all(id),
  };
}

export function createTandaTerima({ tanggal, diserahkan_oleh = '', diterima_oleh = '', items = [] }) {
  if (!tanggal) throw err('Tanggal wajib diisi.');
  const valid = items.filter((i) => i.invoice_id);
  if (!valid.length) throw err('Minimal satu baris invoice yang dipilih.');

  const d = getDb();
  const tx = d.transaction(() => {
    const noDok = nextNo('TT', 'tanda_terima');
    let total = 0;
    const rows = valid.map((it) => {
      const inv = d.prepare('SELECT id, total FROM invoice WHERE id=?').get(it.invoice_id);
      if (!inv) throw err('Invoice tidak ditemukan.');
      total += inv.total;
      return { invoice_id: inv.id, no_sbi: it.no_sbi?.trim() || '', jumlah: inv.total };
    });

    const r = d.prepare(`
      INSERT INTO tanda_terima (no_dokumen, tanggal, diserahkan_oleh, diterima_oleh, total)
      VALUES (?,?,?,?,?)
    `).run(noDok, tanggal, diserahkan_oleh.trim(), diterima_oleh.trim(), total);
    const ttId = r.lastInsertRowid;

    const ins = d.prepare('INSERT INTO tanda_terima_item (tanda_terima_id, invoice_id, no_sbi, jumlah) VALUES (?,?,?,?)');
    for (const row of rows) ins.run(ttId, row.invoice_id, row.no_sbi, row.jumlah);

    return { id: ttId, no_dokumen: noDok };
  });
  return tx();
}

export function updateTandaTerima(id, { tanggal, diserahkan_oleh = '', diterima_oleh = '', items = [] }) {
  if (!id) throw err('ID Tanda Terima tidak valid.');
  if (!tanggal) throw err('Tanggal wajib diisi.');
  const valid = items.filter((i) => i.invoice_id);
  if (!valid.length) throw err('Minimal satu baris invoice yang dipilih.');

  const d = getDb();
  const tx = d.transaction(() => {
    let total = 0;
    const rows = valid.map((it) => {
      const inv = d.prepare('SELECT id, total FROM invoice WHERE id=?').get(it.invoice_id);
      if (!inv) throw err('Invoice tidak ditemukan.');
      total += inv.total;
      return { invoice_id: inv.id, no_sbi: it.no_sbi?.trim() || '', jumlah: inv.total };
    });

    d.prepare(`
      UPDATE tanda_terima SET tanggal=?, diserahkan_oleh=?, diterima_oleh=?, total=?
      WHERE id=?
    `).run(tanggal, diserahkan_oleh.trim(), diterima_oleh.trim(), total, id);

    d.prepare('DELETE FROM tanda_terima_item WHERE tanda_terima_id=?').run(id);

    const ins = d.prepare('INSERT INTO tanda_terima_item (tanda_terima_id, invoice_id, no_sbi, jumlah) VALUES (?,?,?,?)');
    for (const row of rows) ins.run(id, row.invoice_id, row.no_sbi, row.jumlah);

    return { id };
  });
  return tx();
}

export function removeTandaTerima(id) {
  if (!id) throw err('ID tidak valid.');
  const d = getDb();
  d.transaction(() => {
    d.prepare('DELETE FROM tanda_terima_item WHERE tanda_terima_id=?').run(id);
    d.prepare('DELETE FROM tanda_terima WHERE id=?').run(id);
  })();
  return true;
}

// ─────────────────────────── LAPORAN & DASHBOARD ───────────────────────────

export function laporanBulanan(bulan, tahun) {
  const d = getDb();
  const rows = d.prepare(`
    SELECT p.id, p.no_po, p.client_id, c.nama AS client_nama, p.tanggal_po, p.status, p.catatan
    FROM po p JOIN client c ON c.id = p.client_id
    WHERE strftime('%m', p.tanggal_po) = ? AND strftime('%Y', p.tanggal_po) = ?
    ORDER BY p.tanggal_po DESC
  `).all(String(bulan).padStart(2, '0'), String(tahun));

  const sj = d.prepare(`
    SELECT s.id, s.no_sj, p.no_po, p.tanggal_po, c.nama AS client_nama, s.tanggal_kirim, s.status,
           i.no_invoice AS no_invoice, i.tanggal_invoice AS tanggal_invoice, i.total AS jumlah_invoice
    FROM surat_jalan s
    JOIN po p ON p.id = s.po_id
    JOIN client c ON c.id = p.client_id
    LEFT JOIN invoice i ON i.sj_id = s.id
    WHERE strftime('%m', s.tanggal_kirim) = ? AND strftime('%Y', s.tanggal_kirim) = ?
    ORDER BY s.tanggal_kirim DESC
  `).all(String(bulan).padStart(2, '0'), String(tahun));

  const invoices = d.prepare(`
    SELECT i.id, i.no_invoice, c.nama AS client_nama, i.tanggal_invoice, i.total, i.status
    FROM invoice i
    JOIN po p ON p.id = i.po_id
    JOIN client c ON c.id = p.client_id
    WHERE strftime('%m', i.tanggal_invoice) = ? AND strftime('%Y', i.tanggal_invoice) = ?
    ORDER BY i.tanggal_invoice DESC
  `).all(String(bulan).padStart(2, '0'), String(tahun));

  return {
    po: rows.map((r) => ({ ...r, items: poItems(r.id) })),
    sj,
    invoices,
    totalInvoice: invoices.reduce((s, i) => s + i.total, 0),
  };
}

export function rekapPiutang() {
  const d = getDb();
  const rows = d.prepare(`
    SELECT i.id, i.no_invoice, c.id AS client_id, c.nama AS client_nama,
           i.tanggal_invoice, i.status, i.total
    FROM invoice i
    JOIN po p ON p.id = i.po_id
    JOIN client c ON c.id = p.client_id
    WHERE i.status IN ('Terkirim','Ditagih')
    ORDER BY c.nama, i.tanggal_invoice
  `).all();

  const groups = [];
  for (const r of rows) {
    let g = groups.find((x) => x.client_id === r.client_id);
    if (!g) {
      g = { client_id: r.client_id, client_nama: r.client_nama, total: 0, invoices: [] };
      groups.push(g);
    }
    g.total += r.total;
    g.invoices.push(r);
  }
  return groups;
}

export function riwayatPO(id) {
  const po = getPO(id);
  if (!po) return null;
  return {
    ...po,
    suratJalan: listSJByPO(id),
    invoices: listInvoiceByPO(id),
  };
}

export function dashboardStats() {
  const d = getDb();
  const poAktif = d.prepare("SELECT COUNT(*) AS n FROM po WHERE status='Open'").get().n;
  const totalPO = d.prepare('SELECT COUNT(*) AS n FROM po').get().n;
  const totalSJ = d.prepare('SELECT COUNT(*) AS n FROM surat_jalan').get().n;
  const bulanIni = new Date().toISOString().slice(0, 7);
  const sjBulan = d.prepare("SELECT COUNT(*) AS n FROM surat_jalan WHERE tanggal_kirim LIKE ?").get(`${bulanIni}%`).n;
  const totalInvoiceBulan = d.prepare("SELECT COALESCE(SUM(total),0) AS t FROM invoice WHERE tanggal_invoice LIKE ?").get(`${bulanIni}%`).t;
  const piutang = d.prepare("SELECT COALESCE(SUM(total),0) AS t FROM invoice WHERE status IN ('Terkirim','Ditagih')").get().t;
  const piutangCount = d.prepare("SELECT COUNT(*) AS n FROM invoice WHERE status IN ('Terkirim','Ditagih')").get().n;

  const recentPO = d.prepare(`
    SELECT p.id, p.no_po, c.nama AS client_nama, p.tanggal_po, p.status,
           (SELECT COUNT(*) FROM po_item pi WHERE pi.po_id = p.id) AS item_count
    FROM po p JOIN client c ON c.id = p.client_id ORDER BY p.id DESC LIMIT 3
  `).all().reverse();
  const recentSJ = d.prepare(`
    SELECT s.id, s.no_sj, c.nama AS client_nama, s.tanggal_kirim, s.status
    FROM surat_jalan s JOIN po p ON p.id=s.po_id JOIN client c ON c.id=p.client_id
    ORDER BY s.id DESC LIMIT 3
  `).all().reverse();
  const unpaid = d.prepare(`
    SELECT i.id, i.no_invoice, c.nama AS client_nama, i.total, i.status
    FROM invoice i JOIN po p ON p.id=i.po_id JOIN client c ON c.id=p.client_id
    WHERE i.status IN ('Terkirim','Ditagih') ORDER BY i.no_invoice
  `).all();

  return {
    poAktif, totalPO, totalSJ, sjBulanIni: sjBulan,
    totalInvoiceBulanIni: totalInvoiceBulan,
    piutang, piutangCount, recentPO, recentSJ, unpaid,
  };
}

// ─────────────────────────── BACKUP / RESTORE ───────────────────────────

export function backupDb(destDir) {
  const src = getDbPath();
  const nama = `notapedia-backup-${new Date().toISOString().slice(0, 10)}-${Date.now()}.db`;
  const dest = path.join(destDir, nama);
  fs.copyFileSync(src, dest);
  const ukuran = fs.statSync(dest).size;
  const r = getDb().prepare('INSERT INTO backup_log (tanggal, lokasi, ukuran) VALUES (?,?,?)')
    .run(hariIni(), dest, ukuran);
  return { id: r.lastInsertRowid, tanggal: hariIni(), lokasi: dest, ukuran };
}

export function listBackups() {
  return getDb().prepare('SELECT id, tanggal, lokasi, ukuran FROM backup_log ORDER BY id DESC').all();
}

export function deleteBackup(id) {
  const d = getDb();
  const row = d.prepare('SELECT lokasi FROM backup_log WHERE id=?').get(id);
  if (row) {
    try { fs.unlinkSync(row.lokasi); } catch { /* file mungkin sudah dipindah */ }
    d.prepare('DELETE FROM backup_log WHERE id=?').run(id);
  }
  return { id };
}

export function restoreBackup(filePath) {
  if (!fs.existsSync(filePath)) throw err('File backup tidak ditemukan.');
  closeDb();
  try {
    fs.copyFileSync(filePath, getDbPath());
  } catch (e) {
    openDb();
    throw err('Gagal menyalin file backup: ' + e.message);
  }
  openDb();
  return { ok: true };
}

export { STATUS_PO, STATUS_SJ, STATUS_INV };
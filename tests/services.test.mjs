// Smoke test business logic backend — dijalankan dengan `node tests/services.test.mjs`
// Menggunakan database sementara di folder temp (tanpa Electron).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notapedia-test-'));
process.env.NOTAPEDIA_DATA_DIR = dir;

const { openDb, getDbPath } = await import('../electron/db.js');
const svc = await import('../electron/services.js');

let pass = 0;
let fail = 0;
function check(label, cond, extra = '') {
  if (cond) { pass++; console.log(`  OK  ${label}`); }
  else { fail++; console.log(`FAIL  ${label} ${extra}`); }
}

openDb();

// ── Seed terpasang ──
check('seed: client', svc.listClients().length === 4);
check('seed: po', svc.listPO().length === 5);
check('seed: sj', svc.listSJ().length === 5);
check('seed: invoice', svc.listInvoices().length === 4);
check('seed: tt', svc.listTandaTerima().length === 2);

// ── Nomor otomatis ──
const sjBaru = svc.createSJ({
  po_id: 5, tanggal_kirim: '2026-08-28', nama_pengirim: 'Tester', catatan: '',
  items: [{ po_item_id: 9, nama_barang: 'Pipa PVC 4 inch', qty_kirim: 25, berat: 20 }],
});
check('sj: no otomatis', sjBaru.no_sj === 'SJ-0006', sjBaru.no_sj);
check('sj: qty_terkirim belum bertambah', svc.getPO(5).items.find((i) => i.id === 9).qty_terkirim === 0);

// ── SJ melebihi sisa PO ditolak ──
let errQty = null;
try {
  svc.createSJ({
    po_id: 5, tanggal_kirim: '2026-08-28', nama_pengirim: 'Tester', catatan: '',
    items: [{ po_item_id: 9, nama_barang: 'Pipa PVC 4 inch', qty_kirim: 999, berat: 0 }],
  });
} catch (e) { errQty = e.message; }
check('sj: qty > sisa ditolak', !!errQty && errQty.includes('melebihi sisa'), errQty || '');

// ── Konfirmasi penerimaan + retur ──
const sjBaruDetail = svc.getSJ(sjBaru.id);
const itemSJ6 = sjBaruDetail.items[0];
const sjSetelah = svc.confirmSJ(sjBaru.id, {
  items: [{ sj_item_id: itemSJ6.id, qty_diterima: 20, qty_ditolak: 5 }],
  alasan: 'Barang rusak saat tiba',
});
check('sj: status Diterima Sebagian', sjSetelah.status === 'Diterima Sebagian', sjSetelah.status);
check('sj: retur tercatat', sjSetelah.items[0].retur.length === 1 && sjSetelah.items[0].retur[0].qty_ditolak === 5);
check('sj: qty_diterima 20', sjSetelah.items[0].qty_diterima === 20);
const po5 = svc.getPO(5);
check('po: qty_terkirim = 20', po5.items.find((i) => i.id === 9).qty_terkirim === 20);
check('po: sisa = 5', po5.items.find((i) => i.id === 9).qty_pesan - po5.items.find((i) => i.id === 9).qty_terkirim === 5);

// ── Konfirmasi ulang ditolak ──
let errDua = null;
try { svc.confirmSJ(sjBaru.id, { items: [{ sj_item_id: itemSJ6.id, qty_diterima: 25, qty_ditolak: 0 }], alasan: '' }); }
catch (e) { errDua = e.message; }
check('sj: konfirmasi ganda ditolak', !!errDua && errDua.includes('sudah dikonfirmasi'), errDua || '');

// ── Retur tanpa alasan ditolak ──
const sjBaru2 = svc.createSJ({
  po_id: 5, tanggal_kirim: '2026-08-29', nama_pengirim: 'Tester', catatan: '',
  items: [{ po_item_id: 9, nama_barang: 'Pipa PVC 4 inch', qty_kirim: 5, berat: 0 }],
});
let errAlasan = null;
try {
  svc.confirmSJ(sjBaru2.id, { items: [{ sj_item_id: svc.getSJ(sjBaru2.id).items[0].id, qty_diterima: 0, qty_ditolak: 5 }], alasan: '' });
} catch (e) { errAlasan = e.message; }
check('sj: retur wajib alasan', !!errAlasan && errAlasan.includes('Alasan penolakan'), errAlasan || '');

// ── PO Selesai saat semua terkirim ──
const sjP2 = svc.createSJ({
  po_id: 5, tanggal_kirim: '2026-08-29', nama_pengirim: 'Tester', catatan: '',
  items: [
    { po_item_id: 9, nama_barang: 'Pipa PVC 4 inch', qty_kirim: 5, berat: 0 },
    { po_item_id: 10, nama_barang: 'Lem Pipa', qty_kirim: 10, berat: 0 },
  ],
});
const sjP2Detail = svc.getSJ(sjP2.id);
svc.confirmSJ(sjP2.id, {
  items: [
    { sj_item_id: sjP2Detail.items.find((i) => i.po_item_id === 9).id, qty_diterima: 5, qty_ditolak: 0 },
    { sj_item_id: sjP2Detail.items.find((i) => i.po_item_id === 10).id, qty_diterima: 10, qty_ditolak: 0 },
  ],
  alasan: '',
});
check('po: status Selesai', svc.getPO(5).status === 'Selesai', svc.getPO(5).status);

// ── Edit PO terlarang setelah ada SJ ──
let errEdit = null;
try {
  svc.updatePO(5, { no_po: 'PO/X', client_id: 1, tanggal_po: '2026-08-29', catatan: '', items: [{ nama_barang: 'X', satuan: '', qty_pesan: 1 }] });
} catch (e) { errEdit = e.message; }
check('po: edit terlarang setelah SJ', !!errEdit && errEdit.includes('Surat Jalan'), errEdit || '');

// ── Edit PO diizinkan tanpa SJ ──
const poBaru = svc.createPO({ no_po: 'PO/TEST/001', client_id: 1, tanggal_po: '2026-08-30', catatan: '', items: [{ nama_barang: 'Baut', satuan: 'pcs', qty_pesan: 100 }] });
svc.updatePO(poBaru.id, { no_po: 'PO/TEST/001-EDIT', client_id: 1, tanggal_po: '2026-08-30', catatan: '', items: [{ nama_barang: 'Baut', satuan: 'pcs', qty_pesan: 150 }] });
check('po: edit diizinkan tanpa SJ', svc.getPO(poBaru.id)?.no_po === 'PO/TEST/001-EDIT' && svc.getPO(poBaru.id).items[0].qty_pesan === 150);

// ── Duplikat No PO ditolak ──
let errDupe = null;
try {
  svc.createPO({ no_po: 'PO/TEST/001-EDIT', client_id: 1, tanggal_po: '2026-08-30', catatan: '', items: [{ nama_barang: 'Y', satuan: '', qty_pesan: 1 }] });
} catch (e) { errDupe = e.message; }
check('po: No PO duplikat ditolak', !!errDupe && errDupe.includes('sudah terpakai'), errDupe || '');

// ── Invoice ──
const sj7 = svc.getSJ(7); // SJ-0007? nomor bertambah — ambil SJ terbaru dari PO 5
const sjP2detail = svc.getSJ(sjP2.id);
let errInvStatus = null;
try {
  svc.createInvoice({ sj_id: sjP2.id, tanggal_invoice: '2026-08-29', items: [] });
} catch (e) { errInvStatus = e.message; }
check('invoice: item kosong ditolak', !!errInvStatus);

const inv = svc.createInvoice({
  sj_id: sjP2.id, tanggal_invoice: '2026-08-29',
  items: [
    { nama_barang: 'Pipa PVC 4 inch', qty: 5, harga_satuan: 45000 },
    { nama_barang: 'Lem Pipa', qty: 10, harga_satuan: 12000 },
  ],
});
check('invoice: no otomatis INV-0005', inv.no_invoice === 'INV-0005', inv.no_invoice);
check('invoice: total = 345000', svc.getInvoice(inv.id).total === 345000, String(svc.getInvoice(inv.id).total));

let errInvDua = null;
try {
  svc.createInvoice({ sj_id: sjP2.id, tanggal_invoice: '2026-08-29', items: [{ nama_barang: 'X', qty: 1, harga_satuan: 1 }] });
} catch (e) { errInvDua = e.message; }
check('invoice: SJ sudah di-invoice ditolak', !!errInvDua && errInvDua.includes('sudah memiliki invoice'), errInvDua || '');

// ── Invoice dari SJ belum diterima ditolak ──
let errSJTerkirim = null;
try {
  svc.createInvoice({ sj_id: sjBaru2.id, tanggal_invoice: '2026-08-29', items: [{ nama_barang: 'X', qty: 1, harga_satuan: 1 }] });
} catch (e) { errSJTerkirim = e.message; }
check('invoice: SJ belum diterima ditolak', !!errSJTerkirim && errSJTerkirim.includes('Diterima'), errSJTerkirim || '');

// ── Status invoice ──
const invU = svc.updateInvoiceStatus(inv.id, 'Ditagih');
check('invoice: status Ditagih + tanggal', invU.status === 'Ditagih' && !!invU.tanggal_ditagih);
const invU2 = svc.updateInvoiceStatus(inv.id, 'Dibayar');
check('invoice: status Dibayar + tanggal', invU2.status === 'Dibayar' && !!invU2.tanggal_dibayar);
let errStatus = null;
try { svc.updateInvoiceStatus(inv.id, 'Terkirim'); } catch (e) { errStatus = e.message; }
check('invoice: mundur status ditolak', !!errStatus && errStatus.includes('tidak dapat'), errStatus || '');

// ── Tanda Terima ──
const inv2 = svc.createInvoice({
  sj_id: sjBaru.id, tanggal_invoice: '2026-08-29',
  items: [{ nama_barang: 'Pipa PVC 4 inch', qty: 20, harga_satuan: 40000 }],
});
const tt = svc.createTandaTerima({
  tanggal: '2026-08-30', diserahkan_oleh: 'Admin', diterima_oleh: 'Client',
  items: [
    { invoice_id: inv.id, no_sbi: 'SBI/2026/08/1001' },
    { invoice_id: inv2.id, no_sbi: 'SBI/2026/08/1002' },
  ],
});
check('tt: no otomatis TT-0003', tt.no_dokumen === 'TT-0003', tt.no_dokumen);
check('tt: total gabungan', svc.getTandaTerima(tt.id).total === 345000 + 800000, String(svc.getTandaTerima(tt.id).total));
let errTT = null;
try { svc.createTandaTerima({ tanggal: '2026-08-30', items: [{ invoice_id: '', no_sbi: '' }] }); } catch (e) { errTT = e.message; }
check('tt: tanpa invoice ditolak', !!errTT);

// ── Laporan & piutang ──
const lap = svc.laporanBulanan(8, 2026);
check('laporan: bulanan berisi data', lap.sj.length >= 5 && lap.invoices.length >= 4 && lap.totalInvoice > 0);
const piutang = svc.rekapPiutang();
check('piutang: terkelompok per client', piutang.length > 0 && piutang.every((g) => g.total > 0));

// ── Riwayat PO ──
const riw = svc.riwayatPO(5);
check('riwayat: SJ & invoice terkait', riw.suratJalan.length >= 2 && riw.invoices.length >= 1);

// ── Backup & restore ──
const backup = svc.backupDb(dir);
check('backup: file dibuat', fs.existsSync(backup.lokasi));
check('backup: log tercatat', svc.listBackups().length === 1);
svc.deleteBackup(backup.id);
check('backup: hapus log', svc.listBackups().length === 0 && !fs.existsSync(backup.lokasi));

// ── Client ──
const cBaru = svc.createClient({ nama: 'PT Uji Coba', alamat: 'Jl. Test', no_telp: '081' });
check('client: tambah', svc.listClients().some((c) => c.id === cBaru.id));
svc.updateClient(cBaru.id, { nama: 'PT Uji Coba 2' });
check('client: update', svc.listClients().find((c) => c.id === cBaru.id).nama === 'PT Uji Coba 2');
let errClient = null;
try { svc.deleteClient(1); } catch (e) { errClient = e.message; }
check('client: hapus dengan PO ditolak', !!errClient && errClient.includes('PO'), errClient || '');

// ── Dashboard ──
const dash = svc.dashboardStats();
check('dashboard: statistik lengkap', dash.poAktif >= 0 && dash.piutang >= 0 && Array.isArray(dash.recentPO));

// bersihkan
import { closeDb } from '../electron/db.js';
closeDb();
fs.rmSync(dir, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
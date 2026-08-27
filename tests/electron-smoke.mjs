// Smoke test runtime Electron: verifikasi better-sqlite3 termuat (ABI native),
// schema dibuat, dan beberapa operasi inti berjalan.
// Jalankan: npx electron tests/electron-smoke.mjs
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

process.env.NOTAPEDIA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'notapedia-e2e-'));

const { openDb, getDbPath } = await import('../electron/db.js');
const svc = await import('../electron/services.js');
const { renderDoc } = await import('../electron/print.js');
const { renderReport } = await import('../electron/print.js');

app.whenReady().then(() => {
  try {
    openDb();

    const seedOk = {
      client: svc.listClients().length === 4,
      sj: svc.listSJ().length === 5,
    };

    const sjBaru = svc.createSJ({
      po_id: 5, tanggal_kirim: '2026-08-30', nama_pengirim: 'Tester',
      items: [{ po_item_id: 9, qty_kirim: 3, berat: 1 }],
    });
    svc.confirmSJ(sjBaru.id, {
      items: [{ sj_item_id: svc.getSJ(sjBaru.id).items[0].id, qty_diterima: 3, qty_ditolak: 0 }],
      alasan: '',
    });

    const checks = [
      ['db file dibuat', fs.existsSync(getDbPath())],
      ['seed client', seedOk.client],
      ['seed sj', seedOk.sj],
      ['sj create + no otomatis', sjBaru.no_sj === 'SJ-0006'],
      ['invoice create + no otomatis', (() => {
        const inv = svc.createInvoice({
          sj_id: sjBaru.id, tanggal_invoice: '2026-08-30',
          items: [{ nama_barang: 'Pipa PVC 4 inch', qty: 3, harga_satuan: 1000 }],
        });
        return inv.no_invoice === 'INV-0005';
      })()],
      ['print render sj', (() => {
        const html = renderDoc('sj', { ...svc.getSJ(1), client_nama: 'X' });
        return html.includes('SURAT JALAN') && html.includes('SJ-0001');
      })()],
      ['print logo tertanam (base64)', (() => {
        const html = renderDoc('invoice', { ...svc.getInvoice(1), client_nama: 'X' });
        return html.includes('data:image/png;base64,');
      })()],
      ['print render invoice', (() => {
        const html = renderDoc('invoice', { ...svc.getInvoice(1), client_nama: 'X' });
        return html.includes('INVOICE') && html.includes('TOTAL');
      })()],
      ['print render tt', (() => {
        const html = renderDoc('tanda-terima', svc.getTandaTerima(1));
        return html.includes('TANDA TERIMA') && html.includes('SBI');
      })()],
      ['print render laporan bulanan (A4 + logo)', (() => {
        const html = renderReport('laporan-bulanan', { bulan: 'Agustus', tahun: 2026, ...svc.laporanBulanan(8, 2026) });
        return html.includes('LAPORAN BULANAN') && html.includes('data:image/png;base64,') && html.includes('TOTAL BULAN INI');
      })()],
      ['print render rekap piutang (A4 + logo)', (() => {
        const html = renderReport('rekap-piutang', svc.rekapPiutang());
        return html.includes('REKAP PIUTANG') && html.includes('data:image/png;base64,') && html.includes('TOTAL PIUTANG');
      })()],
      ['laporan bulanan', svc.laporanBulanan(8, 2026).totalInvoice > 0],
      ['backup/restore', (() => {
        const b = svc.backupDb(process.env.NOTAPEDIA_DATA_DIR);
        svc.restoreBackup(b.lokasi);
        return svc.listPO().length === 5;
      })()],
    ];

    let fail = 0;
    for (const [label, ok] of checks) {
      console.log((ok ? 'OK  ' : 'FAIL') + ' ' + label);
      if (!ok) fail++;
    }
    console.log(fail === 0 ? 'SMOKE OK' : `SMOKE FAIL (${fail})`);
    app.exit(fail === 0 ? 0 : 1);
  } catch (e) {
    console.error('SMOKE ERROR:', e);
    app.exit(1);
  }
});
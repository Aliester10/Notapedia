import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notapedia-excel-'));
process.env.NOTAPEDIA_DATA_DIR = dir;

const { openDb } = await import('../electron/db.js');
const svc = await import('../electron/services.js');
const excel = await import('../electron/excel.js');

let pass = 0;
let fail = 0;
const check = (label, cond, extra = '') => {
  if (cond) { pass++; console.log(`  OK  ${label}`); }
  else { fail++; console.log(`FAIL  ${label} ${extra}`); }
};

openDb();

// ── Laporan Bulanan ──
const lap = svc.laporanBulanan(8, 2026);
const buf = await excel.buildLaporanBulanan({ bulan: 'Agustus', tahun: 2026, ...lap });
check('bulanan: buffer xlsx non-kosong', Buffer.isBuffer(buf) && buf.length > 3000, String(buf?.length));

// Logo tertanam di dalam zip
const zip = await JSZip.loadAsync(buf);
check('bulanan: logo tertanam (xl/media/image1.png)', !!zip.file('xl/media/image1.png'));

const wb1 = XLSX.read(buf, { type: 'buffer' });
check('bulanan: sheet Laporan', wb1.SheetNames.includes('Laporan'));

const rows = XLSX.utils.sheet_to_json(wb1.Sheets['Laporan'], { header: 1, defval: '' });
check('bulanan: judul baris 4', rows[3][0] === 'LAPORAN BULANAN — SURAT JALAN & INVOICE', JSON.stringify(rows[3]));
check('bulanan: periode baris 5', rows[4][0] === 'Periode: Agustus 2026', JSON.stringify(rows[4]));
check('bulanan: section LAPORAN', rows[6][0] === 'LAPORAN');

// check lengths, header is row 8 (index 7)
// data starts at row 9 (index 8)
const dataRows = rows.slice(8, 8 + lap.sj.length);
check('bulanan: data lengkap', dataRows.length === (lap.sj.length || 1), `got ${dataRows.length}`);

// check totals
const totalRow = rows.find(r => r[0] === 'TOTAL BULAN INI');
check('bulanan: baris total = totalInvoice', !!totalRow && totalRow[6] === lap.totalInvoice, JSON.stringify(totalRow));

const dicetakCell = rows[0].find((c) => String(c).startsWith('Dicetak:'));
check('bulanan: tanggal cetak ada', !!dicetakCell, JSON.stringify(rows[0]));
const footerInv = rows.find((row) => String(row[0] ?? '').startsWith('Dokumen ini dicetak otomatis'));
check('bulanan: footer ada', !!footerInv, JSON.stringify(rows[rows.length - 1]));

// ── Rekap Piutang ──
const groups = svc.rekapPiutang();
const buf2 = await excel.buildRekapPiutang(groups);
const zip2 = await JSZip.loadAsync(buf2);
check('piutang: logo tertanam', !!zip2.file('xl/media/image1.png'));

const wb2 = XLSX.read(buf2, { type: 'buffer' });
check('piutang: sheet ada', wb2.SheetNames.includes('Rekap Piutang'));
const rowsP = XLSX.utils.sheet_to_json(wb2.Sheets['Rekap Piutang'], { header: 1, defval: '' });
check('piutang: judul', rowsP[3][0] === 'LAPORAN REKAP PIUTANG KESELURUHAN', JSON.stringify(rowsP[3]));

const grand = groups.reduce((s, g) => s + g.total, 0);
const totalP = rowsP.find((row) => row[2] === 'TOTAL PIUTANG');
check('piutang: total piutang benar', !!totalP && totalP[3] === grand, JSON.stringify(totalP));

const nSub = groups.filter((g) => g.invoices.length).length;
const subRows = rowsP.filter((row) => String(row[2]).startsWith('Subtotal '));
check('piutang: subtotal per client', subRows.length === nSub, `got ${subRows.length}, expect ${nSub}`);

// ── Nama file ──
check('bulanan: nama file', excel.namaFileLaporanBulanan('Agustus', 2026) === 'laporan-sj-invoice-agustus-2026.xlsx');
check('piutang: nama file', excel.namaFilePiutang().startsWith('rekap-piutang-') && excel.namaFilePiutang().endsWith('.xlsx'));

import { closeDb } from '../electron/db.js';
closeDb();
fs.rmSync(dir, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
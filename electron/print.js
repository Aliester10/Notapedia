// Print Module — merender dokumen sebagai HTML lalu mengirim ke printer
// dotmatrix dengan ukuran halaman custom (setengah A4 / continuous form).
import { BrowserWindow } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rupiah = (n) => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');

// Logo toko direferensikan relatif ("logo.png") karena HTML dimuat dari file temp —
// data: URL berlogo base64 besar gagal dimuat Chromium (ERR_FAILED).
const LOGO_PATH = path.join(__dirname, 'assets', 'cingculogo.png');

// Siapkan folder temp berisi doc.html + logo.png (agar img relatif tampil).
function prepareDoc(html) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notapedia-print-'));
  if (fs.existsSync(LOGO_PATH)) {
    fs.copyFileSync(LOGO_PATH, path.join(dir, 'logo.png'));
  } else {
    html = html.replace('<img src="logo.png" alt="logo" />', '');
  }
  const htmlPath = path.join(dir, 'doc.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  return { htmlPath, dir };
}

// Satu window tersembunyi yang dipakai ulang untuk semua cetak/PDF —
// membuat/menghancurkan window berulang kali terbukti tidak stabil.
let sharedWin = null;
function getSharedWin() {
  if (!sharedWin || sharedWin.isDestroyed()) {
    sharedWin = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true },
    });
  }
  return sharedWin;
}

export function destroySharedWin() {
  if (sharedWin && !sharedWin.isDestroyed()) sharedWin.destroy();
  sharedWin = null;
}

// Operasi cetak diantre agar tidak saling menimpa window yang sama.
let printQueue = Promise.resolve();
function enqueue(task) {
  const run = printQueue.then(task, task);
  printQueue = run.catch(() => {});
  return run;
}

// Layout identik dengan pratinjau aplikasi (src/components/PrintLayout.jsx):
// font 12px Courier New, spacing px (Tailwind), header logo kiri + judul kanan.
const baseCss = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000; background: #fff; }
  .doc { max-width: 768px; margin: 0 auto; padding: 16px; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .logo img { height: 40px; width: auto; }
  .kanan { text-align: right; line-height: 20px; }
  .kanan .judul { font-size: 16px; font-weight: bold; line-height: 24px; }
  .header-line { border-bottom: 1px solid #000; margin-top: 8px; }
  .meta { margin-top: 16px; font-size: 12px; line-height: 20px; }
  .meta-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
  th, td { border: 1px solid #000; padding: 2px 6px; text-align: left; vertical-align: top; }
  th { font-weight: bold; }
  .num { text-align: right; }
  tfoot td { font-weight: bold; }
  .note { margin-top: 12px; font-size: 12px; }
  .sign { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; font-size: 12px; }
  .sign > div { text-align: center; }
  .sign .space { margin-top: 64px; }
`;

const fmtNum = (n) => (Number(n) || 0).toLocaleString('id-ID');

// Ukuran kertas per tipe dokumen (CSS @page — dipakai printToPDF via preferCSSPageSize).
// - invoice: setengah A4 (148 x 210 mm)
// - SJ / TT: continuous form (210 x 139.7 mm = 5.5 inch)
const pageCss = {
  sj: '@page { size: 210mm 139.7mm; margin: 0; }',
  invoice: '@page { size: 148mm 210mm; margin: 0; }',
  'tanda-terima': '@page { size: 210mm 139.7mm; margin: 0; }',
  'laporan-bulanan': '@page { size: 210mm 297mm; margin: 0; }',
  'rekap-piutang': '@page { size: 210mm 297mm; margin: 0; }',
};

function docHtml({ css, body }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
}

// Logo toko (cingculogo) — direferensikan relatif karena HTML dimuat dari file temp.
function headerBlock(judul, lines) {
  return `
    <div class="header">
      <div class="logo"><img src="logo.png" alt="logo" /></div>
      <div class="kanan">
        <div class="judul">${judul}</div>
        ${lines.map((l) => `<div>${l}</div>`).join('')}
      </div>
    </div>
    <div class="header-line"></div>`;
}

function htmlSJ(sj) {
  const rows = sj.items
    .map(
      (it, i) => `<tr>
        <td>${i + 1}</td><td>${it.nama_barang}</td><td>${it.satuan || ''}</td>
        <td class="num">${fmtNum(it.qty_kirim)}</td><td class="num">${it.berat > 0 ? fmtNum(it.berat) : '-'}</td><td></td>
      </tr>`
    )
    .join('');
  const returTotal = sj.items.reduce(
    (s, it) => s + (it.retur || []).reduce((r, x) => r + x.qty_ditolak, 0),
    0
  );
  const body = `
    <div class="doc">
      ${headerBlock('SURAT JALAN', [`No. ${sj.no_sj}`, `Tanggal: ${sj.tanggal_kirim}`])}
      <div class="meta meta-2">
        <div>
          <div>No. PO: ${sj.no_po}</div>
          <div>Kepada Yth: ${sj.client_nama}</div>
        </div>
        <div>
          <div>Pengirim: ${sj.nama_pengirim || ''}</div>
          <div>Tanggal Kirim: ${sj.tanggal_kirim}</div>
        </div>
      </div>
      <table>
        <thead><tr><th>No</th><th>Nama Barang</th><th>Satuan</th><th>Qty</th><th>Berat (kg)</th><th>Keterangan</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${sj.catatan ? `<div class="note">Catatan: ${sj.catatan}</div>` : ''}
      ${returTotal > 0 ? `<div class="note">Catatan Retur: ${fmtNum(returTotal)} ditolak / dikembalikan.</div>` : ''}
      <div class="sign">
        <div><div>Pengirim,</div><div class="space">${sj.nama_pengirim || '................'}</div></div>
        <div><div>Penerima,</div><div class="space">( ${sj.client_nama} )</div></div>
      </div>
    </div>`;
  return docHtml({ css: baseCss + pageCss.sj, body });
}

function htmlInvoice(inv) {
  const rows = inv.items
    .map(
      (it, i) => `<tr>
        <td>${i + 1}</td><td>${it.nama_barang}</td><td>${it.satuan || ''}</td>
        <td class="num">${fmtNum(it.qty)}</td><td class="num">${rupiah(it.harga_satuan)}</td>
        <td class="num">${rupiah(it.subtotal)}</td>
      </tr>`
    )
    .join('');
  const body = `
    <div class="doc">
      ${headerBlock('INVOICE', [`No. ${inv.no_invoice}`, `Tanggal: ${inv.tanggal_invoice}`])}
      <div class="meta meta-2">
        <div>
          <div>No. PO: ${inv.no_po}</div>
          <div>No. SJ: ${inv.no_sj}</div>
        </div>
        <div>
          <div>Kepada Yth: ${inv.client_nama}</div>
        </div>
      </div>
      <table>
        <thead><tr><th>No</th><th>Nama Barang</th><th>Satuan</th><th>Qty</th><th>Harga</th><th>Jumlah</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="5" class="num">TOTAL</td><td class="num">${rupiah(inv.total)}</td></tr></tfoot>
      </table>
      <div class="sign">
        <div><div>Hormat Kami,</div><div class="space">( NOTAPEDIA )</div></div>
        <div><div>Mengetahui / Menerima,</div><div class="space">( ${inv.client_nama} )</div></div>
      </div>
    </div>`;
  return docHtml({ css: baseCss + pageCss.invoice, body });
}

function htmlTandaTerima(tt) {
  const rows = tt.items
    .map(
      (it, i) => `<tr>
        <td>${i + 1}</td><td>${it.no_invoice}</td><td>${it.no_sbi || ''}</td>
        <td class="num">${rupiah(it.jumlah)}</td>
      </tr>`
    )
    .join('');
  const body = `
    <div class="doc">
      ${headerBlock('TANDA TERIMA', [`No. ${tt.no_dokumen}`, `Tanggal: ${tt.tanggal}`])}
      <div class="meta">
        <div>Diserahkan oleh: ${tt.diserahkan_oleh || ''}</div>
        <div>Diterima oleh: ${tt.diterima_oleh || '-'}</div>
      </div>
      <table>
        <thead><tr><th>No</th><th>No. Invoice</th><th>No. SBI</th><th>Jumlah</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="3" class="num">TOTAL</td><td class="num">${rupiah(tt.total)}</td></tr></tfoot>
      </table>
      <div class="sign">
        <div><div>Yang Menyerahkan,</div><div class="space">( ${tt.diserahkan_oleh || '................'} )</div></div>
        <div><div>Yang Menerima,</div><div class="space">( ${tt.diterima_oleh || '................'} )</div></div>
      </div>
    </div>`;
  return docHtml({ css: baseCss + pageCss['tanda-terima'], body });
}

export function renderDoc(type, data) {
  if (type === 'sj') return htmlSJ(data);
  if (type === 'invoice') return htmlInvoice(data);
  if (type === 'tanda-terima') return htmlTandaTerima(data);
  throw new Error('Tipe dokumen tidak dikenal: ' + type);
}

// Ukuran halaman custom (micron).
// - Invoice: setengah A4 (148 x 210 mm)
// - SJ / TT: continuous form (lebar A4, tinggi custom 139.7 mm = 5.5 inch)
export function pageSizeFor(type) {
  if (type === 'invoice') return { width: 148000, height: 210000 };
  return { width: 210000, height: 139700 };
}

export function printDocument(type, data, { deviceName, silent = true } = {}) {
  return enqueue(async () => {
    const html = renderDoc(type, data);
    const { htmlPath, dir } = prepareDoc(html);
    const win = getSharedWin();
    try {
      await win.loadFile(htmlPath);
      const pageSize = pageSizeFor(type);
      const success = await new Promise((resolve) => {
        win.webContents.print(
          {
            silent,
            printBackground: true,
            deviceName: deviceName || undefined,
            pageSize,
            margins: { marginType: 'none' },
            landscape: false,
          },
          (ok, err) => resolve(ok ? true : err)
        );
      });
      if (success !== true) throw new Error('Gagal mencetak: ' + success);
      return { ok: true };
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

// ─────────────────────────── LAPORAN (A4) ───────────────────────────

const reportCss = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 15mm 14mm; font-family: 'Segoe UI', Arial, sans-serif; color: #111; font-size: 10pt; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; }
  .header .logo img { height: 44px; width: auto; }
  .header .tgl-cetak { text-align: right; font-size: 8.5pt; color: #555; }
  .header-line { border-bottom: 2px solid #111; margin-top: 3mm; }
  .judul { text-align: center; margin-top: 5mm; }
  .judul h1 { font-size: 14pt; margin: 0; }
  .judul .periode { font-size: 10.5pt; color: #333; margin-top: 1mm; }
  .section-title { font-size: 11pt; font-weight: bold; margin: 6mm 0 2mm; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th, td { border: 1px solid #444; padding: 2mm 2.5mm; text-align: left; vertical-align: top; }
  th { background: #eee; font-weight: bold; }
  .num { text-align: right; }
  tfoot td { font-weight: bold; border-top: 2px solid #111; }
  tr.subtotal td { font-weight: bold; background: #f5f5f5; }
  .footer { margin-top: 8mm; font-size: 8.5pt; color: #555; text-align: center; }
`;

function reportHeader(judul, periode) {
  return `
    <div class="header">
      <div class="logo"><img src="logo.png" alt="logo" /></div>
      <div class="tgl-cetak">Dicetak: ${new Date().toLocaleString('id-ID')}</div>
    </div>
    <div class="header-line"></div>
    <div class="judul">
      <h1>${judul}</h1>
      ${periode ? `<div class="periode">Periode: ${periode}</div>` : ''}
    </div>`;
}

function htmlLaporanBulanan({ bulan, tahun, sj, invoices, totalInvoice }) {
  const periode = `${bulan} ${tahun}`;
  const sjRows = sj.length
    ? sj.map((s, i) => `<tr>
        <td>${i + 1}</td><td>${s.no_sj}</td><td>${s.tanggal_kirim}</td>
        <td>${s.no_po}</td><td>${s.client_nama}</td><td>${s.status}</td>
      </tr>`).join('')
    : `<tr><td colspan="6" style="text-align:center">Tidak ada data</td></tr>`;

  const invRows = invoices.length
    ? invoices.map((i, idx) => `<tr>
        <td>${idx + 1}</td><td>${i.no_invoice}</td><td>${i.tanggal_invoice}</td>
        <td>${i.client_nama}</td><td class="num">${rupiah(i.total)}</td><td>${i.status}</td>
      </tr>`).join('')
    : `<tr><td colspan="6" style="text-align:center">Tidak ada data</td></tr>`;

  const body = `
    ${reportHeader('LAPORAN BULANAN — SURAT JALAN & INVOICE', periode)}
    <div class="section-title">1. Daftar Surat Jalan</div>
    <table>
      <thead><tr><th>No</th><th>No SJ</th><th>Tanggal</th><th>No PO</th><th>Client</th><th>Status</th></tr></thead>
      <tbody>${sjRows}</tbody>
    </table>
    <div class="section-title">2. Daftar Invoice</div>
    <table>
      <thead><tr><th>No</th><th>No Invoice</th><th>Tanggal</th><th>Client</th><th>Total</th><th>Status</th></tr></thead>
      <tbody>${invRows}</tbody>
      <tfoot><tr><td colspan="4" class="num">TOTAL BULAN INI</td><td class="num">${rupiah(totalInvoice)}</td><td></td></tr></tfoot>
    </table>
    <div class="footer">Dokumen ini dicetak otomatis dari aplikasi Notapedia — ${periode}</div>`;
  return docHtml({ css: reportCss + pageCss['laporan-bulanan'], body });
}

function htmlRekapPiutang(groups) {
  const grand = groups.reduce((s, g) => s + g.total, 0);
  const sections = groups.length
    ? groups.map((g) => `
      <table>
        <thead><tr><th style="width:40%">Client: ${g.client_nama}</th><th>No Invoice</th><th>Tanggal</th><th>Status</th><th style="width:15%">Nilai</th></tr></thead>
        <tbody>
          ${g.invoices.map((i, idx) => `<tr>
            <td>${idx === 0 ? g.client_nama : ''}</td><td>${i.no_invoice}</td><td>${i.tanggal_invoice}</td>
            <td>${i.status}</td><td class="num">${rupiah(i.total)}</td>
          </tr>`).join('')}
          <tr class="subtotal"><td colspan="4" class="num">Subtotal ${g.client_nama}</td><td class="num">${rupiah(g.total)}</td></tr>
        </tbody>
      </table>`).join('\n<div style="height:4mm"></div>')
    : '<div style="text-align:center;margin-top:5mm">Tidak ada piutang — semua invoice sudah dibayar.</div>';

  const body = `
    ${reportHeader('REKAP PIUTANG PER CLIENT', 'Belum dibayar (Terkirim / Ditagih)')}
    ${sections}
    <table style="margin-top:5mm">
      <tfoot><tr><td colspan="4" class="num">TOTAL PIUTANG</td><td class="num">${rupiah(grand)}</td></tr></tfoot>
    </table>
    <div class="footer">Dokumen ini dicetak otomatis dari aplikasi Notapedia</div>`;
  return docHtml({ css: reportCss + pageCss['rekap-piutang'], body });
}

export function renderReport(type, data) {
  if (type === 'laporan-bulanan') return htmlLaporanBulanan(data);
  if (type === 'rekap-piutang') return htmlRekapPiutang(data);
  throw new Error('Tipe laporan tidak dikenal: ' + type);
}

// Cetak laporan A4. silent=false → dialog cetak muncul (bisa pilih "Microsoft Print to PDF").
export function printReport(type, data, { deviceName } = {}) {
  return enqueue(async () => {
    const html = renderReport(type, data);
    const { htmlPath, dir } = prepareDoc(html);
    const win = getSharedWin();
    try {
      await win.loadFile(htmlPath);
      const success = await new Promise((resolve) => {
        win.webContents.print(
          {
            silent: false,
            printBackground: true,
            deviceName: deviceName || undefined,
            pageSize: { width: 210000, height: 297000 },
            margins: { marginType: 'none' },
            landscape: false,
          },
          (ok, err) => resolve(ok ? true : err)
        );
      });
      if (success !== true) throw new Error('Gagal mencetak: ' + success);
      return { ok: true };
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

// Simpan dokumen sebagai PDF dengan ukuran kertas dotmatrix yang tepat.
// printToPDF + preferCSSPageSize memakai @page dari CSS → ukuran halaman persis
// (continuous form / setengah A4), tidak jatuh ke A4 seperti lewat dialog printer.
export function saveDocumentPdf(type, data) {
  return enqueue(async () => {
    const html = renderDoc(type, data);
    const { htmlPath, dir } = prepareDoc(html);
    const win = getSharedWin();
    try {
      await win.loadFile(htmlPath);
      const pdf = await win.webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: true,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        pageSize: pdfPageSizeFor(type),
        landscape: false,
      });
      return pdf;
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

// Ukuran halaman PDF (inch) sebagai fallback selain CSS @page.
// - invoice: setengah A4 (148 x 210 mm ≈ 5.83 x 8.27 inch)
// - SJ / TT: continuous form (210 x 139.7 mm ≈ 8.27 x 5.5 inch)
export function pdfPageSizeFor(type) {
  if (type === 'invoice') return { width: 5.83, height: 8.27 };
  return { width: 8.27, height: 5.5 };
}

// Nama default file PDF berdasarkan nomor dokumen.
export function pdfFileNameFor(type, data) {
  const no = data?.no_sj || data?.no_invoice || data?.no_dokumen || 'dokumen';
  return `${no}.pdf`;
}
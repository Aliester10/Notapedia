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
// gaya dotmatrix hitam-putih, header logo kiri + judul dokumen kanan,
// info client (alamat/telp), tabel barang, grand total, terbilang & tanda tangan.
const baseCss = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; background: #fff; }
  .doc { max-width: 768px; margin: 0 auto; padding: 12px 16px; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .logo img { height: 72px; width: auto; }
  .kanan { text-align: right; line-height: 18px; align-self: flex-end; }
  .kanan .judul { font-size: 18px; font-weight: bold; letter-spacing: 1px; line-height: 24px; }
  .header-line { border-bottom: 2px solid #000; margin-top: 8px; }
  .meta { margin-top: 12px; font-size: 11px; line-height: 19px; }
  .meta-2 { display: flex; justify-content: space-between; gap: 8px 28px; }
  .meta .lbl { display: inline-block; width: 90px; white-space: nowrap; }
  .meta .lbl-lg { display: inline-block; width: 140px; white-space: nowrap; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #000; padding: 2px 4px; vertical-align: top; }
  th { font-weight: bold; background: #eee; white-space: nowrap; }
  th.col-no { width: 30px; }
  th.col-qty { width: 45px; }
  th.col-satuan { width: 55px; }
  th.col-harga { width: 120px; }
  th.col-total { width: 120px; }
  .num { text-align: right; }
  .center { text-align: center; }
  tfoot td { font-weight: bold; border-top: 2px solid #000; }
  .note { margin-top: 8px; font-size: 11px; }
  .terbilang { margin-top: 10px; font-size: 11px; }
  .sign { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; font-size: 11px; }
  .sign > div { text-align: center; }
  .footer-container { margin-top: 32px; display: flex; justify-content: space-between; align-items: flex-start; }
  .footnote-box { display: inline-block; border: 1px solid #000; padding: 6px 12px; font-size: 10px; text-align: center; line-height: 14px; font-weight: bold; }
  .sign-right { font-size: 11px; text-align: center; width: 192px; }
  .sign-right .space { margin-top: 56px; }
`;

const fmtNum = (n) => (n ?? 0).toLocaleString('id-ID');
const fmtTanggal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};

// Terbilang angka → kata Bahasa Indonesia (untuk invoice & tanda terima).
const SATUAN_KATA = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
const belasKata = (n) => {
  if (n < 12) return SATUAN_KATA[n];
  if (n < 20) return SATUAN_KATA[n - 10] + ' belas';
  if (n < 100) {
    const p = Math.floor(n / 10);
    const s = n % 10;
    return SATUAN_KATA[p] + ' puluh' + (s ? ' ' + SATUAN_KATA[s] : '');
  }
  return '';
};
const tigaDigitKata = (n) => {
  const r = Math.floor(n / 100);
  const sisa = n % 100;
  let s = '';
  if (r > 0) s += (r === 1 ? 'seratus' : SATUAN_KATA[r] + ' ratus');
  if (sisa > 0) {
    if (s) s += ' ';
    s += belasKata(sisa);
  }
  return s;
};
const terbilang = (n) => {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'nol';
  const gol = ['', 'ribu', 'juta', 'miliar', 'triliun'];
  const parts = [];
  let i = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk > 0) {
      if (i === 1 && chunk === 1) {
        parts.unshift('seribu');
      } else {
        parts.unshift(tigaDigitKata(chunk) + (gol[i] ? ' ' + gol[i] : ''));
      }
    }
    n = Math.floor(n / 1000);
    i++;
  }
  const res = parts.join(' ').trim().replace(/\s+/g, ' ');
  return res.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

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
function headerBlock(judul, lines, centerJudul = false) {
  return `
    <div class="header" style="position: relative;">
      <div class="logo"><img src="logo.png" alt="logo" /></div>
      ${centerJudul ? `<div class="judul" style="position: absolute; left: 50%; transform: translateX(-50%); text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 1px; top: 10px;">${judul}</div>` : ''}
      <div class="kanan">
        ${!centerJudul ? `<div class="judul">${judul}</div>` : ''}
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
        <td class="center">${fmtNum(it.qty_kirim)}</td><td>${it.keterangan || ''}</td>
      </tr>`
    )
    .join('');
  const returTotal = sj.items.reduce(
    (s, it) => s + (it.retur || []).reduce((r, x) => r + x.qty_ditolak, 0),
    0
  );
  const body = `
    <div class="doc">
      ${headerBlock('SURAT JALAN', [`<span style="font-size: 24px; font-weight: bold;">No. ${sj.no_sj}</span>`, fmtTanggal(sj.tanggal_kirim)], true)}
      <div class="meta meta-2">
        <div>
          <div><span class="lbl">No. PO</span>: ${sj.no_po}</div>
          <div><span class="lbl">Pengirim</span>: ${sj.nama_pengirim || ''}</div>
        </div>
        <div>
          <div><span class="lbl">Kepada Yth.</span>: ${sj.client_nama}</div>
        </div>
      </div>
      <table>
        <thead><tr><th class="center">No</th><th class="center">Nama Barang</th><th class="center">Satuan</th><th class="center">Qty</th><th class="center">Keterangan</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
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
        <td>${i + 1}</td><td>${it.nama_barang}</td><td class="center">${fmtNum(it.qty)}</td><td>${it.satuan || ''}</td>
        <td class="center">${fmtNum(it.harga_satuan)}</td>
        <td class="center">${fmtNum(it.subtotal)}</td>
      </tr>`
    )
    .join('');
  const body = `
    <div class="doc">
      ${headerBlock('INVOICE', [`No. ${inv.no_invoice}`, fmtTanggal(inv.tanggal_invoice)], true)}
      <div class="meta meta-2">
        <div>
          <div><span class="lbl">No. PO</span>: ${inv.no_po}</div>
          <div><span class="lbl">No. SJ</span>: ${inv.no_sj}</div>
          ${inv.rest ? `<div><span class="lbl">Rest</span>: ${inv.rest}</div>` : ''}
        </div>
        <div>
          <div><span class="lbl">Kepada Yth.</span>: ${inv.client_nama}</div>
        </div>
      </div>
      <table>
        <thead><tr><th class="center col-no">No</th><th class="center">Nama Barang</th><th class="center col-qty">Qty</th><th class="center col-satuan">Satuan</th><th class="center col-harga">Harga Satuan (Rp)</th><th class="center col-total">Total (Rp)</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="5" class="num">GRAND TOTAL</td><td class="center">${fmtNum(inv.total)}</td></tr></tfoot>
      </table>
      <div class="terbilang" style="font-style: italic;">Terbilang: ${terbilang(inv.total)} Rupiah.</div>
      <div class="footer-container">
        <div class="footnote-box" style="font-weight: bold; font-size: 11px; line-height: 1.5; border: 1px solid black; padding: 8px; max-width: 340px;">
          MOHON LAKUKAN PEMBAYARAN TEPAT WAKTU<br/>
          UNTUK MENGHINDARI KETERLAMBATAN BARANG DAN DEMI KELANCARAN PRODUKSI BERSAMA.
        </div>
        <div class="sign-right">
          <div>Hormat Kami,</div><div class="space">Antonius Sumera</div>
        </div>
      </div>
    </div>`;
  return docHtml({ css: baseCss + pageCss.invoice, body });
}

function htmlTandaTerima(tt) {
  const rows = tt.items
    .map(
      (it, i) => `<tr>
        <td>${i + 1}</td><td>${it.no_invoice}</td><td>${fmtTanggal(it.tanggal_invoice)}</td>
        <td>${it.no_po || ''}</td><td>${fmtTanggal(it.tanggal_po)}</td>
        <td class="num">${rupiah(it.jumlah)}</td>
      </tr>`
    )
    .join('');
  const body = `
    <div class="doc">
      ${headerBlock('TANDA TERIMA', [`<span style="font-size: 24px; font-weight: bold;">No. ${tt.no_dokumen}</span>`, fmtTanggal(tt.tanggal)], true)}
      <div class="meta">
        <div><span class="lbl-lg">Diserahkan oleh</span>: ${tt.diserahkan_oleh || ''}</div>
        <div><span class="lbl-lg">Diterima oleh</span>: ${tt.diterima_oleh || '-'}</div>
      </div>
      <table>
        <thead><tr><th class="center">No</th><th class="center">No. Invoice</th><th class="center">Tgl Invoice</th><th class="center">No. PO</th><th class="center">Tanggal PO</th><th class="center">Jumlah (Rp)</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="5" class="num">GRAND TOTAL</td><td class="num">${rupiah(tt.total)}</td></tr></tfoot>
      </table>
      <div class="terbilang" style="font-style: italic;">Terbilang: ${terbilang(tt.total)} Rupiah.</div>
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
  .header .logo img { height: 72px; width: auto; }
  .header .tgl-cetak { text-align: right; font-size: 8.5pt; color: #555; }
  .header-line { border-bottom: 2px solid #111; margin-top: 3mm; }
  .judul { text-align: center; margin-top: 5mm; }
  .judul h1 { font-size: 14pt; margin: 0; }
  .judul .periode { font-size: 10.5pt; color: #333; margin-top: 1mm; }
  .section-title { font-size: 11pt; font-weight: bold; margin: 6mm 0 2mm; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th, td { border: 1px solid #000; padding: 2mm 2.5mm; text-align: left; vertical-align: top; }
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
        <td>${s.no_po}</td><td>${s.tanggal_po ? fmtTanggal(s.tanggal_po) : '-'}</td>
        <td>${s.no_sj}</td><td>${fmtTanggal(s.tanggal_kirim)}</td>
        <td>${s.no_invoice || '-'}</td><td>${s.tanggal_invoice ? fmtTanggal(s.tanggal_invoice) : '-'}</td>
        <td class="num">${s.jumlah_invoice ? rupiah(s.jumlah_invoice) : '-'}</td>
      </tr>`).join('')
    : `<tr><td colspan="7" style="text-align:center">Tidak ada data</td></tr>`;

  const body = `
    ${reportHeader('LAPORAN BULANAN', periode)}
    <div class="section-title">LAPORAN</div>
    <table>
      <thead><tr><th>No PO</th><th>Tanggal PO</th><th>No SJ</th><th>Tanggal SJ</th><th>No Invoice</th><th>Tgl Invoice</th><th>Jumlah</th></tr></thead>
      <tbody>${sjRows}</tbody>
      <tfoot><tr><td colspan="6" class="num">TOTAL BULAN INI</td><td class="num">${rupiah(totalInvoice)}</td></tr></tfoot>
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
// Print Module — merender dokumen sebagai HTML lalu mengirim ke printer
// dotmatrix dengan ukuran halaman custom (setengah A4 / continuous form).
import { BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rupiah = (n) => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');

// Logo toko (cingculogo) di-inline sebagai base64 agar tampil di halaman data: URL.
let logoBase64 = null;
function logoDataUrl() {
  if (logoBase64 === null) {
    try {
      const p = path.join(__dirname, 'assets', 'cingculogo.png');
      logoBase64 = fs.existsSync(p)
        ? 'data:image/png;base64,' + fs.readFileSync(p).toString('base64')
        : '';
    } catch {
      logoBase64 = '';
    }
  }
  return logoBase64;
}

const baseCss = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 12mm; font-family: 'Courier New', Courier, monospace; color: #000; font-size: 11pt; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; }
  .header .logo img { height: 40px; width: auto; }
  .header .title { text-align: right; font-weight: bold; font-size: 13pt; }
  .header-line { border-bottom: 1px solid #000; margin-top: 3mm; }
  .meta { margin-top: 4mm; }
  table { width: 100%; border-collapse: collapse; margin-top: 4mm; font-size: 10.5pt; }
  th, td { border: 1px solid #000; padding: 1.5mm 2mm; text-align: left; vertical-align: top; }
  th { font-weight: bold; }
  .num { text-align: right; }
  tfoot td { font-weight: bold; }
  .sign { margin-top: 14mm; display: flex; justify-content: space-between; }
  .sign > div { width: 45%; text-align: center; }
  .sign .space { margin-top: 14mm; }
  .note { margin-top: 3mm; }
`;

function docHtml({ css, body }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
}

function headerBlock(judul, kanan) {
  return `
    <div class="header">
      <div class="logo"><img src="${logoDataUrl()}" alt="logo" /></div>
      <div class="title">${judul}</div>
    </div>
    <div class="header-line"></div>
    <div class="meta">
      ${kanan.map(([label, value]) => `<div><strong>${label}:</strong> ${value}</div>`).join('')}
    </div>`;
}

function htmlSJ(sj) {
  const rows = sj.items
    .map(
      (it, i) => `<tr>
        <td>${i + 1}</td><td>${it.nama_barang}</td><td>${it.satuan || ''}</td>
        <td class="num">${it.qty_kirim}</td><td class="num">${it.berat || '-'}</td><td></td>
      </tr>`
    )
    .join('');
  const returTotal = sj.items.reduce(
    (s, it) => s + (it.retur || []).reduce((r, x) => r + x.qty_ditolak, 0),
    0
  );
  const body = `
    ${headerBlock('SURAT JALAN', [
      ['No', sj.no_sj],
      ['Tanggal', sj.tanggal_kirim],
    ])}
    <div class="meta">
      <div><strong>No. PO:</strong> ${sj.no_po}</div>
      <div><strong>Kepada Yth:</strong> ${sj.client_nama}</div>
      <div><strong>Pengirim:</strong> ${sj.nama_pengirim || ''}</div>
    </div>
    <table>
      <thead><tr><th>No</th><th>Nama Barang</th><th>Satuan</th><th>Qty</th><th>Berat (kg)</th><th>Ket</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${sj.catatan ? `<div class="note">Catatan: ${sj.catatan}</div>` : ''}
    ${returTotal > 0 ? `<div class="note">Catatan Retur: ${returTotal} ditolak / dikembalikan.</div>` : ''}
    <div class="sign">
      <div><div>Pengirim,</div><div class="space">( ${sj.nama_pengirim || '................' } )</div></div>
      <div><div>Penerima,</div><div class="space">( ${sj.client_nama} )</div></div>
    </div>`;
  return docHtml({ css: baseCss, body });
}

function htmlInvoice(inv) {
  const rows = inv.items
    .map(
      (it, i) => `<tr>
        <td>${i + 1}</td><td>${it.nama_barang}</td><td>${it.satuan || ''}</td>
        <td class="num">${it.qty}</td><td class="num">${rupiah(it.harga_satuan)}</td>
        <td class="num">${rupiah(it.subtotal)}</td>
      </tr>`
    )
    .join('');
  const body = `
    ${headerBlock('INVOICE', [
      ['No', inv.no_invoice],
      ['Tanggal', inv.tanggal_invoice],
    ])}
    <div class="meta">
      <div><strong>No. PO:</strong> ${inv.no_po}</div>
      <div><strong>No. SJ:</strong> ${inv.no_sj}</div>
      <div><strong>Kepada Yth:</strong> ${inv.client_nama}</div>
    </div>
    <table>
      <thead><tr><th>No</th><th>Nama Barang</th><th>Satuan</th><th>Qty</th><th>Harga</th><th>Jumlah</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="5" class="num">TOTAL</td><td class="num">${rupiah(inv.total)}</td></tr></tfoot>
    </table>
    <div class="sign">
      <div><div>Hormat Kami,</div><div class="space">( NOTAPEDIA )</div></div>
      <div><div>Mengetahui / Menerima,</div><div class="space">( ${inv.client_nama} )</div></div>
    </div>`;
  return docHtml({ css: baseCss, body });
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
    ${headerBlock('TANDA TERIMA', [
      ['No', tt.no_dokumen],
      ['Tanggal', tt.tanggal],
    ])}
    <div class="meta">
      <div><strong>Diserahkan oleh:</strong> ${tt.diserahkan_oleh || ''}</div>
      <div><strong>Diterima oleh:</strong> ${tt.diterima_oleh || '-'}</div>
    </div>
    <table>
      <thead><tr><th>No</th><th>No. Invoice</th><th>No. SBI</th><th>Jumlah</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="3" class="num">TOTAL</td><td class="num">${rupiah(tt.total)}</td></tr></tfoot>
    </table>
    <div class="sign">
      <div><div>Yang Menyerahkan,</div><div class="space">( ${tt.diserahkan_oleh || '................' } )</div></div>
      <div><div>Yang Menerima,</div><div class="space">( ${tt.diterima_oleh || '................' } )</div></div>
    </div>`;
  return docHtml({ css: baseCss, body });
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

export async function printDocument(type, data, { deviceName, silent = true } = {}) {
  const html = renderDoc(type, data);
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true },
  });

  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
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
    win.destroy();
  }
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
      <div class="logo"><img src="${logoDataUrl()}" alt="logo" /></div>
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
  return docHtml({ css: reportCss, body });
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
  return docHtml({ css: reportCss, body });
}

export function renderReport(type, data) {
  if (type === 'laporan-bulanan') return htmlLaporanBulanan(data);
  if (type === 'rekap-piutang') return htmlRekapPiutang(data);
  throw new Error('Tipe laporan tidak dikenal: ' + type);
}

// Cetak laporan A4. silent=false → dialog cetak muncul (bisa pilih "Microsoft Print to PDF").
export async function printReport(type, data, { deviceName } = {}) {
  const html = renderReport(type, data);
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true },
  });

  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
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
    win.destroy();
  }
}
// Export Excel — membangun workbook .xlsx dari data laporan.
// Desain mengikuti cetak PDF: logo toko kiri atas + tanggal cetak, judul
// di tengah, tabel per section dengan header abu-abu, total tebal, footer.
// Logo disisipkan langsung ke struktur file .xlsx (SheetJS tidak mendukung gambar).
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, 'assets', 'cingculogo.png');

let LOGO_BUF = null;
function logoBuffer() {
  if (LOGO_BUF === null) {
    LOGO_BUF = fs.existsSync(LOGO_PATH) ? fs.readFileSync(LOGO_PATH) : Buffer.alloc(0);
  }
  return LOGO_BUF;
}

function pngDims(buf) {
  if (buf.length < 24) return [0, 0];
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

const rupiah = (n) => (Number(n) || 0).toLocaleString('id-ID');
const tanggal = (t) => {
  if (!t) return '-';
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return t;
  return d.toLocaleDateString('id-ID');
};
const hariIni = () => new Date().toLocaleString('id-ID');

// ─────────────────────────── STYLING ───────────────────────────

const BORDER = {
  top: { style: 'thin', color: { rgb: '444444' } },
  bottom: { style: 'thin', color: { rgb: '444444' } },
  left: { style: 'thin', color: { rgb: '444444' } },
  right: { style: 'thin', color: { rgb: '444444' } },
};
const HEADER_FILL = { patternType: 'solid', fgColor: { rgb: 'EEEEEE' } };
const TOTAL_FILL = { patternType: 'solid', fgColor: { rgb: 'DDDDDD' } };

function cell(ws, r, c, v, s) {
  const addr = XLSX.utils.encode_cell({ r, c });
  let x = ws[addr];
  if (!x) { x = { t: 's', v: '' }; ws[addr] = x; }
  x.t = typeof v === 'number' ? 'n' : 's';
  x.v = v;
  if (s) x.s = s;
  return x;
}

function merge(ws, r0, c0, r1, c1) {
  if (!ws['!merges']) ws['!merges'] = [];
  ws['!merges'].push({ s: { r: r0, c: c0 }, e: { r: r1, c: c1 } });
}

function styleRange(ws, r0, c0, r1, c1, s) {
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) ws[addr].s = { ...(ws[addr].s || {}), ...s };
    }
  }
}

// Header bersama: logo kiri atas, tanggal cetak kanan, judul & periode di tengah.
// mengembalikan nomor baris kosong terakhir yang dipakai (baris berikutnya = konten).
function headerBersama(ws, judul, periode, maxCol) {
  merge(ws, 0, 0, 0, maxCol - 1);
  cell(ws, 0, maxCol - 1, `Dicetak: ${hariIni()}`, { font: { size: 9, color: { rgb: '555555' } }, alignment: { horizontal: 'right' } });
  ws['!rows'] = [{ hpt: 30 }];
  merge(ws, 3, 0, 3, maxCol - 1);
  cell(ws, 3, 0, judul, { font: { bold: true, sz: 14 } });
  if (periode) {
    merge(ws, 4, 0, 4, maxCol - 1);
    cell(ws, 4, 0, periode, { font: { sz: 10, color: { rgb: '333333' } } });
  }
  return 6;
}

function tableHeader(ws, r, headers, colCount) {
  headers.forEach((h, c) => cell(ws, r, c, h, { bold: true, fill: HEADER_FILL, border: BORDER }));
  styleRange(ws, r, 0, r, colCount - 1, { fill: HEADER_FILL, border: BORDER });
  return r + 1;
}

function dataRow(ws, r, values, colCount, { bold = false, fill = null } = {}) {
  values.forEach((v, c) => {
    cell(ws, r, c, v, {
      ...(bold ? { bold: true } : {}),
      ...(fill ? { fill } : {}),
      border: BORDER,
    });
  });
  return r + 1;
}

function footerRow(ws, r, teks, colCount) {
  merge(ws, r, 0, r, colCount - 1);
  cell(ws, r, 0, teks, { font: { size: 9, italic: true, color: { rgb: '555555' } } });
  return r + 1;
}

function fixRef(ws, lastRow, colCount) {
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow - 1, c: colCount - 1 } });
}

// ─────────────────────────── LAPORAN BULANAN ───────────────────────────

export function buildLaporanBulanan({ bulan, tahun, sj, invoices, totalInvoice }) {
  const wb = XLSX.utils.book_new();
  const periode = `${bulan} ${tahun}`;
  const colCount = 6;

  const wsSJ = XLSX.utils.aoa_to_sheet([]);
  wsSJ['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 25 }, { wch: 20 }];
  let r = headerBersama(wsSJ, 'LAPORAN BULANAN — SURAT JALAN & INVOICE', `Periode: ${periode}`, colCount);
  r++; // baris kosong
  merge(wsSJ, r, 0, r, colCount - 1);
  cell(wsSJ, r, 0, '1. Daftar Surat Jalan', { bold: true });
  r++;
  r = tableHeader(wsSJ, r, ['No', 'No SJ', 'Tanggal', 'No PO', 'Client', 'Status'], colCount);
  if (sj.length) {
    sj.forEach((s, i) => {
      r = dataRow(wsSJ, r, [i + 1, s.no_sj, tanggal(s.tanggal_kirim), s.no_po, s.client_nama, s.status], colCount);
    });
  } else {
    r = dataRow(wsSJ, r, ['-', '-', '-', '-', '-', 'Tidak ada data'], colCount);
  }
  r++; // baris kosong
  merge(wsSJ, r, 0, r, colCount - 1);
  cell(wsSJ, r, 0, '2. Daftar Invoice', { bold: true });
  r++;
  r = tableHeader(wsSJ, r, ['No', 'No Invoice', 'Tanggal', 'Client', 'Total', 'Status'], colCount);
  if (invoices.length) {
    invoices.forEach((i, idx) => {
      r = dataRow(wsSJ, r, [idx + 1, i.no_invoice, tanggal(i.tanggal_invoice), i.client_nama, i.total, i.status], colCount);
    });
  } else {
    r = dataRow(wsSJ, r, ['-', '-', '-', '-', 0, 'Tidak ada data'], colCount);
  }
  r = dataRow(wsSJ, r, ['TOTAL BULAN INI', '', '', '', totalInvoice, ''], colCount, { bold: true, fill: TOTAL_FILL });
  r = footerRow(wsSJ, r, `Dokumen ini dicetak otomatis dari aplikasi Notapedia — ${periode}`, colCount);
  fixRef(wsSJ, r, colCount);

  XLSX.utils.book_append_sheet(wb, wsSJ, 'Surat Jalan');

  // Sheet Invoice: header + tabel invoice saja (agar tetap konsisten bila dibuka per sheet)
  const wsInv = XLSX.utils.aoa_to_sheet([]);
  wsInv['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 14 }, { wch: 25 }, { wch: 12 }, { wch: 20 }];
  let r2 = headerBersama(wsInv, 'LAPORAN INVOICE', `Periode: ${periode}`, colCount);
  r2++;
  r2 = tableHeader(wsInv, r2, ['No', 'No Invoice', 'Tanggal', 'Client', 'Total', 'Status'], colCount);
  if (invoices.length) {
    invoices.forEach((i, idx) => {
      r2 = dataRow(wsInv, r2, [idx + 1, i.no_invoice, tanggal(i.tanggal_invoice), i.client_nama, i.total, i.status], colCount);
    });
  } else {
    r2 = dataRow(wsInv, r2, ['-', '-', '-', '-', 0, 'Tidak ada data'], colCount);
  }
  r2 = dataRow(wsInv, r2, ['TOTAL BULAN INI', '', '', '', totalInvoice, ''], colCount, { bold: true, fill: TOTAL_FILL });
  r2 = footerRow(wsInv, r2, `Dokumen ini dicetak otomatis dari aplikasi Notapedia — ${periode}`, colCount);
  fixRef(wsInv, r2, colCount);
  XLSX.utils.book_append_sheet(wb, wsInv, 'Invoice');

  return attachLogo(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}

// ─────────────────────────── REKAP PIUTANG ───────────────────────────

export function buildRekapPiutang(groups) {
  const wb = XLSX.utils.book_new();
  const colCount = 5;
  const ws = XLSX.utils.aoa_to_sheet([]);
  ws['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 14 }];

  let r = headerBersama(ws, 'REKAP PIUTANG PER CLIENT', 'Belum dibayar (Terkirim / Ditagih)', colCount);
  r++;

  if (!groups.length) {
    merge(ws, r, 0, r, colCount - 1);
    cell(ws, r, 0, 'Tidak ada piutang — semua invoice sudah dibayar.');
    r++;
  } else {
    for (const g of groups) {
      merge(ws, r, 0, r, colCount - 1);
      cell(ws, r, 0, `Client: ${g.client_nama}`, { bold: true, fill: HEADER_FILL, border: BORDER });
      r++;
      r = tableHeader(ws, r, ['No Invoice', 'Tanggal', 'Status', 'Nilai'], colCount - 1);
      g.invoices.forEach((i, idx) => {
        r = dataRow(ws, r, [i.no_invoice, tanggal(i.tanggal_invoice), i.status, i.total], colCount - 1);
      });
      r = dataRow(ws, r, ['', '', `Subtotal ${g.client_nama}`, g.total], colCount - 1, { bold: true, fill: HEADER_FILL });
      r++;
    }
    const grand = groups.reduce((s, g) => s + g.total, 0);
    r = dataRow(ws, r, ['', '', 'TOTAL PIUTANG', grand], colCount - 1, { bold: true, fill: TOTAL_FILL });
  }
  r = footerRow(ws, r, 'Dokumen ini dicetak otomatis dari aplikasi Notapedia', colCount);
  fixRef(ws, r, colCount);

  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Piutang');
  return attachLogo(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}

// ─────────────────────────── SISIP LOGO KE XLSX ───────────────────────────

const EMU_PER_PX = 9525;

async function attachLogo(arrayBuffer) {
  const logo = logoBuffer();
  if (!logo.length) return Buffer.from(arrayBuffer);

  const zip = await JSZip.loadAsync(arrayBuffer);
  const [w, h] = pngDims(logo);
  const hEmu = Math.round(40 * EMU_PER_PX); // tinggi logo ~40px
  const wEmu = w && h ? Math.round(hEmu * (w / h)) : hEmu * 2;

  zip.file('xl/media/logo.png', logo);

  // Cari sheet-sheet yang ada
  const sheets = Object.keys(zip.files)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort();

  // [Content_Types].xml
  let ct = await zip.file('[Content_Types].xml').async('string');
  if (!ct.includes('Extension="png"')) {
    ct = ct.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>');
  }
  const drawingOverrides = sheets
    .map((_, i) => `<Override PartName="/xl/drawings/drawing${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`)
    .join('');
  if (!ct.includes('drawing1.xml')) {
    ct = ct.replace('</Types>', `${drawingOverrides}</Types>`);
  }
  zip.file('[Content_Types].xml', ct);

  // Per sheet: drawing + rels
  for (let i = 0; i < sheets.length; i++) {
    const sheetName = sheets[i];
    const idx = i + 1;

    const drawing = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <xdr:oneCellAnchor>
    <xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:ext cx="${wEmu}" cy="${hEmu}"/>
    <xdr:pic>
      <xdr:nvPicPr>
        <xdr:cNvPr id="1" name="cingculogo.png"/>
        <xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr>
      </xdr:nvPicPr>
      <xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
      <xdr:spPr>
        <a:xfrm><a:off x="0" y="0"/><a:ext cx="${wEmu}" cy="${hEmu}"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      </xdr:spPr>
    </xdr:pic>
    <xdr:clientData/>
  </xdr:oneCellAnchor>
</xdr:wsDr>`;
    zip.file(`xl/drawings/drawing${idx}.xml`, drawing);

    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/logo.png"/>
</Relationships>`;
    zip.file(`xl/drawings/_rels/drawing${idx}.xml.rels`, rels);

    // Rels sheet (tambah/update)
    const relPath = sheetName.replace('worksheets/', 'worksheets/_rels/').replace('.xml', '.xml.rels');
    let sRels = '';
    if (zip.file(relPath)) sRels = await zip.file(relPath).async('string');
    if (!sRels.includes('drawing' + idx + '.xml')) {
      if (sRels.includes('</Relationships>')) {
        sRels = sRels.replace('</Relationships>', `<Relationship Id="rIdImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${idx}.xml"/></Relationships>`);
      } else {
        sRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${idx}.xml"/>
</Relationships>`;
      }
      zip.file(relPath, sRels);
    }

    // Sheet xml: tambah elemen <drawing>
    let sheetXml = await zip.file(sheetName).async('string');
    if (!sheetXml.includes('<drawing')) {
      if (!sheetXml.includes('xmlns:r=')) {
        sheetXml = sheetXml.replace('<worksheet ', `<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" `);
      }
      sheetXml = sheetXml.replace('</worksheet>', '<drawing r:id="rIdImg"/></worksheet>');
      zip.file(sheetName, sheetXml);
    }
  }

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

export function namaFileLaporanBulanan(bulan, tahun) {
  return `laporan-sj-invoice-${bulan.toLowerCase()}-${tahun}.xlsx`;
}

export function namaFilePiutang() {
  return `rekap-piutang-${new Date().toISOString().slice(0, 10)}.xlsx`;
}
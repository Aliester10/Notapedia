import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, 'assets', 'cingculogo.png');

function pngDims(buf) {
  if (buf.length < 24) return [0, 0];
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

function addLogo(workbook, worksheet) {
  if (fs.existsSync(LOGO_PATH)) {
    const logoBuf = fs.readFileSync(LOGO_PATH);
    const [w, h] = pngDims(logoBuf);
    const height = 72;
    const width = w && h ? Math.round(height * (w / h)) : height * 2;

    const imageId = workbook.addImage({
      buffer: logoBuf,
      extension: 'png',
    });
    worksheet.addImage(imageId, {
      tl: { col: 0.1, row: 0.1 },
      ext: { width, height },
    });
  }
}

const rupiah = (n) => (Number(n) || 0).toLocaleString('id-ID');
const tanggal = (t) => {
  if (!t) return '-';
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return t;
  return d.toLocaleDateString('id-ID');
};
const hariIni = () => new Date().toLocaleString('id-ID');

const BORDER = {
  top: { style: 'thin', color: { argb: 'FF444444' } },
  left: { style: 'thin', color: { argb: 'FF444444' } },
  bottom: { style: 'thin', color: { argb: 'FF444444' } },
  right: { style: 'thin', color: { argb: 'FF444444' } }
};
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
const TOTAL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDDDDD' } };

// ─────────────────────────── LAPORAN BULANAN ───────────────────────────

export async function buildLaporanBulanan({ bulan, tahun, sj, invoices, totalInvoice }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Laporan');

  ws.columns = [
    { width: 18 }, // No PO
    { width: 14 }, // Tanggal PO
    { width: 14 }, // No SJ
    { width: 14 }, // Tanggal SJ
    { width: 16 }, // No Invoice
    { width: 14 }, // Tgl Invoice
    { width: 18 }, // Jumlah
  ];

  addLogo(wb, ws);

  ws.mergeCells('A1:G1');
  const printRow = ws.getCell('A1');
  printRow.value = `Dicetak: ${hariIni()}`;
  printRow.font = { size: 9, color: { argb: 'FF555555' } };
  printRow.alignment = { horizontal: 'right' };
  
  ws.getRow(1).height = 15;
  ws.getRow(2).height = 15;
  ws.getRow(3).height = 30; // logo space
  
  ws.mergeCells('A4:G4');
  const titleRow = ws.getCell('A4');
  titleRow.value = 'LAPORAN BULANAN — SURAT JALAN & INVOICE';
  titleRow.font = { size: 14, bold: true };
  titleRow.alignment = { horizontal: 'center' };
  ws.getRow(4).height = 20;

  ws.mergeCells('A5:G5');
  const periodRow = ws.getCell('A5');
  periodRow.value = `Periode: ${bulan} ${tahun}`;
  periodRow.font = { size: 10, color: { argb: 'FF333333' } };
  periodRow.alignment = { horizontal: 'center' };
  
  ws.mergeCells('A7:G7');
  const labelRow = ws.getCell('A7');
  labelRow.value = 'LAPORAN';
  labelRow.font = { bold: true };
  
  const headerRow = ws.getRow(8);
  headerRow.values = ['No PO', 'Tanggal PO', 'No SJ', 'Tanggal SJ', 'No Invoice', 'Tgl Invoice', 'Jumlah'];
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = HEADER_FILL;
    cell.border = BORDER;
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  let r = 9;
  if (sj.length) {
    sj.forEach((s) => {
      const row = ws.getRow(r);
      row.values = [
        s.no_po,
        tanggal(s.tanggal_po),
        s.no_sj,
        tanggal(s.tanggal_kirim),
        s.no_invoice || '-',
        s.tanggal_invoice ? tanggal(s.tanggal_invoice) : '-',
        s.jumlah_invoice || '-'
      ];
      row.eachCell((cell, colNumber) => {
        cell.border = BORDER;
        if (colNumber === 7 && typeof cell.value === 'number') {
          cell.numFmt = '#,##0';
        }
      });
      r++;
    });
  } else {
    const row = ws.getRow(r);
    row.values = ['-', '-', '-', '-', '-', '-', 'Tidak ada data'];
    row.eachCell((cell) => { cell.border = BORDER; });
    r++;
  }

  ws.mergeCells(`A${r}:F${r}`);
  const totalLabel = ws.getCell(`A${r}`);
  totalLabel.value = 'TOTAL BULAN INI';
  totalLabel.alignment = { horizontal: 'right' };
  
  const totalValue = ws.getCell(`G${r}`);
  totalValue.value = totalInvoice;
  totalValue.numFmt = '#,##0';
  
  const totalRow = ws.getRow(r);
  totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    if (colNumber <= 7) {
      cell.font = { bold: true };
      cell.fill = TOTAL_FILL;
      cell.border = BORDER;
    }
  });
  
  r += 2;
  ws.mergeCells(`A${r}:G${r}`);
  const foot = ws.getCell(`A${r}`);
  foot.value = `Dokumen ini dicetak otomatis dari aplikasi Notapedia — ${bulan} ${tahun}`;
  foot.font = { size: 9, italic: true, color: { argb: 'FF555555' } };
  foot.alignment = { horizontal: 'center' };

  return wb.xlsx.writeBuffer();
}

// ─────────────────────────── REKAP PIUTANG ───────────────────────────

export async function buildRekapPiutang(groups) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Rekap Piutang');
  
  ws.columns = [
    { width: 28 }, // Client/No Invoice
    { width: 14 }, // Tanggal
    { width: 20 }, // Status
    { width: 18 }, // Nilai
  ];
  
  addLogo(wb, ws);
  
  ws.mergeCells('A1:D1');
  const printRow = ws.getCell('A1');
  printRow.value = `Dicetak: ${hariIni()}`;
  printRow.font = { size: 9, color: { argb: 'FF555555' } };
  printRow.alignment = { horizontal: 'right' };
  
  ws.getRow(1).height = 15;
  ws.getRow(2).height = 15;
  ws.getRow(3).height = 30; // logo space
  
  ws.mergeCells('A4:D4');
  const titleRow = ws.getCell('A4');
  titleRow.value = 'LAPORAN REKAP PIUTANG KESELURUHAN';
  titleRow.font = { size: 14, bold: true };
  titleRow.alignment = { horizontal: 'center' };
  ws.getRow(4).height = 20;
  
  let r = 7;
  if (!groups.length) {
    const row = ws.getRow(r);
    row.values = ['Tidak ada data piutang berjalan'];
    r++;
  } else {
    for (const g of groups) {
      ws.mergeCells(`A${r}:D${r}`);
      const cRow = ws.getCell(`A${r}`);
      cRow.value = `Client: ${g.client_nama}`;
      cRow.font = { bold: true };
      cRow.fill = HEADER_FILL;
      cRow.border = BORDER;
      const rowC = ws.getRow(r);
      rowC.eachCell({ includeEmpty: true }, (c, cn) => { if (cn <= 4) c.border = BORDER; });
      r++;
      
      const hRow = ws.getRow(r);
      hRow.values = ['No Invoice', 'Tanggal', 'Status', 'Nilai'];
      hRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = HEADER_FILL;
        cell.border = BORDER;
      });
      r++;
      
      g.invoices.forEach((i) => {
        const row = ws.getRow(r);
        row.values = [i.no_invoice, tanggal(i.tanggal_invoice), i.status, i.total];
        row.eachCell((cell, colNumber) => {
          cell.border = BORDER;
          if (colNumber === 4) cell.numFmt = '#,##0';
        });
        r++;
      });
      
      const subRow = ws.getRow(r);
      subRow.values = ['', '', `Subtotal ${g.client_nama}`, g.total];
      subRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true };
        cell.fill = HEADER_FILL;
        cell.border = BORDER;
        if (colNumber === 4) cell.numFmt = '#,##0';
      });
      r += 2;
    }
    
    const grand = groups.reduce((s, g) => s + g.total, 0);
    const grandRow = ws.getRow(r);
    grandRow.values = ['', '', 'TOTAL PIUTANG', grand];
    grandRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true };
      cell.fill = TOTAL_FILL;
      cell.border = BORDER;
      if (colNumber === 4) cell.numFmt = '#,##0';
    });
    r += 2;
  }
  
  ws.mergeCells(`A${r}:D${r}`);
  const foot = ws.getCell(`A${r}`);
  foot.value = 'Dokumen ini dicetak otomatis dari aplikasi Notapedia';
  foot.font = { size: 9, italic: true, color: { argb: 'FF555555' } };
  foot.alignment = { horizontal: 'center' };
  
  return wb.xlsx.writeBuffer();
}

export function namaFileLaporanBulanan(bulan, tahun) {
  return `laporan-sj-invoice-${String(bulan).toLowerCase()}-${tahun}.xlsx`;
}

export function namaFilePiutang() {
  const t = new Date().toISOString().split('T')[0];
  return `rekap-piutang-${t}.xlsx`;
}
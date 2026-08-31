import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const WIDTH = 80;

function padR(str, length) {
  str = String(str || '');
  if (str.length > length) return str.substring(0, length);
  return str.padEnd(length, ' ');
}

function padL(str, length) {
  str = String(str || '');
  if (str.length > length) return str.substring(0, length);
  return str.padStart(length, ' ');
}

function padC(str, length) {
  str = String(str || '');
  if (str.length > length) return str.substring(0, length);
  const padLeft = Math.floor((length - str.length) / 2);
  const padRight = length - str.length - padLeft;
  return ' '.repeat(padLeft) + str + ' '.repeat(padRight);
}

function formatCurrency(num) {
  return Number(num || 0).toLocaleString('id-ID');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function hr(char = '-') {
  return char.repeat(WIDTH) + '\n';
}

function terbilang(n) {
  const angka = [
    '',
    'satu',
    'dua',
    'tiga',
    'empat',
    'lima',
    'enam',
    'tujuh',
    'delapan',
    'sembilan',
    'sepuluh',
    'sebelas',
  ];
  if (n < 12) return angka[n];
  if (n < 20) return terbilang(n - 10) + ' belas';
  if (n < 100)
    return (
      terbilang(Math.floor(n / 10)) + ' puluh' + (n % 10 ? ' ' + angka[n % 10] : '')
    );
  if (n < 200) return 'seratus' + (n - 100 ? ' ' + terbilang(n - 100) : '');
  if (n < 1000)
    return (
      terbilang(Math.floor(n / 100)) +
      ' ratus' +
      (n % 100 ? ' ' + terbilang(n % 100) : '')
    );
  if (n < 2000) return 'seribu' + (n - 1000 ? ' ' + terbilang(n - 1000) : '');
  if (n < 1000000)
    return (
      terbilang(Math.floor(n / 1000)) +
      ' ribu' +
      (n % 1000 ? ' ' + terbilang(n % 1000) : '')
    );
  if (n < 1000000000)
    return (
      terbilang(Math.floor(n / 1000000)) +
      ' juta' +
      (n % 1000000 ? ' ' + terbilang(n % 1000000) : '')
    );
  return 'Banyak sekali';
}

function generateRawSJ(sj) {
  let out = '';
  out += '\n'.repeat(2);

  // Header
  out += padC('SURAT JALAN', WIDTH) + '\n';
  out += padR('', WIDTH - 20) + padR('No. ' + sj.no_sj, 20) + '\n';
  out += padR('', WIDTH - 20) + padR(formatDate(sj.tanggal_kirim), 20) + '\n';
  out += hr('=');

  // Meta
  out += padR(`No. PO   : ${sj.no_po || '-'}`, 40) + padR(`Kepada Yth. : ${sj.client_nama || '-'}`, 40) + '\n';
  out += padR(`Pengirim : ${sj.nama_pengirim || '-'}`, 40) + '\n';
  out += hr('-');

  // No(4) | Nama Barang(36) | Sat(6) | Qty(6) | Keterangan(20)
  out += `${padR('No', 4)}| ${padR('Nama Barang', 34)}| ${padC('Sat', 6)}| ${padC('Qty', 6)}| ${padR('Keterangan', 20)}\n`;
  out += hr('-');

  sj.items.forEach((it, i) => {
    out += `${padL(i + 1, 3)} | ${padR(it.nama_barang, 34)}| ${padC(it.satuan, 6)}| ${padL(it.qty_kirim, 5)} | ${padR(it.keterangan, 20)}\n`;
  });
  out += hr('-');

  const totalRetur = sj.items.reduce((s, it) => s + it.retur.reduce((r, x) => r + x.qty_ditolak, 0), 0);
  if (totalRetur > 0) {
    out += `Catatan Retur: ${totalRetur} barang ditolak / dikembalikan.\n`;
  }

  out += '\n\n';
  out += padC('Pengirim,', 40) + padC('Penerima,', 40) + '\n';
  out += '\n'.repeat(5);
  out += padC(`( ${sj.nama_pengirim || '................'} )`, 40) + padC(`( ${sj.client_nama || '................'} )`, 40) + '\n';
  out += '\n'.repeat(3); // Feed bottom space
  return out;
}

function generateRawInvoice(inv) {
  let out = '';
  out += '\n'.repeat(2);
  out += padC('INVOICE', WIDTH) + '\n';
  out += padR('', WIDTH - 20) + padR('No. ' + inv.no_invoice, 20) + '\n';
  out += padR('', WIDTH - 20) + padR(formatDate(inv.tanggal_invoice), 20) + '\n';
  out += hr('=');

  out += padR(`No. PO   : ${inv.no_po || '-'}`, 40) + padR(`Kepada Yth. : ${inv.client_nama || '-'}`, 40) + '\n';
  out += padR(`No. SJ   : ${inv.no_sj || '-'}`, 40) + '\n';
  if (inv.rest) {
    out += padR(`Rest     : ${inv.rest}`, 40) + '\n';
  }
  out += hr('-');

  // No(4) | Nama Barang(30) | Qty(5) | Sat(5) | Harga(13) | Total(15)
  out += ` No | ${padR('Nama Barang', 28)} | ${padC('Qty', 5)} | ${padC('Sat', 5)} | ${padC('Harga Satuan', 13)} | ${padC('Total', 15)}\n`;
  out += hr('-');

  inv.items.forEach((it, i) => {
    out += `${padL(i + 1, 3)} | ${padR(it.nama_barang, 28)} | ${padL(it.qty, 5)} | ${padC(it.satuan, 5)} | ${padL(formatCurrency(it.harga_satuan), 13)} | ${padL(formatCurrency(it.subtotal), 15)}\n`;
  });
  out += hr('-');
  out += `${padR('', 59)} | GRAND TOTAL | ${padL(formatCurrency(inv.total), 15)}\n`;
  out += hr('-');

  out += `\nTerbilang: ${terbilang(inv.total)} Rupiah\n\n`;

  out += "MOHON LAKUKAN PEMBAYARAN TEPAT WAKTU UNTUK MENGHINDARI\n";
  out += "KETERLAMBATAN BARANG DAN DEMI KELANCARAN PRODUKSI BERSAMA.\n\n";

  out += padR('', 40) + padC('Hormat Kami,', 40) + '\n';
  out += '\n'.repeat(5);
  out += padR('', 40) + padC(`( Antonius Sumera )`, 40) + '\n';
  out += '\n'.repeat(3); // Feed bottom space
  return out;
}

function generateRawTT(tt) {
  let out = '';
  out += '\n'.repeat(2);
  out += padC('TANDA TERIMA', WIDTH) + '\n';
  out += padR('', WIDTH - 20) + padR('No. ' + tt.no_dokumen, 20) + '\n';
  out += padR('', WIDTH - 20) + padR(formatDate(tt.tanggal), 20) + '\n';
  out += hr('=');

  out += `Diserahkan oleh : ${tt.diserahkan_oleh}\n`;
  out += `Diterima oleh   : ${tt.diterima_oleh || '-'}\n`;
  out += hr('-');

  // No(4) | Deskripsi Dokumen(52) | Nominal(20)
  out += ` No | ${padR('Deskripsi Dokumen', 52)} | ${padC('Nominal (Rp)', 18)}\n`;
  out += hr('-');

  tt.items.forEach((it, i) => {
    out += `${padL(i + 1, 3)} | ${padR(it.deskripsi, 52)} | ${padL(formatCurrency(it.nominal), 18)}\n`;
  });
  out += hr('-');
  out += `${padR('', 57)} | ${padL(formatCurrency(tt.total), 18)}\n`;
  out += hr('-');

  out += `\nTerbilang: ${terbilang(tt.total)} Rupiah\n\n\n`;

  out += padC('Yang Menyerahkan,', 40) + padC('Yang Menerima,', 40) + '\n';
  out += '\n'.repeat(5);
  out += padC(`( ${tt.diserahkan_oleh} )`, 40) + padC(`( ${tt.diterima_oleh || '................'} )`, 40) + '\n';
  out += '\n'.repeat(3); // Feed bottom space
  return out;
}

export function generateRawDoc(type, data) {
  switch (type) {
    case 'sj':
      return generateRawSJ(data);
    case 'invoice':
      return generateRawInvoice(data);
    case 'tanda-terima':
      return generateRawTT(data);
    default:
      return '';
  }
}

export function printRawText(text, deviceName = '') {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(os.tmpdir(), `print-raw-${Date.now()}.txt`);
    try {
      fs.writeFileSync(tmpFile, text, 'utf8');
    } catch (err) {
      return reject(err);
    }

    // Gunakan PowerShell Out-Printer untuk kirim ke printer dotmatrix
    let cmd = `powershell -WindowStyle Hidden -Command "Get-Content '${tmpFile}' | Out-Printer"`;
    if (deviceName) {
      cmd = `powershell -WindowStyle Hidden -Command "Get-Content '${tmpFile}' | Out-Printer -Name '${deviceName}'"`;
    }

    exec(cmd, (error, stdout, stderr) => {
      // Hapus file temp
      try { fs.unlinkSync(tmpFile); } catch (e) {}

      if (error) {
        return reject(error);
      }
      resolve();
    });
  });
}

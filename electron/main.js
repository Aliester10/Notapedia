// Main Process (Electron) — siklus hidup aplikasi, akses file system,
// koneksi SQLite, perintah cetak, dan jembatan IPC.
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openDb, getDbPath } from './db.js';
import * as svc from './services.js';
import { printDocument, renderDoc, printReport, saveDocumentPdf, pdfFileNameFor, destroySharedWin } from './print.js';
import {
  buildLaporanBulanan, buildRekapPiutang,
  namaFileLaporanBulanan, namaFilePiutang,
} from './excel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV_URL = process.env.VITE_DEV_SERVER_URL;

const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: 'Notapedia — PO · SJ · Invoice',
    icon: path.join(__dirname, 'assets', 'notapedialogo.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (DEV_URL) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (process.platform !== 'darwin') app.quit();
  });
}

// Helper: jalankan handler dan kembalikan {ok, data} atau {ok:false, error}
// Catatan: hasil di-await penuh — nilai (termasuk Promise) harus selesai
// sebelum dikembalikan agar dapat di-serialize lewat IPC.
function ipc(channel, fn) {
  ipcMain.handle(channel, async (_ev, ...args) => {
    try {
      return { ok: true, data: await fn(...args) };
    } catch (e) {
      return { ok: false, error: e.userMessage || e.message };
    }
  });
}

function registerIpc() {
  // ── Client ──
  ipc('client:list', () => svc.listClients());
  ipc('client:create', (d) => svc.createClient(d));
  ipc('client:update', (id, d) => svc.updateClient(id, d));
  ipc('client:delete', (id) => svc.deleteClient(id));

  // ── PO ──
  ipc('po:list', () => svc.listPO());
  ipc('po:get', (id) => svc.getPO(id));
  ipc('po:create', (d) => svc.createPO(d));
  ipc('po:update', (id, d) => svc.updatePO(id, d));
  ipc('po:riwayat', (id) => svc.riwayatPO(id));

  // ── Surat Jalan ──
  ipc('sj:list', () => svc.listSJ());
  ipc('sj:get', (id) => svc.getSJ(id));
  ipc('sj:listByPO', (poId) => svc.listSJByPO(poId));
  ipc('sj:create', (d) => svc.createSJ(d));
  ipc('sj:confirm', (id, d) => svc.confirmSJ(id, d));

  // ── Invoice ──
  ipc('invoice:list', () => svc.listInvoices());
  ipc('invoice:get', (id) => svc.getInvoice(id));
  ipc('invoice:listByPO', (poId) => svc.listInvoiceByPO(poId));
  ipc('invoice:create', (d) => svc.createInvoice(d));
  ipc('invoice:updateStatus', (id, status) => svc.updateInvoiceStatus(id, status));
  ipc('invoice:siapTagih', () => svc.invoicesSiapTagih());

  // ── Tanda Terima ──
  ipc('tt:list', () => svc.listTandaTerima());
  ipc('tt:get', (id) => svc.getTandaTerima(id));
  ipc('tt:create', (d) => svc.createTandaTerima(d));

  // ── Laporan & Dashboard ──
  ipc('laporan:bulanan', (bulan, tahun) => svc.laporanBulanan(bulan, tahun));
  ipc('laporan:piutang', () => svc.rekapPiutang());
  ipc('dashboard:stats', () => svc.dashboardStats());

  // ── Backup / Restore ──
  // Handler di bawah membutuhkan event asli (untuk parent dialog),
  // sehingga didaftarkan langsung via ipcMain.handle (bukan helper `ipc`).
  ipcMain.handle('backup:now', async (ev, destDir) => {
    const win = BrowserWindow.fromWebContents(ev.sender);
    try {
      let dir = destDir;
      if (!dir) {
        const res = await dialog.showOpenDialog(win, {
          title: 'Pilih Lokasi Backup',
          properties: ['openDirectory', 'createDirectory'],
        });
        if (res.canceled || !res.filePaths.length) return { ok: true, data: null };
        dir = res.filePaths[0];
      }
      return { ok: true, data: svc.backupDb(dir) };
    } catch (e) {
      return { ok: false, error: e.userMessage || e.message };
    }
  });
  ipc('backup:list', () => svc.listBackups());
  ipc('backup:delete', (id) => svc.deleteBackup(id));
  ipcMain.handle('backup:restore', async (ev) => {
    const win = BrowserWindow.fromWebContents(ev.sender);
    try {
      const res = await dialog.showOpenDialog(win, {
        title: 'Pilih File Backup untuk Dipulihkan',
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
        properties: ['openFile'],
      });
      if (res.canceled || !res.filePaths.length) return { ok: true, data: null };
      return { ok: true, data: svc.restoreBackup(res.filePaths[0]) };
    } catch (e) {
      return { ok: false, error: e.userMessage || e.message };
    }
  });

  // ── Cetak ──
  ipc('print:document', (type, data) => printDocument(type, data));
  ipc('print:report', ({ tab, bulan, tahun }) => {
    if (tab === 'piutang') {
      return printReport('rekap-piutang', svc.rekapPiutang());
    }
    return printReport('laporan-bulanan', {
      bulan,
      tahun,
      ...svc.laporanBulanan(months.indexOf(bulan) + 1, tahun),
    });
  });

  // ── Simpan PDF (ukuran kertas dotmatrix via printToPDF) ──
  ipcMain.handle('pdf:save', async (ev, type, data) => {
    const win = BrowserWindow.fromWebContents(ev.sender);
    try {
      const pdf = await saveDocumentPdf(type, data);
      const res = await dialog.showSaveDialog(win, {
        title: 'Simpan Dokumen PDF',
        defaultPath: pdfFileNameFor(type, data),
        filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
      });
      if (res.canceled || !res.filePath) return { ok: true, data: null };
      fs.writeFileSync(res.filePath, pdf);
      return { ok: true, data: res.filePath };
    } catch (e) {
      return { ok: false, error: e.userMessage || e.message };
    }
  });

  // ── Export Excel ──
  ipcMain.handle('export:excel', async (ev, { tab, bulan, tahun }) => {
    const win = BrowserWindow.fromWebContents(ev.sender);
    try {
      let buffer;
      let defaultName;
      if (tab === 'piutang') {
        buffer = await buildRekapPiutang(svc.rekapPiutang());
        defaultName = namaFilePiutang();
      } else {
        buffer = await buildLaporanBulanan({ bulan, tahun, ...svc.laporanBulanan(months.indexOf(bulan) + 1, tahun) });
        defaultName = namaFileLaporanBulanan(bulan, tahun);
      }

      const res = await dialog.showSaveDialog(win, {
        title: 'Simpan File Excel',
        defaultPath: defaultName,
        filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
      });
      if (res.canceled || !res.filePath) return { ok: true, data: null };
      fs.writeFileSync(res.filePath, buffer);
      return { ok: true, data: res.filePath };
    } catch (e) {
      return { ok: false, error: e.userMessage || e.message };
    }
  });

  // ── Info aplikasi / database ──
  ipc('app:info', () => {
    const p = getDbPath();
    let size = 0;
    let mtime = null;
    try {
      size = fs.statSync(p).size;
      mtime = fs.statSync(p).mtime;
    } catch { /* file belum ada */ }
    return { dbPath: p, dbSize: size, dbMtime: mtime ? mtime.toISOString() : null };
  });

  ipc('app:ping', () => 'pong');
}

app.whenReady().then(() => {
  openDb();
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  destroySharedWin();
});
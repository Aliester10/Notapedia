// E2E Export Excel di runtime Electron: preload → IPC → xlsx → tulis file.
// Dialog save di-mock agar tidak menunggu interaksi user.
// Jalankan: npx electron tests/excel-electron.mjs
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notapedia-excel-e2e-'));
process.env.NOTAPEDIA_DATA_DIR = dir;

const { openDb } = await import('../electron/db.js');
const svc = await import('../electron/services.js');

const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function ipc(channel, fn) {
  ipcMain.handle(channel, async (_ev, ...args) => {
    try {
      return { ok: true, data: await fn(...args) };
    } catch (e) {
      return { ok: false, error: e.userMessage || e.message };
    }
  });
}

app.whenReady().then(async () => {
  try {
    openDb();

    const savePath = path.join(dir, 'hasil-export.xlsx');
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: savePath });

    // Register handler nyata (sama seperti main.js: ipcMain.handle langsung)
    ipcMain.handle('export:excel', async (_ev, { tab, bulan, tahun }) => {
      const { buildLaporanBulanan, buildRekapPiutang, namaFileLaporanBulanan, namaFilePiutang } =
        await import('../electron/excel.js');
      let buffer;
      let defaultName;
      if (tab === 'piutang') {
        buffer = await buildRekapPiutang(svc.rekapPiutang());
        defaultName = namaFilePiutang();
      } else {
        buffer = await buildLaporanBulanan({ bulan, tahun, ...svc.laporanBulanan(months.indexOf(bulan) + 1, tahun) });
        defaultName = namaFileLaporanBulanan(bulan, tahun);
      }
      const res = await dialog.showSaveDialog(null, {
        title: 'Simpan File Excel',
        defaultPath: defaultName,
        filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
      });
      if (res.canceled || !res.filePath) return { ok: true, data: null };
      try {
        fs.writeFileSync(res.filePath, buffer);
        return { ok: true, data: res.filePath };
      } catch (e) {
        return { ok: false, error: 'Gagal menyimpan file: ' + e.message };
      }
    });

    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '..', 'electron', 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    await new Promise((r) => setTimeout(r, 1200));

    const hasil = await win.webContents.executeJavaScript(`(async () => {
      const r = await window.notapedia.excel.export({ tab: 'bulanan', bulan: 'Agustus', tahun: '2026' });
      return r;
    })()`);

    console.log('IPC result:', JSON.stringify(hasil));
    const ok = hasil?.ok === true && typeof hasil.data === 'string' && fs.existsSync(hasil.data);
    console.log('file dibuat:', fs.existsSync(savePath), '| ukuran:', fs.statSync(savePath).size);
    console.log(ok ? 'EXCEL E2E OK' : 'EXCEL E2E FAIL');
    app.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('EXCEL E2E ERROR:', e);
    app.exit(1);
  }
});
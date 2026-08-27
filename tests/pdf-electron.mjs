// E2E Simpan PDF di runtime Electron: preload → IPC → printToPDF → tulis file.
// Dialog save di-mock agar tidak menunggu interaksi user.
// Jalankan: npx electron tests/pdf-electron.mjs
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notapedia-pdf-e2e-'));
process.env.NOTAPEDIA_DATA_DIR = dir;

const { openDb } = await import('../electron/db.js');
const svc = await import('../electron/services.js');
const { saveDocumentPdf, pdfFileNameFor } = await import('../electron/print.js');

app.whenReady().then(async () => {
  try {
    openDb();

    ipcMain.handle('sj:get', (_ev, id) => {
      try { return { ok: true, data: svc.getSJ(id) }; }
      catch (e) { return { ok: false, error: e.userMessage || e.message }; }
    });

    const savePath = path.join(dir, 'SJ-0001.pdf');
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: savePath });

    // Handler nyata (sama seperti main.js: (ev, type, data))
    ipcMain.handle('pdf:save', async (_ev, type, data) => {
      try {
        const pdf = await saveDocumentPdf(type, data);
        const res = await dialog.showSaveDialog(null, {
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

    const sj = await win.webContents.executeJavaScript(`(async () => {
      const d = await window.notapedia.sj.get(1);
      const data = d && d.ok ? d.data : null;
      const r = await window.notapedia.print.savePdf('sj', data);
      return r;
    })()`);

    console.log('IPC result:', JSON.stringify(sj));
    const ok = sj?.ok === true && typeof sj.data === 'string' && fs.existsSync(sj.data);
    if (ok) {
      const buf = fs.readFileSync(sj.data);
      const m = buf.toString('latin1').match(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/);
      const size = m ? [Math.round(Number(m[3])), Math.round(Number(m[4]))] : null;
      console.log('file dibuat:', fs.existsSync(sj.data), '| ukuran file:', fs.statSync(sj.data).size);
      console.log('MediaBox (pt):', JSON.stringify(size));
      const sizeOk = size && size[0] === 595 && size[1] === 396;
      console.log(sizeOk ? 'PDF E2E OK' : 'PDF E2E FAIL (ukuran kertas salah)');
      app.exit(sizeOk ? 0 : 1);
    } else {
      console.log('PDF E2E FAIL:', JSON.stringify(sj));
      app.exit(1);
    }
  } catch (e) {
    console.error('PDF E2E ERROR:', e);
    app.exit(1);
  }
});
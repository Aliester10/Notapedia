// Verifikasi UI termuat di Electron (dist/index.html + preload).
// Jalankan: npx electron tests/ui-smoke.mjs
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

process.env.NOTAPEDIA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'notapedia-ui-'));

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { openDb } = await import('../electron/db.js');
const svc = await import('../electron/services.js');

app.whenReady().then(async () => {
  try {
    openDb();
    ipcMain.handle('dashboard:stats', () => ({ ok: true, data: svc.dashboardStats() }));
    ipcMain.handle('client:list', () => ({ ok: true, data: svc.listClients() }));
    ipcMain.handle('app:ping', () => ({ ok: true, data: 'pong' }));
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '..', 'electron', 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    await new Promise((r) => setTimeout(r, 1500));

    const hasil = await win.webContents.executeJavaScript(`(async () => {
      const root = document.getElementById('root');
      const text = root ? root.innerText.slice(0, 500) : '';
      const api = typeof window.notapedia !== 'undefined';
      let dataOk = false;
      if (api) {
        try { const r = await window.notapedia.dashboard.stats(); dataOk = r && r.ok; } catch (e) {}
      }
      return {
        hasChildren: root ? root.children.length > 0 : false,
        apiExposed: api,
        apiWorks: dataOk,
        text,
      };
    })()`);

    console.log('hasChildren:', hasil.hasChildren);
    console.log('apiExposed:', hasil.apiExposed);
    console.log('apiWorks:', hasil.apiWorks);
    console.log('text sample:', JSON.stringify(hasil.text.slice(0, 120)));

    const ok = hasil.hasChildren && hasil.apiExposed && hasil.apiWorks && hasil.text.includes('Dashboard');
    console.log(ok ? 'UI SMOKE OK' : 'UI SMOKE FAIL');
    app.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('UI SMOKE ERROR:', e);
    app.exit(1);
  }
});
// IPC Bridge (preload) — jembatan aman antara Renderer dan Main Process.
// Renderer tidak mengakses database/printer secara langsung.
const { contextBridge, ipcRenderer } = require('electron');

const call = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

const api = {
  clients: {
    list: call('client:list'),
    create: call('client:create'),
    update: call('client:update'),
    remove: call('client:delete'),
  },
  po: {
    list: call('po:list'),
    get: call('po:get'),
    create: call('po:create'),
    update: call('po:update'),
    remove: call('po:remove'),
    riwayat: call('po:riwayat'),
  },
  sj: {
    list: call('sj:list'),
    get: call('sj:get'),
    listByPO: call('sj:listByPO'),
    create: call('sj:create'),
    update: call('sj:update'),
    remove: call('sj:remove'),
    confirm: call('sj:confirm'),
  },
  invoice: {
    list: call('invoice:list'),
    get: call('invoice:get'),
    listByPO: call('invoice:listByPO'),
    create: call('invoice:create'),
    update: call('invoice:update'),
    remove: call('invoice:remove'),
    updateStatus: call('invoice:updateStatus'),
    siapTagih: call('invoice:siapTagih'),
  },
  tt: {
    list: call('tt:list'),
    get: call('tt:get'),
    create: call('tt:create'),
    update: call('tt:update'),
    remove: call('tt:remove'),
  },
  laporan: {
    bulanan: call('laporan:bulanan'),
    piutang: call('laporan:piutang'),
  },
  dashboard: {
    stats: call('dashboard:stats'),
  },
  backup: {
    now: call('backup:now'),
    list: call('backup:list'),
    remove: call('backup:delete'),
    restore: call('backup:restore'),
  },
  print: {
    document: call('print:document'),
    report: call('print:report'),
    savePdf: call('pdf:save'),
  },
  excel: {
    export: call('export:excel'),
  },
  app: {
    info: call('app:info'),
    ping: call('app:ping'),
  },
};

contextBridge.exposeInMainWorld('notapedia', api);
// Lapisan akses data Renderer → IPC (window.notapedia).
// Saat dijalankan di browser (vite dev tanpa Electron), otomatis fallback
// ke mockData agar preview tetap berfungsi.
import {
  clients as mockClients, poList as mockPO, suratJalanList as mockSJ,
  invoiceList as mockInvoice, tandaTerimaList as mockTT,
} from './mockData';

const isElectron = typeof window !== 'undefined' && !!window.notapedia;

async function call(fn, ...args) {
  const res = await fn(...args);
  if (res && res.ok === false) {
    throw new Error(res.error || 'Terjadi kesalahan.');
  }
  return res?.data;
}

function mockMutate() {
  return Promise.resolve({ id: 0 });
}

// ── Dashboard ──
export const getDashboard = () =>
  isElectron
    ? call(window.notapedia.dashboard.stats)
    : Promise.resolve({
        poAktif: mockPO.filter((p) => p.status === 'Open').length,
        totalPO: mockPO.length,
        sjBulanIni: mockSJ.length,
        totalInvoiceBulanIni: mockInvoice.reduce((s, i) => s + i.total, 0),
        piutang: mockInvoice.filter((i) => i.status !== 'Dibayar').reduce((s, i) => s + i.total, 0),
        piutangCount: mockInvoice.filter((i) => i.status !== 'Dibayar').length,
        recentPO: mockPO.slice(-3).reverse(),
        recentSJ: mockSJ.slice(-3).reverse(),
        unpaid: mockInvoice.filter((i) => i.status !== 'Dibayar'),
      });

// ── Client ──
export const listClients = () => (isElectron ? call(window.notapedia.clients.list) : Promise.resolve(mockClients));
export const createClient = (d) => (isElectron ? call(window.notapedia.clients.create, d) : mockMutate());
export const updateClient = (id, d) => (isElectron ? call(window.notapedia.clients.update, id, d) : mockMutate());
export const deleteClient = (id) => (isElectron ? call(window.notapedia.clients.remove, id) : mockMutate());

// ── PO ──
export const listPO = () => (isElectron ? call(window.notapedia.po.list) : Promise.resolve(mockPO));
export const getPO = (id) =>
  isElectron ? call(window.notapedia.po.get, id) : Promise.resolve(mockPO.find((p) => p.id === Number(id)));
export const createPO = (d) => (isElectron ? call(window.notapedia.po.create, d) : mockMutate());
export const updatePO = (id, d) => (isElectron ? call(window.notapedia.po.update, id, d) : mockMutate());
export const getRiwayatPO = (id) =>
  isElectron
    ? call(window.notapedia.po.riwayat, id)
    : Promise.resolve({
        ...mockPO.find((p) => p.id === Number(id)),
        suratJalan: mockSJ.filter((sj) => sj.po_id === Number(id)),
        invoices: mockInvoice.filter((i) => i.po_id === Number(id)),
      });

// ── Surat Jalan ──
export const listSJ = () => (isElectron ? call(window.notapedia.sj.list) : Promise.resolve(mockSJ));
export const listSJByPO = (poId) =>
  isElectron ? call(window.notapedia.sj.listByPO, poId) : Promise.resolve(mockSJ.filter((sj) => sj.po_id === Number(poId)));
export const getSJ = (id) =>
  isElectron ? call(window.notapedia.sj.get, id) : Promise.resolve(mockSJ.find((s) => s.id === Number(id)));
export const createSJ = (d) => (isElectron ? call(window.notapedia.sj.create, d) : mockMutate());
export const confirmSJ = (id, d) =>
  isElectron ? call(window.notapedia.sj.confirm, id, d) : Promise.resolve(mockSJ.find((s) => s.id === Number(id)));

// ── Invoice ──
export const listInvoices = () => (isElectron ? call(window.notapedia.invoice.list) : Promise.resolve(mockInvoice));
export const getInvoice = (id) =>
  isElectron ? call(window.notapedia.invoice.get, id) : Promise.resolve(mockInvoice.find((i) => i.id === Number(id)));
export const createInvoice = (d) => (isElectron ? call(window.notapedia.invoice.create, d) : mockMutate());
export const updateInvoiceStatus = (id, status) =>
  isElectron ? call(window.notapedia.invoice.updateStatus, id, status) : mockMutate();
export const listInvoicesSiapTagih = () =>
  isElectron
    ? call(window.notapedia.invoice.siapTagih)
    : Promise.resolve(mockInvoice.filter((i) => i.status === 'Terkirim' || i.status === 'Ditagih'));

// ── Tanda Terima ──
export const listTandaTerima = () => (isElectron ? call(window.notapedia.tt.list) : Promise.resolve(mockTT));
export const createTandaTerima = (d) => (isElectron ? call(window.notapedia.tt.create, d) : mockMutate());

// ── Laporan ──
export const getLaporanBulanan = (bulan, tahun) =>
  isElectron
    ? call(window.notapedia.laporan.bulanan, bulan, tahun)
    : Promise.resolve({
        po: mockPO,
        sj: mockSJ,
        invoices: mockInvoice,
        totalInvoice: mockInvoice.reduce((s, i) => s + i.total, 0),
      });
export const getRekapPiutang = () =>
  isElectron
    ? call(window.notapedia.laporan.piutang)
    : Promise.resolve(
        [...new Set(mockInvoice.filter((i) => i.status !== 'Dibayar').map((i) => i.client_nama))].map((nama) => ({
          client_nama: nama,
          total: mockInvoice.filter((i) => i.client_nama === nama && i.status !== 'Dibayar').reduce((s, i) => s + i.total, 0),
          invoices: mockInvoice.filter((i) => i.client_nama === nama && i.status !== 'Dibayar'),
        }))
      );

// ── Backup ──
export const backupNow = (dir) =>
  isElectron ? call(window.notapedia.backup.now, dir) : mockMutate();
export const listBackups = () =>
  isElectron
    ? call(window.notapedia.backup.list)
    : Promise.resolve([
        { id: 1, tanggal: '2026-08-20', lokasi: 'D:\\Backup\\Notapedia\\backup-2026-08-20.db', ukuran: 1153433 },
        { id: 2, tanggal: '2026-08-27', lokasi: 'D:\\Backup\\Notapedia\\backup-2026-08-27.db', ukuran: 1258291 },
      ]);
export const deleteBackup = (id) => (isElectron ? call(window.notapedia.backup.remove, id) : mockMutate());
export const restoreBackup = () => (isElectron ? call(window.notapedia.backup.restore) : mockMutate());

// ── Cetak ──
export const printDocument = (type, data) =>
  isElectron ? call(window.notapedia.print.document, type, data) : Promise.resolve({ ok: true });

export const printReport = ({ tab, bulan, tahun }) =>
  isElectron
    ? call(window.notapedia.print.report, { tab, bulan, tahun })
    : Promise.resolve({ ok: true });

export const saveDocumentPdf = (type, data) =>
  isElectron ? call(window.notapedia.print.savePdf, type, data) : Promise.resolve(null);

// ── Export Excel ──
export const exportExcel = ({ tab, bulan, tahun }) =>
  isElectron
    ? call(window.notapedia.excel.export, { tab, bulan, tahun })
    : Promise.resolve({ path: null });

// ── Info aplikasi ──
export const getAppInfo = () =>
  isElectron
    ? call(window.notapedia.app.info)
    : Promise.resolve({
        dbPath: 'C:\\Users\\<user>\\AppData\\Roaming\\Notapedia\\notapedia.db',
        dbSize: 1258291,
        dbMtime: '2026-08-27T14:32:00.000Z',
      });

export { isElectron };
import { useEffect, useState } from 'react';
import {
  Printer, FileSpreadsheet, Database, Wallet, Truck, HardDriveDownload, Trash2, RotateCcw,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import {
  getLaporanBulanan, getRekapPiutang,
  backupNow, listBackups, deleteBackup, restoreBackup, getAppInfo, exportExcel, printReport,
} from '../data/api';
import Modal from '../components/Modal';
import cingcuLogo from '../assets/cingculogo.png';
import { formatDate, formatRupiah } from '../data/mockData';

const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const fmtBytes = (b) => {
  if (!b) return '-';
  const mb = b / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
};

export default function Laporan() {
  const [tab, setTab] = useState('bulanan');
  const [bulan, setBulan] = useState(months[new Date().getMonth()]);
  const [tahun, setTahun] = useState(String(new Date().getFullYear()));

  const [dataBulanan, setDataBulanan] = useState(null);
  const [piutang, setPiutang] = useState([]);
  const [backups, setBackups] = useState([]);
  const [appInfo, setAppInfo] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const muatBulanan = () => {
    getLaporanBulanan(months.indexOf(bulan) + 1, tahun).then(setDataBulanan).catch((e) => setError(e.message));
  };
  const muatPiutang = () => {
    getRekapPiutang().then(setPiutang).catch((e) => setError(e.message));
  };
  const muatBackup = () => {
    listBackups().then(setBackups).catch((e) => setError(e.message));
    getAppInfo().then(setAppInfo).catch(console.error);
  };

  useEffect(() => {
    setError('');
    setMessage('');
    if (tab === 'bulanan') muatBulanan();
    else if (tab === 'piutang') muatPiutang();
    else muatBackup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, bulan, tahun]);

  const doBackup = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const hasil = await backupNow(undefined);
      if (hasil && hasil.id) {
        setMessage(`Backup berhasil disimpan di: ${hasil.lokasi}`);
      }
      muatBackup();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const hasil = await restoreBackup();
      if (hasil && hasil.ok) {
        setMessage('Database berhasil dipulihkan dari backup.');
      }
      muatBackup();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doDeleteBackup = async (id) => {
    if (!window.confirm('Hapus file backup ini?')) return;
    try {
      await deleteBackup(id);
      muatBackup();
    } catch (e) {
      setError(e.message);
    }
  };

  const doExport = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const path = await exportExcel({
        tab,
        bulan,
        tahun: tab === 'bulanan' ? tahun : undefined,
      });
      if (path) setMessage(`File Excel berhasil disimpan di: ${path}`);
      else setMessage('Export dibatalkan — tidak ada file yang disimpan.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doCetak = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await printReport({ tab, bulan, tahun: tab === 'bulanan' ? tahun : undefined });
      setShowPreview(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Laporan"
        subtitle="Rekap bulanan, piutang per client, dan utilitas database."
        actions={
          <button className="btn-secondary" onClick={doExport} disabled={busy}>
            <FileSpreadsheet className="h-4 w-4" /> {busy ? 'Mengekspor...' : 'Export Excel'}
          </button>
        }
      />

      {(error || message) && (
        <div className={`card mb-5 p-4 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      )}

      <div className="border-b border-slate-200 mb-5">
        <nav className="flex gap-1">
          {[
            { key: 'bulanan', label: 'Laporan Bulanan', icon: Truck },
            { key: 'piutang', label: 'Rekap Piutang', icon: Wallet },
            { key: 'backup', label: 'Backup Database', icon: Database },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition',
                tab === t.key
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800',
              ].join(' ')}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'bulanan' && (
        <div>
          <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
            <div>
              <label className="label">Bulan</label>
              <select className="input" value={bulan} onChange={(e) => setBulan(e.target.value)}>
                {months.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tahun</label>
              <select className="input" value={tahun} onChange={(e) => setTahun(e.target.value)}>
                {[String(new Date().getFullYear()), String(new Date().getFullYear() - 1)].map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="self-end ml-auto">
              <button className="btn-secondary" onClick={() => setShowPreview(true)} disabled={busy}>
                <Printer className="h-4 w-4" /> Cetak / PDF
              </button>
            </div>
          </div>

          <div className="card p-5 mb-6">
            <h3 className="font-semibold text-slate-900 mb-3">Daftar Surat Jalan</h3>
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="text-left py-2 font-medium">No SJ</th>
                  <th className="text-left py-2 font-medium">Tanggal</th>
                  <th className="text-left py-2 font-medium">No PO</th>
                  <th className="text-left py-2 font-medium">Client</th>
                  <th className="text-left py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(dataBulanan?.sj ?? []).map((sj) => (
                  <tr key={sj.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 font-medium text-slate-800">{sj.no_sj}</td>
                    <td className="py-3 text-slate-600">{formatDate(sj.tanggal_kirim)}</td>
                    <td className="py-3 text-slate-600">{sj.no_po}</td>
                    <td className="py-3 text-slate-600">{sj.client_nama}</td>
                    <td className="py-3"><StatusBadge status={sj.status} /></td>
                  </tr>
                ))}
                {!dataBulanan?.sj?.length && (
                  <tr><td colSpan={5} className="py-4 text-center text-sm text-slate-500">Tidak ada Surat Jalan pada periode ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Daftar Invoice</h3>
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="text-left py-2 font-medium">No Invoice</th>
                  <th className="text-left py-2 font-medium">Tanggal</th>
                  <th className="text-left py-2 font-medium">Client</th>
                  <th className="text-right py-2 font-medium">Total</th>
                  <th className="text-left py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(dataBulanan?.invoices ?? []).map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 font-medium text-slate-800">{inv.no_invoice}</td>
                    <td className="py-3 text-slate-600">{formatDate(inv.tanggal_invoice)}</td>
                    <td className="py-3 text-slate-600">{inv.client_nama}</td>
                    <td className="py-3 text-right font-semibold text-slate-800">{formatRupiah(inv.total)}</td>
                    <td className="py-3"><StatusBadge status={inv.status} /></td>
                  </tr>
                ))}
                {!dataBulanan?.invoices?.length && (
                  <tr><td colSpan={5} className="py-4 text-center text-sm text-slate-500">Tidak ada Invoice pada periode ini.</td></tr>
                )}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-right font-semibold text-slate-700">Total Bulan Ini</td>
                  <td className="px-3 py-3 text-right font-bold text-brand-700">
                    {formatRupiah(dataBulanan?.totalInvoice ?? 0)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {tab === 'piutang' && (
        <div>
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-1">Rekap Piutang per Client</h3>
            <p className="text-sm text-slate-500 mb-4">Invoice berstatus <strong>Terkirim</strong> atau <strong>Ditagih</strong> yang belum dibayar, dikelompokkan per client.</p>

            {piutang.length === 0 && (
              <div className="text-sm text-slate-500 text-center py-6">Tidak ada piutang. Semua invoice sudah dibayar.</div>
            )}

            {piutang.map((g) => (
              <div key={g.client_id} className="mb-5 last:mb-0 overflow-hidden rounded-lg border border-slate-200">
                <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">{g.client_nama}</div>
                    <div className="text-xs text-slate-500">{g.no_telp}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Total Piutang</div>
                    <div className="text-lg font-bold text-red-600">{formatRupiah(g.total)}</div>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">No Invoice</th>
                      <th className="text-left px-4 py-2 font-medium">Tanggal</th>
                      <th className="text-left px-4 py-2 font-medium">Status</th>
                      <th className="text-right px-4 py-2 font-medium">Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.invoices.map((inv) => (
                      <tr key={inv.id} className="border-t border-slate-200">
                        <td className="px-4 py-2 font-medium text-slate-800">{inv.no_invoice}</td>
                        <td className="px-4 py-2 text-slate-600">{formatDate(inv.tanggal_invoice)}</td>
                        <td className="px-4 py-2"><StatusBadge status={inv.status} /></td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-800">{formatRupiah(inv.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'backup' && (
        <div className="card p-5 max-w-2xl">
          <h3 className="font-semibold text-slate-900 mb-1">Backup Database</h3>
          <p className="text-sm text-slate-500 mb-5">
            Seluruh data tersimpan dalam satu file SQLite lokal di komputer Anda. Untuk backup,
            cukup salin file database ke lokasi lain (mis. flashdisk atau folder bersama).
          </p>

          <div className="rounded-lg bg-slate-50 p-4 mb-5">
            <div className="text-xs text-slate-500">Lokasi file database saat ini:</div>
            <div className="mt-1 font-mono text-sm text-slate-800 break-all">
              {appInfo?.dbPath ?? 'Memuat...'}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Ukuran: {fmtBytes(appInfo?.dbSize)} · Terakhir diubah: {appInfo?.dbMtime ? formatTanggal(appInfo.dbMtime) : '-'}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={doBackup} disabled={busy}>
              <HardDriveDownload className="h-4 w-4" /> {busy ? 'Memproses...' : 'Backup Sekarang'}
            </button>
            <button className="btn-secondary" onClick={doRestore} disabled={busy}>
              <RotateCcw className="h-4 w-4" /> Restore dari Backup
            </button>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Riwayat Backup</h4>
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="text-left py-2 font-medium">Tanggal</th>
                  <th className="text-left py-2 font-medium">Lokasi</th>
                  <th className="text-right py-2 font-medium">Ukuran</th>
                  <th className="text-right py-2 font-medium w-20">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 text-slate-700">{formatDate(b.tanggal)}</td>
                    <td className="py-3 text-slate-600 break-all">{b.lokasi}</td>
                    <td className="py-3 text-right text-slate-600">{fmtBytes(b.ukuran)}</td>
                    <td className="py-3 text-right">
                      <button className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline" onClick={() => doDeleteBackup(b.id)}>
                        <Trash2 className="h-3 w-3" /> Hapus
                      </button>
                    </td>
                  </tr>
                ))}
                {backups.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-sm text-slate-500">Belum ada riwayat backup.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Pratinjau Cetak Laporan" wide>
        <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-800">
          <div className="flex items-start justify-between">
            <img src={cingcuLogo} alt="logo toko" className="h-9 w-auto" />
            <div className="text-right text-[11px] text-slate-500">
              Dicetak: {new Date().toLocaleString('id-ID')}
            </div>
          </div>
          <div className="mt-2 border-b-2 border-slate-800" />
          <div className="mt-4 text-center">
            <div className="text-base font-bold">
              {tab === 'piutang' ? 'REKAP PIUTANG PER CLIENT' : 'LAPORAN BULANAN — SURAT JALAN & INVOICE'}
            </div>
            <div className="mt-0.5 text-xs text-slate-600">
              {tab === 'piutang' ? 'Belum dibayar (Terkirim / Ditagih)' : `Periode: ${bulan} ${tahun}`}
            </div>
          </div>

          {tab !== 'piutang' && (
            <div className="mt-4">
              <div className="text-xs font-semibold mb-1">1. Daftar Surat Jalan</div>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-500 px-1.5 py-1 text-left">No</th>
                    <th className="border border-slate-500 px-1.5 py-1 text-left">No SJ</th>
                    <th className="border border-slate-500 px-1.5 py-1 text-left">Tanggal</th>
                    <th className="border border-slate-500 px-1.5 py-1 text-left">No PO</th>
                    <th className="border border-slate-500 px-1.5 py-1 text-left">Client</th>
                    <th className="border border-slate-500 px-1.5 py-1 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(dataBulanan?.sj ?? []).map((sj, i) => (
                    <tr key={sj.id}>
                      <td className="border border-slate-500 px-1.5 py-1">{i + 1}</td>
                      <td className="border border-slate-500 px-1.5 py-1">{sj.no_sj}</td>
                      <td className="border border-slate-500 px-1.5 py-1">{formatDate(sj.tanggal_kirim)}</td>
                      <td className="border border-slate-500 px-1.5 py-1">{sj.no_po}</td>
                      <td className="border border-slate-500 px-1.5 py-1">{sj.client_nama}</td>
                      <td className="border border-slate-500 px-1.5 py-1">{sj.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-xs font-semibold mb-1 mt-4">2. Daftar Invoice</div>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-500 px-1.5 py-1 text-left">No</th>
                    <th className="border border-slate-500 px-1.5 py-1 text-left">No Invoice</th>
                    <th className="border border-slate-500 px-1.5 py-1 text-left">Tanggal</th>
                    <th className="border border-slate-500 px-1.5 py-1 text-left">Client</th>
                    <th className="border border-slate-500 px-1.5 py-1 text-right">Total</th>
                    <th className="border border-slate-500 px-1.5 py-1 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(dataBulanan?.invoices ?? []).map((inv, i) => (
                    <tr key={inv.id}>
                      <td className="border border-slate-500 px-1.5 py-1">{i + 1}</td>
                      <td className="border border-slate-500 px-1.5 py-1">{inv.no_invoice}</td>
                      <td className="border border-slate-500 px-1.5 py-1">{formatDate(inv.tanggal_invoice)}</td>
                      <td className="border border-slate-500 px-1.5 py-1">{inv.client_nama}</td>
                      <td className="border border-slate-500 px-1.5 py-1 text-right font-semibold">{formatRupiah(inv.total)}</td>
                      <td className="border border-slate-500 px-1.5 py-1">{inv.status}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-semibold">
                    <td colSpan={4} className="border border-slate-500 px-1.5 py-1 text-right">TOTAL BULAN INI</td>
                    <td className="border border-slate-500 px-1.5 py-1 text-right">{formatRupiah(dataBulanan?.totalInvoice ?? 0)}</td>
                    <td className="border border-slate-500 px-1.5 py-1"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {tab === 'piutang' && (
            <div className="mt-4 space-y-4">
              {piutang.map((g) => (
                <div key={g.client_id}>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-500 px-1.5 py-1 text-left" colSpan={4}>Client: {g.client_nama}</th>
                      </tr>
                      <tr>
                        <th className="border border-slate-500 px-1.5 py-1 text-left">No Invoice</th>
                        <th className="border border-slate-500 px-1.5 py-1 text-left">Tanggal</th>
                        <th className="border border-slate-500 px-1.5 py-1 text-left">Status</th>
                        <th className="border border-slate-500 px-1.5 py-1 text-right">Nilai</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className="border border-slate-500 px-1.5 py-1">{inv.no_invoice}</td>
                          <td className="border border-slate-500 px-1.5 py-1">{formatDate(inv.tanggal_invoice)}</td>
                          <td className="border border-slate-500 px-1.5 py-1">{inv.status}</td>
                          <td className="border border-slate-500 px-1.5 py-1 text-right">{formatRupiah(inv.total)}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-semibold">
                        <td colSpan={3} className="border border-slate-500 px-1.5 py-1 text-right">Subtotal {g.client_nama}</td>
                        <td className="border border-slate-500 px-1.5 py-1 text-right">{formatRupiah(g.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
              {piutang.length > 0 && (
                <table className="w-full border-collapse text-xs">
                  <tbody>
                    <tr className="bg-slate-200 font-bold">
                      <td className="border border-slate-500 px-1.5 py-1 text-right" colSpan={3}>TOTAL PIUTANG</td>
                      <td className="border border-slate-500 px-1.5 py-1 text-right">
                        {formatRupiah(piutang.reduce((s, g) => s + g.total, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          )}

          <div className="mt-4 text-center text-[11px] text-slate-500">
            Dokumen ini dicetak otomatis dari aplikasi Notapedia
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setShowPreview(false)}>Tutup</button>
          <button className="btn-primary" onClick={doCetak} disabled={busy}>
            <Printer className="h-4 w-4" /> {busy ? 'Mencetak...' : 'Cetak / Simpan PDF'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function formatTanggal(iso) {
  try {
    return new Date(iso).toLocaleString('id-ID');
  } catch {
    return '-';
  }
}
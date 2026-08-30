import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Printer, FileSpreadsheet, Database, Wallet, Truck, HardDriveDownload, Trash2, RotateCcw, Search, Eye
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
            <h3 className="font-semibold text-slate-900 mb-3">LAPORAN</h3>
            <div className="table-wrap">
              <table className="w-full text-sm">
                 <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                  <tr className="divide-x divide-slate-200">
                    <th className="text-center px-4 py-3 font-medium">No PO</th>
                    <th className="text-center px-4 py-3 font-medium">Tanggal PO</th>
                    <th className="text-center px-4 py-3 font-medium">No SJ</th>
                    <th className="text-center px-4 py-3 font-medium">Tanggal SJ</th>
                    <th className="text-center px-4 py-3 font-medium">No Invoice</th>
                    <th className="text-center px-4 py-3 font-medium">Tgl Invoice</th>
                    <th className="text-center px-4 py-3 font-medium">Jumlah</th>
                    <th className="text-center px-4 py-3 font-medium w-16">Aksi</th>
                  </tr>
              </thead>
              <tbody>
                {(dataBulanan?.sj ?? []).map((sj) => (
                  <tr key={sj.id} className="divide-x divide-slate-100 border-b border-slate-100 last:border-0">
                    <td className="py-3 px-4 text-left text-slate-600">{sj.no_po}</td>
                    <td className="py-3 px-4 text-center text-slate-600">{formatDate(sj.tanggal_po)}</td>
                    <td className="py-3 px-4 font-medium text-center text-slate-800">{sj.no_sj}</td>
                    <td className="py-3 px-4 text-center text-slate-600">{formatDate(sj.tanggal_kirim)}</td>
                    <td className="py-3 px-4 text-center text-slate-600">{sj.no_invoice || '-'}</td>
                    <td className="py-3 px-4 text-center text-slate-600">{sj.tanggal_invoice ? formatDate(sj.tanggal_invoice) : '-'}</td>
                    <td className="py-3 px-4 text-right text-slate-800">
                      {sj.jumlah_invoice ? formatRupiah(sj.jumlah_invoice) : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center">
                        <Link to={`/surat-jalan/${sj.id}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-brand-600" title="Detail SJ">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {!dataBulanan?.sj?.length && (
                  <tr><td colSpan={8} className="py-4 text-center text-sm text-slate-500">Tidak ada Surat Jalan pada periode ini.</td></tr>
                )}
              </tbody>
            </table>
            </div>
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
            <div className="table-wrap">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                  <tr className="divide-x divide-slate-200">
                    <th className="text-center px-4 py-3 font-medium">Tanggal</th>
                    <th className="text-center px-4 py-3 font-medium">Lokasi</th>
                    <th className="text-center px-4 py-3 font-medium w-24">Ukuran</th>
                    <th className="text-center px-4 py-3 font-medium w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.id} className="divide-x divide-slate-100 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 text-center text-slate-700 whitespace-nowrap">{formatDate(b.tanggal)}</td>
                      <td className="px-4 py-3 text-slate-600 break-all text-xs font-mono">{b.lokasi}</td>
                      <td className="px-4 py-3 text-center text-slate-600 whitespace-nowrap">{fmtBytes(b.ukuran)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 mx-auto"
                          onClick={() => doDeleteBackup(b.id)}
                          title="Hapus Backup"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {backups.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-sm text-slate-500">Belum ada riwayat backup.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Pratinjau Cetak Laporan" wide>
        <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-800">
          <div className="flex items-start justify-between">
            <img src={cingcuLogo} alt="logo toko" className="h-[72px] w-auto" />
            <div className="text-right text-[11px] text-slate-500">
              Dicetak: {new Date().toLocaleString('id-ID')}
            </div>
          </div>
          <div className="mt-2 border-b-2 border-slate-800" />
          <div className="mt-4 text-center">
            <div className="text-base font-bold">LAPORAN BULANAN</div>
            <div className="mt-0.5 text-xs text-slate-600">Periode: {bulan} {tahun}</div>
          </div>

          <div className="mt-4">
              <div className="text-xs font-semibold mb-1">LAPORAN</div>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-800 px-1.5 py-1 text-center">No</th>
                    <th className="border border-slate-800 px-1.5 py-1 text-center">No PO</th>
                    <th className="border border-slate-800 px-1.5 py-1 text-center">Tanggal PO</th>
                    <th className="border border-slate-800 px-1.5 py-1 text-center">No SJ</th>
                    <th className="border border-slate-800 px-1.5 py-1 text-center">Tanggal SJ</th>
                    <th className="border border-slate-800 px-1.5 py-1 text-center">No Invoice</th>
                    <th className="border border-slate-800 px-1.5 py-1 text-center">Tgl Invoice</th>
                    <th className="border border-slate-800 px-1.5 py-1 text-center">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {(dataBulanan?.sj ?? []).map((sj, i) => (
                    <tr key={sj.id}>
                      <td className="border border-slate-800 px-1.5 py-1 text-center">{i + 1}</td>
                      <td className="border border-slate-800 px-1.5 py-1 text-left">{sj.no_po}</td>
                      <td className="border border-slate-800 px-1.5 py-1 text-center">{formatDate(sj.tanggal_po)}</td>
                      <td className="border border-slate-800 px-1.5 py-1 text-center">{sj.no_sj}</td>
                      <td className="border border-slate-800 px-1.5 py-1 text-center">{formatDate(sj.tanggal_kirim)}</td>
                      <td className="border border-slate-800 px-1.5 py-1 text-center">{sj.no_invoice || '-'}</td>
                      <td className="border border-slate-800 px-1.5 py-1 text-center">{sj.tanggal_invoice ? formatDate(sj.tanggal_invoice) : '-'}</td>
                      <td className="border border-slate-800 px-1.5 py-1 text-right">
                        {sj.jumlah_invoice ? formatRupiah(sj.jumlah_invoice) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100">
                    <td colSpan={7} className="border border-slate-800 px-1.5 py-1 text-right font-bold">TOTAL BULAN INI</td>
                    <td className="border border-slate-800 px-1.5 py-1 text-right font-bold">
                      {formatRupiah(dataBulanan?.totalInvoice ?? 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>


          </div>


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
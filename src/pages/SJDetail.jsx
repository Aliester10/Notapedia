import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Printer, CheckCircle2, AlertOctagon } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { SJPrint } from '../components/PrintLayout';
import { getSJ, confirmSJ, printDocument, saveDocumentPdf } from '../data/api';
import { formatDate, formatNumber } from '../data/mockData';

export default function SJDetail() {
  const { id } = useParams();
  const [sj, setSj] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [penerimaan, setPenerimaan] = useState({});
  const [alasan, setAlasan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pdfInfo, setPdfInfo] = useState('');

  const muat = () => {
    getSJ(id).then((d) => {
      if (!d) setNotFound(true);
      else setSj(d);
    }).catch(console.error);
  };

  useEffect(muat, [id]);

  if (notFound) {
    return <div className="card p-6">Surat Jalan tidak ditemukan.</div>;
  }
  if (!sj) {
    return <div className="card p-6 text-sm text-slate-500">Memuat data...</div>;
  }

  const initPenerimaan = () => {
    const awal = {};
    sj.items.forEach((it) => {
      awal[it.id] = { diterima: it.qty_kirim, ditolak: '' };
    });
    setPenerimaan(awal);
    setAlasan('');
  };

  const bukaKonfirmasi = () => {
    initPenerimaan();
    setError('');
    setShowConfirm(true);
  };

  const updatePenerimaan = (itemId, field, value) =>
    setPenerimaan((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));

  const totalDitolak = Object.values(penerimaan).reduce(
    (s, v) => s + (Number(v?.ditolak) || 0),
    0
  );

  const simpanKonfirmasi = async () => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        items: sj.items.map((it) => ({
          sj_item_id: it.id,
          qty_diterima: Number(penerimaan[it.id]?.diterima) || 0,
          qty_ditolak: Number(penerimaan[it.id]?.ditolak) || 0,
        })),
        alasan,
      };
      const updated = await confirmSJ(Number(id), payload);
      setSj(updated);
      setShowConfirm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cetak = () => printDocument('sj', sj).catch((e) => alert(e.message));

  const simpanPdf = async () => {
    setPdfInfo('');
    try {
      const path = await saveDocumentPdf('sj', sj);
      setPdfInfo(path ? `PDF tersimpan: ${path}` : 'Penyimpanan dibatalkan.');
    } catch (e) {
      setPdfInfo(e.message);
    }
  };

  const totalRetur = sj.items.reduce(
    (s, it) => s + it.retur.reduce((r, x) => r + x.qty_ditolak, 0),
    0
  );

  return (
    <div>
      <Link to="/surat-jalan" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3">
        <ChevronLeft className="h-4 w-4" /> Kembali ke daftar Surat Jalan
      </Link>

      <PageHeader
        title={sj.no_sj}
        subtitle={`Referensi PO: ${sj.no_po} · ${sj.client_nama}`}
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setShowPrint(true)}>
              <Printer className="h-4 w-4" /> Cetak
            </button>
            {sj.status === 'Terkirim' && (
              <button className="btn-primary" onClick={bukaKonfirmasi}>
                <CheckCircle2 className="h-4 w-4" /> Konfirmasi Penerimaan
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Detail Barang yang Dikirim</h3>
            <StatusBadge status={sj.status} />
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr className="divide-x divide-slate-200">
                  <th className="px-4 py-3 text-center font-medium">Nama Barang</th>
                  <th className="px-4 py-3 text-center font-medium w-32">Qty Kirim</th>
                  <th className="px-4 py-3 text-center font-medium w-36">Qty diterima client</th>
                  <th className="px-4 py-3 text-center font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {sj.items.map((it) => (
                  <tr key={it.id} className="divide-x divide-slate-100 border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-800">{it.nama_barang}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatNumber(it.qty_kirim)}</td>
                  <td className="px-4 py-3 text-right">
                    {it.qty_diterima > 0 ? (
                      <span className="font-medium text-emerald-700">{formatNumber(it.qty_diterima)}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-left text-slate-600">
                    {it.keterangan || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>

          {sj.items.some((it) => it.retur.length > 0) && (
            <div className="mt-5">
              <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 text-amber-600" /> Retur / Penolakan
              </h4>
              <div className="space-y-2">
                {sj.items.map((it) =>
                  it.retur.map((r) => (
                    <div key={r.id} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm">
                      <div className="font-medium text-amber-900">
                        {it.nama_barang} — {formatNumber(r.qty_ditolak)} ditolak
                      </div>
                      <div className="text-amber-700 text-xs mt-0.5">{r.alasan} · {formatDate(r.tanggal)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card p-5 h-fit">
          <h3 className="font-semibold text-slate-900 mb-3">Info Pengiriman</h3>
          <dl className="text-sm space-y-2.5">
            <div className="flex justify-between">
              <dt className="text-slate-500">Tanggal Kirim</dt>
              <dd className="font-medium text-slate-800">{formatDate(sj.tanggal_kirim)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Pengirim</dt>
              <dd className="font-medium text-slate-800">{sj.nama_pengirim}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Status</dt>
              <dd><StatusBadge status={sj.status} /></dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Total Retur</dt>
              <dd className={totalRetur > 0 ? 'font-medium text-red-600' : 'font-medium text-slate-800'}>
                {formatNumber(totalRetur)}
              </dd>
            </div>
            {sj.catatan && (
              <div>
                <dt className="text-slate-500">Catatan</dt>
                <dd className="text-slate-700 mt-1">{sj.catatan}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title={`Konfirmasi Penerimaan — ${sj.no_sj}`} wide>
        <p className="text-sm text-slate-600 mb-4">
          Tandai barang yang benar-benar diterima. Qty yang ditolak akan otomatis dikembalikan ke
          sisa qty PO.
        </p>
        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr className="divide-x divide-slate-200">
                <th className="text-left px-3 py-2 font-medium">Nama Barang</th>
                <th className="text-right px-3 py-2 font-medium w-24">Qty Kirim</th>
                <th className="text-right px-3 py-2 font-medium w-28">Qty diterima client</th>
                <th className="text-right px-3 py-2 font-medium w-28">Qty Ditolak</th>
              </tr>
            </thead>
            <tbody>
              {sj.items.map((it) => {
                const v = penerimaan[it.id] ?? { diterima: '', ditolak: '' };
                return (
                  <tr key={it.id} className="divide-x divide-slate-100 border-t border-slate-200">
                    <td className="px-3 py-2 font-medium text-slate-800">{it.nama_barang}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{formatNumber(it.qty_kirim)}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="input text-right"
                        min={0}
                        max={it.qty_kirim}
                        placeholder="0"
                        value={v.diterima}
                        onChange={(e) => updatePenerimaan(it.id, 'diterima', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="input text-right"
                        min={0}
                        max={it.qty_kirim}
                        placeholder="0"
                        value={v.ditolak}
                        onChange={(e) => updatePenerimaan(it.id, 'ditolak', e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <label className="label">Alasan Penolakan (wajib jika ada qty ditolak)</label>
          <input
            type="text"
            className="input"
            placeholder="cth: Barang bengkok sebagian / rusak saat tiba"
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
          />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Total ditolak: <strong className="text-red-600">{formatNumber(totalDitolak)}</strong>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setShowConfirm(false)}>Batal</button>
            <button
              className="btn-primary"
              onClick={simpanKonfirmasi}
              disabled={loading || (totalDitolak > 0 && !alasan.trim())}
            >
              <CheckCircle2 className="h-4 w-4" /> {loading ? 'Menyimpan...' : 'Simpan Konfirmasi'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showPrint} onClose={() => setShowPrint(false)} title={`Cetak — ${sj.no_sj}`} wide>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <SJPrint sj={sj} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {pdfInfo && (
              <span className={pdfInfo.startsWith('PDF tersimpan') ? 'text-emerald-700' : 'text-red-600'}>{pdfInfo}</span>
            )}
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={simpanPdf}>
              <Printer className="h-4 w-4" /> Simpan PDF
            </button>
            <button className="btn-primary" onClick={cetak}>
              <Printer className="h-4 w-4" /> Cetak Dokumen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
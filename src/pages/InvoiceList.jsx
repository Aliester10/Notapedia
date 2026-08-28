import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Printer, ArrowRight, RefreshCw } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { InvoicePrint } from '../components/PrintLayout';
import { listInvoices, getInvoice, updateInvoiceStatus, printDocument, saveDocumentPdf } from '../data/api';
import { formatDate, formatRupiah } from '../data/mockData';

const urutanStatus = ['Terkirim', 'Ditagih', 'Dibayar'];

export default function InvoiceList() {
  const [invoiceList, setInvoiceList] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua Status');
  const [statusInv, setStatusInv] = useState(null);
  const [printInv, setPrintInv] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfInfo, setPdfInfo] = useState('');

  const muat = () => {
    listInvoices().then(setInvoiceList).catch(console.error);
  };

  useEffect(muat, []);

  const hasil = invoiceList.filter((inv) => {
    const cocokCari = [inv.no_invoice, inv.no_po, inv.no_sj, inv.client_nama]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase());
    const cocokStatus = filterStatus === 'Semua Status' || inv.status === filterStatus;
    return cocokCari && cocokStatus;
  });

  const nextStatus = (inv) => {
    const idx = urutanStatus.indexOf(inv.status);
    return idx >= 0 && idx < urutanStatus.length - 1 ? urutanStatus[idx + 1] : null;
  };

  const ubahStatus = async () => {
    setError('');
    setLoading(true);
    try {
      await updateInvoiceStatus(statusInv.id, nextStatus(statusInv));
      setStatusInv(null);
      muat();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const bukaCetak = async (inv) => {
    try {
      const detail = await getInvoice(inv.id);
      setPrintInv(detail);
    } catch (e) {
      alert(e.message);
    }
  };

  const cetak = () =>
    printDocument('invoice', printInv).catch((e) => alert(e.message));

  const simpanPdf = async () => {
    setPdfInfo('');
    try {
      const path = await saveDocumentPdf('invoice', printInv);
      setPdfInfo(path ? `PDF tersimpan: ${path}` : 'Penyimpanan dibatalkan.');
    } catch (e) {
      setPdfInfo(e.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Invoice"
        subtitle="Daftar invoice beserta status penagihan (Terkirim → Ditagih → Dibayar)."
        actions={
          <Link to="/invoice/baru" className="btn-primary">
            <Plus className="h-4 w-4" /> Invoice Baru
          </Link>
        }
      />

      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari No Invoice / client..."
            className="input pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input max-w-[180px]"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option>Semua Status</option>
          <option>Terkirim</option>
          <option>Ditagih</option>
          <option>Dibayar</option>
        </select>
        <button className="btn-secondary" onClick={muat} title="Muat ulang">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="card mb-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="table-wrap">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-center font-medium">No Invoice</th>
              <th className="px-4 py-3 text-center font-medium">No PO</th>
              <th className="px-4 py-3 text-center font-medium">No SJ</th>
              <th className="px-4 py-3 text-left font-medium">Client</th>
              <th className="px-4 py-3 text-left font-medium">Tgl Invoice</th>
              <th className="px-4 py-3 text-center font-medium">Total</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium w-24">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {hasil.map((inv) => (
              <tr key={inv.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-center text-slate-800">{inv.no_invoice}</td>
                <td className="px-4 py-3 text-center text-slate-600">{inv.no_po}</td>
                <td className="px-4 py-3 text-center text-slate-600">{inv.no_sj}</td>
                <td className="px-4 py-3 text-slate-600">{inv.client_nama}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(inv.tanggal_invoice)}</td>
                <td className="px-4 py-3 text-center font-semibold text-slate-800">{formatRupiah(inv.total)}</td>
                <td className="px-4 py-3 text-center"><StatusBadge status={inv.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                      title="Cetak Invoice"
                      onClick={() => bukaCetak(inv)}
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    {nextStatus(inv) && (
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                        title={`Ubah status ke ${nextStatus(inv)}`}
                        onClick={() => { setError(''); setStatusInv(inv); }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {hasil.length === 0 && (
              <tr><td colSpan={8} className="py-6 text-center text-sm text-slate-500">Tidak ada invoice yang cocok.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 card p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Ringkasan Piutang</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Belum Ditagih</div>
            <div className="mt-1 text-xl font-bold text-slate-900">
              {formatRupiah(invoiceList.filter((i) => i.status === 'Terkirim').reduce((s, i) => s + i.total, 0))}
            </div>
          </div>
          <div className="rounded-lg bg-amber-50 p-4">
            <div className="text-xs text-amber-700">Sudah Ditagih (Belum Dibayar)</div>
            <div className="mt-1 text-xl font-bold text-amber-700">
              {formatRupiah(invoiceList.filter((i) => i.status === 'Ditagih').reduce((s, i) => s + i.total, 0))}
            </div>
          </div>
          <div className="rounded-lg bg-emerald-50 p-4">
            <div className="text-xs text-emerald-700">Sudah Dibayar</div>
            <div className="mt-1 text-xl font-bold text-emerald-700">
              {formatRupiah(invoiceList.filter((i) => i.status === 'Dibayar').reduce((s, i) => s + i.total, 0))}
            </div>
          </div>
        </div>
      </div>

      {statusInv && (
        <Modal open onClose={() => setStatusInv(null)} title={`Ubah Status — ${statusInv.no_invoice}`}>
          <div className="text-sm space-y-3">
            {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-red-700">{error}</div>}
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <div className="text-xs text-slate-500">Status saat ini</div>
              <div className="mt-1"><StatusBadge status={statusInv.status} /></div>
              {statusInv.tanggal_ditagih && (
                <div className="mt-1 text-xs text-slate-500">Ditagih: {formatDate(statusInv.tanggal_ditagih)}</div>
              )}
              {statusInv.tanggal_dibayar && (
                <div className="text-xs text-slate-500">Dibayar: {formatDate(statusInv.tanggal_dibayar)}</div>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm">
              <StatusBadge status={statusInv.status} />
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <StatusBadge status={nextStatus(statusInv)} />
            </div>
            <p className="text-xs text-slate-500">
              Tanggal perubahan akan tercatat otomatis (tanggal hari ini).
            </p>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setStatusInv(null)}>Batal</button>
            <button className="btn-primary" onClick={ubahStatus} disabled={loading}>
              {loading ? 'Menyimpan...' : `Konfirmasi Ubah ke ${nextStatus(statusInv)}`}
            </button>
          </div>
        </Modal>
      )}

      {printInv && (
        <Modal open onClose={() => setPrintInv(null)} title={`Cetak — ${printInv.no_invoice}`} wide>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <InvoicePrint inv={printInv} />
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
      )}
    </div>
  );
}
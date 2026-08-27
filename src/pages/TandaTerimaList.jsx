import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Printer, RefreshCw } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { TandaTerimaPrint } from '../components/PrintLayout';
import { listTandaTerima, listInvoicesSiapTagih, printDocument } from '../data/api';
import { formatDate, formatRupiah } from '../data/mockData';

export default function TandaTerimaList() {
  const [tandaTerimaList, setTandaTerimaList] = useState([]);
  const [invoicesSiap, setInvoicesSiap] = useState([]);
  const [printTT, setPrintTT] = useState(null);

  const muat = () => {
    listTandaTerima().then(setTandaTerimaList).catch(console.error);
    listInvoicesSiapTagih().then(setInvoicesSiap).catch(console.error);
  };

  useEffect(muat, []);

  const cetak = () =>
    printDocument('tanda-terima', printTT).catch((e) => alert(e.message));

  return (
    <div>
      <PageHeader
        title="Tanda Terima / Rekonsiliasi"
        subtitle="Menggabungkan beberapa invoice untuk ditagihkan sekaligus, dengan No SBI per baris."
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={muat} title="Muat ulang">
              <RefreshCw className="h-4 w-4" />
            </button>
            <Link to="/tanda-terima/baru" className="btn-primary">
              <Plus className="h-4 w-4" /> Buat Tanda Terima
            </Link>
          </div>
        }
      />

      <div className="table-wrap mb-6">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium">No Dokumen</th>
              <th className="px-4 py-3 text-left font-medium">Tanggal</th>
              <th className="px-4 py-3 text-left font-medium">Diserahkan Oleh</th>
              <th className="px-4 py-3 text-left font-medium">Diterima Oleh</th>
              <th className="px-4 py-3 text-center font-medium w-20">Invoice</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-right font-medium w-16">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {tandaTerimaList.map((tt) => (
              <tr key={tt.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{tt.no_dokumen}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(tt.tanggal)}</td>
                <td className="px-4 py-3 text-slate-600">{tt.diserahkan_oleh}</td>
                <td className="px-4 py-3 text-slate-600">{tt.diterima_oleh}</td>
                <td className="px-4 py-3 text-center text-slate-600">{tt.items.length}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatRupiah(tt.total)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                    onClick={() => setPrintTT(tt)}
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {tandaTerimaList.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-sm text-slate-500">Belum ada dokumen Tanda Terima.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Invoice Siap Ditagihkan</h3>
        <p className="text-sm text-slate-500 mb-3">Invoice berstatus <strong>Terkirim</strong> atau <strong>Ditagih</strong> yang belum masuk dokumen Tanda Terima.</p>
        {invoicesSiap.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-4">Tidak ada invoice yang siap ditagihkan.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">No Invoice</th>
                  <th className="text-left px-3 py-2 font-medium">Client</th>
                  <th className="text-right px-3 py-2 font-medium w-32">Nilai</th>
                </tr>
              </thead>
              <tbody>
                {invoicesSiap.map((inv) => (
                  <tr key={inv.id} className="border-t border-slate-200">
                    <td className="px-3 py-2 font-medium text-slate-800">{inv.no_invoice}</td>
                    <td className="px-3 py-2 text-slate-600">{inv.client_nama}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800">{formatRupiah(inv.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {printTT && (
        <Modal open onClose={() => setPrintTT(null)} title={`Cetak — ${printTT.no_dokumen}`} wide>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <TandaTerimaPrint tt={printTT} />
          </div>
          <div className="mt-4 flex justify-end">
            <button className="btn-primary" onClick={cetak}>
              <Printer className="h-4 w-4" /> Cetak Dokumen
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
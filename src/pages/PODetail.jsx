import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Printer, Truck, Receipt, Pencil } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { getRiwayatPO } from '../data/api';
import { formatDate, formatNumber, sisaItem } from '../data/mockData';

function formatDateNumeric(d) {
  if (!d) return '-';
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function PODetail() {
  const { id } = useParams();
  const [po, setPo] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getRiwayatPO(id).then((d) => {
      if (!d) setNotFound(true);
      else setPo(d);
    }).catch(console.error);
  }, [id]);

  if (notFound) {
    return <div className="card p-6">PO tidak ditemukan. <Link to="/po" className="text-brand-600 hover:underline">Kembali</Link></div>;
  }
  if (!po) {
    return <div className="card p-6 text-sm text-slate-500">Memuat data...</div>;
  }

  const sjTerbaru = po.suratJalan ?? [];
  const invTerbaru = po.invoices ?? [];

  return (
    <div>
      <Link to="/po" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3">
        <ChevronLeft className="h-4 w-4" /> Kembali ke daftar PO
      </Link>

      <PageHeader
        title={po.no_po}
        subtitle={`${po.client_nama} · ${formatDateNumeric(po.tanggal_po)}`}
        actions={
          <div className="flex gap-2">
            <Link to={`/po/${po.id}/edit`} className="btn-secondary"><Pencil className="h-4 w-4" /> Edit PO</Link>
            <Link to={`/surat-jalan/baru?po=${po.id}`} className="btn-primary"><Truck className="h-4 w-4" /> Buat SJ</Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Daftar Barang</h3>
            <StatusBadge status={po.status} />
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr className="divide-x divide-slate-200">
                <th className="px-4 py-3 text-center font-medium">Nama Barang</th>
                <th className="px-4 py-3 text-center font-medium w-24">Satuan</th>
                <th className="px-4 py-3 text-center font-medium w-28">Qty Pesan</th>
                <th className="px-4 py-3 text-center font-medium w-28">Terkirim</th>
                <th className="px-4 py-3 text-center font-medium w-28">Sisa</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((it) => {
                const sisa = sisaItem(it);
                return (
                  <tr key={it.id} className="divide-x divide-slate-100 border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-800">{it.nama_barang}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{it.satuan}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatNumber(it.qty_pesan)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatNumber(it.qty_terkirim)}</td>
                    <td className="px-4 py-3 text-right">
                      {sisa > 0 ? (
                        <span className="font-medium text-amber-700">{formatNumber(sisa)}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>

          {po.catatan && (
            <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <span className="font-medium text-slate-700">Catatan:</span> <span className="text-slate-600">{po.catatan}</span>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Informasi PO</h3>
          <dl className="text-sm space-y-2.5">
            <div className="flex justify-between">
              <dt className="text-slate-500">Client</dt>
              <dd className="font-medium text-slate-800 text-right">{po.client_nama}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Tanggal PO</dt>
              <dd className="font-medium text-slate-800">{formatDateNumeric(po.tanggal_po)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Jumlah Item</dt>
              <dd className="font-medium text-slate-800">{po.items.length} item</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Total Surat Jalan</dt>
              <dd className="font-medium text-slate-800">{sjTerbaru.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Total Invoice</dt>
              <dd className="font-medium text-slate-800">{invTerbaru.length}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6 card p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Riwayat Surat Jalan</h3>
        {sjTerbaru.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-4">Belum ada Surat Jalan untuk PO ini.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr className="divide-x divide-slate-200">
                <th className="px-4 py-3 text-center font-medium">No SJ</th>
                <th className="px-4 py-3 text-center font-medium">Tanggal Kirim</th>
                <th className="px-4 py-3 text-center font-medium">Pengirim</th>
                <th className="px-4 py-3 text-center font-medium">Retur</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium w-20">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sjTerbaru.map((sj) => {
                const totalRetur = sj.retur_total ?? 0;
                return (
                  <tr key={sj.id} className="divide-x divide-slate-100 border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-center text-slate-800">{sj.no_sj}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{formatDateNumeric(sj.tanggal_kirim)}</td>
                    <td className="px-4 py-3 text-left text-slate-600">{sj.nama_pengirim}</td>
                    <td className="px-4 py-3 text-center">
                      {totalRetur > 0 ? (
                        <span className="font-medium text-red-600">{formatNumber(totalRetur)}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={sj.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/surat-jalan/${sj.id}`} className="text-brand-600 hover:underline text-xs">Detail</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 card p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Riwayat Invoice</h3>
        {invTerbaru.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-4">Belum ada Invoice untuk PO ini.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr className="divide-x divide-slate-200">
                <th className="px-4 py-3 text-center font-medium">No Invoice</th>
                <th className="px-4 py-3 text-center font-medium">No SJ</th>
                <th className="px-4 py-3 text-center font-medium">Tanggal</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invTerbaru.map((inv) => (
                <tr key={inv.id} className="divide-x divide-slate-100 border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-center text-slate-800">{inv.no_invoice}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{inv.no_sj}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{formatDateNumeric(inv.tanggal_invoice)}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
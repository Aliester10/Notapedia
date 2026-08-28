import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { listPO, listClients } from '../data/api';
import { formatDate, formatNumber, sisaItem } from '../data/mockData';

export default function POList() {
  const [poList, setPoList] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua Status');
  const [filterClient, setFilterClient] = useState('Semua Client');

  useEffect(() => {
    listPO().then(setPoList).catch(console.error);
    listClients().then(setClients).catch(console.error);
  }, []);

  const hasil = poList.filter((po) => {
    const cocokCari = [po.no_po, po.client_nama]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase());
    const cocokStatus = filterStatus === 'Semua Status' || po.status === filterStatus;
    const cocokClient = filterClient === 'Semua Client' || po.client_id === Number(filterClient);
    return cocokCari && cocokStatus && cocokClient;
  });

  return (
    <div>
      <PageHeader
        title="Purchase Order"
        subtitle="Daftar seluruh PO dari client beserta sisa qty yang belum terkirim."
        actions={
          <Link to="/po/baru" className="btn-primary">
            <Plus className="h-4 w-4" /> PO Baru
          </Link>
        }
      />

      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari No PO / client..."
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
          <option>Open</option>
          <option>Selesai</option>
        </select>
        <select
          className="input max-w-[180px]"
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
        >
          <option>Semua Client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.nama}</option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-center font-medium">No PO</th>
              <th className="px-4 py-3 text-left font-medium">Client</th>
              <th className="px-4 py-3 text-center font-medium">Tanggal</th>
              <th className="px-4 py-3 text-center font-medium">Item</th>
              <th className="px-4 py-3 text-center font-medium">Sisa Qty</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium w-16">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {hasil.map((po) => {
              const totalSisa = po.items.reduce((s, it) => s + sisaItem(it), 0);
              return (
                <tr key={po.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-center text-slate-800">{po.no_po}</td>
                  <td className="px-4 py-3 text-slate-600">{po.client_nama}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{formatDate(po.tanggal_po)}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{po.items.length}</td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {totalSisa > 0 ? formatNumber(totalSisa) : <span className="text-slate-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={po.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/po/${po.id}`} className="inline-flex rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600">
                      <Eye className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {hasil.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-sm text-slate-500">Tidak ada PO yang cocok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, BookText } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { listPO } from '../data/api';
import { formatDate, formatNumber, sisaItem } from '../data/mockData';

export default function RiwayatPO() {
  const [poList, setPoList] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    listPO().then(setPoList).catch(console.error);
  }, []);

  const hasil = poList.filter((po) =>
    [po.no_po, po.client_nama, ...po.items.map((it) => it.nama_barang)]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Riwayat PO"
        subtitle="Lihat seluruh Surat Jalan, retur, dan Invoice terkait dalam satu PO."
      />

      <div className="card p-4 mb-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari No PO / nama client..."
            className="input pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        {hasil.map((po) => {
          const totalSisa = po.items.reduce((s, it) => s + sisaItem(it), 0);
          return (
            <Link
              key={po.id}
              to={`/po/${po.id}`}
              className="card p-5 block hover:border-brand-300 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 shrink-0">
                    <BookText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-base font-bold text-slate-900">{po.no_po}</div>
                      <StatusBadge status={po.status} />
                    </div>
                    <div className="text-sm text-slate-600 mt-0.5">{po.client_nama}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Tanggal: {formatDate(po.tanggal_po)} · {po.items.length} item
                      {totalSisa > 0 && (
                        <span className="text-amber-700"> · Sisa qty: {formatNumber(totalSisa)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">
                  Item: {po.items.map((it) => it.nama_barang).slice(0, 2).join(', ')}
                  {po.items.length > 2 && `, +${po.items.length - 2} lainnya`}
                </span>
              </div>
            </Link>
          );
        })}
        {hasil.length === 0 && (
          <div className="card p-6 text-center text-sm text-slate-500">Tidak ada PO yang cocok.</div>
        )}
      </div>
    </div>
  );
}
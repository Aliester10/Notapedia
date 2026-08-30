import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Truck, Receipt, Wallet, Plus, ArrowUpRight,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { getDashboard } from '../data/api';
import { formatRupiah, formatDate } from '../data/mockData';

function StatCard({ icon: Icon, label, value, hint, color = 'brand' }) {
  const colors = {
    brand: 'bg-brand-50 text-brand-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-600">{label}</div>
      {hint && <div className="mt-2 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getDashboard().then(setStats).catch(console.error);
  }, []);

  if (!stats) {
    return <div className="card p-6 text-sm text-slate-500">Memuat data...</div>;
  }

  const {
    poAktif, totalPO, sjBulanIni, totalInvoiceBulanIni,
    piutang, piutangCount, recentPO, recentSJ, unpaid,
  } = stats;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Ringkasan aktivitas pencatatan PO, Surat Jalan, dan Invoice."
        actions={
          <div className="flex gap-2">
            <Link to="/po/baru" className="btn-primary">
              <Plus className="h-4 w-4" /> PO Baru
            </Link>
            <Link to="/surat-jalan/baru" className="btn-secondary">
              <Truck className="h-4 w-4" /> Buat SJ
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="PO Aktif" value={poAktif} hint={`dari ${totalPO} total PO`} color="brand" />
        <StatCard icon={Truck} label="Surat Jalan (Bulan Ini)" value={sjBulanIni} color="amber" />
        <StatCard icon={Receipt} label="Nilai Invoice Bulan Ini" value={formatRupiah(totalInvoiceBulanIni)} color="emerald" />
        <StatCard icon={Wallet} label="Piutang Belum Dibayar" value={formatRupiah(piutang)} hint={`${piutangCount} invoice`} color="red" />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">PO Terbaru</h3>
            <Link to="/po" className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1">
              Lihat semua <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentPO.map((po) => (
              <Link key={po.id} to={`/po/${po.id}`} className="flex items-center justify-between rounded-lg p-3 hover:bg-slate-50">
                <div>
                  <div className="font-medium text-slate-800">{po.no_po}</div>
                  <div className="text-xs text-slate-500">{po.client_nama} · {formatDate(po.tanggal_po)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{po.item_count ?? po.items?.length ?? 0} item</span>
                  <StatusBadge status={po.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Surat Jalan Terbaru</h3>
            <Link to="/surat-jalan" className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1">
              Lihat semua <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentSJ.map((sj) => (
              <Link key={sj.id} to={`/surat-jalan/${sj.id}`} className="flex items-center justify-between rounded-lg p-3 hover:bg-slate-50">
                <div>
                  <div className="font-medium text-slate-800">{sj.no_sj}</div>
                  <div className="text-xs text-slate-500">{sj.client_nama} · {formatDate(sj.tanggal_kirim)}</div>
                </div>
                <StatusBadge status={sj.status} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Invoice Belum Dibayar</h3>
          <Link to="/invoice" className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1">
            Lihat semua <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        {unpaid.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-6">Tidak ada invoice yang belum dibayar.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 border-b border-slate-200">
              <tr className="divide-x divide-slate-200">
                <th className="text-center py-2 font-medium">No Invoice</th>
                <th className="text-left py-2 font-medium">Client</th>
                <th className="text-center py-2 font-medium">Total</th>
                <th className="text-center py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {unpaid.map((inv) => (
                <tr key={inv.id} className="divide-x divide-slate-100 border-b border-slate-100 last:border-0">
                  <td className="py-3 font-medium text-center text-slate-800">{inv.no_invoice}</td>
                  <td className="py-3 text-slate-600">{inv.client_nama}</td>
                  <td className="py-3 text-center font-medium">{formatRupiah(inv.total)}</td>
                  <td className="py-3 text-center"><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
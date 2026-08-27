export default function StatusBadge({ status }) {
  const map = {
    Open: 'bg-blue-50 text-blue-700 border border-blue-200',
    Selesai: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Terkirim: 'bg-slate-100 text-slate-700 border border-slate-200',
    'Diterima Penuh': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    'Diterima Sebagian': 'bg-amber-50 text-amber-700 border border-amber-200',
    Ditolak: 'bg-red-50 text-red-700 border border-red-200',
    Ditagih: 'bg-amber-50 text-amber-700 border border-amber-200',
    Dibayar: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  };
  return <span className={`badge ${map[status] || 'bg-slate-100 text-slate-700'}`}>{status}</span>;
}

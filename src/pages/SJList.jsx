import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { listSJ } from '../data/api';
import { formatDate } from '../data/mockData';

export default function SJList() {
  const [suratJalanList, setSuratJalanList] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua Status');

  useEffect(() => {
    listSJ().then(setSuratJalanList).catch(console.error);
  }, []);

  const hasil = suratJalanList.filter((sj) => {
    const cocokCari = [sj.no_sj, sj.no_po, sj.client_nama, sj.nama_pengirim]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase());
    const cocokStatus = filterStatus === 'Semua Status' || sj.status === filterStatus;
    return cocokCari && cocokStatus;
  });

  return (
    <div>
      <PageHeader
        title="Surat Jalan"
        subtitle="Daftar seluruh Surat Jalan yang pernah dibuat dari PO."
        actions={
          <Link to="/surat-jalan/baru" className="btn-primary">
            <Plus className="h-4 w-4" /> Buat SJ
          </Link>
        }
      />

      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari No SJ / No PO..."
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
          <option>Diterima Penuh</option>
          <option>Diterima Sebagian</option>
          <option>Ditolak</option>
        </select>
      </div>

      <div className="table-wrap">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-center font-medium">No SJ</th>
              <th className="px-4 py-3 text-center font-medium">No PO</th>
              <th className="px-4 py-3 text-left font-medium">Client</th>
              <th className="px-4 py-3 text-left font-medium">Tgl Kirim</th>
              <th className="px-4 py-3 text-left font-medium">Pengirim</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium w-16">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {hasil.map((sj) => (
              <tr key={sj.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-center text-slate-800">{sj.no_sj}</td>
                <td className="px-4 py-3 text-center text-slate-600">{sj.no_po}</td>
                <td className="px-4 py-3 text-slate-600">{sj.client_nama}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(sj.tanggal_kirim)}</td>
                <td className="px-4 py-3 text-slate-600">{sj.nama_pengirim}</td>
                <td className="px-4 py-3 text-center"><StatusBadge status={sj.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/surat-jalan/${sj.id}`} className="inline-flex rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600">
                    <Eye className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
            {hasil.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-sm text-slate-500">Tidak ada Surat Jalan yang cocok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { listSJ, deleteSJ } from '../data/api';
import { formatDate } from '../data/mockData';

export default function SJList() {
  const [suratJalanList, setSuratJalanList] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua Status');

  const fetchSJ = () => {
    listSJ().then(setSuratJalanList).catch(console.error);
  };

  useEffect(() => {
    fetchSJ();
  }, []);

  const handleDelete = async (id, noSj) => {
    if (!confirm(`Hapus Surat Jalan ${noSj}?\n\nPerhatian: Menghapus SJ juga akan mengembalikan sisa Qty di PO terkait. (SJ tidak dapat dihapus jika sudah ada Invoice).`)) return;
    try {
      await deleteSJ(id);
      fetchSJ();
    } catch (err) {
      alert(err.message || 'Gagal menghapus Surat Jalan.');
    }
  };

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
            <tr className="divide-x divide-slate-200">
              <th className="px-4 py-3 text-center font-medium">No SJ</th>
              <th className="px-4 py-3 text-center font-medium">No PO</th>
              <th className="px-4 py-3 text-center font-medium">Client</th>
              <th className="px-4 py-3 text-center font-medium">Tgl Kirim</th>
              <th className="px-4 py-3 text-center font-medium">Pengirim</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium w-28">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {hasil.map((sj) => (
              <tr key={sj.id} className="divide-x divide-slate-100 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-center text-slate-800">{sj.no_sj}</td>
                <td className="px-4 py-3 text-center text-slate-600">{sj.no_po}</td>
                <td className="px-4 py-3 text-slate-600">{sj.client_nama}</td>
                <td className="px-4 py-3 text-center text-slate-600">{formatDate(sj.tanggal_kirim)}</td>
                <td className="px-4 py-3 text-left text-slate-600">{sj.nama_pengirim}</td>
                <td className="px-4 py-3 text-center"><StatusBadge status={sj.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link to={`/surat-jalan/${sj.id}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-brand-600" title="Detail SJ">
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link to={`/surat-jalan/${sj.id}/edit`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-600" title="Edit SJ">
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(sj.id, sj.no_sj)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                      title="Hapus SJ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
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
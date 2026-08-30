import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { listClients } from '../data/api';

export default function ClientList() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    listClients().then(setClients).catch(console.error);
  }, []);

  const hasil = clients.filter((c) =>
    c.nama.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Manajemen Client"
        subtitle="Daftar client/pemesan yang pernah bertransaksi."
        actions={
          <Link to="/client/baru" className="btn-primary">
            <Plus className="h-4 w-4" /> Client Baru
          </Link>
        }
      />

      <div className="card p-4 mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama client..."
            className="input pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-wrap">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr className="divide-x divide-slate-200">
              <th className="px-4 py-3 text-left font-medium">Nama Client</th>
              <th className="px-4 py-3 text-right font-medium w-32">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {hasil.map((c) => (
              <tr key={c.id} className="divide-x divide-slate-100 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{c.nama}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link to={`/client/${c.id}/edit`} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600">
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <Link to={`/client/${c.id}/edit`} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {hasil.length === 0 && (
              <tr><td colSpan={2} className="py-6 text-center text-sm text-slate-500">Tidak ada client yang cocok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
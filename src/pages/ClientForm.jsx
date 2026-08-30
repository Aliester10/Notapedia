import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { listClients, createClient, updateClient, deleteClient } from '../data/api';

export default function ClientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [nama, setNama] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    listClients().then((all) => {
      const edit = all.find((c) => c.id === Number(id));
      if (edit) {
        setNama(edit.nama);
      }
    });
  }, [id, isEdit]);

  const simpan = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = { nama };
      if (isEdit) await updateClient(Number(id), data);
      else await createClient(data);
      navigate('/client');
    } catch (err) {
      setError(err.message);
    }
  };

  const hapus = async () => {
    setError('');
    try {
      await deleteClient(Number(id));
      navigate('/client');
    } catch (err) {
      setError(err.message);
      setConfirmDelete(false);
    }
  };

  return (
    <div>
      <Link to="/client" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3">
        <ChevronLeft className="h-4 w-4" /> Kembali ke daftar Client
      </Link>

      <PageHeader
        title={isEdit ? `Edit Client — ${nama || '...'}` : 'Client Baru'}
        subtitle="Nama client/pemesan."
        actions={
          isEdit && (
            <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> Hapus Client
            </button>
          )
        }
      />

      {error && (
        <div className="card mb-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={simpan} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2 space-y-4">
          <div>
            <label className="label">Nama Client</label>
            <input
              type="text"
              className="input"
              placeholder="cth: PT Maju Bersama"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="card p-5 h-fit">
          <h3 className="font-semibold text-slate-900 mb-3">Aksi</h3>
          <p className="text-sm text-slate-500 mb-4">
            Client yang sudah memiliki PO tidak disarankan dihapus.
          </p>
          <div className="flex flex-col gap-2">
            <button type="submit" className="btn-primary justify-center">
              <Save className="h-4 w-4" /> Simpan Client
            </button>
            <Link to="/client" className="btn-secondary justify-center">Batal</Link>
          </div>
        </div>
      </form>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Hapus Client?">
        <p className="text-sm text-slate-600">
          Client <strong>{nama}</strong> akan dihapus dari daftar. Tindakan ini tidak dapat
          dibatalkan.
        </p>
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setConfirmDelete(false)}>Batal</button>
          <button className="btn-danger" onClick={hapus}>
            <Trash2 className="h-4 w-4" /> Ya, Hapus
          </button>
        </div>
      </Modal>
    </div>
  );
}
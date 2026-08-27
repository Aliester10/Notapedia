import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Save } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { listClients, getPO, createPO, updatePO, listSJByPO } from '../data/api';

export default function POForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [clients, setClients] = useState([]);
  const [noPO, setNoPO] = useState('');
  const [clientId, setClientId] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [catatan, setCatatan] = useState('');
  const [items, setItems] = useState([
    { nama_barang: '', satuan: '', qty_pesan: '' },
    { nama_barang: '', satuan: '', qty_pesan: '' },
  ]);
  const [terlarangEdit, setTerlarangEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listClients().then(setClients).catch(console.error);
    if (!isEdit) return;
    getPO(Number(id)).then((po) => {
      if (!po) return;
      setNoPO(po.no_po);
      setClientId(po.client_id);
      setTanggal(po.tanggal_po);
      setCatatan(po.catatan ?? '');
      setItems(po.items.map((it) => ({ nama_barang: it.nama_barang, satuan: it.satuan, qty_pesan: it.qty_pesan })));
    }).catch(console.error);
    listSJByPO(Number(id)).then((sj) => {
      if (sj.length > 0) setTerlarangEdit(true);
    }).catch(console.error);
  }, [id, isEdit]);

  const updateItem = (i, field, value) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));

  const tambahItem = () => setItems((prev) => [...prev, { nama_barang: '', satuan: '', qty_pesan: '' }]);
  const hapusItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const simpan = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = { no_po: noPO, client_id: Number(clientId), tanggal_po: tanggal, catatan, items };
      if (isEdit) await updatePO(Number(id), data);
      else await createPO(data);
      navigate(isEdit ? `/po/${id}` : '/po');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link to={isEdit ? `/po/${id}` : '/po'} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3">
        <ChevronLeft className="h-4 w-4" /> Kembali {isEdit ? 'ke detail PO' : 'ke daftar PO'}
      </Link>

      <PageHeader
        title={isEdit ? `Edit PO — ${noPO || '...'}` : 'Purchase Order Baru'}
        subtitle={isEdit ? 'Ubah data PO selama belum ada Surat Jalan yang terbit.' : 'Isi No PO, client, dan daftar barang yang dipesan.'}
      />

      {error && (
        <div className="card mb-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {isEdit && terlarangEdit && (
        <div className="card mb-6 border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          PO ini sudah memiliki Surat Jalan terbit, sehingga tidak dapat diedit. Buat PO baru jika
          perlu perubahan.
        </div>
      )}

      <form onSubmit={simpan} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">No PO</label>
              <input
                type="text"
                placeholder="cth: PO/2026/08/005"
                className="input"
                value={noPO}
                onChange={(e) => setNoPO(e.target.value)}
                disabled={terlarangEdit}
                required
              />
            </div>
            <div>
              <label className="label">Client</label>
              <select
                className="input"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={terlarangEdit}
                required
              >
                <option value="">-- Pilih client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tanggal PO</label>
              <input
                type="date"
                className="input"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                disabled={terlarangEdit}
                required
              />
            </div>
            <div>
              <label className="label">Catatan (opsional)</label>
              <input
                type="text"
                placeholder="cth: Kirim sebelum tgl 20"
                className="input"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                disabled={terlarangEdit}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900">Daftar Barang</h3>
              {!terlarangEdit && (
                <button type="button" className="btn-secondary text-xs" onClick={tambahItem}>
                  <Plus className="h-3.5 w-3.5" /> Tambah Item
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="text-left py-2 font-medium">Nama Barang</th>
                  <th className="text-center py-2 font-medium w-24">Satuan</th>
                  <th className="text-right py-2 font-medium w-28">Qty Pesan</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        className="input"
                        placeholder="cth: Besi Beton 12mm"
                        value={it.nama_barang}
                        onChange={(e) => updateItem(i, 'nama_barang', e.target.value)}
                        disabled={terlarangEdit}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        className="input text-center"
                        placeholder="batang"
                        value={it.satuan}
                        onChange={(e) => updateItem(i, 'satuan', e.target.value)}
                        disabled={terlarangEdit}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        className="input text-right"
                        placeholder="0"
                        value={it.qty_pesan}
                        onChange={(e) => updateItem(i, 'qty_pesan', e.target.value)}
                        disabled={terlarangEdit}
                      />
                    </td>
                    <td className="py-2 text-center">
                      {!terlarangEdit && (
                        <button
                          type="button"
                          className="text-slate-400 hover:text-red-600"
                          onClick={() => hapusItem(i)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5 h-fit">
          <h3 className="font-semibold text-slate-900 mb-3">Aksi</h3>
          <p className="text-sm text-slate-500 mb-4">
            {isEdit
              ? 'Perubahan hanya tersimpan jika belum ada Surat Jalan dari PO ini.'
              : 'Pastikan No PO dan qty sudah benar. PO yang sudah disimpan akan berstatus Open.'}
          </p>
          <div className="flex flex-col gap-2">
            <button type="submit" className="btn-primary justify-center" disabled={terlarangEdit || loading}>
              <Save className="h-4 w-4" /> {loading ? 'Menyimpan...' : 'Simpan PO'}
            </button>
            <Link to={isEdit ? `/po/${id}` : '/po'} className="btn-secondary justify-center">Batal</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
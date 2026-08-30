import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { ChevronLeft, Save } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { listPO, createSJ, getSJ, updateSJ } from '../data/api';
import { formatNumber, sisaItem } from '../data/mockData';

export default function SJForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [params] = useSearchParams();
  const [poList, setPoList] = useState([]);
  const [poId, setPoId] = useState(params.get('po') ?? '');
  const [tanggal, setTanggal] = useState('');
  const [pengirim, setPengirim] = useState('');
  const [catatan, setCatatan] = useState('');
  const [items, setItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listPO().then((pos) => {
      setPoList(pos);
      if (isEdit) {
        getSJ(id).then((sj) => {
          if (!sj) {
            setError('Surat Jalan tidak ditemukan.');
            return;
          }
          if (sj.status !== 'Terkirim') {
            setError('Surat Jalan sudah dikonfirmasi, tidak dapat diedit.');
          }
          setPoId(String(sj.po_id));
          setTanggal(sj.tanggal_kirim);
          setPengirim(sj.nama_pengirim);
          setCatatan(sj.catatan || '');
          const initialItems = {};
          sj.items.forEach((it) => {
            initialItems[it.po_item_id] = {
              qty_kirim: it.qty_kirim,
              berat: it.berat || '',
              keterangan: it.keterangan || ''
            };
          });
          setItems(initialItems);
        }).catch((e) => setError(e.message));
      }
    }).catch(console.error);
  }, [id, isEdit]);

  const po = poList.find((p) => p.id === Number(poId));

  const pilihPO = (id) => {
    setPoId(id);
    const p = poList.find((x) => x.id === Number(id));
    if (p) {
      const awal = {};
      p.items.forEach((it) => {
        awal[it.id] = { qty_kirim: '', berat: '', keterangan: '' };
      });
      setItems(awal);
    } else {
      setItems({});
    }
  };

  const updateItem = (itemId, field, value) =>
    setItems((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));

  const simpan = async (print = false) => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        po_id: Number(poId),
        tanggal_kirim: tanggal,
        nama_pengirim: pengirim,
        catatan,
        items: po.items.map((it) => ({
          po_item_id: it.id,
          nama_barang: it.nama_barang,
          satuan: it.satuan,
          qty_kirim: Number(items[it.id]?.qty_kirim) || 0,
          berat: Number(items[it.id]?.berat) || 0,
          keterangan: items[it.id]?.keterangan || '',
        })),
      };
      
      let result;
      if (isEdit) {
        result = await updateSJ(id, payload);
      } else {
        result = await createSJ(payload);
      }
      
      if (print && !isEdit) {
        await window.notapedia?.print?.document?.('sj', { ...payload, id: result.id, no_sj: result.no_sj, no_po: po.no_po, client_nama: po.client_nama });
      }
      navigate('/surat-jalan');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link to="/surat-jalan" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3">
        <ChevronLeft className="h-4 w-4" /> Kembali ke daftar Surat Jalan
      </Link>

      <PageHeader
        title={isEdit ? "Edit Surat Jalan" : "Buat Surat Jalan"}
        subtitle={isEdit ? "Ubah detail pengiriman Surat Jalan." : "Pilih PO asal, lalu tentukan barang & qty yang akan dikirim (maksimal sebesar sisa qty PO)."}
      />

      {error && (
        <div className="card mb-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Referensi PO</label>
              <select className="input" value={poId} onChange={(e) => pilihPO(e.target.value)} required disabled={isEdit}>
                <option value="">-- Pilih PO --</option>
                {poList.map((p) => (
                  <option key={p.id} value={p.id}>{p.no_po} — {p.client_nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tanggal Kirim</label>
              <input type="date" className="input" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
            </div>
            <div>
              <label className="label">Nama Pengirim</label>
              <input type="text" placeholder="cth: Budi Santoso" className="input" value={pengirim} onChange={(e) => setPengirim(e.target.value)} required />
            </div>
            <div>
              <label className="label">No SJ (auto-generate)</label>
              <input type="text" className="input bg-slate-50" value="SJ-XXXX (otomatis)" disabled />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Catatan Pengiriman</label>
              <input type="text" placeholder="cth: Disetor oleh ekspedisi A" className="input" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
            </div>
          </div>

          {po ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-900">Item Barang Dikirim</h3>
                <span className="text-xs text-slate-500">Sisa qty PO: lihat di samping</span>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr className="divide-x divide-slate-200">
                      <th className="text-center px-3 py-2 font-medium">Nama Barang</th>
                      <th className="text-center px-3 py-2 font-medium w-20">Satuan</th>
                      <th className="text-center px-3 py-2 font-medium w-24">Sisa PO</th>
                      <th className="text-center px-3 py-2 font-medium w-28">Qty Kirim</th>
                      <th className="text-center px-3 py-2 font-medium w-40">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.items.map((it) => {
                      const sisa = sisaItem(it);
                      const val = items[it.id] ?? { qty_kirim: '', berat: '', keterangan: '' };
                      return (
                        <tr key={it.id} className="divide-x divide-slate-100 border-t border-slate-200">
                          <td className="px-3 py-2 font-medium text-slate-800">{it.nama_barang}</td>
                          <td className="px-3 py-2 text-center text-slate-600">{it.satuan}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{formatNumber(sisa)}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              max={sisa}
                              className="input text-right"
                              placeholder="0"
                              value={val.qty_kirim}
                              onChange={(e) => updateItem(it.id, 'qty_kirim', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              className="input"
                              placeholder="Keterangan..."
                              value={val.keterangan}
                              onChange={(e) => updateItem(it.id, 'keterangan', e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">
              Pilih PO terlebih dahulu untuk melihat item yang dapat dikirim.
            </div>
          )}
        </div>

        <div className="card p-5 h-fit">
          <h3 className="font-semibold text-slate-900 mb-3">Aksi</h3>
          <p className="text-sm text-slate-500 mb-4">No SJ di-generate otomatis. Qty kirim tidak boleh melebihi sisa PO.</p>
          <div className="flex flex-col gap-2">
            <button className="btn-primary justify-center" onClick={() => simpan(true)} disabled={loading || !po}>
              <Save className="h-4 w-4" /> {loading ? 'Menyimpan...' : 'Simpan & Cetak'}
            </button>
            <button className="btn-secondary justify-center" onClick={() => simpan(false)} disabled={loading || !po}>
              Simpan Saja
            </button>
            <Link to="/surat-jalan" className="btn-secondary justify-center">Batal</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
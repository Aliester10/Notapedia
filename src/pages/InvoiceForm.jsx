import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save, Printer } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { listSJ, getSJ, createInvoice, updateInvoice, getInvoice, printDocument } from '../data/api';
import { formatNumber, formatRupiah } from '../data/mockData';

const statusValid = ['Diterima Penuh', 'Diterima Sebagian'];

export default function InvoiceForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [allSJ, setAllSJ] = useState([]);
  const [sjId, setSjId] = useState('');
  const [noInvoice, setNoInvoice] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [rest, setRest] = useState('');
  const [harga, setHarga] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listSJ().then(setAllSJ).catch(console.error);
    if (isEdit) {
      getInvoice(id).then((inv) => {
        if (!inv) return;
        setNoInvoice(inv.no_invoice);
        setTanggal(inv.tanggal_invoice);
        setRest(inv.rest || '');
        setSjId(inv.sj_id);
        
        getSJ(Number(inv.sj_id)).then((s) => {
          if (!s) return;
          const h = {};
          s.items.forEach((it) => {
            const invItem = inv.items.find((i) => i.nama_barang === it.nama_barang);
            h[it.id] = invItem ? invItem.harga_satuan : '';
          });
          setHarga(h);
          setSelected(s);
        });
      }).catch(console.error);
    }
  }, [id, isEdit]);

  const sjTersedia = allSJ.filter((sj) => statusValid.includes(sj.status));

  const pilihSJ = (id) => {
    setSjId(id);
    if (!id) {
      setHarga({});
      setSelected(null);
      return;
    }
    getSJ(Number(id)).then((s) => {
      if (!s) return;
      const awal = {};
      s.items.forEach((it) => {
        awal[it.id] = '';
      });
      setHarga(awal);
      setSelected(s);
    }).catch(console.error);
  };

  const [selected, setSelected] = useState(null);
  const sj = selected;

  const updateHarga = (itemId, value) => setHarga((prev) => ({ ...prev, [itemId]: value }));

  const total = sj
    ? sj.items.reduce((s, it) => s + ((Number(harga[it.id]) || 0) * it.qty_diterima), 0)
    : 0;

  const simpan = async (print = false) => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        no_invoice: noInvoice,
        sj_id: Number(sjId),
        tanggal_invoice: tanggal,
        rest,
        items: sj.items.map((it) => ({
          nama_barang: it.nama_barang,
          satuan: it.satuan,
          qty: it.qty_diterima,
          harga_satuan: Number(harga[it.id]) || 0,
        })),
      };
      
      let result;
      if (isEdit) {
        result = await updateInvoice(id, payload);
      } else {
        result = await createInvoice(payload);
      }
      if (print) {
        const invData = {
          id: result.id,
          no_invoice: result.no_invoice,
          no_po: sj.no_po,
          no_sj: sj.no_sj,
          client_nama: sj.client_nama,
          tanggal_invoice: tanggal,
          rest,
          items: payload.items,
          total,
        };
        await printDocument('invoice', invData);
      }
      navigate('/invoice');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link to="/invoice" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3">
        <ChevronLeft className="h-4 w-4" /> Kembali ke daftar Invoice
      </Link>

      <PageHeader
        title={isEdit ? 'Edit Invoice' : 'Invoice Baru'}
        subtitle="Pilih Surat Jalan yang sudah dikonfirmasi diterima, lalu isi harga satuan per item."
      />

      {error && (
        <div className="card mb-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">No. Invoice (auto-generate)</label>
              {isEdit ? (
                <input type="text" className="input bg-slate-50" value={noInvoice} disabled />
              ) : (
                <input type="text" className="input bg-slate-50" value="INV-XXXX (otomatis)" disabled />
              )}
            </div>
            <div>
              <label className="label">Tanggal Invoice</label>
              <input type="date" className="input" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Referensi Surat Jalan</label>
              <select className="input" value={sjId} onChange={(e) => pilihSJ(e.target.value)} required disabled={isEdit}>
                <option value="">-- Pilih Surat Jalan --</option>
                {sjTersedia.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.no_sj} — {s.no_po} ({s.client_nama})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">Hanya SJ berstatus "Diterima Penuh" / "Diterima Sebagian" yang dapat dipilih.</p>
            </div>
          </div>

          {sj ? (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Item Invoice</h3>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr className="divide-x divide-slate-200">
                      <th className="text-center px-3 py-2 font-medium">Nama Barang</th>
                      <th className="text-center px-3 py-2 font-medium w-20">Satuan</th>
                      <th className="text-center px-3 py-2 font-medium w-20">Qty</th>
                      <th className="text-center px-3 py-2 font-medium w-32">Harga Satuan</th>
                      <th className="text-center px-3 py-2 font-medium w-32">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sj.items.map((it) => {
                      const h = Number(harga[it.id]) || 0;
                      return (
                        <tr key={it.id} className="divide-x divide-slate-100 border-t border-slate-200">
                          <td className="px-3 py-2 font-medium text-slate-800">{it.nama_barang}</td>
                          <td className="px-3 py-2 text-center text-slate-600">{it.satuan}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{formatNumber(it.qty_diterima)}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              className="input text-right"
                              placeholder="0"
                              value={harga[it.id]}
                              onChange={(e) => updateHarga(it.id, e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-slate-800">
                            {formatRupiah(h * it.qty_diterima)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-right text-sm font-semibold text-slate-700">Total</td>
                      <td className="px-3 py-2 text-center text-base font-bold text-brand-700">{formatRupiah(total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">
              Pilih Surat Jalan yang sudah diterima untuk membuat invoice.
            </div>
          )}
        </div>

        <div className="card p-5 h-fit">
          <h3 className="font-semibold text-slate-900 mb-3">Aksi</h3>
          <p className="text-sm text-slate-500 mb-4">Status awal setelah disimpan adalah <strong>Terkirim</strong>.</p>
          <div className="flex flex-col gap-2">
            <button className="btn-primary justify-center" onClick={() => simpan(false)} disabled={!sj || loading}>
              <Save className="h-4 w-4" /> {loading ? 'Menyimpan...' : 'Simpan Invoice'}
            </button>
            <button className="btn-secondary justify-center" onClick={() => simpan(true)} disabled={!sj || loading}>
              <Printer className="h-4 w-4" /> Simpan & Cetak
            </button>
            <Link to="/invoice" className="btn-secondary justify-center">Batal</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
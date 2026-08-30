import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, Plus, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { listInvoices, createTandaTerima, updateTandaTerima, getTandaTerima, printDocument } from '../data/api';
import { formatRupiah } from '../data/mockData';

export default function TandaTerimaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoiceList, setInvoiceList] = useState([]);
  const [tanggal, setTanggal] = useState('');
  const [diserahkan, setDiserahkan] = useState('Antonius Sumera');
  const [diterima, setDiterima] = useState('');
  const [rows, setRows] = useState([{ invoice_id: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listInvoices().then(setInvoiceList).catch(console.error);
    if (id) {
      getTandaTerima(id)
        .then((data) => {
          setTanggal(data.tanggal);
          setDiserahkan(data.diserahkan_oleh);
          setDiterima(data.diterima_oleh || '');
          if (data.items?.length) {
            setRows(data.items.map((it) => ({ invoice_id: it.invoice_id })));
          }
        })
        .catch(console.error);
    }
  }, [id]);

  const updateRow = (i, field, value) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const tambahRow = () => setRows((prev) => [...prev, { invoice_id: '' }]);
  const hapusRow = (i) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const total = rows.reduce((s, r) => {
    const inv = invoiceList.find((x) => x.id === Number(r.invoice_id));
    return s + (inv ? inv.total : 0);
  }, 0);

  const simpan = async (print = false) => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        tanggal,
        diserahkan_oleh: diserahkan,
        diterima_oleh: diterima,
        items: rows.map((r) => ({ invoice_id: Number(r.invoice_id), no_sbi: '' })),
      };

      let result;
      if (id) {
        result = await updateTandaTerima(id, payload);
        result.no_dokumen = 'TT-' + String(id).padStart(4, '0'); // for printing
      } else {
        result = await createTandaTerima(payload);
      }

      if (print) {
        const ttData = {
          id: result.id,
          no_dokumen: result.no_dokumen,
          tanggal,
          diserahkan_oleh: diserahkan,
          diterima_oleh: diterima,
          total,
          items: rows
            .filter((r) => r.invoice_id)
            .map((r) => {
              const inv = invoiceList.find((x) => x.id === Number(r.invoice_id));
              return {
                no_invoice: inv?.no_invoice,
                tanggal_invoice: inv?.tanggal_invoice,
                no_po: inv?.no_po,
                no_sbi: '',
                jumlah: inv?.total ?? 0,
              };
            }),
        };
        await printDocument('tanda-terima', ttData);
      }
      navigate('/tanda-terima');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link to="/tanda-terima" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3">
        <ChevronLeft className="h-4 w-4" /> Kembali ke daftar Tanda Terima
      </Link>

      <PageHeader
        title={id ? 'Edit Tanda Terima' : 'Buat Tanda Terima'}
        subtitle={id ? 'Ubah data tanda terima.' : 'Pilih beberapa invoice yang akan ditagihkan bersama.'}
      />

      {error && (
        <div className="card mb-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">No Dokumen (auto-generate)</label>
              <input type="text" className="input bg-slate-50" value={id ? `TT-${String(id).padStart(4, '0')}` : 'TT-XXXX (otomatis)'} disabled />
            </div>
            <div>
              <label className="label">Tanggal</label>
              <input type="date" className="input" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
            </div>
            <div>
              <label className="label">Diserahkan Oleh</label>
              <input type="text" placeholder="cth: Admin Notapedia" className="input" value={diserahkan} onChange={(e) => setDiserahkan(e.target.value)} />
            </div>
            <div>
              <label className="label">Diterima Oleh (opsional)</label>
              <input type="text" placeholder="cth: Bagian Keuangan CV Sinar Jaya" className="input" value={diterima} onChange={(e) => setDiterima(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900">Invoice yang Digabungkan</h3>
              <button className="btn-secondary text-xs" onClick={tambahRow}>
                <Plus className="h-3.5 w-3.5" /> Tambah Invoice
              </button>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr className="divide-x divide-slate-200">
                    <th className="text-center px-3 py-2 font-medium">Pilih Invoice</th>
                    <th className="text-center px-3 py-2 font-medium">No PO</th>
                    <th className="text-center px-3 py-2 font-medium w-32">Jumlah</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const inv = invoiceList.find((x) => x.id === Number(row.invoice_id));
                    return (
                      <tr key={i} className="divide-x divide-slate-100 border-t border-slate-200">
                        <td className="px-3 py-2">
                          <select
                            className="input"
                            value={row.invoice_id}
                            onChange={(e) => updateRow(i, 'invoice_id', e.target.value)}
                          >
                            <option value="">-- Pilih invoice --</option>
                            {invoiceList.map((invOpt) => (
                              <option key={invOpt.id} value={invOpt.id}>
                                {invOpt.no_invoice} — {invOpt.client_nama}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-slate-500 font-medium">
                          {inv ? inv.no_po || '-' : '-'}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-800">
                          {inv ? formatRupiah(inv.total) : 'Rp 0'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button className="text-slate-400 hover:text-red-600" onClick={() => hapusRow(i)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-right text-sm font-semibold text-slate-700">Total Gabungan</td>
                    <td className="px-3 py-2 text-center text-base font-bold text-brand-700">{formatRupiah(total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="card p-5 h-fit">
          <h3 className="font-semibold text-slate-900 mb-3">Aksi</h3>
          <p className="text-sm text-slate-500 mb-4">No Dokumen di-generate otomatis. Setelah disimpan, ubah status invoice terkait menjadi <strong>Ditagih</strong> di menu Invoice.</p>
          <div className="flex flex-col gap-2">
            <button className="btn-primary justify-center" onClick={() => simpan(true)} disabled={loading}>
              <Save className="h-4 w-4" /> {loading ? 'Menyimpan...' : 'Simpan & Cetak'}
            </button>
            <button className="btn-secondary justify-center" onClick={() => simpan(false)} disabled={loading}>
              Simpan Saja
            </button>
            <Link to="/tanda-terima" className="btn-secondary justify-center">Batal</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
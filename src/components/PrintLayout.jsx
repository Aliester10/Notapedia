// Layout cetak bergaya dotmatrix (monospace, hitam-putih, border tipis).
// Di produksi, komponen ini dirender ke HTML lalu dikirim ke printer dotmatrix
// dengan ukuran halaman custom (setengah A4 / continuous form).
// Layout disinkronkan dengan template produksi di electron/print.js.
import cingcuLogo from '../assets/cingculogo.png';

const dotStyle = {
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: '15px',
  lineHeight: '1.3',
  fontWeight: '700',
  WebkitFontSmoothing: 'none',
  letterSpacing: '0.5px',
  color: '#000',
  background: '#fff',
};

const thTd = 'border-2 border-black px-2 py-1 align-top';
const thClass = 'border-2 border-black px-2 py-1 text-center font-black align-middle whitespace-nowrap';

function DocHeader({ tengah, kanan }) {
  return (
    <div>
      <style>
        {`
          @media print {
            @page {
              margin: 0.8cm 1.3cm 1.3cm 1.3cm;
            }
          }
        `}
      </style>
      <div className="relative flex items-start justify-between">
        <div className="logo">
          <img src={cingcuLogo} alt="logo" className="h-[75px] w-auto" />
        </div>
        {tengah && (
          <div className="absolute left-1/2 -translate-x-1/2 pt-2">
            {tengah}
          </div>
        )}
        <div className="text-right">
          {kanan}
        </div>
      </div>
      <div className="mt-4 border-b-4 border-black" />
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="flex">
      <span className="inline-block w-[140px] font-semibold">{label}</span>
      <span className="mr-2">:</span>
      <span>{value}</span>
    </div>
  );
}

function TerbilangText({ total }) {
  return <div className="mt-3 text-[15px]">Terbilang: <span className="italic capitalize">{terbilang(total)}</span> Rupiah.</div>;
}

export function SJPrint({ sj }) {
  const totalRetur = sj.items.reduce(
    (s, it) => s + it.retur.reduce((r, x) => r + x.qty_ditolak, 0),
    0
  );
  return (
    <div style={dotStyle} className="w-full">
      <DocHeader
        tengah={
          <div className="text-3xl font-bold tracking-widest pt-4">SURAT JALAN</div>
        }
        kanan={
          <>
            <div className="mb-1 text-2xl font-bold">No. {sj.no_sj}</div>
            <div className="text-[15px]">{formatDateLong(sj.tanggal_kirim)}</div>
          </>
        }
      />
      <div className="mt-5 flex justify-between text-[15px] leading-relaxed">
        <div className="space-y-1">
          <MetaRow label="No. PO" value={sj.no_po} />
          <MetaRow label="Pengirim" value={sj.nama_pengirim} />
        </div>
        <div className="space-y-1 pr-8">
          <MetaRow label="Kepada Yth." value={sj.client_nama} />
        </div>
      </div>

      <table className="mt-6 w-full border-collapse text-[15px]">
        <thead>
          <tr>
            <th className={`${thClass} w-12`}>No</th>
            <th className={thClass}>Nama Barang</th>
            <th className={`${thClass} w-24`}>Satuan</th>
            <th className={`${thClass} w-24`}>Qty</th>
            <th className={`${thClass} w-64`}>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {sj.items.map((it, i) => (
            <tr key={it.id}>
              <td className={`${thTd} text-center`}>{i + 1}</td>
              <td className={thTd}>{it.nama_barang}</td>
              <td className={`${thTd} text-center`}>{it.satuan}</td>
              <td className={`${thTd} text-center font-bold`}>{it.qty_kirim}</td>
              <td className={thTd}>{it.keterangan || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalRetur > 0 && (
        <div className="mt-4 text-[15px] font-bold">
          Catatan Retur: {formatQty(totalRetur)} barang ditolak / dikembalikan.
        </div>
      )}

      <div className="mt-4 flex justify-between px-12 text-[15px]">
        <div className="text-center">
          <div>Pengirim,</div>
          <div className="pt-[48px] font-bold uppercase">( {sj.nama_pengirim || '................'} )</div>
        </div>
        <div className="text-center">
          <div>Penerima,</div>
          <div className="pt-[48px] font-bold uppercase">( {sj.client_nama} )</div>
        </div>
      </div>
    </div>
  );
}

export function InvoicePrint({ inv }) {
  return (
    <div style={dotStyle} className="w-full">
      <DocHeader
        tengah={
          <div className="text-3xl font-bold tracking-widest pt-4">INVOICE</div>
        }
        kanan={
          <>
            <div className="mb-1 text-2xl font-bold">No. {inv.no_invoice}</div>
            <div className="text-[15px]">{formatDateLong(inv.tanggal_invoice)}</div>
          </>
        }
      />
      <div className="mt-5 flex justify-between text-[15px] leading-relaxed">
        <div className="space-y-1">
          <MetaRow label="No. PO" value={inv.no_po} />
          <MetaRow label="No. SJ" value={inv.no_sj} />
        </div>
        <div className="space-y-1 pr-8">
          <MetaRow label="Kepada Yth." value={inv.client_nama} />
        </div>
      </div>

      <table className="mt-6 w-full border-collapse text-[15px]">
        <thead>
          <tr>
            <th className={`${thClass} w-12`}>No</th>
            <th className={thClass}>Nama Barang</th>
            <th className={`${thClass} w-24`}>Qty</th>
            <th className={`${thClass} w-24`}>Satuan</th>
            <th className={`${thClass} w-40 whitespace-nowrap`}>Harga Satuan (Rp)</th>
            <th className={`${thClass} w-40 whitespace-nowrap`}>Total (Rp)</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((it, i) => (
            <tr key={it.id}>
              <td className={`${thTd} text-center`}>{i + 1}</td>
              <td className={thTd}>{it.nama_barang}</td>
              <td className={`${thTd} text-center font-bold`}>{it.qty}</td>
              <td className={`${thTd} text-center`}>{it.satuan}</td>
              <td className={`${thTd} text-right`}>{formatQty(it.harga_satuan)}</td>
              <td className={`${thTd} text-right font-bold`}>{formatQty(it.subtotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} className={`${thTd} text-right font-bold`}>GRAND TOTAL</td>
            <td className={`${thTd} text-right font-bold text-lg`}>{formatQty(inv.total)}</td>
          </tr>
        </tfoot>
      </table>

      <TerbilangText total={inv.total} />

      <div className="mt-6 flex items-start justify-between">
        <div className="w-[420px] border-2 border-black p-2 text-center text-sm leading-relaxed font-bold">
          MOHON LAKUKAN PEMBAYARAN TEPAT WAKTU<br />
          UNTUK MENGHINDARI KETERLAMBATAN BARANG DAN DEMI KELANCARAN PRODUKSI BERSAMA.
        </div>

        <div className="text-center w-56 text-[15px] mr-8">
          <div>Hormat Kami,</div>
          <div className="pt-[48px] font-bold uppercase">( Antonius Sumera )</div>
        </div>
      </div>
    </div>
  );
}

export function TandaTerimaPrint({ tt }) {
  return (
    <div style={dotStyle} className="w-full">
      <DocHeader
        tengah={
          <div className="text-3xl font-bold tracking-widest pt-4">TANDA TERIMA</div>
        }
        kanan={
          <>
            <div className="mb-1 text-2xl font-bold">No. {tt.no_dokumen}</div>
            <div className="text-[15px]">{formatDateLong(tt.tanggal)}</div>
          </>
        }
      />

      <div className="mt-2 space-y-1 text-[15px] leading-relaxed">
        <MetaRow label="Diserahkan oleh" value={tt.diserahkan_oleh} />
        <MetaRow label="Diterima oleh" value={tt.diterima_oleh || '-'} />
      </div>

      <table className="mt-6 w-full border-collapse text-[15px]">
        <thead>
          <tr>
            <th className={`${thClass} w-12`}>No</th>
            <th className={thClass}>No. Invoice</th>
            <th className={thClass}>Tgl Invoice</th>
            <th className={thClass}>No. PO</th>
            <th className={thClass}>Tanggal PO</th>
            <th className={`${thClass} w-48 whitespace-nowrap`}>Jumlah (Rp)</th>
          </tr>
        </thead>
        <tbody>
          {tt.items.map((it, i) => (
            <tr key={it.id}>
              <td className={`${thTd} text-center`}>{i + 1}</td>
              <td className={`${thTd} text-center`}>{it.no_invoice}</td>
              <td className={`${thTd} text-center`}>{formatDateLong(it.tanggal_invoice)}</td>
              <td className={`${thTd} text-center`}>{it.no_po || ''}</td>
              <td className={`${thTd} text-center`}>{formatDateLong(it.tanggal_po)}</td>
              <td className={`${thTd} text-right font-bold`}>{formatRupiah(it.jumlah)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} className={`${thTd} text-right font-bold`}>GRAND TOTAL</td>
            <td className={`${thTd} text-right font-bold text-lg`}>{formatRupiah(tt.total)}</td>
          </tr>
        </tfoot>
      </table>

      <TerbilangText total={tt.total} />

      <div className="mt-6 flex justify-between px-12 text-[15px]">
        <div className="text-center">
          <div>Yang Menyerahkan,</div>
          <div className="pt-[48px] font-bold uppercase">( {tt.diserahkan_oleh} )</div>
        </div>
        <div className="text-center">
          <div>Yang Menerima,</div>
          <div className="pt-[48px] font-bold uppercase">( {tt.diterima_oleh || '.................'} )</div>
        </div>
      </div>
    </div>
  );
}

function formatRupiah(n) {
  return 'Rp ' + (n ?? 0).toLocaleString('id-ID');
}

function formatQty(n) {
  return (n ?? 0).toLocaleString('id-ID');
}

function formatDateLong(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateNumeric(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const SATUAN_KATA = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
function belasKata(n) {
  if (n < 12) return SATUAN_KATA[n];
  if (n < 20) return SATUAN_KATA[n - 10] + ' belas';
  if (n < 100) {
    const p = Math.floor(n / 10);
    const s = n % 10;
    return SATUAN_KATA[p] + ' puluh' + (s ? ' ' + SATUAN_KATA[s] : '');
  }
  return '';
}
function tigaDigitKata(n) {
  const r = Math.floor(n / 100);
  const sisa = n % 100;
  let s = '';
  if (r > 0) s += (r === 1 ? 'seratus' : SATUAN_KATA[r] + ' ratus');
  if (sisa > 0) {
    if (s) s += ' ';
    s += belasKata(sisa);
  }
  return s;
}
function terbilang(n) {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'nol';
  const gol = ['', 'ribu', 'juta', 'miliar', 'triliun'];
  const parts = [];
  let i = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk > 0) {
      if (i === 1 && chunk === 1) {
        parts.unshift('seribu');
      } else {
        parts.unshift(tigaDigitKata(chunk) + (gol[i] ? ' ' + gol[i] : ''));
      }
    }
    n = Math.floor(n / 1000);
    i++;
  }
  return parts.join(' ').trim().replace(/\s+/g, ' ');
}

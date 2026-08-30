// Layout cetak bergaya dotmatrix (monospace, hitam-putih, border tipis).
// Di produksi, komponen ini dirender ke HTML lalu dikirim ke printer dotmatrix
// dengan ukuran halaman custom (setengah A4 / continuous form).
// Layout disinkronkan dengan template produksi di electron/print.js.
import cingcuLogo from '../assets/cingculogo.png';

const dotStyle = {
  fontFamily: '"Courier New", Courier, monospace',
  fontSize: '11px',
  color: '#000',
  background: '#fff',
};

const thTd = 'border border-black px-1.5 py-0.5 text-center align-top';

function DocHeader({ kiri, tengah, kanan }) {
  return (
    <div>
      <div className="flex items-start justify-between relative">
        <img src={cingcuLogo} alt="logo" className="h-[72px] w-auto" />
        {tengah && <div className="absolute left-1/2 -translate-x-1/2 text-center leading-[18px]">{tengah}</div>}
        <div className="text-right leading-[22px] self-end text-sm">{kanan}</div>
      </div>
      <div className="mt-2 border-b-2 border-black" />
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div>
      <span className="inline-block w-[130px]">{label}</span>: {value}
    </div>
  );
}

function TerbilangText({ total }) {
  return <div className="mt-2.5 text-sm">Terbilang: <span className="italic capitalize">{terbilang(total)}</span> Rupiah.</div>;
}

export function SJPrint({ sj }) {
  const totalRetur = sj.items.reduce(
    (s, it) => s + it.retur.reduce((r, x) => r + x.qty_ditolak, 0),
    0
  );
  return (
    <div style={dotStyle} className="mx-auto max-w-3xl p-3">
      <DocHeader
        tengah={
          <div className="text-lg font-bold tracking-wide mt-2">SURAT JALAN</div>
        }
        kanan={
          <>
            <div className="text-2xl font-bold">No. {sj.no_sj}</div>
            <div>{formatDateLong(sj.tanggal_kirim)}</div>
          </>
        }
      />
      <div className="mt-3 flex justify-between text-sm leading-[22px]">
        <div>
          <MetaRow label="No. PO" value={sj.no_po} />
          <MetaRow label="Pengirim" value={sj.nama_pengirim} />
        </div>
        <div>
          <MetaRow label="Kepada Yth." value={sj.client_nama} />
        </div>
      </div>

      <table className="mt-3 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={`${thTd} text-center`}>No</th>
            <th className={`${thTd} text-center`}>Nama Barang</th>
            <th className={`${thTd} text-center`}>Satuan</th>
            <th className={`${thTd} text-center`}>Qty</th>
            <th className={`${thTd} text-center`}>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {sj.items.map((it, i) => (
            <tr key={it.id}>
              <td className={thTd}>{i + 1}</td>
              <td className={thTd}>{it.nama_barang}</td>
              <td className={thTd}>{it.satuan}</td>
              <td className={`${thTd} text-center`}>{it.qty_kirim}</td>
              <td className={thTd}>{it.keterangan || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalRetur > 0 && (
        <div className="mt-2 text-sm">
          Catatan Retur: {formatQty(totalRetur)} barang ditolak / dikembalikan.
        </div>
      )}

      <div className="mt-9 grid grid-cols-2 gap-8 text-sm">
        <div className="text-center">
          <div>Pengirim,</div>
          <div className="mt-14">{sj.nama_pengirim}</div>
        </div>
        <div className="text-center">
          <div>Penerima,</div>
          <div className="mt-14">( {sj.client_nama} )</div>
        </div>
      </div>
    </div>
  );
}

export function InvoicePrint({ inv }) {
  return (
    <div style={dotStyle} className="mx-auto max-w-3xl p-3">
      <DocHeader
        tengah={
          <div className="text-lg font-bold tracking-wide mt-2">INVOICE</div>
        }
        kanan={
          <>
            <div className="text-2xl font-bold">No. {inv.no_invoice}</div>
            <div>{formatDateLong(inv.tanggal_invoice)}</div>
          </>
        }
      />
      <div className="mt-3 flex justify-between text-sm leading-[22px]">
        <div>
          <MetaRow label="No. PO" value={inv.no_po} />
          <MetaRow label="No. SJ" value={inv.no_sj} />
          {inv.rest && <MetaRow label="Rest" value={inv.rest} />}
        </div>
        <div>
          <MetaRow label="Kepada Yth." value={inv.client_nama} />
        </div>
      </div>

      <table className="mt-3 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={`${thTd} w-8`}>No</th>
            <th className={thTd}>Nama Barang</th>
            <th className={`${thTd} w-12`}>Qty</th>
            <th className={`${thTd} w-16`}>Satuan</th>
            <th className={`${thTd} w-32 whitespace-nowrap`}>Harga Satuan (Rp)</th>
            <th className={`${thTd} w-32 whitespace-nowrap`}>Total (Rp)</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((it, i) => (
            <tr key={it.id}>
              <td className={thTd}>{i + 1}</td>
              <td className={thTd}>{it.nama_barang}</td>
              <td className={`${thTd} text-right`}>{it.qty}</td>
              <td className={thTd}>{it.satuan}</td>
              <td className={`${thTd} text-right`}>{formatQty(it.harga_satuan)}</td>
              <td className={`${thTd} text-right`}>{formatQty(it.subtotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} className={`${thTd} text-right font-bold`}>GRAND TOTAL</td>
            <td className={`${thTd} text-right font-bold`}>{formatQty(inv.total)}</td>
          </tr>
        </tfoot>
      </table>

      <TerbilangText total={inv.total} />

      <div className="mt-8 flex items-start justify-between">
        <div className="w-[340px] border border-black p-2 text-center text-[11px] leading-relaxed font-bold">
          MOHON LAKUKAN PEMBAYARAN TEPAT WAKTU<br />
          UNTUK MENGHINDARI KETERLAMBATAN BARANG DAN DEMI KELANCARAN PRODUKSI BERSAMA.
        </div>

        <div className="text-center w-48 text-sm">
          <div>Hormat Kami,</div>
          <div className="mt-14">Antonius Sumera</div>
        </div>
      </div>
    </div>
  );
}

export function TandaTerimaPrint({ tt }) {
  return (
    <div style={dotStyle} className="mx-auto max-w-3xl p-3">
      <DocHeader
        tengah={
          <div className="text-lg font-bold tracking-wide mt-2">TANDA TERIMA</div>
        }
        kanan={
          <>
            <div className="text-2xl font-bold">No. {tt.no_dokumen}</div>
            <div>{formatDateLong(tt.tanggal)}</div>
          </>
        }
      />

      <div className="mt-3 text-sm leading-[22px]">
        <MetaRow label="Diserahkan oleh" value={tt.diserahkan_oleh} />
        <MetaRow label="Diterima oleh" value={tt.diterima_oleh || '-'} />
      </div>

      <table className="mt-3 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={thTd}>No</th>
            <th className={thTd}>No. Invoice</th>
            <th className={thTd}>Tgl Invoice</th>
            <th className={thTd}>No. PO</th>
            <th className={thTd}>Tanggal PO</th>
            <th className={thTd}>Jumlah (Rp)</th>
          </tr>
        </thead>
        <tbody>
          {tt.items.map((it, i) => (
            <tr key={it.id}>
              <td className={thTd}>{i + 1}</td>
              <td className={thTd}>{it.no_invoice}</td>
              <td className={thTd}>{formatDateLong(it.tanggal_invoice)}</td>
              <td className={thTd}>{it.no_po || ''}</td>
              <td className={thTd}>{formatDateLong(it.tanggal_po)}</td>
              <td className={`${thTd} text-right`}>{formatRupiah(it.jumlah)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} className={`${thTd} text-right font-bold`}>GRAND TOTAL</td>
            <td className={`${thTd} text-right font-bold`}>{formatRupiah(tt.total)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-2.5 text-sm">Terbilang: <span className="italic capitalize">{terbilang(tt.total)}</span> Rupiah.</div>

      <div className="mt-9 grid grid-cols-2 gap-8 text-sm">
        <div className="text-center">
          <div>Yang Menyerahkan,</div>
          <div className="mt-14">( {tt.diserahkan_oleh} )</div>
        </div>
        <div className="text-center">
          <div>Yang Menerima,</div>
          <div className="mt-14">( {tt.diterima_oleh || '.................'} )</div>
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

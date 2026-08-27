// Layout cetak bergaya dotmatrix (monospace, hitam-putih, border tipis).
// Di produksi, komponen ini dirender ke HTML lalu dikirim ke printer dotmatrix
// dengan ukuran halaman custom (setengah A4 / continuous form).
import cingcuLogo from '../assets/cingculogo.png';

const dotStyle = {
  fontFamily: '"Courier New", Courier, monospace',
  fontSize: '12px',
  color: '#000',
  background: '#fff',
};

const thTd = 'border border-black px-1.5 py-0.5 text-left align-top';

function DocHeader({ kiri, kanan }) {
  return (
    <div>
      <div className="flex items-start justify-between">
        <img src={cingcuLogo} alt="logo" className="h-10 w-auto" />
        <div className="text-right text-xs leading-5">{kanan}</div>
      </div>
      <div className="mt-2 border-b border-black" />
    </div>
  );
}

export function SJPrint({ sj }) {
  const totalRetur = sj.items.reduce(
    (s, it) => s + it.retur.reduce((r, x) => r + x.qty_ditolak, 0),
    0
  );
  return (
    <div style={dotStyle} className="mx-auto max-w-3xl p-4">
      <DocHeader
        kanan={
          <>
            <div className="text-base font-bold">SURAT JALAN</div>
            <div>No. {sj.no_sj}</div>
            <div>Tanggal: {sj.tanggal_kirim}</div>
          </>
        }
      />
      <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
        <div>
          <div>No. PO: {sj.no_po}</div>
          <div>Kepada Yth: {sj.client_nama}</div>
        </div>
        <div>
          <div>Pengirim: {sj.nama_pengirim}</div>
          <div>Tanggal Kirim: {sj.tanggal_kirim}</div>
        </div>
      </div>

      <table className="mt-4 w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={thTd}>No</th>
            <th className={thTd}>Nama Barang</th>
            <th className={thTd}>Satuan</th>
            <th className={`${thTd} text-right`}>Qty</th>
            <th className={`${thTd} text-right`}>Berat (kg)</th>
            <th className={thTd}>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {sj.items.map((it, i) => (
            <tr key={it.id}>
              <td className={thTd}>{i + 1}</td>
              <td className={thTd}>{it.nama_barang}</td>
              <td className={thTd}>{it.satuan}</td>
              <td className={`${thTd} text-right`}>{it.qty_kirim}</td>
              <td className={`${thTd} text-right`}>{it.berat || '-'}</td>
              <td className={thTd}></td>
            </tr>
          ))}
        </tbody>
      </table>

      {sj.catatan && <div className="mt-3 text-xs">Catatan: {sj.catatan}</div>}
      {totalRetur > 0 && (
        <div className="mt-3 text-xs">
          Catatan Retur: {formatQty(totalRetur)} barang ditolak / dikembalikan.
        </div>
      )}

      <div className="mt-10 grid grid-cols-2 gap-8 text-xs">
        <div className="text-center">
          <div>Pengirim,</div>
          <div className="mt-16">{sj.nama_pengirim}</div>
        </div>
        <div className="text-center">
          <div>Penerima,</div>
          <div className="mt-16">( {sj.client_nama} )</div>
        </div>
      </div>
    </div>
  );
}

export function InvoicePrint({ inv }) {
  return (
    <div style={dotStyle} className="mx-auto max-w-3xl p-4">
      <DocHeader
        kanan={
          <>
            <div className="text-base font-bold">INVOICE</div>
            <div>No. {inv.no_invoice}</div>
            <div>Tanggal: {inv.tanggal_invoice}</div>
          </>
        }
      />
      <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
        <div>
          <div>No. PO: {inv.no_po}</div>
          <div>No. SJ: {inv.no_sj}</div>
        </div>
        <div>
          <div>Kepada Yth: {inv.client_nama}</div>
        </div>
      </div>

      <table className="mt-4 w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={thTd}>No</th>
            <th className={thTd}>Nama Barang</th>
            <th className={thTd}>Satuan</th>
            <th className={`${thTd} text-right`}>Qty</th>
            <th className={`${thTd} text-right`}>Harga</th>
            <th className={`${thTd} text-right`}>Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((it, i) => (
            <tr key={it.id}>
              <td className={thTd}>{i + 1}</td>
              <td className={thTd}>{it.nama_barang}</td>
              <td className={thTd}>{it.satuan}</td>
              <td className={`${thTd} text-right`}>{it.qty}</td>
              <td className={`${thTd} text-right`}>{formatRupiah(it.harga_satuan)}</td>
              <td className={`${thTd} text-right`}>{formatRupiah(it.subtotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} className={`${thTd} text-right font-bold`}>TOTAL</td>
            <td className={`${thTd} text-right font-bold`}>{formatRupiah(inv.total)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-10 grid grid-cols-2 gap-8 text-xs">
        <div className="text-center">
          <div>Hormat Kami,</div>
          <div className="mt-16">( NOTAPEDIA )</div>
        </div>
        <div className="text-center">
          <div>Mengetahui / Menerima,</div>
          <div className="mt-16">( {inv.client_nama} )</div>
        </div>
      </div>
    </div>
  );
}

export function TandaTerimaPrint({ tt }) {
  return (
    <div style={dotStyle} className="mx-auto max-w-3xl p-4">
      <DocHeader
        kanan={
          <>
            <div className="text-base font-bold">TANDA TERIMA</div>
            <div>No. {tt.no_dokumen}</div>
            <div>Tanggal: {tt.tanggal}</div>
          </>
        }
      />

      <div className="mt-4 text-xs">
        <div>Diserahkan oleh: {tt.diserahkan_oleh}</div>
        <div>Diterima oleh: {tt.diterima_oleh || '-'}</div>
      </div>

      <table className="mt-4 w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={thTd}>No</th>
            <th className={thTd}>No. Invoice</th>
            <th className={thTd}>No. SBI</th>
            <th className={`${thTd} text-right`}>Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {tt.items.map((it, i) => (
            <tr key={it.id}>
              <td className={thTd}>{i + 1}</td>
              <td className={thTd}>{it.no_invoice}</td>
              <td className={thTd}>{it.no_sbi}</td>
              <td className={`${thTd} text-right`}>{formatRupiah(it.jumlah)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className={`${thTd} text-right font-bold`}>TOTAL</td>
            <td className={`${thTd} text-right font-bold`}>{formatRupiah(tt.total)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-10 grid grid-cols-2 gap-8 text-xs">
        <div className="text-center">
          <div>Yang Menyerahkan,</div>
          <div className="mt-16">( {tt.diserahkan_oleh} )</div>
        </div>
        <div className="text-center">
          <div>Yang Menerima,</div>
          <div className="mt-16">( {tt.diterima_oleh || '.................'} )</div>
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
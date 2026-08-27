// Dummy data — mengikuti schema PRD. Data statis untuk review UI.

export const clients = [
  {
    id: 1,
    nama: 'PT Maju Bersama',
    alamat: 'Jl. Industri Raya No. 88, Surabaya',
    no_telp: '031-555-0101',
  },
  {
    id: 2,
    nama: 'CV Sinar Jaya',
    alamat: 'Jl. Gatot Subroto No. 12, Sidoarjo',
    no_telp: '031-555-0202',
  },
  {
    id: 3,
    nama: 'UD Sumber Rezeki',
    alamat: 'Jl. Veteran No. 45, Gresik',
    no_telp: '031-555-0303',
  },
  {
    id: 4,
    nama: 'PT Anugrah Sentosa',
    alamat: 'Jl. Diponegoro No. 17, Malang',
    no_telp: '0341-555-0404',
  },
];

export const poList = [
  {
    id: 1,
    no_po: 'PO/2026/08/001',
    client_id: 1,
    client_nama: 'PT Maju Bersama',
    tanggal_po: '2026-08-02',
    status: 'Open',
    catatan: 'Pengiriman sebelum tgl 10',
    items: [
      { id: 1, nama_barang: 'Besi Beton 12mm', satuan: 'batang', qty_pesan: 200, qty_terkirim: 80 },
      { id: 2, nama_barang: 'Semen Portland 50kg', satuan: 'sak', qty_pesan: 100, qty_terkirim: 100 },
      { id: 3, nama_barang: 'Pasir Urug', satuan: 'kubik', qty_pesan: 8, qty_terkirim: 3 },
    ],
  },
  {
    id: 2,
    no_po: 'PO/2026/08/002',
    client_id: 2,
    client_nama: 'CV Sinar Jaya',
    tanggal_po: '2026-08-05',
    status: 'Selesai',
    catatan: '',
    items: [
      { id: 4, nama_barang: 'Cat Tembok 25kg', satuan: 'kaleng', qty_pesan: 30, qty_terkirim: 30 },
      { id: 5, nama_barang: 'Kuas Roll 9 inch', satuan: 'pcs', qty_pesan: 20, qty_terkirim: 20 },
    ],
  },
  {
    id: 3,
    no_po: 'PO/2026/08/003',
    client_id: 3,
    client_nama: 'UD Sumber Rezeki',
    tanggal_po: '2026-08-10',
    status: 'Open',
    catatan: 'Tolong kirim bertahap',
    items: [
      { id: 6, nama_barang: 'Paku 5cm', satuan: 'kg', qty_pesan: 50, qty_terkirim: 0 },
      { id: 7, nama_barang: 'Triplek 9mm', satuan: 'lembar', qty_pesan: 40, qty_terkirim: 40 },
    ],
  },
  {
    id: 4,
    no_po: 'PO/2026/08/004',
    client_id: 4,
    client_nama: 'PT Anugrah Sentosa',
    tanggal_po: '2026-08-15',
    status: 'Open',
    catatan: '',
    items: [
      { id: 8, nama_barang: 'Keramik 40x40', satuan: 'dus', qty_pesan: 60, qty_terkirim: 25 },
    ],
  },
  {
    id: 5,
    no_po: 'PO/2026/08/005',
    client_id: 2,
    client_nama: 'CV Sinar Jaya',
    tanggal_po: '2026-08-25',
    status: 'Open',
    catatan: 'Belum ada SJ terbit — PO masih bisa diedit',
    items: [
      { id: 9, nama_barang: 'Pipa PVC 4 inch', satuan: 'batang', qty_pesan: 25, qty_terkirim: 0 },
      { id: 10, nama_barang: 'Lem Pipa', satuan: 'kaleng', qty_pesan: 10, qty_terkirim: 0 },
    ],
  },
];

export const suratJalanList = [
  {
    id: 1,
    no_sj: 'SJ-0001',
    po_id: 1,
    no_po: 'PO/2026/08/001',
    client_nama: 'PT Maju Bersama',
    tanggal_kirim: '2026-08-04',
    nama_pengirim: 'Budi Santoso',
    status: 'Diterima Penuh',
    catatan: 'Disetor oleh ekspedisi A',
    items: [
      {
        id: 1,
        po_item_id: 1,
        nama_barang: 'Besi Beton 12mm',
        qty_kirim: 80,
        qty_diterima: 80,
        berat: 600,
        retur: [],
      },
      {
        id: 2,
        po_item_id: 2,
        nama_barang: 'Semen Portland 50kg',
        qty_kirim: 100,
        qty_diterima: 100,
        berat: 5000,
        retur: [],
      },
    ],
  },
  {
    id: 2,
    no_sj: 'SJ-0002',
    po_id: 1,
    no_po: 'PO/2026/08/001',
    client_nama: 'PT Maju Bersama',
    tanggal_kirim: '2026-08-08',
    nama_pengirim: 'Andi Wijaya',
    status: 'Diterima Sebagian',
    catatan: 'Sebagian barang ditolak',
    items: [
      {
        id: 3,
        po_item_id: 1,
        nama_barang: 'Besi Beton 12mm',
        qty_kirim: 50,
        qty_diterima: 40,
        berat: 300,
        retur: [
          { id: 1, qty_ditolak: 10, alasan: 'Besi bengkok sebagian', tanggal: '2026-08-09' },
        ],
      },
      {
        id: 4,
        po_item_id: 3,
        nama_barang: 'Pasir Urug',
        qty_kirim: 3,
        qty_diterima: 3,
        berat: 0,
        retur: [],
      },
    ],
  },
  {
    id: 3,
    no_sj: 'SJ-0003',
    po_id: 2,
    no_po: 'PO/2026/08/002',
    client_nama: 'CV Sinar Jaya',
    tanggal_kirim: '2026-08-07',
    nama_pengirim: 'Budi Santoso',
    status: 'Diterima Penuh',
    catatan: '',
    items: [
      {
        id: 5,
        po_item_id: 4,
        nama_barang: 'Cat Tembok 25kg',
        qty_kirim: 30,
        qty_diterima: 30,
        berat: 750,
        retur: [],
      },
      {
        id: 6,
        po_item_id: 5,
        nama_barang: 'Kuas Roll 9 inch',
        qty_kirim: 20,
        qty_diterima: 20,
        berat: 10,
        retur: [],
      },
    ],
  },
  {
    id: 4,
    no_sj: 'SJ-0004',
    po_id: 3,
    no_po: 'PO/2026/08/003',
    client_nama: 'UD Sumber Rezeki',
    tanggal_kirim: '2026-08-12',
    nama_pengirim: 'Andi Wijaya',
    status: 'Diterima Penuh',
    catatan: '',
    items: [
      {
        id: 7,
        po_item_id: 7,
        nama_barang: 'Triplek 9mm',
        qty_kirim: 40,
        qty_diterima: 40,
        berat: 800,
        retur: [],
      },
    ],
  },
  {
    id: 5,
    no_sj: 'SJ-0005',
    po_id: 4,
    no_po: 'PO/2026/08/004',
    client_nama: 'PT Anugrah Sentosa',
    tanggal_kirim: '2026-08-17',
    nama_pengirim: 'Budi Santoso',
    status: 'Terkirim',
    catatan: 'Belum konfirmasi',
    items: [
      {
        id: 8,
        po_item_id: 8,
        nama_barang: 'Keramik 40x40',
        qty_kirim: 25,
        qty_diterima: 0,
        berat: 0,
        retur: [],
      },
    ],
  },
];

export const invoiceList = [
  {
    id: 1,
    no_invoice: 'INV-0001',
    po_id: 1,
    no_po: 'PO/2026/08/001',
    sj_id: 1,
    no_sj: 'SJ-0001',
    client_id: 1,
    client_nama: 'PT Maju Bersama',
    tanggal_invoice: '2026-08-05',
    status: 'Dibayar',
    tanggal_ditagih: '2026-08-12',
    tanggal_dibayar: '2026-08-20',
    items: [
      { id: 1, nama_barang: 'Besi Beton 12mm', qty: 80, satuan: 'batang', harga_satuan: 85000, subtotal: 6800000 },
      { id: 2, nama_barang: 'Semen Portland 50kg', qty: 100, satuan: 'sak', harga_satuan: 75000, subtotal: 7500000 },
    ],
    total: 14300000,
  },
  {
    id: 2,
    no_invoice: 'INV-0002',
    po_id: 1,
    no_po: 'PO/2026/08/001',
    sj_id: 2,
    no_sj: 'SJ-0002',
    client_id: 1,
    client_nama: 'PT Maju Bersama',
    tanggal_invoice: '2026-08-09',
    status: 'Ditagih',
    tanggal_ditagih: '2026-08-15',
    tanggal_dibayar: null,
    items: [
      { id: 3, nama_barang: 'Besi Beton 12mm', qty: 40, satuan: 'batang', harga_satuan: 85000, subtotal: 3400000 },
      { id: 4, nama_barang: 'Pasir Urug', qty: 3, satuan: 'kubik', harga_satuan: 350000, subtotal: 1050000 },
    ],
    total: 4450000,
  },
  {
    id: 3,
    no_invoice: 'INV-0003',
    po_id: 2,
    no_po: 'PO/2026/08/002',
    sj_id: 3,
    no_sj: 'SJ-0003',
    client_id: 2,
    client_nama: 'CV Sinar Jaya',
    tanggal_invoice: '2026-08-10',
    status: 'Dibayar',
    tanggal_ditagih: '2026-08-18',
    tanggal_dibayar: '2026-08-25',
    items: [
      { id: 5, nama_barang: 'Cat Tembok 25kg', qty: 30, satuan: 'kaleng', harga_satuan: 250000, subtotal: 7500000 },
      { id: 6, nama_barang: 'Kuas Roll 9 inch', qty: 20, satuan: 'pcs', harga_satuan: 35000, subtotal: 700000 },
    ],
    total: 8200000,
  },
  {
    id: 4,
    no_invoice: 'INV-0004',
    po_id: 3,
    no_po: 'PO/2026/08/003',
    sj_id: 4,
    no_sj: 'SJ-0004',
    client_id: 3,
    client_nama: 'UD Sumber Rezeki',
    tanggal_invoice: '2026-08-14',
    status: 'Terkirim',
    tanggal_ditagih: null,
    tanggal_dibayar: null,
    items: [
      { id: 7, nama_barang: 'Triplek 9mm', qty: 40, satuan: 'lembar', harga_satuan: 95000, subtotal: 3800000 },
    ],
    total: 3800000,
  },
];

export const tandaTerimaList = [
  {
    id: 1,
    no_dokumen: 'TT-0001',
    tanggal: '2026-08-15',
    diserahkan_oleh: 'Admin Notapedia',
    diterima_oleh: 'Bagian Keuangan CV Sinar Jaya',
    total: 12650000,
    items: [
      { id: 1, no_invoice: 'INV-0001', no_sbi: 'SBI/2026/08/0033', jumlah: 14300000 },
      { id: 2, no_invoice: 'INV-0002', no_sbi: 'SBI/2026/08/0034', jumlah: 4450000 },
    ],
  },
  {
    id: 2,
    no_dokumen: 'TT-0002',
    tanggal: '2026-08-18',
    diserahkan_oleh: 'Admin Notapedia',
    diterima_oleh: 'Bagian Keuangan CV Sinar Jaya',
    total: 8200000,
    items: [
      { id: 3, no_invoice: 'INV-0003', no_sbi: 'SBI/2026/08/0040', jumlah: 8200000 },
    ],
  },
];

export const formatRupiah = (n) =>
  'Rp ' + (n ?? 0).toLocaleString('id-ID');

export const formatDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatNumber = (n) => (n ?? 0).toLocaleString('id-ID');

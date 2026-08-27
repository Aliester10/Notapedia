// Type definitions (JSDoc) — merepresentasikan schema SQLite di PRD.
// Dipakai untuk konsistensi data dummy.

/**
 * @typedef {Object} Client
 * @property {number} id
 * @property {string} nama
 * @property {string} alamat
 * @property {string} no_telp
 */

/**
 * @typedef {Object} POItem
 * @property {number} id
 * @property {string} nama_barang
 * @property {string} satuan
 * @property {number} qty_pesan
 * @property {number} qty_terkirim
 */

/**
 * @typedef {Object} PO
 * @property {number} id
 * @property {string} no_po
 * @property {number} client_id
 * @property {string} tanggal_po   // YYYY-MM-DD
 * @property {'Open'|'Selesai'} status
 * @property {string} catatan
 * @property {POItem[]} items
 */

/**
 * @typedef {Object} SJItem
 * @property {number} id
 * @property {number} po_item_id
 * @property {string} nama_barang
 * @property {number} qty_kirim
 * @property {number} qty_diterima
 * @property {number} berat
 * @property {Retur[]} retur
 */

/**
 * @typedef {Object} Retur
 * @property {number} id
 * @property {number} qty_ditolak
 * @property {string} alasan
 * @property {string} tanggal
 */

/**
 * @typedef {Object} SuratJalan
 * @property {number} id
 * @property {string} no_sj
 * @property {number} po_id
 * @property {string} no_po
 * @property {string} client_nama
 * @property {string} tanggal_kirim
 * @property {string} nama_pengirim
 * @property {'Terkirim'|'Diterima Penuh'|'Diterima Sebagian'|'Ditolak'} status
 * @property {string} catatan
 * @property {SJItem[]} items
 */

/**
 * @typedef {Object} InvoiceItem
 * @property {number} id
 * @property {string} nama_barang
 * @property {number} qty
 * @property {string} satuan
 * @property {number} harga_satuan
 * @property {number} subtotal
 */

/**
 * @typedef {Object} Invoice
 * @property {number} id
 * @property {string} no_invoice
 * @property {number} po_id
 * @property {string} no_po
 * @property {number} sj_id
 * @property {string} no_sj
 * @property {number} client_id
 * @property {string} client_nama
 * @property {string} tanggal_invoice
 * @property {'Terkirim'|'Ditagih'|'Dibayar'} status
 * @property {string|null} tanggal_ditagih
 * @property {string|null} tanggal_dibayar
 * @property {number} total
 * @property {InvoiceItem[]} items
 */

/**
 * @typedef {Object} TandaTerimaItem
 * @property {number} id
 * @property {string} no_invoice
 * @property {string} no_sbi
 * @property {number} jumlah
 */

/**
 * @typedef {Object} TandaTerima
 * @property {number} id
 * @property {string} no_dokumen
 * @property {string} tanggal
 * @property {string} diserahkan_oleh
 * @property {string} diterima_oleh
 * @property {number} total
 * @property {TandaTerimaItem[]} items
 */

export {};

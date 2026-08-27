# Notapedia

Aplikasi desktop offline untuk pencatatan **Purchase Order (PO), Surat Jalan (SJ), dan Invoice** — single user, Windows.

## Fitur

- **Manajemen Client** — tambah/edit/hapus data client.
- **Purchase Order** — pencatatan PO dengan No PO manual, daftar barang & qty, pelacakan sisa qty otomatis (termasuk saat retur).
- **Surat Jalan** — pembuatan SJ dari PO (No SJ auto-generate), validasi qty ≤ sisa PO, konfirmasi penerimaan dengan retur/penolakan + alasan.
- **Invoice** — pembuatan dari SJ yang sudah diterima, harga manual, status penagihan **Terkirim → Ditagih → Dibayar** dengan tanggal otomatis.
- **Tanda Terima / Rekonsiliasi** — menggabungkan beberapa invoice dengan No SBI per baris.
- **Laporan** — laporan bulanan (filter bulan/tahun), rekap piutang per client, riwayat per PO, pencarian cepat.
- **Cetak** — Surat Jalan, Invoice (setengah A4), Tanda Terima, dan laporan (A4) ke printer dotmatrix/printer biasa; bisa disimpan sebagai PDF. Semua dokumen cetak memuat logo toko.
- **Export Excel** — laporan bulanan & rekap piutang dalam format `.xlsx` dengan desain seragam laporan PDF.
- **Backup/Restore** — satu file SQLite lokal, mudah di-backup.

## Tech Stack

| Layer | Teknologi |
|---|---|
| Runtime | Electron |
| UI | React + Tailwind CSS |
| Database | SQLite (better-sqlite3) |
| Export | SheetJS (xlsx) + JSZip |
| Packaging | electron-builder |

## Menjalankan

```bash
npm install
npm run electron        # build renderer + jalankan aplikasi desktop
npm run electron:dev    # mode development (vite + electron)
npm run dist            # buat installer .exe (electron-builder)
```

## Test

```bash
npm run test:services   # unit test business logic (Node)
npm run test:excel      # unit test export Excel
npm run test:electron   # smoke test runtime Electron
```
# Aplikasi Pencatatan PO, Surat Jalan & Invoice

**PRD — Project Requirements Document**
Aplikasi Desktop Offline — Single User, Windows
Versi 1.0 · 27 Agustus 2026

---

## Daftar Isi

1. [Overview](#1-overview)
2. [Requirements](#2-requirements)
3. [Core Features](#3-core-features)
   - [Fase 1: Purchase Order & Surat Jalan](#fase-1-purchase-order--surat-jalan)
   - [Fase 2: Invoice & Penagihan](#fase-2-invoice--penagihan)
   - [Fase 3: Laporan & Riwayat](#fase-3-laporan--riwayat)
4. [User Flow](#4-user-flow)
5. [Architecture](#5-architecture)
6. [Database Schema](#6-database-schema)
7. [Tech Stack](#7-tech-stack)

---

## 1. Overview

### 1.1 Latar Belakang

Saat ini proses pencatatan Purchase Order (PO), Surat Jalan (SJ), dan Invoice masih dilakukan secara manual menggunakan formulir cetak (dokumen dotmatrix) dan berkas fisik untuk merekonsiliasi tagihan (Tanda Terima). Proses ini rawan salah catat, sulit ditelusuri riwayatnya, dan menyulitkan pemantauan sisa barang yang belum dikirim maupun status pembayaran invoice.

Dibutuhkan aplikasi desktop yang menggantikan pencatatan manual tersebut, namun tetap mempertahankan alur kerja dan format dokumen cetak yang sudah familiar bagi tim (invoice & surat jalan gaya dotmatrix), tanpa mengubah cara kerja printer yang sudah ada.

### 1.2 Tujuan

- Mendigitalkan pencatatan PO, Surat Jalan, dan Invoice dalam satu aplikasi terintegrasi.
- Melacak sisa qty barang per PO yang belum terkirim, termasuk saat terjadi retur/penolakan sebagian barang.
- Melacak status penagihan tiap invoice (Terkirim → Ditagih → Dibayar).
- Mencetak Surat Jalan dan Invoice dengan layout yang kompatibel dengan printer dotmatrix yang sudah dipakai.
- Menyediakan laporan bulanan dan rekap piutang tanpa perlu rekap manual.
- Aplikasi berjalan 100% offline, tanpa ketergantungan koneksi internet atau server.

### 1.3 Target Pengguna

Satu orang admin/staf administrasi yang menangani seluruh pencatatan PO, penerbitan Surat Jalan, penerbitan Invoice, dan pemantauan status pembayaran. Aplikasi dijalankan pada satu unit komputer Windows (single user, single device).

### 1.4 Ruang Lingkup

**Termasuk (In Scope)**
- Pencatatan PO, Surat Jalan (dengan retur/revisi qty), dan Invoice.
- Cetak Surat Jalan dan Invoice ke printer dotmatrix.
- Dokumen Tanda Terima/rekonsiliasi untuk penagihan gabungan beberapa invoice.
- Laporan bulanan status SJ/Invoice, rekap piutang per client, dan riwayat per PO.
- Backup/restore database (copy file lokal).

**Tidak Termasuk (Out of Scope) — untuk versi ini**
- Multi-user / akses bersamaan dari beberapa komputer.
- Sinkronisasi cloud atau akses jarak jauh.
- Modul akuntansi/pembukuan penuh (jurnal, neraca, dsb).
- Integrasi otomatis dengan sistem client (EDI, API, dsb).

---

## 2. Requirements

### 2.1 Functional Requirements

| ID | Deskripsi |
|---|---|
| FR-01 | User dapat mencatat PO baru dengan No PO manual (dari client), nama client, tanggal, dan daftar barang beserta qty. |
| FR-02 | Sistem menghitung otomatis sisa qty per item PO yang belum dikirim. |
| FR-03 | User dapat membuat Surat Jalan (No SJ auto-generate) yang mereferensikan satu PO, memilih item & qty yang dikirim (tidak melebihi sisa qty PO). |
| FR-04 | User dapat mencatat penolakan/retur sebagian atau seluruh qty pada suatu Surat Jalan; qty yang ditolak dikembalikan ke sisa qty PO. |
| FR-05 | User dapat mencetak Surat Jalan ke printer dotmatrix dengan format yang sudah ditentukan (No SJ, No PO, nama pengirim, daftar barang & qty, kolom tanda tangan). |
| FR-06 | User dapat membuat Invoice (No Invoice auto-generate) yang mereferensikan satu PO dan satu Surat Jalan, dengan harga per item diinput manual. |
| FR-07 | User dapat mencetak Invoice ke printer dotmatrix (ukuran setengah A4) dengan format tanggal, nomor, daftar barang, harga, dan jumlah. |
| FR-08 | Sistem mencatat & menampilkan status invoice: Terkirim, Ditagih, Dibayar — beserta tanggal perubahan status. |
| FR-09 | User dapat membuat dokumen Tanda Terima yang menggabungkan beberapa invoice sekaligus untuk ditagihkan, dengan No SBI diinput manual per baris. |
| FR-10 | User dapat melihat laporan bulanan berisi daftar Surat Jalan/Invoice beserta status, dengan filter per bulan. |
| FR-11 | User dapat melihat rekap piutang (invoice belum dibayar) per client. |
| FR-12 | User dapat melihat riwayat lengkap suatu PO: seluruh SJ, retur, dan invoice terkait. |
| FR-13 | User dapat melakukan backup database dengan menyalin/mengekspor file database ke lokasi lain. |

### 2.2 Non-Functional Requirements

| ID | Deskripsi |
|---|---|
| NFR-01 | Aplikasi berjalan sepenuhnya offline, tanpa memerlukan koneksi internet. |
| NFR-02 | Aplikasi berjalan di Windows 10/11 sebagai aplikasi desktop mandiri (installer .exe). |
| NFR-03 | Seluruh data tersimpan dalam satu file database lokal (SQLite) agar mudah di-backup. |
| NFR-04 | Dukungan cetak ke printer dotmatrix dengan kontrol layout yang presisi (ukuran kertas custom / continuous form). |
| NFR-05 | Waktu buka aplikasi dan pencarian data (PO/SJ/Invoice) di bawah 1 detik untuk skala data ribuan transaksi/tahun. |

---

## 3. Core Features

Fitur dibagi menjadi 3 fase pengembangan, disusun mengikuti urutan alur dokumen (PO → Surat Jalan → Invoice → Rekonsiliasi/Laporan).

### Fase 1: Purchase Order & Surat Jalan

**Manajemen Client**
- Tambah/edit/hapus data client (nama, alamat, no. telepon).

**Manajemen PO**
- Input PO baru: No PO (manual), client, tanggal, daftar barang & qty.
- Lihat daftar PO dengan status Open/Selesai dan sisa qty per item.
- Edit PO selama belum ada Surat Jalan yang terbit dari PO tersebut.

**Surat Jalan**
- Buat Surat Jalan baru dari sebuah PO: pilih item & qty yang dikirim (maksimal sebesar sisa qty).
- No SJ auto-generate dengan format berurutan (contoh: `SJ-0001`).
- Input nama pengirim dan catatan pengiriman.
- Cetak Surat Jalan ke printer dotmatrix sesuai format contoh (No SJ, referensi No PO, daftar barang, qty, berat, kolom tanda tangan penerima).
- Konfirmasi penerimaan: tandai barang diterima penuh, sebagian, atau ditolak.
- Jika ditolak sebagian/seluruhnya: catat qty retur beserta alasan; qty tersebut otomatis kembali menjadi sisa qty PO.

### Fase 2: Invoice & Penagihan

**Invoice**
- Buat Invoice dari kombinasi PO + Surat Jalan yang sudah dikonfirmasi diterima.
- No Invoice auto-generate dengan format berurutan (contoh: `INV-0001`).
- Input harga per item secara manual, total dihitung otomatis.
- Cetak Invoice ke printer dotmatrix ukuran setengah A4 sesuai format contoh.
- Ubah status invoice: Terkirim → Ditagih → Dibayar, dengan tanggal tercatat otomatis di tiap perubahan.

**Tanda Terima / Rekonsiliasi Faktur**
- Buat dokumen Tanda Terima yang menggabungkan beberapa invoice yang siap ditagihkan sekaligus.
- Input No SBI (nomor referensi dari client) secara manual per baris invoice.
- Total jumlah dihitung otomatis dari invoice-invoice yang digabung.
- Cetak dokumen Tanda Terima.

### Fase 3: Laporan & Riwayat

- Laporan bulanan: daftar Surat Jalan/Invoice beserta status, dengan filter per bulan (seperti contoh laporan yang sudah dipakai saat ini).
- Rekap piutang: daftar invoice berstatus belum dibayar, dikelompokkan per client, dengan total nilai.
- Riwayat per PO: tampilkan seluruh Surat Jalan, retur, dan Invoice yang terkait dengan satu PO dalam satu tampilan.
- Pencarian cepat berdasarkan No PO / No SJ / No Invoice / nama client.
- Backup database: fitur ekspor/salin file database ke lokasi pilihan user.

---

## 4. User Flow

### 4.1 Alur Utama (Happy Path)

1. User membuka aplikasi → tampil Dashboard (ringkasan PO aktif, invoice belum dibayar).
2. User membuat PO baru → input No PO, client, dan daftar barang & qty → simpan (status PO: Open).
3. User membuat Surat Jalan dari PO tersebut → pilih item & qty yang akan dikirim → cetak Surat Jalan.
4. Barang dikirim ke client. Setelah client konfirmasi terima, user menandai Surat Jalan sebagai "Diterima" di aplikasi.
5. User membuat Invoice dari Surat Jalan yang sudah diterima → input harga manual per item → cetak Invoice (status: Terkirim).
6. Jika PO memiliki sisa item yang belum dikirim, user dapat mengulangi langkah 3–5 untuk sisa item tersebut (menghasilkan Invoice terpisah dengan No PO yang sama).
7. Ketika invoice siap ditagihkan, user membuat dokumen Tanda Terima, menggabungkan beberapa invoice, dan mengisi No SBI dari client → cetak dokumen.
8. User mengubah status invoice menjadi "Ditagih" setelah Tanda Terima diserahkan, lalu "Dibayar" setelah pembayaran diterima.
9. User dapat melihat laporan bulanan atau rekap piutang kapan saja dari menu Laporan.

### 4.2 Alur Alternatif: Barang Ditolak Sebagian

1. Pada langkah konfirmasi penerimaan Surat Jalan, user menandai sebagian/seluruh qty sebagai "Ditolak".
2. User mengisi alasan penolakan.
3. Sistem otomatis mengembalikan qty yang ditolak ke sisa qty PO.
4. Qty yang benar-benar diterima (bukan yang ditolak) yang akan dipakai sebagai dasar pembuatan Invoice.
5. User dapat membuat Surat Jalan baru di kemudian hari untuk mengirim ulang qty yang tadinya ditolak, masih dengan No PO yang sama.

---

## 5. Architecture

Aplikasi menggunakan arsitektur Electron standar dua-proses, dengan seluruh data disimpan lokal tanpa server eksternal.

### 5.1 Diagram Alur Komponen

```
Renderer (React UI)
      │  IPC
      ▼
IPC Bridge (preload.js)
      │
      ▼
Main Process (Electron)
      │
      ├──▶ SQLite Database (.db lokal)
      │
      └──▶ Print Module ──▶ Printer Dotmatrix
```

### 5.2 Komponen

| Komponen | Tanggung Jawab |
|---|---|
| Main Process (Electron) | Mengelola siklus hidup aplikasi, akses file system, koneksi ke SQLite, dan menjalankan perintah cetak ke printer. |
| Renderer Process (React) | Antarmuka pengguna: form PO/SJ/Invoice, daftar data, laporan, dan pratinjau cetak. |
| IPC Bridge (preload.js) | Jembatan komunikasi aman antara Renderer dan Main Process — Renderer tidak mengakses database/printer secara langsung. |
| Data Layer (better-sqlite3) | Membaca/menulis data ke file database SQLite lokal, termasuk transaksi (mis. update sisa qty PO saat SJ dibuat). |
| Print Module | Merender layout Invoice/Surat Jalan sebagai HTML, lalu mengirim ke printer dotmatrix dengan ukuran halaman custom (setengah A4 / continuous form). |
| Local File Storage | Menyimpan file database (.db) dan hasil backup di folder data aplikasi pada komputer user. |

### 5.3 Prinsip Desain

- **Offline-first**: tidak ada panggilan jaringan; seluruh logika & data berjalan lokal.
- **Single source of truth**: satu file SQLite menyimpan seluruh data transaksi, memudahkan backup (cukup salin 1 file).
- **Pemisahan tanggung jawab**: Renderer hanya menangani tampilan; semua akses data & printer melalui Main Process via IPC agar lebih aman dan mudah di-debug.

---

## 6. Database Schema

Database menggunakan SQLite (satu file lokal). Berikut struktur tabel utama.

### `client`
Menyimpan data client/pemesan.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER (PK) | ID unik client, auto-increment. |
| nama | TEXT | Nama client. |
| alamat | TEXT | Alamat client. |
| no_telp | TEXT | Nomor telepon client. |
| created_at | DATETIME | Waktu data dibuat. |

### `po`
Menyimpan data Purchase Order.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER (PK) | ID unik internal, auto-increment. |
| no_po | TEXT (UNIQUE) | Nomor PO, diinput manual dari client. |
| client_id | INTEGER (FK → client.id) | Referensi client pemesan. |
| tanggal_po | DATE | Tanggal PO diterima. |
| status | TEXT | Open / Selesai. |
| catatan | TEXT | Catatan tambahan (opsional). |
| created_at | DATETIME | Waktu data dibuat. |

### `po_item`
Menyimpan detail barang & qty per PO.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER (PK) | ID unik item PO. |
| po_id | INTEGER (FK → po.id) | Referensi PO induk. |
| nama_barang | TEXT | Nama barang yang dipesan. |
| satuan | TEXT | Satuan (kg, pcs, dsb). |
| qty_pesan | REAL | Qty yang dipesan dalam PO. |
| qty_terkirim | REAL | Total qty yang sudah terkirim & diterima (dihitung dari SJ Item). |

### `surat_jalan`
Menyimpan data Surat Jalan.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER (PK) | ID unik internal. |
| no_sj | TEXT (UNIQUE) | Nomor Surat Jalan, auto-generate (contoh: SJ-0001). |
| po_id | INTEGER (FK → po.id) | Referensi PO yang dikirim. |
| tanggal_kirim | DATE | Tanggal pengiriman. |
| nama_pengirim | TEXT | Nama pengirim/petugas. |
| status | TEXT | Terkirim / Diterima Penuh / Diterima Sebagian / Ditolak. |
| catatan | TEXT | Catatan pengiriman (opsional). |
| created_at | DATETIME | Waktu data dibuat. |

### `sj_item`
Menyimpan detail barang & qty per Surat Jalan.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER (PK) | ID unik baris item SJ. |
| sj_id | INTEGER (FK → surat_jalan.id) | Referensi Surat Jalan induk. |
| po_item_id | INTEGER (FK → po_item.id) | Referensi item PO yang dikirim. |
| qty_kirim | REAL | Qty yang dikirim pada SJ ini. |
| qty_diterima | REAL | Qty yang benar-benar diterima (setelah dikurangi retur). |
| berat | REAL | Berat barang (opsional, untuk dicetak di SJ). |

### `retur`
Menyimpan data retur/penolakan barang pada Surat Jalan.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER (PK) | ID unik retur. |
| sj_item_id | INTEGER (FK → sj_item.id) | Referensi item SJ yang ditolak. |
| qty_ditolak | REAL | Jumlah qty yang ditolak client. |
| alasan | TEXT | Alasan penolakan. |
| tanggal | DATE | Tanggal retur dicatat. |

### `invoice`
Menyimpan data Invoice beserta status penagihan.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER (PK) | ID unik internal. |
| no_invoice | TEXT (UNIQUE) | Nomor invoice, auto-generate (contoh: INV-0001). |
| po_id | INTEGER (FK → po.id) | Referensi PO. |
| sj_id | INTEGER (FK → surat_jalan.id) | Referensi Surat Jalan sumber invoice ini. |
| tanggal_invoice | DATE | Tanggal invoice diterbitkan. |
| status | TEXT | Terkirim / Ditagih / Dibayar. |
| tanggal_ditagih | DATE | Diisi otomatis saat status berubah menjadi Ditagih. |
| tanggal_dibayar | DATE | Diisi otomatis saat status berubah menjadi Dibayar. |
| total | REAL | Total nilai invoice (dihitung dari invoice_item). |

### `invoice_item`
Menyimpan detail barang, qty, dan harga per Invoice.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER (PK) | ID unik baris item invoice. |
| invoice_id | INTEGER (FK → invoice.id) | Referensi invoice induk. |
| nama_barang | TEXT | Nama barang yang ditagihkan. |
| qty | REAL | Qty yang ditagihkan. |
| harga_satuan | REAL | Harga per satuan, diinput manual. |
| subtotal | REAL | qty × harga_satuan (dihitung otomatis). |

### `tanda_terima`
Menyimpan dokumen rekonsiliasi/penyerahan invoice untuk ditagihkan.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER (PK) | ID unik internal. |
| no_dokumen | TEXT (UNIQUE) | Nomor dokumen Tanda Terima, auto-generate. |
| tanggal | DATE | Tanggal dokumen dibuat. |
| diserahkan_oleh | TEXT | Nama yang menyerahkan dokumen. |
| diterima_oleh | TEXT | Nama penerima di pihak client (opsional). |
| total | REAL | Total gabungan seluruh invoice dalam dokumen ini. |

### `tanda_terima_item`
Menyimpan daftar invoice & No SBI dalam satu dokumen Tanda Terima.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER (PK) | ID unik baris. |
| tanda_terima_id | INTEGER (FK → tanda_terima.id) | Referensi dokumen Tanda Terima induk. |
| invoice_id | INTEGER (FK → invoice.id) | Referensi invoice yang digabungkan. |
| no_sbi | TEXT | Nomor SBI dari client, diinput manual. |
| jumlah | REAL | Nilai invoice yang dicatat pada baris ini. |

### Relasi Utama

- `client` 1—N `po`
- `po` 1—N `po_item`
- `po` 1—N `surat_jalan`
- `surat_jalan` 1—N `sj_item`
- `sj_item` 1—N `retur`
- `surat_jalan` 1—1 `invoice` (satu SJ menghasilkan satu invoice)
- `invoice` 1—N `invoice_item`
- `tanda_terima` 1—N `tanda_terima_item`
- `invoice` 1—N `tanda_terima_item` (satu invoice bisa muncul di satu dokumen Tanda Terima)

---

## 7. Tech Stack

| Layer | Teknologi | Alasan Pemilihan |
|---|---|---|
| Runtime aplikasi | Electron | Memungkinkan aplikasi desktop offline dengan UI berbasis web; ekosistem printing (termasuk dotmatrix/ESC-P) paling matang dibanding alternatif seperti Tauri. |
| UI | React + Tailwind CSS | Pengembangan antarmuka cepat, komponen dapat dipakai ulang untuk form PO/SJ/Invoice yang mirip satu sama lain. |
| Database | SQLite (better-sqlite3) | Database file tunggal, tanpa server, sangat cocok untuk aplikasi single-user offline; mudah di-backup (copy file). |
| Cetak dokumen | HTML/CSS render + Chromium print API (custom page size) | Layout Invoice & Surat Jalan dirender sebagai HTML lalu dicetak dengan ukuran halaman custom (setengah A4 / continuous form) ke printer dotmatrix yang sudah ada. |
| Packaging | electron-builder | Membungkus aplikasi menjadi installer `.exe` untuk Windows. |
| Bahasa pemrograman | JavaScript / TypeScript | Konsisten di Main Process, Renderer, dan logika database. |

### Catatan Implementasi

- Karena kebutuhan single-user & offline, tidak diperlukan mekanisme sinkronisasi data atau server backend.
- Backup dilakukan dengan menyalin file database SQLite secara berkala (manual atau terjadwal oleh aplikasi ke folder pilihan user).
- Format cetak Invoice & Surat Jalan mengikuti contoh dokumen fisik yang sudah dipakai, agar transisi ke aplikasi tidak mengubah kebiasaan kerja tim di lapangan.
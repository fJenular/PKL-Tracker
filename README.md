# PKL Task Tracker 

Aplikasi pelacak tugas & kegiatan harian Praktik Kerja Lapangan (PKL) yang terintegrasi secara otomatis dengan **Google Spreadsheet** dan **Export Laporan PDF** berbasis template resmi dokumen **SMK TI BAZMA**.

---

## 🌟 Fitur Utama

1. **Task Tracker & Manajemen Kegiatan**:
   - Catat tanggal, hari (otomatis), rentang waktu, rincian tugas, user/PIC pemohon, tempat pelaksanaan, kendala, tindakan, status, dan catatan.
   - Filter berdasarkan status (*Selesai*, *Sedang Berjalan*, *Pending*), tanggal, atau pencarian teks bebas.
   - Perhitungan statistik otomatis (Total Tugas, Tugas Selesai, Tugas Berjalan, Total Hari Aktif).

2. **Integrasi Google Spreadsheet Real-Time**:
   - Setiap kali tugas baru disimpan, data otomatis terkirim dan ditambahkan ke baris baru di Google Spreadsheet Anda.
   - Mendukung sinkronisasi massal (*batch sync*) untuk tugas yang dibuat saat offline atau sebelum kredensial disetel.
   - Indikator status per baris untuk memantau tugas mana yang sudah tercatat di Google Spreadsheet.

3. **Export Laporan PKL Resmi ke PDF**:
   - Tata letak, kop surat (header & footer resmi SMK TI BAZMA), format judul, metadata siswa, tabel kegiatan, dan lembar pengesahan (3 kolom tanda tangan: User DU/DI, Pembimbing PKL, Peserta PKL) 100% presisi sesuai template Google Docs.
   - **Mode Penggabungan Kegiatan**: Tugas pada tanggal yang sama otomatis dirangkum menjadi *bullet points* kegiatan harian seperti format resmi BAZMA.
   - Pilihan cetak langsung (*Print / Save as PDF*) atau melalui halaman tab cetak khusus (`/print`).

4. **Pengaturan Profil & Google API**:
   - Kelola identitas siswa (Nama, NIS, Sekolah, Tempat PKL, Periode Bulan, Nama Pembimbing, User DU/DI, Ruangan Default).
   - Dukungan unggah file JSON Service Account atau *copy-paste* kredensial langsung.
   - Fitur **Tes Koneksi** untuk memverifikasi akses ke Spreadsheet secara instan.

---

## 🚀 Cara Menjalankan Aplikasi

Aplikasi berada di folder:
```bash
C:\Users\fjenu\.gemini\antigravity\scratch\pkl-task-tracker
```

### 1. Menjalankan di Mode Pengembangan (Development)
```bash
cd C:\Users\fjenu\.gemini\antigravity\scratch\pkl-task-tracker
npm run dev
```
Buka browser di: **[http://localhost:3000](http://localhost:3000)**

### 2. Menjalankan di Mode Produksi
```bash
npm run build
npm run start
```

---

## 📘 Panduan Integrasi Google Spreadsheet (Langkah demi Langkah)

Untuk mengaktifkan sinkronisasi otomatis ke Spreadsheet Anda (`15tFaxo-AJQNFBLAhUZEwjvEQYiY3twCzwl0vEFlIWnw`):

### Langkah 1: Buka Google Cloud Console & Buat Proyek
1. Buka [https://console.cloud.google.com/](https://console.cloud.google.com/).
2. Login menggunakan akun Google Anda.
3. Di pojok kiri atas, klik dropdown project &gt; pilih **New Project**.
4. Beri nama proyek, misalnya `PKL-Task-Tracker`, lalu klik **Create**.

### Langkah 2: Aktifkan Google Sheets API
1. Buka [Google Sheets API Library](https://console.cloud.google.com/apis/library/sheets.googleapis.com).
2. Pastikan project yang aktif adalah `PKL-Task-Tracker`.
3. Klik tombol biru **ENABLE (Aktifkan)**.

### Langkah 3: Buat Service Account & Unduh File Key JSON
1. Buka menu samping &gt; **IAM & Admin** &gt; **Service Accounts**.
2. Klik tombol **+ CREATE SERVICE ACCOUNT** di bagian atas.
3. Masukkan nama Service Account, misalnya `pkl-bot` &gt; klik **Create and Continue** &gt; klik **Done**.
4. Klik pada Service Account yang baru dibuat &gt; buka tab **KEYS**.
5. Klik **ADD KEY** &gt; **Create new key** &gt; pilih format **JSON** &gt; klik **Create**.
6. File kunci JSON akan otomatis terunduh ke komputer Anda.

### Langkah 4: Bagikan Spreadsheet ke Email Service Account
1. Buka file JSON yang baru Anda unduh menggunakan Text Editor (Notepad/VS Code).
2. Cari dan salin nilai `client_email` (contoh: `pkl-bot@project-xxxx.iam.gserviceaccount.com`).
3. Buka Spreadsheet Anda: [Link Spreadsheet](https://docs.google.com/spreadsheets/d/15tFaxo-AJQNFBLAhUZEwjvEQYiY3twCzwl0vEFlIWnw/edit).
4. Klik tombol **Share (Bagikan)** di pojok kanan atas.
5. Tempelkan email Service Account tersebut, pilih role **Editor**, lalu klik **Kirim / Bagikan**.

### Langkah 5: Masukkan ke Aplikasi
1. Buka aplikasi di [http://localhost:3000](http://localhost:3000).
2. Klik tombol **Pengaturan (ikon gerigi)** di pojok kanan atas.
3. Buka tab **Integrasi Google Sheets**.
4. Klik tombol **Pilih File JSON Key** dan pilih file JSON yang Anda unduh tadi (atau tempel isinya).
5. Klik tombol **Tes Koneksi ke Spreadsheet** untuk memastikan koneksi berhasil.
6. Klik **Simpan Perubahan**.

Sekarang, setiap kali Anda menambah atau memperbarui tugas, data akan otomatis masuk ke Google Spreadsheet!

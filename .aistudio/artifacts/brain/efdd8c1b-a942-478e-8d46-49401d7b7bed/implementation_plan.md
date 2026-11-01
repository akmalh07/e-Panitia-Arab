# Pelan Perlaksanaan: Laporan dan Penilaian Tahunan Panitia

## 1. Gambaran Keseluruhan & Objektif
Menambah modul **Laporan dan Penilaian Tahunan Panitia** lengkap ke dalam sistem pengurusan panitia. Modul ini membolehkan Guru Panitia menjana, menyunting, mencetak, dan memuat turun (PDF & Word `.docx`) laporan tahunan merangkumi **7 bahagian utama** mengikut piawaian Pengurusan Panitia Kementerian Pendidikan Malaysia (KPM).

---

## 2. Struktur 7 Bahagian Utama Laporan Tahunan

1. **Laporan Aktiviti Panitia**: Senarai mesyuarat panitia, penyenggaraan bahan/aset, dan aktiviti berkala sepanjang tahun.
2. **Laporan Program Akademik**: Pelaksanaan program peningkatan akademik, program intervensi, dan penilaian keberkesanannya.
3. **Rumusan Pencapaian Murid**: Analisis purata gred, peratus kelulusan, taburan TP (PBD), dan keputusan ujian diagnostik/UASA.
4. **Penilaian Pencapaian Objektif Panitia**: Perbandingan Sasaran Kerja Tahunan (KPI) panitia dengan pencapaian sebenar.
5. **Rumusan Kekuatan dan Kelemahan**: Analisis SWOT (Kekuatan, Kelemahan, Peluang, Ancaman) serta kekangan pelaksanaan.
6. **Cadangan Penambahbaikan**: Syor langkah susulan dan strategi penambahbaikan berimpak tinggi.
7. **Perancangan Awal Bagi Tahun Berikutnya**: Takwim ringkas, sasaran KPI baharu, dan anggaran belanjawan/keperluan bahan.

---

## 3. Ciri-Ciri Utama (Smart Features)

* **Jana Otomatik (Auto-Populate)**: 
  Satu klik butang untuk mengekstrak data sedia ada secara automatik:
  - Data rumusan markah dan TP murid dari modul Ujian & PBD.
  - Data program intervensi dari modul Intervensi.
  - Rekod penggunaan aset/peralatan panitia dari modul Aset.
* **Templat Cadangan & Draf Teks Piawai**:
  Menyediakan contoh frasa dan cadangan penambahbaikan piawai KPM untuk memudahkan guru.
* **Format Cetakan Rasmi (PDF/Print)**:
  Layout bercetak lengkap dengan kepala surat sekolah (letterhead), jadual bergaris kemas, break muka surat otomatik, dan ruang tandatangan (Disediakan Oleh & Disahkan Oleh).
* **Eksport Dokumen Word (.docx)**:
  Menggunakan pustaka `docx` untuk mengeksport keseluruhan laporan tahunan atau bahagian berasingan ke dalam fail Microsoft Word `.docx` bercetak kemas.

---

## 4. Perubahan Fail & Senarai Tugas

1. **Model Data (`types.ts`)**:
   - Menambah antaramuka `AnnualReport` dan jenis data berkaitan 7 bahagian laporan.
2. **Perkhidmatan Database (`services/dbService.ts`)**:
   - Menambah fungsi simpan, muat, dan padam laporan tahunan dengan penyelarasan Firestore.
3. **Pustaka Eksport (`services/reportExportService.ts`)**:
   - Pustaka pembina dokumen `.docx` menggunakan `docx` & `file-saver`.
4. **Komponen Utama (`src/components/AnnualReportManager.tsx`)**:
   - Antaramuka pemilihan tahun laporan, borang penyuntingan 7 bahagian, mod pratonton cetakan, dan butang eksport PDF/Word.
5. **Navigasi Utama (`App.tsx`)**:
   - Menambah menu tab "Laporan Tahunan" dengan ikon laporan.

---

## 5. Pelan Semakan & Pengesahan
- Semakan penjanaan auto-populate daripada data ujian dan intervensi wujud.
- Semakan muat turun fail `.docx` bagi dokumen penuh dan bahagian individu.
- Semakan susun atur cetakan `window.print()` agar tidak terpotong.
- Ujian kompilasi (`compile_applet`) untuk memastikan tiada ralat binaan.

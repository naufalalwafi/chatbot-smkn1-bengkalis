# 🤖 Chatbot Pelayanan Akademik SMKN 1 Bengkalis

Aplikasi Chatbot interaktif berbasis **Flask (Python)**, **MySQL**, dan **NLP (TF-IDF & Cosine Similarity)** untuk menangani informasi pelayanan akademik, berita sekolah, serta pengelolaan data nilai siswa di SMKN 1 Bengkalis.

---

## 📌 Fitur Utama

- **Chatbot Akademik (NLP TF-IDF):** Menjawab pertanyaan umum (FAQ) seputar sekolah secara otomatis.
- **Portal & Dashboard Guru:**
  - Input & perbarui nilai siswa secara manual (NISN, Mata Pelajaran, Nilai Akhir, Semester, Tahun Ajaran).
  - Pilihan otomatis **Program Keahlian/Jurusan** SMKN 1 Bengkalis.
  - Penataan rekap nilai siswa berbasis *accordion* per individu.
  - Fitur penambahan FAQ baru langsung dari Portal Guru.
- **Panel Admin:**
  - Manajemen FAQ (Tambah, Edit, Hapus, Proteksi Akses).
  - Pengelolaan Data Pengguna (Data Siswa & Data Guru).
  - Penanganan *Unanswered Queries* (pertanyaan siswa yang belum terjawab oleh sistem).
- **Pengikatan Berita Sekolah:** Scraper otomatis berita & pengumuman terbaru dari situs resmi SMKN 1 Bengkalis.

---

## 🛠️ Prasyarat Perangkat Lunak (Software Requirements)

Sebelum menjalankan proyek, pastikan perangkat berikut telah terinstal:

1. **Python** (Versi 3.10 atau yang lebih baru)
2. **XAMPP / MySQL Server** (Untuk database MySQL & phpMyAdmin)
3. **Web Browser** (Google Chrome, Microsoft Edge, Firefox, dll.)
4. **Git** (Untuk mengkloning repositori)

---

## 🚀 Panduan Menjalankan Proyek (Setup & Installation)

Ikuti langkah-langkah di bawah ini untuk menjalankan aplikasi di lingkungan lokal:

### 1. Kloning Repositori
Buka Terminal / Command Prompt, lalu jalankan:
```bash
git clone [https://github.com/naufalalwafi/chatbot-smkn1-bengkalis.git](https://github.com/naufalalwafi/chatbot-smkn1-bengkalis.git)
cd chatbot-smkn1-bengkalis

2. Buat & Aktifkan Virtual Environment
# Membuat virtual environment
python -m venv venv

# Mengaktifkan di Windows (Command Prompt / PowerShell):
venv\Scripts\activate

# Mengaktifkan di Linux / macOS:
source venv/bin/activate

3. Instal Seluruh Dependensi / Pustaka Python
pip install -r requirements.txt

4. Konfigurasi Database MySQL
Buka XAMPP Control Panel dan nyalakan Apache & MySQL.

Buka browser lalu akses http://localhost/phpmyadmin.

Buat database baru bernama: db_smkn1_chatbot.

Pilih database tersebut, klik tab Import, lalu unggah berkas SQL db_smkn1_chatbot.sql yang ada di dalam folder proyek ini.

Akses Aplikasi di Browser
Halaman Utama (Chatbot Siswa): http://127.0.0.1:5000/

Portal Guru: http://127.0.0.1:5000/guru/login

Panel Admin: http://127.0.0.1:5000/admin

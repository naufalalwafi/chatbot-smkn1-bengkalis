-- 1. Tabel FAQ (Pangkalan Data NLP)
CREATE TABLE IF NOT EXISTS tb_faq (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pertanyaan TEXT NOT NULL,
    jawaban TEXT NOT NULL,
    kategori VARCHAR(50) DEFAULT 'Umum'
);

-- 2. Tabel Siswa (Autentikasi NISN)
CREATE TABLE IF NOT EXISTS tb_siswa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nisn VARCHAR(20) NOT NULL UNIQUE,
    nama_siswa VARCHAR(100) NOT NULL,
    kata_sandi VARCHAR(100) NOT NULL,
    kelas VARCHAR(50) NOT NULL,
    nilai_rapor TEXT NOT NULL
);

-- 3. Tabel Guru (Autentikasi NIP)
CREATE TABLE IF NOT EXISTS tb_guru (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nip VARCHAR(20) NOT NULL UNIQUE,
    nama_guru VARCHAR(100) NOT NULL,
    kata_sandi VARCHAR(100) NOT NULL,
    mata_pelajaran VARCHAR(50) NOT NULL
);

-- 4. Tabel Unanswered Queries (Log Cosine Similarity < 0.40)
CREATE TABLE IF NOT EXISTS tb_unanswered (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pertanyaan_user TEXT NOT NULL,
    skor_similarity FLOAT NOT NULL,
    waktu TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data Dummy
INSERT INTO tb_faq (pertanyaan, jawaban, kategori) VALUES
('Bagaimana cara mendaftar PPDB?', 'Pendaftaran PPDB dapat dilakukan secara online melalui website resmi sekolah pada menu PPDB.', 'PPDB');

INSERT INTO tb_siswa (nisn, nama_siswa, kata_sandi, kelas, nilai_rapor) VALUES
('12345678', 'Muhammad Wafi', 'sandi123', 'XII RPL', 'Matematika: 88, Pemrograman: 92');

INSERT INTO tb_guru (nip, nama_guru, kata_sandi, mata_pelajaran) VALUES
('19850101', 'Prof. Naufal, M.T.', 'guru123', 'Pemrograman Web');
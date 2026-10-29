from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import mysql.connector
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)
app.secret_key = 'smkn1_bengkalis_secret_key_chatbot'

# =========================================================
# KONEKSI DATABASE MYSQL
# =========================================================
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="db_smkn1_chatbot"
    )

# =========================================================
# HELPER: SCRAPER BERITA SMKN 1 BENGKALIS
# =========================================================
def scrape_school_news():
    url = "https://smkn1bengkalis.sch.id/"
    news_list = []
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            articles = soup.find_all('article', limit=5)
            for art in articles:
                title_tag = art.find(['h2', 'h3', 'a'])
                link_tag = art.find('a')
                date_tag = art.find('time')
                
                title = title_tag.get_text(strip=True) if title_tag else "Berita SMKN 1 Bengkalis"
                link = link_tag['href'] if link_tag and 'href' in link_tag.attrs else url
                date = date_tag.get_text(strip=True) if date_tag else "Terbaru"
                
                if not link.startswith('http'):
                    link = url + link
                    
                news_list.append({
                    'title': title,
                    'link': link,
                    'date': date
                })
    except Exception as e:
        print(f"Error scraping news: {e}")
    return news_list

# =========================================================
# ROUTING HALAMAN (TEMPLATES)
# =========================================================
@app.route('/')
def index():
    siswa_info = session.get('siswa')
    return render_template('index.html', siswa=siswa_info)

@app.route('/guru/login')
def guru_login():
    if 'guru' in session:
        return redirect(url_for('guru_dashboard'))
    return render_template('guru_login.html')

@app.route('/guru')
def guru_dashboard():
    if 'guru' not in session:
        return redirect(url_for('guru_login'))
    return render_template('guru_dashboard.html')

@app.route('/admin')
def admin_panel():
    return render_template('admin.html')

# =========================================================
# API ENDPOINT CHATBOT (LOGIKA NLP TF-IDF & OPSI KLARIFIKASI)
# =========================================================
@app.route('/api/chat', methods=['POST'])
def chat():
    user_message = request.json.get('message', '').strip()
    if not user_message:
        return jsonify({'status': 'error', 'response': 'Pesan tidak boleh kosong.'})

    user_msg_lower = user_message.lower()

    # 1. Pemicu Berita Sekolah
    if any(keyword in user_msg_lower for keyword in ['berita', 'kabar', 'pengumuman']):
        news_data = scrape_school_news()
        return jsonify({
            'status': 'success',
            'is_news': True,
            'response': 'Berikut adalah berita & pengumuman terbaru dari SMKN 1 Bengkalis:',
            'news': news_data
        })

    # 2. Pemicu Nilai Rapor Siswa
    if any(keyword in user_msg_lower for keyword in ['nilai', 'rapor', 'transkrip', 'indeks prestasi']):
        if 'siswa' not in session:
            return jsonify({
                'status': 'success',
                'requires_login': True,
                'response': 'Untuk melihat data nilai rapor pribadi Anda, silakan masuk/login menggunakan akun siswa terlebih dahulu.'
            })
        
        nisn = session['siswa']['nisn']
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM tb_siswa WHERE nisn = %s", (nisn,))
        siswa = cursor.fetchone()
        
        cursor.execute("SELECT * FROM tb_nilai WHERE nisn = %s", (nisn,))
        nilai_list = cursor.fetchall()
        conn.close()

        return jsonify({
            'status': 'success',
            'is_nilai': True,
            'response': f'Berikut adalah transkrip nilai rapor milik **{siswa["nama_siswa"]}**:',
            'student_info': siswa,
            'nilai': nilai_list
        })

    # 3. Pemicu Kata Pendek / Ambigu (Opsi Klarifikasi)
    if len(user_message.split()) <= 2 and user_msg_lower in ['jam', 'berapa', 'kapan', 'jurusan', 'syarat', 'masuk']:
        suggestions = [
            'Jam Layanan Tata Usaha (TU)',
            'Jadwal Kegiatan Belajar Mengajar (KBM)',
            'Syarat Pendaftaran PPDB',
            'Daftar Jurusan di SMKN 1 Bengkalis'
        ]
        return jsonify({
            'status': 'success',
            'is_suggestion': True,
            'response': 'Pertanyaan Anda cukup singkat. Silakan pilih salah satu topik yang mungkin Anda maksudkan di bawah ini:',
            'suggestions': suggestions
        })

    # 4. Pencarian TF-IDF Cosine Similarity pada tb_faq
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM tb_faq")
    faqs = cursor.fetchall()

    if not faqs:
        conn.close()
        return jsonify({'status': 'success', 'response': 'Sistem FAQ belum diisi oleh administrator.'})

    questions = [faq['pertanyaan'] for faq in faqs]
    vectorizer = TfidfVectorizer().fit(questions + [user_message])
    faq_vectors = vectorizer.transform(questions)
    user_vector = vectorizer.transform([user_message])

    similarities = cosine_similarity(user_vector, faq_vectors)[0]
    best_index = similarities.argmax()
    best_score = float(similarities[best_index])

    if best_score >= 0.25:
        matched_faq = faqs[best_index]
        
        if matched_faq.get('is_protected') == 1 and 'siswa' not in session:
            conn.close()
            return jsonify({
                'status': 'success',
                'requires_login': True,
                'response': 'Informasi ini bersifat khusus/terproteksi. Silakan login akun siswa untuk melihatnya.'
            })

        conn.close()
        return jsonify({
            'status': 'success',
            'response': matched_faq['jawaban']
        })

    # 5. Jika Tidak Ada Kemiripan -> Catat ke tb_unanswered_queries
    cursor.execute("""
        INSERT INTO tb_unanswered_queries (pertanyaan, skor_similarity) 
        VALUES (%s, %s)
    """, (user_message, best_score))
    conn.commit()
    conn.close()

    return jsonify({
        'status': 'success',
        'response': 'Maaf, saya belum dapat memahami pertanyaan Anda. Pertanyaan Anda telah dicatat agar ditinjau dan dijawab oleh tim administrasi sekolah.'
    })

# =========================================================
# API AUTHENTICATION (SISWA & GURU)
# =========================================================
@app.route('/api/login-siswa', methods=['POST'])
def login_siswa():
    data = request.json
    nisn = data.get('nisn')
    kata_sandi = data.get('kata_sandi')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM tb_siswa WHERE nisn = %s AND kata_sandi = %s", (nisn, kata_sandi))
    siswa = cursor.fetchone()
    conn.close()

    if siswa:
        session['siswa'] = siswa
        return jsonify({'status': 'success', 'message': 'Login siswa berhasil!'})
    return jsonify({'status': 'error', 'message': 'NISN atau Kata Sandi salah.'}), 401

@app.route('/api/login-guru', methods=['POST'])
def login_guru():
    data = request.json
    nip = data.get('nip')
    kata_sandi = data.get('kata_sandi')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM tb_guru WHERE nip = %s AND kata_sandi = %s", (nip, kata_sandi))
    guru = cursor.fetchone()
    conn.close()

    if guru:
        session['guru'] = guru
        return jsonify({'status': 'success', 'message': 'Login guru berhasil!'})
    return jsonify({'status': 'error', 'message': 'NIP atau Kata Sandi guru salah.'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'status': 'success', 'message': 'Berhasil keluar.'})

# =========================================================
# API GURU (PENGELOLAAN NILAI TERKELOMPOK)
# =========================================================
@app.route('/api/guru/nilai/grouped-list', methods=['GET'])
def get_grouped_nilai():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT DISTINCT kelas FROM tb_siswa ORDER BY kelas ASC")
    kelas_list = cursor.fetchall()

    result = []
    for k in kelas_list:
        nama_kelas = k['kelas']
        cursor.execute("SELECT nisn, nama_siswa, kelas FROM tb_siswa WHERE kelas = %s ORDER BY nama_siswa ASC", (nama_kelas,))
        siswa_list = cursor.fetchall()

        for s in siswa_list:
            cursor.execute("SELECT id as nilai_id, mata_pelajaran, guru_mapel, semester, tahun_ajaran, nilai_akhir FROM tb_nilai WHERE nisn = %s", (s['nisn'],))
            s['daftar_nilai'] = cursor.fetchall()

        result.append({
            'nama_kelas': nama_kelas,
            'daftar_siswa': siswa_list
        })

    conn.close()
    return jsonify({'status': 'success', 'data_kelas': result})

@app.route('/api/guru/nilai/upsert', methods=['POST'])
def upsert_nilai():
    data = request.json
    nilai_id = data.get('id')
    nisn = data.get('nisn')
    nama_siswa = data.get('nama_siswa', '')
    kelas = data.get('kelas', '')

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Pastikan data siswa ada/diperbarui di tb_siswa
        if nisn:
            cursor.execute("SELECT nisn FROM tb_siswa WHERE nisn = %s", (nisn,))
            exist_siswa = cursor.fetchone()
            if not exist_siswa:
                cursor.execute("""
                    INSERT INTO tb_siswa (nisn, nama_siswa, kelas, kata_sandi)
                    VALUES (%s, %s, %s, '123456')
                """, (nisn, nama_siswa or f"Siswa {nisn}", kelas))
            else:
                if nama_siswa or kelas:
                    cursor.execute("""
                        UPDATE tb_siswa 
                        SET nama_siswa = COALESCE(NULLIF(%s, ''), nama_siswa),
                            kelas = COALESCE(NULLIF(%s, ''), kelas)
                        WHERE nisn = %s
                    """, (nama_siswa, kelas, nisn))

        # 2. Update jika ID nilai dikirim, jika tidak lakukan Insert baru
        if nilai_id:
            cursor.execute("""
                UPDATE tb_nilai 
                SET nisn = %s, kelas = %s, mata_pelajaran = %s, guru_mapel = %s, 
                    semester = %s, tahun_ajaran = %s, nilai_akhir = %s
                WHERE id = %s
            """, (
                nisn, kelas, data['mata_pelajaran'], data.get('guru_mapel', ''),
                data.get('semester', 'Ganjil'), data.get('tahun_ajaran', '2023/2024'),
                data['nilai_akhir'], nilai_id
            ))
        else:
            cursor.execute("""
                INSERT INTO tb_nilai (nisn, kelas, mata_pelajaran, guru_mapel, semester, tahun_ajaran, nilai_akhir)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                nisn, kelas, data['mata_pelajaran'], data.get('guru_mapel', ''),
                data.get('semester', 'Ganjil'), data.get('tahun_ajaran', '2023/2024'),
                data['nilai_akhir']
            ))

        conn.commit()
        return jsonify({'status': 'success', 'message': 'Data nilai berhasil disimpan!'})
    except Exception as e:
        conn.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/guru/nilai/delete/<int:nilai_id>', methods=['DELETE'])
def delete_nilai(nilai_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tb_nilai WHERE id = %s", (nilai_id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'message': 'Nilai berhasil dihapus.'})

# =========================================================
# API ADMIN (MANAGEMENT FAQ, SISWA, GURU & UNANSWERED)
# =========================================================
@app.route('/api/admin/data', methods=['GET'])
def get_admin_data():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT * FROM tb_faq ORDER BY id DESC")
    faqs = cursor.fetchall()

    cursor.execute("SELECT * FROM tb_unanswered_queries ORDER BY id DESC")
    unanswered = cursor.fetchall()

    conn.close()
    return jsonify({'status': 'success', 'faqs': faqs, 'unanswered': unanswered})

# FAQ CRUD
@app.route('/api/admin/faq/add', methods=['POST'])
def add_faq():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO tb_faq (pertanyaan, jawaban, is_protected)
        VALUES (%s, %s, %s)
    """, (data['pertanyaan'], data['jawaban'], data.get('is_protected', 0)))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'message': 'FAQ berhasil ditambahkan!'})

@app.route('/api/admin/faq/update/<int:faq_id>', methods=['PUT'])
def update_faq(faq_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE tb_faq 
        SET pertanyaan = %s, jawaban = %s, is_protected = %s 
        WHERE id = %s
    """, (data['pertanyaan'], data['jawaban'], data.get('is_protected', 0), faq_id))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'message': 'FAQ berhasil diperbarui!'})

@app.route('/api/admin/faq/delete/<int:faq_id>', methods=['DELETE'])
def delete_faq(faq_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tb_faq WHERE id = %s", (faq_id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'message': 'FAQ berhasil dihapus.'})

# Kelola Data Siswa
@app.route('/api/admin/siswa/list', methods=['GET'])
def get_siswa_list():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT nisn, nama_siswa, kelas FROM tb_siswa ORDER BY kelas ASC, nama_siswa ASC")
    siswa = cursor.fetchall()
    conn.close()
    return jsonify({'status': 'success', 'siswa': siswa})

@app.route('/api/admin/siswa/add', methods=['POST'])
def add_siswa():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO tb_siswa (nisn, nama_siswa, kelas, kata_sandi) 
        VALUES (%s, %s, %s, %s)
    """, (data['nisn'], data['nama_siswa'], data['kelas'], data['kata_sandi']))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'message': 'Siswa berhasil ditambahkan!'})

@app.route('/api/admin/siswa/delete/<string:nisn>', methods=['DELETE'])
def delete_siswa(nisn):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tb_siswa WHERE nisn = %s", (nisn,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'message': 'Siswa berhasil dihapus.'})

# Kelola Data Guru
@app.route('/api/admin/guru/list', methods=['GET'])
def get_guru_list():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT nip, nama_guru FROM tb_guru ORDER BY nama_guru ASC")
    guru = cursor.fetchall()
    conn.close()
    return jsonify({'status': 'success', 'guru': guru})

@app.route('/api/admin/guru/add', methods=['POST'])
def add_guru():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO tb_guru (nip, nama_guru, kata_sandi) 
            VALUES (%s, %s, %s)
        """, (data['nip'], data['nama_guru'], data['kata_sandi']))
        conn.commit()
        return jsonify({'status': 'success', 'message': 'Guru berhasil ditambahkan!'})
    except Exception as e:
        conn.rollback()
        return jsonify({'status': 'error', 'message': 'NIP sudah terdaftar atau terjadi kesalahan data.'}), 400
    finally:
        conn.close()

@app.route('/api/admin/guru/delete/<string:nip>', methods=['DELETE'])
def delete_guru(nip):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tb_guru WHERE nip = %s", (nip,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'message': 'Data guru berhasil dihapus.'})

# Fitur Menjawab Pertanyaan dari tb_unanswered_queries
@app.route('/api/admin/unanswered/answer', methods=['POST'])
def answer_unanswered_query():
    data = request.json
    unanswered_id = data.get('id')
    pertanyaan = data.get('pertanyaan')
    jawaban = data.get('jawaban')
    is_protected = data.get('is_protected', 0)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO tb_faq (pertanyaan, jawaban, is_protected)
            VALUES (%s, %s, %s)
        """, (pertanyaan, jawaban, is_protected))

        cursor.execute("DELETE FROM tb_unanswered_queries WHERE id = %s", (unanswered_id,))

        conn.commit()
        return jsonify({'status': 'success', 'message': 'Pertanyaan berhasil dijawab dan masuk ke FAQ!'})
    except Exception as e:
        conn.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/admin/unanswered/delete/<int:unanswered_id>', methods=['DELETE'])
def delete_unanswered_query(unanswered_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tb_unanswered_queries WHERE id = %s", (unanswered_id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'message': 'Pertanyaan berhasil dihapus.'})

# =========================================================
# JALANKAN SERVER FLASK
# =========================================================
if __name__ == '__main__':
    app.run(debug=True, port=5000)
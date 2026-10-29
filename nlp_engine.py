import mysql.connector
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def get_db():
  return mysql.connector.connect(
      host='localhost', user='root', password='', database='db_smkn1_chatbot'
  )


def cari_jawaban_nlp(pertanyaan_user, threshold=0.40):
  db = get_db()
  cursor = db.cursor(dictionary=True)

  cursor.execute('SELECT id, pertanyaan, jawaban FROM tb_faq')
  data_faq = cursor.fetchall()

  if not data_faq:
    cursor.close()
    db.close()
    return 'Maaf, basis data FAQ masih kosong.', 0.0

  corpus = [item['pertanyaan'] for item in data_faq]
  corpus.append(pertanyaan_user)

  # Ekstraksi Fitur TF-IDF
  vectorizer = TfidfVectorizer()
  tfidf_matrix = vectorizer.fit_transform(corpus)

  # Hitung Cosine Similarity antara input user dan data FAQ
  cosine_sim = cosine_similarity(tfidf_matrix[-1], tfidf_matrix[:-1]).flatten()

  best_match_idx = cosine_sim.argmax()
  best_score = float(cosine_sim[best_match_idx])

  # Pengecekan Ambang Batas (Threshold >= 0.40)
  if best_score >= threshold:
    jawaban = data_faq[best_match_idx]['jawaban']
    cursor.close()
    db.close()
    return jawaban, best_score
  else:
    # Simpan kueri tak terjawab ke database
    sql_insert = (
        'INSERT INTO tb_unanswered (pertanyaan_user, skor_similarity) VALUES'
        ' (%s, %s)'
    )
    cursor.execute(sql_insert, (pertanyaan_user, best_score))
    db.commit()

    cursor.close()
    db.close()

    return (
        'Maaf, saya belum memahami pertanyaan Anda. Pertanyaan Anda telah'
        ' dicatat untuk ditinjau oleh Admin.',
        best_score,
    )
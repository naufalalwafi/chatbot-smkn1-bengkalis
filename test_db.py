import mysql.connector


def cek_koneksi():
  try:
    db = mysql.connector.connect(
        host='localhost',
        user='root',
        password='',  # Default password Laragon kosong
        database='db_smkn1_chatbot',
    )

    if db.is_connected():
      cursor = db.cursor(dictionary=True)
      cursor.execute('SELECT * FROM tb_siswa')
      siswa = cursor.fetchone()

      print('====================================================')
      print('✅ KONEKSI KE MYSQL LARAGON BERHASIL!')
      print('====================================================')
      print('Data Siswa dari Database:', siswa)
      print('====================================================')

      cursor.close()
      db.close()

  except mysql.connector.Error as err:
    print('❌ Gagal terhubung ke database:', err)


if __name__ == '__main__':
  cek_koneksi()
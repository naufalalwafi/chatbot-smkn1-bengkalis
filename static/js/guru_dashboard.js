let globalRekapSiswa = [];

document.addEventListener("DOMContentLoaded", () => {
    loadRekapSiswa();
});

// 1. Ambil & Render Rekap Nilai Siswa
async function loadRekapSiswa() {
    const container = document.getElementById('rekap-siswa-container');
    try {
        const res = await fetch('/api/guru/nilai/grouped-list');
        const data = await res.json();

        if (data.status === 'success' && data.data_kelas) {
            renderRekapAccordion(data.data_kelas);
        } else {
            container.innerHTML = `<div class="alert alert-light text-center py-4 text-muted rounded-3">Belum ada data nilai terdaftar.</div>`;
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="alert alert-danger text-center py-4 rounded-3">Gagal memuat rekap nilai.</div>`;
    }
}

// 2. Render Accordion Rekap Nilai per Siswa
function renderRekapAccordion(dataKelas) {
    const container = document.getElementById('rekap-siswa-container');
    let allSiswa = [];
    globalRekapSiswa = [];

    dataKelas.forEach(kelasItem => {
        if (kelasItem.daftar_siswa) {
            kelasItem.daftar_siswa.forEach(s => {
                const item = {
                    nisn: s.nisn,
                    nama: s.nama_siswa || 'Siswa',
                    kelas: s.kelas || kelasItem.nama_kelas || 'Umum',
                    nilaiList: s.daftar_nilai || []
                };
                allSiswa.push(item);
                globalRekapSiswa.push(item);
            });
        }
    });

    if (allSiswa.length === 0) {
        container.innerHTML = `<div class="text-center py-4 text-muted">Belum ada data siswa terdaftar.</div>`;
        return;
    }

    let html = '';
    allSiswa.forEach((siswa, index) => {
        const collapseId = `collapseSiswa${index}`;
        const badgeColor = 'bg-primary';

        html += `
            <div class="accordion-item border rounded-3 mb-2 overflow-hidden shadow-sm">
                <h2 class="accordion-header" id="heading${index}">
                    <button class="accordion-button collapsed py-3 px-3 fw-semibold" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                        <div class="d-flex justify-content-between align-items-center w-100 pe-3">
                            <div>
                                <span class="text-dark fw-bold me-2">${siswa.nama}</span>
                                <small class="text-muted">(NISN: ${siswa.nisn})</small>
                            </div>
                            <span class="badge ${badgeColor} rounded-pill px-3 py-1">${siswa.kelas}</span>
                        </div>
                    </button>
                </h2>
                <div id="${collapseId}" class="accordion-collapse collapse" data-bs-parent="#rekap-siswa-container">
                    <div class="accordion-body p-0">
                        <div class="table-responsive">
                            <table class="table table-sm table-hover align-middle mb-0">
                                <thead class="table-light small">
                                    <tr>
                                        <th class="ps-3">Mata Pelajaran</th>
                                        <th>Guru Pengampu</th>
                                        <th class="text-center">Semester</th>
                                        <th class="text-center">Nilai Akhir</th>
                                        <th class="text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody class="small">
        `;

        if (siswa.nilaiList.length === 0) {
            html += `<tr><td colspan="5" class="text-center py-3 text-muted fst-italic">Belum ada data nilai.</td></tr>`;
        } else {
            siswa.nilaiList.forEach(n => {
                html += `
                    <tr>
                        <td class="ps-3 fw-medium">${n.mata_pelajaran}</td>
                        <td>${n.guru_mapel || '-'}</td>
                        <td class="text-center">${n.semester || 'Ganjil'}</td>
                        <td class="text-center fw-bold text-primary">${n.nilai_akhir}</td>
                        <td class="text-center">
                            <div class="d-flex justify-content-center gap-1">
                                <button class="btn btn-sm btn-outline-warning rounded-circle p-1 px-2" 
                                    onclick="editNilai('${siswa.nisn}', '${siswa.nama}', '${siswa.kelas}', ${n.nilai_id}, '${n.mata_pelajaran}', '${n.guru_mapel || ''}', '${n.semester || 'Ganjil'}', ${n.nilai_akhir}, '${n.tahun_ajaran || '2023/2024'}')" title="Edit Nilai">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger rounded-circle p-1 px-2" onclick="deleteNilai(${n.nilai_id})" title="Hapus Nilai">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// 3. Masukkan Data ke Form saat Tombol Edit Diklik
function editNilai(nisn, nama, kelas, nilaiId, mapel, guru, semester, nilai, ta) {
    document.getElementById('guru-nilai-id').value = nilaiId;
    document.getElementById('guru-nisn').value = nisn;
    document.getElementById('guru-nama-siswa').value = nama;

    // Pisahkan string kelas (misal "XII Teknik Jaringan Komputer dan Telekomunikasi 1")
    const progSelect = document.getElementById('guru-program-keahlian');
    const options = Array.from(progSelect.options).map(o => o.value);
    
    let foundProg = "";
    options.forEach(prog => {
        if (prog && kelas.includes(prog)) {
            foundProg = prog;
        }
    });

    if (foundProg) {
        progSelect.value = foundProg;
    }

    if (kelas.startsWith('X ')) document.getElementById('guru-tingkat-kelas').value = 'X';
    else if (kelas.startsWith('XI ')) document.getElementById('guru-tingkat-kelas').value = 'XI';
    else if (kelas.startsWith('XII ')) document.getElementById('guru-tingkat-kelas').value = 'XII';

    document.getElementById('guru-semester').value = semester;
    document.getElementById('guru-ta').value = ta || '2023/2024';
    document.getElementById('guru-mapel').value = mapel;
    document.getElementById('guru-pengampu').value = guru;
    document.getElementById('guru-nilai').value = nilai;

    // Ubah UI Form ke Mode Edit
    document.getElementById('form-title').innerHTML = `<i class="fa-solid fa-pen-to-square text-warning"></i> Edit Nilai Siswa`;
    document.getElementById('btn-submit-nilai').className = "btn btn-warning w-100 rounded-3 py-2 fw-semibold shadow-sm";
    document.getElementById('btn-submit-nilai').innerHTML = `<i class="fa-solid fa-check me-1"></i> Perbarui Nilai`;
    document.getElementById('btn-cancel-edit').classList.remove('d-none');
}

// Reset Form Input ke Mode Tambah Baru
function resetFormInput() {
    document.getElementById('form-input-nilai').reset();
    document.getElementById('guru-nilai-id').value = '';
    document.getElementById('form-title').innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Input / Perbarui Nilai Siswa`;
    document.getElementById('btn-submit-nilai').className = "btn btn-primary w-100 rounded-3 py-2 fw-semibold shadow-sm";
    document.getElementById('btn-submit-nilai').innerHTML = `<i class="fa-solid fa-floppy-disk me-1"></i> Simpan Nilai`;
    document.getElementById('btn-cancel-edit').classList.add('d-none');
}

// 4. Simpan / Update Nilai Siswa via API
async function handleSaveNilaiGuru(event) {
    event.preventDefault();

    const nilaiId = document.getElementById('guru-nilai-id').value;
    const nisn = document.getElementById('guru-nisn').value.trim();
    const namaSiswa = document.getElementById('guru-nama-siswa').value.trim();
    const programKeahlian = document.getElementById('guru-program-keahlian').value;
    const tingkatKelas = document.getElementById('guru-tingkat-kelas').value;
    const rombel = document.getElementById('guru-rombel').value.trim();

    // Gabungkan menjadi format nama kelas yang lengkap (Misal: XII Teknik Jaringan Komputer dan Telekomunikasi 1)
    const gabunganKelas = `${tingkatKelas} ${programKeahlian} ${rombel}`.trim();

    const semester = document.getElementById('guru-semester').value;
    const ta = document.getElementById('guru-ta').value.trim();
    const mapel = document.getElementById('guru-mapel').value.trim();
    const guru = document.getElementById('guru-pengampu').value.trim();
    const nilai = document.getElementById('guru-nilai').value;

    try {
        const res = await fetch('/api/guru/nilai/upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: nilaiId || null,
                nisn: nisn,
                nama_siswa: namaSiswa,
                kelas: gabunganKelas,
                semester: semester,
                tahun_ajaran: ta,
                mata_pelajaran: mapel,
                guru_mapel: guru,
                nilai_akhir: parseFloat(nilai)
            })
        });

        const data = await res.json();
        if (data.status === 'success') {
            alert('Data nilai berhasil disimpan!');
            resetFormInput();
            loadRekapSiswa();
        } else {
            alert(data.message || 'Gagal menyimpan nilai.');
        }
    } catch (e) {
        alert('Terjadi kesalahan jaringan.');
    }
}

// 5. Modal Handler FAQ Guru
function openModalTambahFAQGuru() {
    document.getElementById('form-faq-guru').reset();
    new bootstrap.Modal(document.getElementById('modalFAQGuru')).show();
}

async function handleSaveFAQGuru(event) {
    event.preventDefault();
    const pertanyaan = document.getElementById('guru-faq-pertanyaan').value.trim();
    const jawaban = document.getElementById('guru-faq-jawaban').value.trim();
    const isProtected = document.getElementById('guru-faq-protected').checked ? 1 : 0;

    try {
        const res = await fetch('/api/admin/faq/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pertanyaan, jawaban, is_protected: isProtected })
        });
        const data = await res.json();

        if (data.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modalFAQGuru')).hide();
            alert('FAQ baru berhasil ditambahkan!');
        } else {
            alert(data.message || 'Gagal menambahkan FAQ.');
        }
    } catch (e) {
        alert('Terjadi kesalahan sistem.');
    }
}

// 6. Hapus Nilai
async function deleteNilai(nilaiId) {
    if (!confirm('Hapus data nilai ini?')) return;
    try {
        await fetch(`/api/guru/nilai/delete/${nilaiId}`, { method: 'DELETE' });
        loadRekapSiswa();
    } catch (e) {
        alert('Gagal menghapus nilai.');
    }
}

// 7. Logout Guru
async function handleLogoutGuru() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/guru/login';
}
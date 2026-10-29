// Variable Global Penyimpan FAQ
let globalFaqs = [];

// Event Listener saat Halaman Selesai Dimuat
document.addEventListener("DOMContentLoaded", () => {
    loadAdminData();
    loadSiswaData();
    loadGuruData();
});

// 1. Fetch Data FAQ & Unanswered Queries
async function loadAdminData() {
    try {
        const response = await fetch('/api/admin/data');
        const data = await response.json();

        if (data.status === 'success' || data.faqs) {
            globalFaqs = data.faqs || [];
            renderFAQTable(globalFaqs);
            renderUnansweredTable(data.unanswered || []);
        } else {
            console.error('Gagal memuat data admin:', data.message);
        }
    } catch (error) {
        console.error('Terjadi kesalahan koneksi server:', error);
    }
}

// 2. Fetch Data Siswa
async function loadSiswaData() {
    try {
        const response = await fetch('/api/admin/siswa/list');
        const data = await response.json();
        if (data.status === 'success') {
            renderSiswaTable(data.siswa || []);
        }
    } catch (error) {
        console.error('Gagal memuat data siswa:', error);
    }
}

// 3. Fetch Data Guru
async function loadGuruData() {
    try {
        const response = await fetch('/api/admin/guru/list');
        const data = await response.json();
        if (data.status === 'success') {
            renderGuruTable(data.guru || []);
        }
    } catch (error) {
        console.error('Gagal memuat data guru:', error);
    }
}

// 4. Render Tabel FAQ (tb_faq)
function renderFAQTable(faqs) {
    const tbody = document.getElementById('faq-tbody');
    if (!tbody) return;

    if (!faqs || faqs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4 text-muted">
                    <i class="fa-solid fa-inbox fs-4 d-block mb-2"></i>Belum ada data FAQ tersedia.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = faqs.map(item => `
        <tr>
            <td class="ps-3 fw-bold text-secondary">${item.id}</td>
            <td class="fw-semibold text-dark">${item.pertanyaan}</td>
            <td>
                <div class="text-truncate-3" title="${item.jawaban}">
                    ${item.jawaban}
                </div>
            </td>
            <td class="text-center">
                ${item.is_protected == 1 
                    ? '<span class="badge bg-warning text-dark px-2 py-1"><i class="fa-solid fa-lock me-1"></i>Siswa</span>' 
                    : '<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1"><i class="fa-solid fa-globe me-1"></i>Umum</span>'}
            </td>
            <td class="text-center">
                <div class="d-flex justify-content-center gap-1">
                    <button class="btn btn-sm btn-outline-warning rounded-circle p-2" onclick="editFAQ(${item.id})" title="Edit FAQ">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger rounded-circle p-2" onclick="deleteFAQ(${item.id})" title="Hapus FAQ">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// 5. Render Tabel Siswa
function renderSiswaTable(siswa) {
    const tbody = document.getElementById('siswa-tbody');
    if (!tbody) return;

    if (!siswa || siswa.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">Belum ada data siswa.</td></tr>`;
        return;
    }

    tbody.innerHTML = siswa.map(s => `
        <tr>
            <td class="ps-3 fw-bold">${s.nisn}</td>
            <td>${s.nama_siswa}</td>
            <td><span class="badge bg-info text-dark">${s.kelas}</span></td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-danger rounded-circle p-2" onclick="deleteSiswa('${s.nisn}')" title="Hapus Siswa">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// 6. Render Tabel Guru
function renderGuruTable(guru) {
    const tbody = document.getElementById('guru-tbody');
    if (!tbody) return;

    if (!guru || guru.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted">Belum ada data guru.</td></tr>`;
        return;
    }

    tbody.innerHTML = guru.map(g => `
        <tr>
            <td class="ps-3 fw-bold">${g.nip}</td>
            <td class="fw-medium text-dark">${g.nama_guru}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-danger rounded-circle p-2" onclick="deleteGuru('${g.nip}')" title="Hapus Guru">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// 7. Render Tabel Unanswered Queries
function renderUnansweredTable(unanswered) {
    const tbody = document.getElementById('unanswered-tbody');
    if (!tbody) return;

    if (!unanswered || unanswered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4 text-muted">
                    <i class="fa-solid fa-circle-check fs-4 text-success d-block mb-2"></i>Tidak ada pertanyaan yang belum terjawab.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = unanswered.map(item => `
        <tr>
            <td class="ps-3 text-dark fw-medium">${item.pertanyaan}</td>
            <td class="text-center">
                <span class="badge bg-secondary-subtle text-secondary border px-2 py-1">${(parseFloat(item.skor_similarity || 0) * 100).toFixed(1)}%</span>
            </td>
            <td class="text-center text-muted small">${item.created_at || '-'}</td>
            <td class="text-center">
                <div class="d-flex justify-content-center gap-1">
                    <button class="btn btn-sm btn-primary rounded-pill px-2 py-1 shadow-sm d-flex align-items-center gap-1" onclick="openModalJawab('${item.id}', \`${item.pertanyaan.replace(/`/g, '\\`')}\`)">
                        <i class="fa-solid fa-reply"></i> Jawab
                    </button>
                    <button class="btn btn-sm btn-outline-danger rounded-circle p-1 px-2" onclick="deleteUnanswered(${item.id})" title="Abaikan / Hapus">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// 8. Tab Switcher Pengguna (Siswa / Guru)
function switchUserTab(type) {
    const viewSiswa = document.getElementById('view-siswa');
    const viewGuru = document.getElementById('view-guru');
    const btnSiswa = document.getElementById('tab-siswa-btn');
    const btnGuru = document.getElementById('tab-guru-btn');
    const btnContainer = document.getElementById('user-add-btn-container');

    if (type === 'siswa') {
        viewSiswa.classList.remove('d-none');
        viewGuru.classList.add('d-none');
        btnSiswa.classList.add('active');
        btnGuru.classList.remove('active');
        btnContainer.innerHTML = `
            <button class="btn btn-sm btn-outline-success rounded-pill px-3" onclick="openModalTambahSiswa()">
                <i class="fa-solid fa-user-plus me-1"></i> Tambah Siswa Baru
            </button>`;
    } else {
        viewSiswa.classList.add('d-none');
        viewGuru.classList.remove('d-none');
        btnSiswa.classList.remove('active');
        btnGuru.classList.add('active');
        btnContainer.innerHTML = `
            <button class="btn btn-sm btn-outline-primary rounded-pill px-3" onclick="openModalTambahGuru()">
                <i class="fa-solid fa-user-plus me-1"></i> Tambah Guru Baru
            </button>`;
    }
}

// 9. Modal Handlers (Buka Modal Tambah/Edit)
function openModalTambahFAQ() {
    document.getElementById('form-faq').reset();
    document.getElementById('faq-id').value = '';
    document.getElementById('modalFAQTitle').innerText = 'Tambah FAQ Baru';
    new bootstrap.Modal(document.getElementById('modalFAQ')).show();
}

function editFAQ(id) {
    const faq = globalFaqs.find(f => f.id == id);
    if (!faq) return;

    document.getElementById('faq-id').value = faq.id;
    document.getElementById('faq-pertanyaan').value = faq.pertanyaan;
    document.getElementById('faq-jawaban').value = faq.jawaban;
    document.getElementById('faq-protected').checked = faq.is_protected == 1;
    document.getElementById('modalFAQTitle').innerText = 'Edit FAQ (ID: ' + faq.id + ')';

    new bootstrap.Modal(document.getElementById('modalFAQ')).show();
}

function openModalTambahSiswa() {
    document.getElementById('form-siswa').reset();
    new bootstrap.Modal(document.getElementById('modalSiswa')).show();
}

function openModalTambahGuru() {
    document.getElementById('form-guru').reset();
    new bootstrap.Modal(document.getElementById('modalGuru')).show();
}

function openModalJawab(id, pertanyaan) {
    document.getElementById('form-jawab-unanswered').reset();
    document.getElementById('unanswered-id').value = id;
    document.getElementById('unanswered-pertanyaan').value = pertanyaan;
    new bootstrap.Modal(document.getElementById('modalJawabUnanswered')).show();
}

// 10. Handler Simpan/Update FAQ
async function handleSaveFAQ(event) {
    event.preventDefault();
    const id = document.getElementById('faq-id').value;
    const pertanyaan = document.getElementById('faq-pertanyaan').value.trim();
    const jawaban = document.getElementById('faq-jawaban').value.trim();
    const isProtected = document.getElementById('faq-protected').checked ? 1 : 0;

    const endpoint = id ? `/api/admin/faq/update/${id}` : '/api/admin/faq/add';
    const method = id ? 'PUT' : 'POST';

    try {
        const res = await fetch(endpoint, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pertanyaan, jawaban, is_protected: isProtected })
        });
        const data = await res.json();
        if (data.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modalFAQ')).hide();
            loadAdminData();
        } else {
            alert(data.message || 'Gagal menyimpan FAQ.');
        }
    } catch (e) {
        alert('Terjadi kesalahan server saat menyimpan FAQ.');
    }
}

// 11. Handler Simpan Siswa Baru
async function handleSaveSiswa(event) {
    event.preventDefault();
    const nisn = document.getElementById('siswa-nisn').value.trim();
    const nama_siswa = document.getElementById('siswa-nama').value.trim();
    const kelas = document.getElementById('siswa-kelas').value.trim();
    const kata_sandi = document.getElementById('siswa-pass').value.trim();

    try {
        const res = await fetch('/api/admin/siswa/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nisn, nama_siswa, kelas, kata_sandi })
        });
        const data = await res.json();
        if (data.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modalSiswa')).hide();
            loadSiswaData();
        } else {
            alert(data.message || 'Gagal menambah siswa.');
        }
    } catch (e) {
        alert('Terjadi kesalahan server.');
    }
}

// 12. Handler Simpan Guru Baru
async function handleSaveGuru(event) {
    event.preventDefault();
    const nip = document.getElementById('guru-nip').value.trim();
    const nama_guru = document.getElementById('guru-nama').value.trim();
    const kata_sandi = document.getElementById('guru-pass').value.trim();

    try {
        const res = await fetch('/api/admin/guru/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nip, nama_guru, kata_sandi })
        });
        const data = await res.json();
        if (data.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modalGuru')).hide();
            loadGuruData();
        } else {
            alert(data.message || 'Gagal menambah data guru.');
        }
    } catch (e) {
        alert('Terjadi kesalahan server saat menyimpan data guru.');
    }
}

// 13. Handler Jawab Unanswered Query
async function handleSaveAnsweredQuery(event) {
    event.preventDefault();
    const id = document.getElementById('unanswered-id').value;
    const pertanyaan = document.getElementById('unanswered-pertanyaan').value.trim();
    const jawaban = document.getElementById('unanswered-jawaban').value.trim();
    const isProtected = document.getElementById('unanswered-protected').checked ? 1 : 0;

    try {
        const res = await fetch('/api/admin/unanswered/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, pertanyaan, jawaban, is_protected: isProtected })
        });
        const data = await res.json();
        if (data.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modalJawabUnanswered')).hide();
            loadAdminData();
        } else {
            alert(data.message || 'Gagal menyimpan jawaban.');
        }
    } catch (e) {
        alert('Terjadi kesalahan jaringan.');
    }
}

// 14. Handler Hapus Data
async function deleteFAQ(id) {
    if (!confirm('Hapus FAQ ini?')) return;
    await fetch(`/api/admin/faq/delete/${id}`, { method: 'DELETE' });
    loadAdminData();
}

async function deleteSiswa(nisn) {
    if (!confirm(`Hapus siswa dengan NISN ${nisn}?`)) return;
    await fetch(`/api/admin/siswa/delete/${nisn}`, { method: 'DELETE' });
    loadSiswaData();
}

async function deleteGuru(nip) {
    if (!confirm(`Hapus guru dengan NIP ${nip}?`)) return;
    await fetch(`/api/admin/guru/delete/${nip}`, { method: 'DELETE' });
    loadGuruData();
}

async function deleteUnanswered(id) {
    if (!confirm('Hapus/abaikan pertanyaan ini dari daftar?')) return;
    await fetch(`/api/admin/unanswered/delete/${id}`, { method: 'DELETE' });
    loadAdminData();
}
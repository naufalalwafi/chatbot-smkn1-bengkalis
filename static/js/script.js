// 1. Helper Format Balasan Bot (Penomoran & Label Titik Dua)
function formatBotResponse(text) {
    if (!text) return '';

    let formatted = text;

    // Ubah baris baru (\n) biasa dari database menjadi <br>
    formatted = formatted.replace(/\n/g, '<br>');

    // Format penomoran angka (misal "1. ", "2. ")
    formatted = formatted.replace(/(\d+)\.\s+/g, '<br><strong class="text-primary">$1.</strong> ');

    // Format label titik dua khusus kata kunci tertentu
    formatted = formatted.replace(/(sebagai berikut:|berikut:)\s*/gi, '$1<br>');
    formatted = formatted.replace(/(Waktu Mulai:|Waktu Selesai:|Jam Masuk:|Jam Pulang:|Hari:|Lokasi:|Persyaratan:|Syarat:)\s*/gi, '<br>• <strong>$1</strong> ');

    // Bersihkan <br> berlebihan
    formatted = formatted.replace(/(<br>\s*){2,}/g, '<br>');
    if (formatted.startsWith('<br>')) {
        formatted = formatted.substring(4);
    }

    return formatted;
}

// 2. Render Pesan ke Chat Box
function appendMessage(sender, htmlContent) {
    const container = document.getElementById('chat-container');
    if (!container) return;
    
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${sender === 'user' ? 'user-message' : 'bot-message'}`;
    bubble.innerHTML = htmlContent;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
}

// 3. Handle Kirim Pesan ke API Chat
async function handleSendMessage(event) {
    event.preventDefault();
    const inputElem = document.getElementById('user-input');
    const message = inputElem.value.trim();
    if (!message) return;

    // Render Pesan User (Teks Polos Tanpa RegEx)
    appendMessage('user', message);
    inputElem.value = '';

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });
        const data = await response.json();

        // A. Opsi Klarifikasi / Suggestions
        if (data.is_suggestion) {
            let html = `<p class="mb-2 fw-semibold text-dark">${data.response}</p>`;
            html += `<div class="d-flex flex-column gap-2 mt-2">`;
            
            data.suggestions.forEach(item => {
                html += `
                    <button class="btn btn-sm btn-outline-primary text-start rounded-3 px-3 py-2 shadow-sm" onclick="sendQuickPrompt('${item}')">
                        <i class="fa-solid fa-circle-question me-2"></i>${item}
                    </button>
                `;
            });
            
            html += `</div>`;
            appendMessage('bot', html);

        // B. Berita Sekolah (Web Scraper)
        } else if (data.is_news) {
            let html = `<p class="mb-2 fw-bold text-primary">${data.response}</p>`;
            html += `<div class="list-group mt-2">`;
            if (data.news && data.news.length > 0) {
                data.news.forEach(item => {
                    html += `
                        <a href="${item.link}" target="_blank" class="list-group-item list-group-item-action mb-2 rounded border shadow-sm">
                            <div class="d-flex w-100 justify-content-between align-items-center mb-1">
                                <h6 class="mb-0 text-primary font-weight-bold">
                                    <i class="fa-solid fa-newspaper me-2"></i>${item.title}
                                </h6>
                                <small class="badge bg-secondary">${item.date}</small>
                            </div>
                            <small class="text-muted">Klik untuk membaca selengkapnya di website sekolah <i class="fa-solid fa-arrow-up-right-from-square ms-1"></i></small>
                        </a>
                    `;
                });
            } else {
                html += `<p class="text-muted">Tidak ada berita yang ditemukan.</p>`;
            }
            html += `</div>`;
            appendMessage('bot', html);

        // C. Tabel Nilai Rapor Siswa
        } else if (data.is_nilai) {
            let html = `<p class="mb-2 fw-bold text-primary">${data.response}</p>`;
            if (data.student_info && data.student_info.kelas) {
                html += `
                    <div class="card card-body bg-light border-0 mb-3 p-2 small text-dark">
                        <div class="row">
                            <div class="col-6"><strong>Nama:</strong> ${data.student_info.nama}</div>
                            <div class="col-6"><strong>NISN:</strong> ${data.student_info.nisn}</div>
                            <div class="col-6"><strong>Kelas:</strong> ${data.student_info.kelas}</div>
                            <div class="col-6"><strong>Tahun Ajaran:</strong> ${data.student_info.tahun_ajaran} (${data.student_info.semester})</div>
                        </div>
                    </div>
                `;
            }

            if (!data.nilai || data.nilai.length === 0) {
                html += `<p class="text-muted fst-italic">Belum ada data nilai tersedia.</p>`;
            } else {
                html += `
                    <div class="table-responsive">
                        <table class="table table-sm table-bordered custom-chat-table m-0">
                            <thead>
                                <tr>
                                    <th>Mata Pelajaran</th>
                                    <th>Guru Pengampu</th>
                                    <th class="text-center">Nilai Akhir</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.nilai.map(n => `
                                    <tr>
                                        <td>${n.mata_pelajaran}</td>
                                        <td>${n.guru_mapel || '-'}</td>
                                        <td class="fw-bold text-center">${n.nilai_akhir}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
            appendMessage('bot', html);

        // D. Teks Biasa (FAQ)
        } else {
            let html = formatBotResponse(data.response);
            if (data.requires_login) {
                html += `
                    <div class="mt-3">
                        <button class="btn btn-sm btn-primary rounded-pill px-3 shadow-sm" data-bs-toggle="modal" data-bs-target="#loginModal">
                            <i class="fa-solid fa-right-to-bracket me-1"></i> Masuk Sekarang
                        </button>
                    </div>
                `;
            }
            appendMessage('bot', html);
        }

    } catch (error) {
        appendMessage('bot', 'Maaf, terjadi kesalahan koneksi server.');
    }
}

// 4. Quick Prompt Handler
function sendQuickPrompt(promptText) {
    const inputElem = document.getElementById('user-input');
    if (inputElem) {
        inputElem.value = promptText;
        handleSendMessage(new Event('submit'));
    }
}

// 5. Login Siswa Handler
async function handleLoginSiswa(event) {
    event.preventDefault();
    const nisn = document.getElementById('login-nisn').value;
    const password = document.getElementById('login-password').value;
    const errDiv = document.getElementById('login-error');

    try {
        const res = await fetch('/api/login-siswa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nisn: nisn, kata_sandi: password })
        });
        const data = await res.json();

        if (data.status === 'success') {
            location.reload();
        } else {
            errDiv.innerText = data.message;
            errDiv.classList.remove('d-none');
        }
    } catch (e) {
        errDiv.innerText = 'Gagal melakukan login. Periksa jaringan Anda.';
        errDiv.classList.remove('d-none');
    }
}

// 6. Logout Handler
async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    location.reload();
}

// 7. Toggle Sidebar & Dark/Light Theme
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const icon = document.getElementById('theme-icon');
    if (currentTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        icon.className = 'fa-solid fa-moon';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        icon.className = 'fa-solid fa-sun';
    }
}

// 8. Event Listener saat Halaman Selesai Dibuat
document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById('chat-container');
    const inputElem = document.getElementById('user-input');

    if (container) {
        container.scrollTop = container.scrollHeight;
    }

    if (inputElem) {
        inputElem.focus();
    }
});
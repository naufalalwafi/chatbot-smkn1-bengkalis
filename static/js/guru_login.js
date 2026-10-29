async function handleLoginGuru(event) {
    event.preventDefault();
    
    const nip = document.getElementById('nip').value.trim();
    const password = document.getElementById('kata_sandi').value.trim();
    const errDiv = document.getElementById('login-error');

    try {
        const res = await fetch('/api/login-guru', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nip: nip, kata_sandi: password })
        });
        const data = await res.json();

        if (res.ok && data.status === 'success') {
            window.location.href = '/guru';
        } else {
            errDiv.innerText = data.message || 'NIP atau Kata Sandi salah!';
            errDiv.classList.remove('d-none');
        }
    } catch (e) {
        errDiv.innerText = 'Gagal melakukan login. Periksa koneksi server/jaringan Anda.';
        errDiv.classList.remove('d-none');
    }
}
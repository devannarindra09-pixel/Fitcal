FITCAL - IMT, Jadwal Olahraga & Kalori

CARA JALANKAN (dengan scan AI)
1. Install Node.js 18 atau lebih baru (nodejs.org).
2. Salin .env.example menjadi .env, lalu isi API key Gemini kamu
   (dari aistudio.google.com/apikey):
     GEMINI_API_KEY=AIza...
   (atau di terminal: GEMINI_API_KEY=AIza... node server.js)
3. Jalankan:  node server.js
4. Buka http://localhost:3000

Scan foto/teks dikirim ke server lokal, lalu server memanggil Gemini API.
API key tetap di server, tidak masuk ke browser.
Model bawaan: gemini-flash-latest (ganti lewat MODEL di .env,
misalnya MODEL=gemini-2.5-flash).

TANPA SERVER
Buka index.html langsung. Scan AI nonaktif, tapi kolom teks tetap
memberi estimasi dari database makanan Indonesia bawaan.

CATATAN
- Jangan menaruh API key di index.html atau mengunggah .env ke GitHub.
- Kalau di-deploy publik, tambahkan batas pemakaian (rate limit) agar
  kuota API tidak dihabiskan orang lain.
- Data profil dan riwayat kalori tersimpan di browser (localStorage).
- Hasil hanya estimasi, bukan pengganti saran dokter atau ahli gizi.

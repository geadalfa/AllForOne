# pagesource — Webpage Resource Capture CLI

Source: PyPI `pagesource` 0.1.2 · author Tim Farrelly · MIT · repo https://github.com/timf34/pagesource · verified 2026-11-13 on Windows 11, Python 3.11.9, Playwright 1.65.1.

## What it is

CLI Python (Typer + Playwright/Chromium, dependency `httpx`, `rich`) yang membuka sebuah URL di browser headless, merekam semua network response yang dimuat halaman (HTML, CSS, JS, gambar, font), lalu menyimpannya ke disk dengan struktur direktori mengikuti path URL. Padanan "simpan semua sumber" dari tab Sources/Network DevTools, tetapi hasilnya file nyata yang bisa dibaca, di-grep, dan dianalisis.

Contoh struktur output:

```text
pagesource_output/
  example.com/
    index.html
    assets/css/style.css
    assets/js/app.js
```

## Why it matters

- Bukti nyata untuk audit frontend: HTML setelah JS render, bundle CSS/JS asli, daftar aset, font yang dipakai.
- Bahan rekayasa balik ringan atau dokumentasi situs yang source-nya tidak tersedia.
- Snapshot aset saat melaporkan bug UI/QA, supaya temuan bisa diverifikasi ulang tanpa akses langsung.

## Key concepts

- Default hanya same-origin. `--include-external` menambahkan CDN/pihak ketiga ke folder host masing-masing.
- `--wait N` menunggu N detik setelah load, untuk SPA dan konten lazy.
- Query string dibuang dari nama file, ekstensi diinfer dari Content-Type, nama duplikat ditangani, path disanitasi agar aman di filesystem.
- Output default `./pagesource_output/<host>/...`; `-o` mengganti direktori.

## Workflow

```bash
# instal (sekali)
python -m pip install pagesource
python -m playwright install chromium

# capture
pagesource https://example.com -o ./capture --wait 3 --include-external

# capture + manifest ringkas (wrapper the agent)
python "<plugin-root>/tools/pagesource_capture.py" https://example.com -o ./capture
```

Wrapper membuat `_capture_manifest.md` berisi daftar file, ukuran, dan kategori (html/css/js/image/font/other) agar the agent tidak perlu menebak isi direktori.

## Verified behavior (2026-11-13)

- `pagesource --version` → `pagesource 0.1.2`; executable di `...\Python311\Scripts\pagesource.exe`.
- `https://example.com` → 2 resource disimpan (`index.html`, `s.js`).
- `https://pypi.org/project/pagesource/ --wait 2` → 40 resource terdeteksi, 20 disimpan (same-origin), 20 eksternal dilewati, total 789 KB.
- Chromium Playwright terpasang di `%LOCALAPPDATA%\ms-playwright` (winldd-1007). Tanpa ini CLI gagal jalan.

## Limitations

- Status alpha (0.1.x), baru 3 rilis, belum ada test suite publik yang jelas; perlakukan sebagai alat bantu, bukan sumber kebenaran tunggal.
- Hanya menangkap resource yang benar-benar dimuat browser; konten lazy di luar viewport atau di balik interaksi user tidak ikut.
- Tidak menghasilkan HAR, timing, atau waterfall — bukan pengganti DevTools Network performance.
- Tidak ada opsi login/cookie/session; halaman di balik autentikasi tidak bisa ditangkap apa adanya.
- Butuh Chromium Playwright; instalasi browser ±150 MB dan tidak ikut saat `pip install`.

## Ethics and legal

- Hanya capture situs yang the user berhak akses. Jangan scrape massal, jangan menyimpan data pribadi atau kredensial ke knowledge/memory.
- Hasil capture halaman berisi data sensitif harus diperlakukan sebagai artefak kerja sementara dan dihapus setelah dipakai.

## How the agent should use it

1. Recon frontend sebelum menilai UI/QA atau menulis temuan desain: ambil HTML/CSS/JS aktual, bukan menebak dari screenshot.
2. Bukti bug: simpan snapshot aset ke `outputs/` atau folder kerja saat melaporkan masalah rendering/JS.
3. Reverse engineering ringan level web (bukan biner) dan dokumentasi arsitektur frontend.
4. Selalu tulis ke folder kerja/outputs, jangan ke home; hapus output uji setelah selesai.

## References

- PyPI: https://pypi.org/project/pagesource/
- Repository: https://github.com/timf34/pagesource
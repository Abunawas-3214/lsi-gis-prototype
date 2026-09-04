# Product Requirements Document (PRD) - WebGIS Prototype

## 1. Tujuan
Memvalidasi fungsionalitas inti WebGIS (menampilkan peta, merender poligon, dan menggambar batas wilayah) menggunakan arsitektur yang disederhanakan sebelum beralih ke sistem produksi yang kompleks (PostGIS & Role-Based Access Control).

## 2. Lingkup (Scope)
Prototype ini hanya berfokus pada dua antarmuka utama tanpa adanya sistem autentikasi pengguna. Tata letak (UI) mengutamakan desain *full-bleed* (edge-to-edge) dengan *negative space* yang luas untuk memaksimalkan area visualisasi peta.

### 2.1 Halaman Home (`/`)
- **Tampilan:** Peta layar penuh yang berpusat di wilayah Jawa Timur (Latitude: -7.7, Longitude: 112.5).
- **Fungsi:** 
  - Mengambil data wilayah dari *database* lokal saat dimuat.
  - Merender objek GeoJSON (Poligon) ke atas peta.
  - Interaksi klik pada poligon akan memunculkan *popup* yang menampilkan variabel: `Nama Lembaga` dan `Status Kepemilikan`.

### 2.2 Halaman Editor (`/editor`)
- **Tampilan:** Peta layar penuh yang dilengkapi dengan panel instrumen *drawing tools* (khusus poligon).
- **Fungsi:**
  - Pengguna dapat menggambar batas wilayah (poligon) baru langsung di atas peta.
  - Setelah poligon tertutup/selesai, sebuah *modal/form* melayang (UI minimalis dengan Tailwind) akan muncul meminta input:
    - Nama Lembaga (Teks)
    - Status Kepemilikan (Dropdown: "Negeri", "Swasta")
  - Proses *submit* akan mengonversi bentuk visual menjadi *string* GeoJSON dan menyimpannya bersama data form ke *database*.

## 3. Tech Stack
- **Framework:** React
- **Mapping:** Leaflet & react-leaflet
- **Drawing Tool:** leaflet-draw
- **Database:** better-sqlite3 (Lokal, berbasis file)
- **Styling:** Tailwind CSS

## 4. Skema Database (SQLite)
Tabel: `regions`
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `name` (TEXT)
- `ownership` (TEXT)
- `geojson` (TEXT) - Menyimpan objek geometri GeoJSON yang di-*stringify*.

## 5. Batasan Teknis (Constraints)
- Leaflet tidak kompatibel dengan Server-Side Rendering (SSR). Semua komponen peta harus diimpor menggunakan `next/dynamic` dengan opsi `{ ssr: false }`.
- Tidak ada validasi *overlap* antar poligon pada fase prototype ini.
- Tidak ada relasi *parent-child* (hierarki wilayah), semua poligon berada di level yang sama (1 tingkat/datar).
# Database lokasi investasi DKI Jakarta

Database siap pakai: `investasi_dki.sqlite`.

## Isi database

- `lokasi`: 518 lokasi unik dari lima CSV kategori.
- `nama_alias`: nama lain yang ditemukan pada koordinat lokasi yang sama.
- `sumber_data`: daftar seluruh berkas sumber, checksum SHA-256, dan statistik impor.
- `metadata_batas_wilayah`: metadata ISO 19139 dari berkas XML.
- `ringkasan_kategori`: view jumlah lokasi per kategori.

Identitas unik lokasi adalah gabungan `id_adm_provinsi`, `longitude`, dan
`latitude`. Dengan aturan ini, tempat bernama sama pada koordinat berbeda tetap
dipertahankan, sedangkan record ganda pada koordinat yang sama tidak masuk dua
kali. Nama berbeda pada koordinat yang sama disimpan di `nama_alias`.

`semua_poi_investasi_dki_siap_overlay.csv` tidak diimpor lagi karena merupakan
gabungan yang mengulang isi lima CSV kategori. Berkas tersebut tetap tercatat
di `sumber_data`. XML batas desa/kelurahan hanya berisi metadata, bukan daftar
lokasi atau geometri, sehingga informasinya disimpan di
`metadata_batas_wilayah`.

## Contoh pemakaian

```sh
sqlite3 "investasi_dki.sqlite"
```

```sql
SELECT * FROM ringkasan_kategori ORDER BY kategori;

SELECT nama, kategori, latitude, longitude
FROM lokasi
WHERE kategori = 'rumah_sakit'
ORDER BY nama;
```

Untuk membangun ulang database dari semua berkas sumber:

```sh
python3 import_to_sqlite.py
```

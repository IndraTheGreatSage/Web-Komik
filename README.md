# KomikLoka

Template web baca manhua, manhwa, dan manga berbasis HTML, CSS, dan JavaScript statis. Cocok untuk deploy langsung ke Vercel tanpa build step.

Gunakan hanya konten yang kamu punya haknya, karya sendiri, public domain, atau sumber yang memang memberi izin untuk ditayangkan ulang.

## Cara Isi Data Banyak Sekaligus

Data utama ada di `komik-data.json`. Halaman web akan otomatis membaca file itu lewat `data.js`.

Kalau kamu punya API/JSON legal dari tempat lain, ubah URL di `config.js`:

```js
window.KOMIK_CONFIG = {
    dataUrl: "https://domain-kamu.com/komik-data.json",
};
```

Sumber data harus berupa JSON dengan bentuk:

```json
{
    "comics": [
        {
            "id": "judul-komik",
            "title": "Judul Komik",
            "type": "Manhwa",
            "status": "Berjalan",
            "rating": "4.8",
            "year": "2026",
            "author": "Nama Author",
            "cover": "https://cdn-kamu.com/cover.jpg",
            "genres": ["Action", "Fantasy"],
            "summary": "Ringkasan cerita.",
            "chapters": []
        }
    ]
}
```

## Chapter Manual, Gambar Otomatis

Pakai `pagePattern` kalau URL gambar chapter punya pola angka:

```json
{
    "id": "komik-chapter-1",
    "number": 1,
    "title": "Chapter 1",
    "updatedAt": "2026-06-09",
    "pagePattern": "https://cdn-kamu.com/komik/chapter-1/{page}.jpg",
    "pageStart": 1,
    "pageEnd": 20,
    "pagePad": 3
}
```

Contoh hasil dari `pagePad: 3`:

```text
001.jpg
002.jpg
003.jpg
```

## Banyak Chapter Otomatis

Pakai `chapterTemplate` kalau chapter dan gambar sama-sama punya pola URL:

```json
{
    "id": "judul-komik",
    "title": "Judul Komik",
    "cover": "https://cdn-kamu.com/cover.jpg",
    "chapterTemplate": {
        "start": 1,
        "end": 100,
        "order": "desc",
        "titlePattern": "Chapter {number}",
        "idPattern": "judul-komik-chapter-{number}",
        "pagePattern": "https://cdn-kamu.com/judul-komik/chapter-{chapter}/{page}.jpg",
        "pageStart": 1,
        "pageEnd": 18,
        "pagePad": 3
    }
}
```

Dengan format itu, 100 chapter langsung muncul, dan tiap chapter punya 18 halaman gambar otomatis.

## Chapter Dari File/API Terpisah

Kalau halaman gambar tiap chapter mau dipisah, pakai `pagesUrl`:

```json
{
    "id": "komik-chapter-1",
    "number": 1,
    "title": "Chapter 1",
    "pagesUrl": "https://domain-kamu.com/komik/chapter-1.json"
}
```

Isi `chapter-1.json`:

```json
{
    "pages": [
        "https://cdn-kamu.com/komik/chapter-1/001.jpg",
        "https://cdn-kamu.com/komik/chapter-1/002.jpg"
    ]
}
```

## Deploy Vercel

Vercel akan otomatis membaca `index.html` sebagai halaman utama. Setelah file di-push ke GitHub, Vercel akan redeploy lewat GitHub integration.

(async function () {
    const comics = window.KomikData ? await window.KomikData.loadLibrary() : [];
    const params = new URLSearchParams(window.location.search);
    const comicId = params.get("id");
    const comic = comics.find((item) => item.id === comicId);

    const escapeHtml = (value) => {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    };

    const showMissing = () => {
        const root = document.getElementById("detailRoot");
        if (root) {
            root.innerHTML = `
                <section class="empty-page">
                    <p class="eyebrow">Tidak ditemukan</p>
                    <h1>Komik belum ada di katalog.</h1>
                    <p>Pastikan link yang dibuka benar atau pastikan koneksi internet ke API lancar.</p>
                    <a class="primary-action" href="index.html">Kembali ke katalog</a>
                </section>
            `;
        }
    };

    const formatDate = (value) => {
        if (!value) return "Belum ada tanggal";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value; // Amankan format teks bawaan API seperti "1 minggu yang lalu"

        return date.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    if (!comic) {
        showMissing();
        return;
    }

    // Menarik daftar chapter secara live dari API Vercel baru (Lazy Load)
    if (window.KomikData.loadComicDetail) {
        await window.KomikData.loadComicDetail(comic);
    }

    const firstChapter = comic.chapters && comic.chapters.length > 0 
        ? comic.chapters[comic.chapters.length - 1] 
        : null;
        
    const readUrl = firstChapter
        ? `reader.html?id=${encodeURIComponent(comic.id)}&chapter=${encodeURIComponent(firstChapter.id)}`
        : "#";

    document.title = `${comic.title} - KomikLoka`;
    
    // Render data ke elemen HTML pendukung
    const coverEl = document.getElementById("detailCover");
    if (coverEl) {
        coverEl.src = comic.cover;
        coverEl.alt = `Cover ${comic.title}`;
    }
    
    const typeEl = document.getElementById("detailType");
    if (typeEl) typeEl.textContent = comic.type;
    
    const titleEl = document.getElementById("detailTitle");
    if (titleEl) titleEl.textContent = comic.title;
    
    const summaryEl = document.getElementById("detailSummary");
    if (summaryEl) summaryEl.textContent = comic.summary || "Sinopsis tidak tersedia untuk komik ini.";
    
    const startReadingEl = document.getElementById("startReading");
    if (startReadingEl) {
        startReadingEl.href = readUrl;
        startReadingEl.textContent = firstChapter ? "Mulai baca" : "Belum ada chapter";
    }
    
    const chapterCountEl = document.getElementById("chapterCount");
    if (chapterCountEl) {
        chapterCountEl.textContent = `${comic.chapters ? comic.chapters.length : 0} chapter`;
    }

    // Penyesuaian tampilan rating agar fleksibel mengikuti format angka dari API baru
    const displayRating = comic.rating && comic.rating !== "-" 
        ? (comic.rating.includes("/5") || comic.rating.includes("/10") ? comic.rating : `⭐ ${comic.rating}`)
        : "-";

    const metaEl = document.getElementById("detailMeta");
    if (metaEl) {
        metaEl.innerHTML = [
            comic.status || "Unknown",
            displayRating,
            comic.year || "-",
            comic.author || "Unknown",
        ].map((item) => `<span>${escapeHtml(item)}</span>`).join("");
    }

    const tagsEl = document.getElementById("detailTags");
    if (tagsEl && comic.genres) {
        tagsEl.innerHTML = comic.genres
            .map((genre) => `<span>${escapeHtml(genre)}</span>`)
            .join("");
    }

    const chapterListEl = document.getElementById("chapterList");
    if (chapterListEl && comic.chapters) {
        chapterListEl.innerHTML = comic.chapters.map((chapter) => {
            const chapterUrl = `reader.html?id=${encodeURIComponent(comic.id)}&chapter=${encodeURIComponent(chapter.id)}`;
            const date = formatDate(chapter.updatedAt);

            return `
                <a class="chapter-row" href="${chapterUrl}">
                    <span>${escapeHtml(chapter.title)}</span>
                    <time datetime="${escapeHtml(chapter.updatedAt)}">${escapeHtml(date)}</time>
                </a>
            `;
        }).join("");
    }
})();
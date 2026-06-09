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
        root.innerHTML = `
            <section class="empty-page">
                <p class="eyebrow">Tidak ditemukan</p>
                <h1>Komik belum ada di katalog.</h1>
                <p>Pastikan link yang dibuka benar atau tambahkan datanya di file data JSON.</p>
                <a class="primary-action" href="index.html">Kembali ke katalog</a>
            </section>
        `;
    };

    const formatDate = (value) => {
        if (!value) return "Belum ada tanggal";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;

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

    // Untuk mode komikku, load chapter list terlebih dahulu (lazy load dari API)
    if (window.KomikData.loadComicDetail) {
        await window.KomikData.loadComicDetail(comic);
    }

    const firstChapter = comic.chapters[comic.chapters.length - 1];
    const readUrl = firstChapter
        ? `reader.html?id=${encodeURIComponent(comic.id)}&chapter=${encodeURIComponent(firstChapter.id)}`
        : "#";

    document.title = `${comic.title} - KomikLoka`;
    document.getElementById("detailCover").src = comic.cover;
    document.getElementById("detailCover").alt = `Cover ${comic.title}`;
    document.getElementById("detailType").textContent = comic.type;
    document.getElementById("detailTitle").textContent = comic.title;
    document.getElementById("detailSummary").textContent = comic.summary;
    document.getElementById("startReading").href = readUrl;
    document.getElementById("startReading").textContent = firstChapter ? "Mulai baca" : "Belum ada chapter";
    document.getElementById("chapterCount").textContent = `${comic.chapters.length} chapter`;

    document.getElementById("detailMeta").innerHTML = [
        comic.status,
        `${comic.rating}/5`,
        comic.year,
        comic.author,
    ].map((item) => `<span>${escapeHtml(item)}</span>`).join("");

    document.getElementById("detailTags").innerHTML = comic.genres
        .map((genre) => `<span>${escapeHtml(genre)}</span>`)
        .join("");

    document.getElementById("chapterList").innerHTML = comic.chapters.map((chapter) => {
        const chapterUrl = `reader.html?id=${encodeURIComponent(comic.id)}&chapter=${encodeURIComponent(chapter.id)}`;
        const date = formatDate(chapter.updatedAt);

        return `
            <a class="chapter-row" href="${chapterUrl}">
                <span>${escapeHtml(chapter.title)}</span>
                <time datetime="${escapeHtml(chapter.updatedAt)}">${escapeHtml(date)}</time>
            </a>
        `;
    }).join("");
})();

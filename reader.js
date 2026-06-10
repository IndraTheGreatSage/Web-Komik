(async function () {
    const comics = window.KomikData ? await window.KomikData.loadLibrary() : [];
    const params = new URLSearchParams(window.location.search);
    const comicId = params.get("id");
    const chapterId = params.get("chapter");
    const comic = comics.find((item) => item.id === comicId);

    const chapterSelect = document.getElementById("chapterSelect");
    const readerPages = document.getElementById("readerPages");
    const prevButton = document.getElementById("prevChapter");
    const nextButton = document.getElementById("nextChapter");
    const comicTitle = document.getElementById("readerComicTitle");
    const chapterTitle = document.getElementById("readerChapterTitle");
    const backToDetail = document.getElementById("backToDetail");

    const escapeHtml = (value) => {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    };

    const showMissing = () => {
        if (comicTitle) comicTitle.textContent = "Komik tidak ditemukan";
        if (chapterTitle) chapterTitle.textContent = "Kembali ke katalog";
        if (readerPages) {
            readerPages.innerHTML = `
                <section class="empty-page">
                    <p class="eyebrow">Tidak ditemukan</p>
                    <h1>Chapter belum tersedia.</h1>
                    <p>Pastikan link yang dibuka benar atau periksa koneksi internet kamu.</p>
                    <a class="primary-action" href="index.html">Kembali ke katalog</a>
                </section>
            `;
        }
        if (prevButton) prevButton.disabled = true;
        if (nextButton) nextButton.disabled = true;
        if (chapterSelect) chapterSelect.disabled = true;
    };

    // Pastikan data detail/chapter ter-load dari API Vercel baru
    if (comic && window.KomikData.loadComicDetail) {
        await window.KomikData.loadComicDetail(comic);
    }

    if (!comic || !comic.chapters || comic.chapters.length === 0) {
        showMissing();
        return;
    }

    const getChapterIndex = (id) => {
        const index = comic.chapters.findIndex((chapter) => chapter.id === id);
        return index >= 0 ? index : 0;
    };

    let currentIndex = getChapterIndex(chapterId);

    const getReadUrl = (chapter) => {
        return `reader.html?id=${encodeURIComponent(comic.id)}&chapter=${encodeURIComponent(chapter.id)}`;
    };

    const updateNavigation = () => {
        // Menyesuaikan logika disable tombol navigasi berdasarkan urutan data API (descending)
        if (prevButton) prevButton.disabled = currentIndex === comic.chapters.length - 1;
        if (nextButton) nextButton.disabled = currentIndex === 0;
    };

    const renderPages = (pages, chapter) => {
        if (!readerPages) return;
        if (!pages || !pages.length) {
            readerPages.innerHTML = `
                <section class="empty-page">
                    <p class="eyebrow">Belum ada gambar</p>
                    <h1>Isi halaman chapter belum tersedia.</h1>
                    <p>Gambar sedang diproses oleh server sumber atau memerlukan reload.</p>
                </section>
            `;
            return;
        }

        readerPages.innerHTML = pages.map((image, pageIndex) => {
            const loading = pageIndex === 0 ? "eager" : "lazy";
            return `
                <figure class="reader-page">
                    <img src="${escapeHtml(image)}" alt="${escapeHtml(comic.title)} ${escapeHtml(chapter.title)} halaman ${pageIndex + 1}" loading="${loading}">
                </figure>
            `;
        }).join("");
    };

    const renderChapter = async (index, shouldScroll = true) => {
        currentIndex = index;
        const chapter = comic.chapters[currentIndex];

        document.title = `${chapter.title} - ${comic.title}`;
        if (comicTitle) comicTitle.textContent = comic.title;
        if (chapterTitle) chapterTitle.textContent = chapter.title;
        if (chapterSelect) chapterSelect.value = chapter.id;
        if (backToDetail) backToDetail.href = `detail.html?id=${encodeURIComponent(comic.id)}`;
        updateNavigation();

        localStorage.setItem(`komikloka:last:${comic.id}`, chapter.id);
        window.history.replaceState({}, "", getReadUrl(chapter));

        if (readerPages) readerPages.innerHTML = '<p class="reader-loading">Memuat halaman chapter...</p>';

        try {
            const pages = window.KomikData ? await window.KomikData.loadChapterPages(chapter) : chapter.pages;
            renderPages(pages, chapter);
        } catch (error) {
            console.error("Gagal memuat gambar chapter:", error);
            if (readerPages) {
                readerPages.innerHTML = `
                    <section class="empty-page">
                        <p class="eyebrow">Gagal memuat</p>
                        <h1>Halaman chapter gagal dimuat.</h1>
                        <p>Server penyedia gambar sibuk atau format tidak didukung.</p>
                    </section>
                `;
            }
        }

        if (shouldScroll) {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    if (chapterSelect) {
        chapterSelect.innerHTML = comic.chapters.map((chapter) => {
            return `<option value="${escapeHtml(chapter.id)}">${escapeHtml(chapter.title)}</option>`;
        }).join("");

        chapterSelect.addEventListener("change", (event) => {
            renderChapter(getChapterIndex(event.target.value));
        });
    }

    const savedChapter = localStorage.getItem(`komikloka:last:${comic.id}`);
    if (!chapterId && savedChapter) {
        currentIndex = getChapterIndex(savedChapter);
    }

    if (prevButton) {
        prevButton.addEventListener("click", () => {
            // Indeks bertambah berarti berpindah ke chapter yang rilis lebih lama (Sebelumnya)
            if (currentIndex < comic.chapters.length - 1) {
                renderChapter(currentIndex + 1);
            }
        });
    }

    if (nextButton) {
        nextButton.addEventListener("click", () => {
            // Indeks berkurang berarti berpindah ke chapter yang rilis lebih baru (Selanjutnya)
            if (currentIndex > 0) {
                renderChapter(currentIndex - 1);
            }
        });
    }

    await renderChapter(currentIndex, false);
})();
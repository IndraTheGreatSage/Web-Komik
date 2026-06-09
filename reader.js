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
        comicTitle.textContent = "Komik tidak ditemukan";
        chapterTitle.textContent = "Kembali ke katalog";
        readerPages.innerHTML = `
            <section class="empty-page">
                <p class="eyebrow">Tidak ditemukan</p>
                <h1>Chapter belum tersedia.</h1>
                <p>Pastikan link yang dibuka benar atau tambahkan chapter di data JSON.</p>
                <a class="primary-action" href="index.html">Kembali ke katalog</a>
            </section>
        `;
        prevButton.disabled = true;
        nextButton.disabled = true;
        chapterSelect.disabled = true;
    };

    // Untuk mode komikku, load chapter list terlebih dahulu
    if (comic && window.KomikData.loadComicDetail) {
        await window.KomikData.loadComicDetail(comic);
    }

    if (!comic || comic.chapters.length === 0) {
        showMissing();
        return;
    }

    const getChapterIndex = (id) => {
        const index = comic.chapters.findIndex((chapter) => chapter.id === id);
        return index >= 0 ? index : comic.chapters.length - 1;
    };

    let currentIndex = getChapterIndex(chapterId);

    const getReadUrl = (chapter) => {
        return `reader.html?id=${encodeURIComponent(comic.id)}&chapter=${encodeURIComponent(chapter.id)}`;
    };

    const updateNavigation = () => {
        prevButton.disabled = currentIndex === comic.chapters.length - 1;
        nextButton.disabled = currentIndex === 0;
    };

    const renderPages = (pages, chapter) => {
        if (!pages.length) {
            readerPages.innerHTML = `
                <section class="empty-page">
                    <p class="eyebrow">Belum ada gambar</p>
                    <h1>Isi halaman chapter belum tersedia.</h1>
                    <p>Tambahkan pages, pagesUrl, atau pagePattern untuk ${escapeHtml(chapter.title)}.</p>
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
        comicTitle.textContent = comic.title;
        chapterTitle.textContent = chapter.title;
        chapterSelect.value = chapter.id;
        backToDetail.href = `detail.html?id=${encodeURIComponent(comic.id)}`;
        updateNavigation();

        localStorage.setItem(`komikloka:last:${comic.id}`, chapter.id);
        window.history.replaceState({}, "", getReadUrl(chapter));

        readerPages.innerHTML = "<p class=\"reader-loading\">Memuat halaman chapter...</p>";

        try {
            const pages = window.KomikData ? await window.KomikData.loadChapterPages(chapter) : chapter.pages;
            renderPages(pages, chapter);
        } catch (error) {
            console.error("Gagal memuat gambar chapter:", error);
            readerPages.innerHTML = `
                <section class="empty-page">
                    <p class="eyebrow">Gagal memuat</p>
                    <h1>Halaman chapter belum bisa dibuka.</h1>
                    <p>Periksa URL gambar, pagesUrl, atau izin akses sumber datanya.</p>
                </section>
            `;
        }

        if (shouldScroll) {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    chapterSelect.innerHTML = comic.chapters.map((chapter) => {
        return `<option value="${escapeHtml(chapter.id)}">${escapeHtml(chapter.title)}</option>`;
    }).join("");

    const savedChapter = localStorage.getItem(`komikloka:last:${comic.id}`);
    if (!chapterId && savedChapter) {
        currentIndex = getChapterIndex(savedChapter);
    }

    chapterSelect.addEventListener("change", (event) => {
        renderChapter(getChapterIndex(event.target.value));
    });

    prevButton.addEventListener("click", () => {
        if (currentIndex < comic.chapters.length - 1) {
            renderChapter(currentIndex + 1);
        }
    });

    nextButton.addEventListener("click", () => {
        if (currentIndex > 0) {
            renderChapter(currentIndex - 1);
        }
    });

    await renderChapter(currentIndex, false);
})();

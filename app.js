(async function () {
    const elements = {
        searchInput: document.getElementById("searchInput"),
        resetSearch: document.getElementById("resetSearch"),
        filterTabs: document.getElementById("filterTabs"),
        comicGrid: document.getElementById("comicGrid"),
        emptyState: document.getElementById("emptyState"),
        resultCount: document.getElementById("resultCount"),
        spotlightCover: document.getElementById("spotlightCover"),
        spotlightTitle: document.getElementById("judul-spotlight"),
        spotlightSummary: document.getElementById("spotlightSummary"),
        spotlightMeta: document.getElementById("spotlightMeta"),
        spotlightRead: document.getElementById("spotlightRead"),
        spotlightDetail: document.getElementById("spotlightDetail"),
    };

    const state = {
        comics: [],
        query: "",
        activeType: "Semua",
        activeGenre: "Semua",
    };

    const escapeHtml = (value) => {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    };

    const getDetailUrl = (comic) => {
        return `detail.html?id=${encodeURIComponent(comic.id)}`;
    };

    const getReadableChapter = (comic) => {
        return Array.isArray(comic.chapters) && comic.chapters.length > 0
            ? comic.chapters[0]
            : null;
    };

    const getReadUrl = (comic) => {
        const chapter = getReadableChapter(comic);
        if (!chapter) return getDetailUrl(comic);
        return `reader.html?id=${encodeURIComponent(comic.id)}&chapter=${encodeURIComponent(chapter.id)}`;
    };

    const getSearchText = (comic) => {
        // Search only by title
        return comic.title.toLowerCase();
    };

    const getFilteredComics = () => {
        const query = state.query.trim().toLowerCase();
        return state.comics.filter((comic) => {
            const matchesType = state.activeType === "Semua" || comic.type === state.activeType;
            const matchesGenre = state.activeGenre === "Semua" || (comic.genres && comic.genres.includes(state.activeGenre));
            const matchesQuery = !query || getSearchText(comic).includes(query);
            return matchesType && matchesGenre && matchesQuery;
        });
    };

    const renderFilters = () => {
        if (!elements.filterTabs) return;

        const types = ["Semua", ...new Set(state.comics.map((comic) => comic.type).filter(Boolean))];
        elements.filterTabs.innerHTML = types.map((type) => {
            const active = type === state.activeType ? " active" : "";
            return `<button type="button" class="${active.trim()}" data-type="${escapeHtml(type)}">${escapeHtml(type)}</button>`;
        }).join("");

        elements.filterTabs.querySelectorAll("button").forEach((button) => {
            button.addEventListener("click", () => {
                state.activeType = button.dataset.type || "Semua";
                render();
            });
        });
    };

    const renderGenreFilters = () => {
        const genreTabsEl = document.getElementById("genreTabs");
        if (!genreTabsEl) return;

        // Get all unique genres from all comics
        const allGenres = new Set();
        state.comics.forEach((comic) => {
            if (comic.genres) {
                comic.genres.forEach((genre) => allGenres.add(genre));
            }
        });

        const genres = ["Semua", ...Array.from(allGenres).sort()];
        genreTabsEl.innerHTML = genres.map((genre) => {
            const active = genre === state.activeGenre ? " active" : "";
            return `<button type="button" class="${active.trim()}" data-genre="${escapeHtml(genre)}">${escapeHtml(genre)}</button>`;
        }).join("");

        genreTabsEl.querySelectorAll("button").forEach((button) => {
            button.addEventListener("click", () => {
                state.activeGenre = button.dataset.genre || "Semua";
                render();
            });
        });
    };

    const renderSpotlight = (comic) => {
        if (!comic || !elements.spotlightTitle) return;

        const chapter = getReadableChapter(comic);
        const meta = [
            comic.type,
            comic.status,
            chapter?.title,
        ].filter(Boolean);

        if (elements.spotlightCover) {
            elements.spotlightCover.src = comic.cover;
            elements.spotlightCover.alt = `Cover ${comic.title}`;
        }
        elements.spotlightTitle.textContent = comic.title;
        if (elements.spotlightSummary) {
            elements.spotlightSummary.textContent = comic.summary || "Buka detail untuk melihat sinopsis dan daftar chapter terbaru.";
        }
        if (elements.spotlightMeta) {
            elements.spotlightMeta.innerHTML = meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("");
        }
        if (elements.spotlightRead) elements.spotlightRead.href = getReadUrl(comic);
        if (elements.spotlightDetail) elements.spotlightDetail.href = getDetailUrl(comic);
    };

    const renderCard = (comic) => {
        const chapter = getReadableChapter(comic);
        const detailUrl = getDetailUrl(comic);
        const readUrl = getReadUrl(comic);
        const genres = (comic.genres || []).slice(0, 3);
        const summary = comic.summary || "Detail chapter dan sinopsis tersedia dari API Komiku.";

        return `
            <article class="comic-card">
                <a class="cover-link" href="${detailUrl}">
                    <img src="${escapeHtml(comic.cover)}" alt="Cover ${escapeHtml(comic.title)}" loading="lazy">
                </a>
                <div class="comic-card-body">
                    <div class="card-topline">
                        <span>${escapeHtml(comic.type || "Komik")}</span>
                        <span>${escapeHtml(comic.status || "Update")}</span>
                    </div>
                    <h3><a href="${detailUrl}">${escapeHtml(comic.title)}</a></h3>
                    <p>${escapeHtml(summary)}</p>
                    <div class="tag-list">
                        ${genres.map((genre) => `<span>${escapeHtml(genre)}</span>`).join("")}
                    </div>
                    <a class="chapter-pill" href="${readUrl}">${escapeHtml(chapter?.title || "Lihat detail")}</a>
                </div>
            </article>
        `;
    };

    const renderGrid = (comics) => {
        if (!elements.comicGrid) return;

        elements.comicGrid.innerHTML = comics.map(renderCard).join("");
        if (elements.emptyState) elements.emptyState.hidden = comics.length > 0;
        if (elements.resultCount) elements.resultCount.textContent = `${comics.length} komik`;
    };

    const render = () => {
        renderFilters();
        renderGenreFilters();
        const comics = getFilteredComics();
        renderSpotlight(comics[0] || state.comics[0]);
        renderGrid(comics);
    };

    const showLoadError = () => {
        if (elements.comicGrid) {
            elements.comicGrid.innerHTML = `
                <section class="empty-page">
                    <p class="eyebrow">Gagal memuat</p>
                    <h1>Data komik belum bisa diambil.</h1>
                    <p>Periksa URL API di config.js atau status deploy Vercel kamu.</p>
                </section>
            `;
        }
        if (elements.resultCount) elements.resultCount.textContent = "0 komik";
    };

    try {
        state.comics = window.KomikData ? await window.KomikData.loadLibrary() : [];
        render();
    } catch (error) {
        console.error("Gagal memuat katalog:", error);
        showLoadError();
        return;
    }

    if (elements.searchInput) {
        elements.searchInput.addEventListener("input", (event) => {
            state.query = event.target.value;
            render();
        });
    }

    if (elements.resetSearch) {
        elements.resetSearch.addEventListener("click", () => {
            state.query = "";
            state.activeType = "Semua";
            state.activeGenre = "Semua";
            if (elements.searchInput) elements.searchInput.value = "";
            render();
        });
    }
})();

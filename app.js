(async function () {
    const comics = window.KomikData ? await window.KomikData.loadLibrary() : [];
    const grid = document.getElementById("comicGrid");
    const tabs = document.getElementById("filterTabs");
    const searchInput = document.getElementById("searchInput");
    const resetSearch = document.getElementById("resetSearch");
    const resultCount = document.getElementById("resultCount");
    const emptyState = document.getElementById("emptyState");

    const state = {
        type: "Semua",
        query: "",
    };

    const escapeHtml = (value) => {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    };

    const getFirstChapter = (comic) => {
        return comic.chapters[comic.chapters.length - 1];
    };

    const getLatestChapter = (comic) => {
        return comic.chapters[0];
    };

    const formatMeta = (comic) => {
        return [comic.type, comic.status, `${comic.rating}/5`, comic.year];
    };

    const getReaderUrl = (comic, chapter) => {
        if (!chapter) {
            return `detail.html?id=${encodeURIComponent(comic.id)}`;
        }

        return `reader.html?id=${encodeURIComponent(comic.id)}&chapter=${encodeURIComponent(chapter.id)}`;
    };

    const renderTabs = () => {
        const types = ["Semua", ...new Set(comics.map((comic) => comic.type))];

        tabs.innerHTML = types.map((type) => {
            const active = state.type === type ? "active" : "";
            return `<button type="button" class="${active}" data-type="${escapeHtml(type)}">${escapeHtml(type)}</button>`;
        }).join("");
    };

    const renderSpotlight = () => {
        const spotlight = comics[0];
        if (!spotlight) {
            document.getElementById("judul-spotlight").textContent = "Data komik belum tersedia.";
            document.getElementById("spotlightSummary").textContent = "Isi komik-data.json atau sambungkan config.js ke API legal milikmu.";
            return;
        }

        const firstChapter = getFirstChapter(spotlight);
        const detailUrl = `detail.html?id=${encodeURIComponent(spotlight.id)}`;

        document.getElementById("spotlightCover").src = spotlight.cover;
        document.getElementById("spotlightCover").alt = `Cover ${spotlight.title}`;
        document.getElementById("judul-spotlight").textContent = spotlight.title;
        document.getElementById("spotlightSummary").textContent = spotlight.summary;
        document.getElementById("spotlightRead").href = getReaderUrl(spotlight, firstChapter);
        document.getElementById("spotlightDetail").href = detailUrl;
        document.getElementById("spotlightMeta").innerHTML = formatMeta(spotlight)
            .map((item) => `<span>${escapeHtml(item)}</span>`)
            .join("");
    };

    const getFilteredComics = () => {
        const query = state.query.trim().toLowerCase();

        return comics.filter((comic) => {
            const matchesType = state.type === "Semua" || comic.type === state.type;
            const haystack = [
                comic.title,
                comic.type,
                comic.status,
                comic.author,
                comic.summary,
                ...comic.genres,
            ].join(" ").toLowerCase();

            return matchesType && (!query || haystack.includes(query));
        });
    };

    const renderGrid = () => {
        const filteredComics = getFilteredComics();
        resultCount.textContent = `${filteredComics.length} komik`;
        emptyState.hidden = filteredComics.length > 0;

        grid.innerHTML = filteredComics.map((comic) => {
            const latest = getLatestChapter(comic);
            const detailUrl = `detail.html?id=${encodeURIComponent(comic.id)}`;
            const genreLabels = comic.genres.slice(0, 2).map((genre) => `<span>${escapeHtml(genre)}</span>`).join("");
            const chapterUrl = getReaderUrl(comic, latest);
            const chapterLabel = latest ? latest.title : "Lihat detail";

            return `
                <article class="comic-card">
                    <a class="cover-link" href="${detailUrl}" aria-label="Buka detail ${escapeHtml(comic.title)}">
                        <img src="${escapeHtml(comic.cover)}" alt="Cover ${escapeHtml(comic.title)}" loading="lazy">
                    </a>
                    <div class="comic-card-body">
                        <div class="card-topline">
                            <span>${escapeHtml(comic.type)}</span>
                            <span>${escapeHtml(comic.status)}</span>
                        </div>
                        <h3><a href="${detailUrl}">${escapeHtml(comic.title)}</a></h3>
                        <p>${escapeHtml(comic.summary)}</p>
                        <div class="tag-list">${genreLabels}</div>
                        <a class="chapter-pill" href="${chapterUrl}">
                            ${escapeHtml(chapterLabel)}
                        </a>
                    </div>
                </article>
            `;
        }).join("");
    };

    tabs.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-type]");
        if (!button) return;

        state.type = button.dataset.type;
        renderTabs();
        renderGrid();
    });

    searchInput.addEventListener("input", (event) => {
        state.query = event.target.value;
        renderGrid();
    });

    resetSearch.addEventListener("click", () => {
        state.query = "";
        searchInput.value = "";
        renderGrid();
    });

    renderTabs();
    renderSpotlight();
    renderGrid();
})();

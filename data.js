(function () {
    const DEFAULT_DATA_URL = "komik-data.json";

    const cover = (title, bg, fg) => {
        return `https://placehold.co/420x620/${bg}/${fg}.png?text=${encodeURIComponent(title)}`;
    };

    const fallbackComics = [
        {
            id: "satria-bara",
            title: "Satria Bara",
            type: "Manhwa",
            status: "Berjalan",
            rating: "4.8",
            year: "2026",
            author: "Studio Karsa",
            cover: cover("Satria Bara", "24130f", "f8dfc5"),
            genres: ["Action", "Fantasy", "Revenge"],
            summary: "Seorang murid akademi pedang bangkit setelah kota bawah tanahnya terbakar dan menemukan kontrak kuno yang mengubah arah hidupnya.",
            chapterTemplate: {
                count: 4,
                order: "desc",
                titlePattern: "Chapter {number}: Arsip Bara",
                idPattern: "satria-bara-chapter-{number}",
                pagePattern: "https://placehold.co/920x1280/24130f/f8dfc5.png?text=Satria%20Bara%0AChapter%20{chapter}%0APage%20{page}",
                pageStart: 1,
                pageEnd: 7,
                pagePad: 2,
                updatedAt: ["2026-06-09", "2026-06-02", "2026-05-26", "2026-05-19"],
            },
        },
    ];

    let cachedLibrary = null;

    const padNumber = (value, length) => {
        return String(value).padStart(Number(length || 0), "0");
    };

    const fillPattern = (pattern, values) => {
        return String(pattern || "").replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
            return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match;
        });
    };

    const getListFromPayload = (payload) => {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.comics)) return payload.comics;
        if (Array.isArray(payload.results)) return payload.results;
        if (Array.isArray(payload.data)) return payload.data;
        return [];
    };

    const normalizePage = (page) => {
        if (typeof page === "string") return page;
        return page?.url || page?.img || page?.src || page?.image || "";
    };

    const expandPages = (chapter) => {
        if (Array.isArray(chapter.pages) && chapter.pages.length > 0) {
            return chapter.pages.map(normalizePage).filter(Boolean);
        }

        if (!chapter.pagePattern || !chapter.pageEnd) {
            return [];
        }

        const start = Number(chapter.pageStart || 1);
        const end = Number(chapter.pageEnd);
        const pages = [];

        for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
            pages.push(fillPattern(chapter.pagePattern, {
                id: chapter.id,
                number: chapter.number,
                chapter: padNumber(chapter.number, chapter.chapterPad),
                chapterRaw: chapter.number,
                page: padNumber(pageNumber, chapter.pagePad),
                pageRaw: pageNumber,
            }));
        }

        return pages;
    };

    const normalizeChapter = (rawChapter, comic, fallbackNumber) => {
        const number = Number(rawChapter.number || fallbackNumber || 1);
        const id = rawChapter.id || fillPattern(rawChapter.idPattern || `${comic.id}-chapter-{number}`, {
            comicId: comic.id,
            number,
            chapter: number,
        });

        const chapter = {
            id: String(id),
            number,
            title: rawChapter.title || fillPattern(rawChapter.titlePattern || "Chapter {number}", {
                number,
                chapter: number,
            }),
            updatedAt: rawChapter.updatedAt || "",
            pagesUrl: rawChapter.pagesUrl || "",
            pagePattern: rawChapter.pagePattern || "",
            pageStart: rawChapter.pageStart,
            pageEnd: rawChapter.pageEnd,
            pagePad: rawChapter.pagePad,
            chapterPad: rawChapter.chapterPad,
            pages: [],
        };

        chapter.pages = expandPages({ ...rawChapter, ...chapter });
        return chapter;
    };

    const buildChaptersFromTemplate = (comic) => {
        const template = comic.chapterTemplate;
        if (!template) return [];

        const start = Number(template.start || 1);
        const end = Number(template.end || (start + Number(template.count || 1) - 1));
        const numbers = [];

        for (let number = start; number <= end; number += 1) {
            numbers.push(number);
        }

        if (template.order !== "asc") {
            numbers.reverse();
        }

        return numbers.map((number, index) => {
            const templateValues = {
                comicId: comic.id,
                number,
                chapter: padNumber(number, template.chapterPad),
                chapterRaw: number,
            };

            return normalizeChapter({
                ...template,
                id: fillPattern(template.idPattern || `${comic.id}-chapter-{number}`, templateValues),
                title: fillPattern(template.titlePattern || "Chapter {number}", templateValues),
                number,
                updatedAt: Array.isArray(template.updatedAt) ? template.updatedAt[index] : template.updatedAt,
            }, comic, number);
        });
    };

    const normalizeComic = (rawComic) => {
        const comic = {
            id: String(rawComic.id || rawComic.slug || rawComic.title || ""),
            title: rawComic.title || "Tanpa judul",
            type: rawComic.type || "Komik",
            status: rawComic.status || "Unknown",
            rating: rawComic.rating || "-",
            year: rawComic.year || "-",
            author: rawComic.author || "Unknown",
            cover: rawComic.cover || rawComic.image || "",
            genres: Array.isArray(rawComic.genres) ? rawComic.genres : [],
            summary: rawComic.summary || rawComic.description || "",
            chapters: [],
            chapterTemplate: rawComic.chapterTemplate,
        };

        const rawChapters = Array.isArray(rawComic.chapters)
            ? rawComic.chapters
            : buildChaptersFromTemplate(comic);

        comic.chapters = rawChapters.map((chapter, index) => {
            return normalizeChapter(chapter, comic, rawChapters.length - index);
        });

        return comic;
    };

    const loadJson = async (url) => {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`Gagal mengambil data: ${response.status}`);
        }
        return response.json();
    };

    const loadLibrary = async ({ force = false } = {}) => {
        if (cachedLibrary && !force) {
            return cachedLibrary;
        }

        const config = window.KOMIK_CONFIG || {};
        const dataUrl = config.dataUrl || DEFAULT_DATA_URL;

        try {
            const payload = await loadJson(dataUrl);
            const list = getListFromPayload(payload);
            if (list.length === 0) {
                throw new Error("Format data kosong atau tidak dikenali");
            }
            cachedLibrary = list.map(normalizeComic).filter((comic) => comic.id);
        } catch (error) {
            console.warn("Memakai data fallback karena data utama gagal dimuat.", error);
            cachedLibrary = fallbackComics.map(normalizeComic);
        }

        window.KOMIK_LIBRARY = cachedLibrary;
        return cachedLibrary;
    };

    const loadChapterPages = async (chapter) => {
        if (Array.isArray(chapter.pages) && chapter.pages.length > 0) {
            return chapter.pages;
        }

        if (!chapter.pagesUrl) {
            return [];
        }

        const payload = await loadJson(chapter.pagesUrl);
        const pages = Array.isArray(payload) ? payload : payload.pages;
        return Array.isArray(pages) ? pages.map(normalizePage).filter(Boolean) : [];
    };

    window.KomikData = {
        loadLibrary,
        loadChapterPages,
    };
})();

(function () {
    const DEFAULT_DATA_URL = "komik-data.json";

    // ─── Helpers ────────────────────────────────────────────────────────────────

    const cover = (title, bg, fg) => {
        return `https://placehold.co/420x620/${bg}/${fg}.png?text=${encodeURIComponent(title)}`;
    };

    const fallbackComics = [
        {
            id: "Solo Leveling",
            title: "Solo Leveling",
            type: "Manhwa",
            status: "Ongoing",
            rating: "9.0",
            year: "Unknown",
            author: "REDICE Studio",
            cover: cover("Solo Leveling", "24130f", "f8dfc5"),
            genres: ["Action", "Fantasy", "Adventure"],
            summary: "Data fallback. API atau JSON tidak berhasil dimuat.",
            chapterTemplate: {
                count: 1,
                order: "desc",
                titlePattern: "Chapter {number}",
                idPattern: "Solo-Leveling-chapter-{number}",
                pagePattern: "https://placehold.co/920x1280/24130f/f8dfc5.png?text=Page%20{page}",
                pageStart: 1,
                pageEnd: 3,
                pagePad: 2,
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
        if (Array.isArray(payload.data)) return payload.data;
        if (Array.isArray(payload.comics)) return payload.comics;
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
        if (!chapter.pagePattern || !chapter.pageEnd) return [];

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
            title: rawChapter.title || fillPattern(rawChapter.titlePattern || "Chapter {number}", { number, chapter: number }),
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

        if (template.order !== "asc") numbers.reverse();

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
            id: String(rawComic.slug || rawComic.id || rawComic.title || ""),
            title: rawComic.title || "Tanpa judul",
            type: rawComic.type || "Komik",
            status: rawComic.status || "Unknown",
            rating: rawComic.rating || "-",
            year: rawComic.year || "-",
            author: rawComic.author || "Unknown",
            cover: rawComic.thumbnail || rawComic.image || rawComic.cover || "",
            genres: Array.isArray(rawComic.genre) ? rawComic.genre : (Array.isArray(rawComic.genres) ? rawComic.genres : []),
            summary: rawComic.sinopsis || rawComic.description || rawComic.desc || "",
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
        if (!response.ok) throw new Error(`Gagal mengambil data: ${response.status}`);
        return response.json();
    };

    // ─── New Express.js Komiku API Adapter ────────────────────────────────────────

    const newApiListItemToComic = (item) => {
        const slug = item.slug || "";
        return {
            id: slug,
            title: item.title || "Tanpa judul",
            type: item.type || "Komik",
            status: "Unknown",
            rating: "-",
            year: "-",
            author: "Unknown",
            cover: item.thumbnail || item.image || cover(item.title, "24130f", "f8dfc5"),
            genres: [],
            summary: "",
            chapters: [],
            _newApiSlug: slug,
            _newApiLoaded: false,
        };
    };

    const newApiInfoToComic = (base, info) => {
        const chapterList = Array.isArray(info.chapter_list) ? info.chapter_list : [];

        const chapters = chapterList.map((ch, index) => {
            const chSlug = ch.slug || "";
            // Ambil parameter murni chapter (misal dari /ch/chapter-19/ atau "19")
            let chParam = chSlug.replace(/^\/|\/$/g, "");
            if (chParam.includes('/')) {
                chParam = chParam.split('/').pop();
            }

            return {
                id: chSlug,
                number: chapterList.length - index,
                title: ch.name || ch.title || `Chapter ${chapterList.length - index}`,
                updatedAt: ch.date || "",
                pages: [],
                _comicSlug: base.id,
                _chapterParam: chParam || chSlug,
            };
        });

        return {
            ...base,
            type: info.type || base.type,
            status: info.status || base.status,
            rating: info.rating || base.rating,
            author: info.author || base.author,
            cover: info.thumbnail || info.image || base.cover,
            genres: Array.isArray(info.genre) ? info.genre : base.genres,
            summary: info.sinopsis || info.description || base.summary,
            chapters,
            _newApiLoaded: true,
        };
    };

    const ensureComicDetail = async (comic) => {
        if (comic._newApiLoaded || !comic.id) return comic;

        const config = window.KOMIK_CONFIG || {};
        const base = config.apiBaseUrl || "https://komiku-rest-api.vercel.app";

        try {
            const url = `${base}/detail-komik/${comic.id}`;
            const payload = await loadJson(url);
            const resData = payload.data || payload;

            if (resData) {
                const updated = newApiInfoToComic(comic, resData);
                Object.assign(comic, updated);
            }
        } catch (error) {
            console.warn(`Gagal load detail komik "${comic.title}":`, error);
            comic._newApiLoaded = true;
        }

        return comic;
    };

    // ─── Load Library ─────────────────────────────────────────────────────────────

    const loadLibraryFromJson = async () => {
        const config = window.KOMIK_CONFIG || {};
        const dataUrl = config.dataUrl || DEFAULT_DATA_URL;
        const payload = await loadJson(dataUrl);
        const list = getListFromPayload(payload);
        if (list.length === 0) throw new Error("Format data kosong atau tidak dikenali");
        return list.map(normalizeComic).filter((c) => c.id);
    };

    const loadLibraryFromNewApi = async () => {
        const config = window.KOMIK_CONFIG || {};
        const base = config.apiBaseUrl || "https://komiku-rest-api.vercel.app";

        // Mengambil kombinasi data komik terbaru & populer agar grid beranda penuh dan ramai
        const [terbaruPayload, populerPayload] = await Promise.allSettled([
            loadJson(`${base}/terbaru`),
            loadJson(`${base}/komik-populer`),
        ]);

        const combined = [];

        if (terbaruPayload.status === "fulfilled") {
            const list = terbaruPayload.value.data || terbaruPayload.value;
            if (Array.isArray(list)) combined.push(...list);
        }
        if (populerPayload.status === "fulfilled") {
            const list = populerPayload.value.data || populerPayload.value;
            if (Array.isArray(list)) combined.push(...list);
        }

        if (combined.length === 0) throw new Error("API tidak mengembalikan data komik");

        // Hapus duplikasi berdasarkan slug
        const seen = new Set();
        const unique = combined.filter((item) => {
            const slug = item.slug;
            if (!slug || seen.has(slug)) return false;
            seen.add(slug);
            return true;
        });

        return unique.map(newApiListItemToComic).filter((c) => c.id);
    };

    const loadLibrary = async ({ force = false } = {}) => {
        if (cachedLibrary && !force) return cachedLibrary;

        const config = window.KOMIK_CONFIG || {};
        const mode = config.mode || "json";

        try {
            if (mode === "api") {
                cachedLibrary = await loadLibraryFromNewApi();
            } else {
                cachedLibrary = await loadLibraryFromJson();
            }
        } catch (error) {
            console.warn("Memakai data fallback karena data utama gagal dimuat.", error);
            cachedLibrary = fallbackComics.map(normalizeComic);
        }

        window.KOMIK_LIBRARY = cachedLibrary;
        return cachedLibrary;
    };

    // ─── Load Chapter Pages ───────────────────────────────────────────────────────

    const loadChapterPages = async (chapter) => {
        if (Array.isArray(chapter.pages) && chapter.pages.length > 0) {
            return chapter.pages;
        }

        if (chapter.pagesUrl) {
            const payload = await loadJson(chapter.pagesUrl);
            const pages = Array.isArray(payload) ? payload : payload.pages;
            return Array.isArray(pages) ? pages.map(normalizePage).filter(Boolean) : [];
        }

        if (chapter._comicSlug && chapter._chapterParam) {
            const config = window.KOMIK_CONFIG || {};
            const base = config.apiBaseUrl || "https://komiku-rest-api.vercel.app";

            const url = `${base}/baca-chapter/${chapter._comicSlug}/${chapter._chapterParam}`;
            try {
                const payload = await loadJson(url);
                const resData = payload.data || payload;
                if (resData) {
                    const images = resData.chapter_images || resData.images || resData.image || [];
                    chapter.pages = images;
                    return images;
                }
            } catch (error) {
                console.error("Gagal memuat gambar chapter:", error);
            }
        }

        return [];
    };

    const loadComicDetail = async (comic) => {
        const config = window.KOMIK_CONFIG || {};
        if (config.mode !== "api") return comic;
        return ensureComicDetail(comic);
    };

    window.KomikData = {
        loadLibrary,
        loadComicDetail,
        loadChapterPages,
    };
})();
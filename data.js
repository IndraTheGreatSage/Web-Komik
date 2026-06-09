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
            id: String(rawComic.id || rawComic.slug || rawComic.title || ""),
            title: rawComic.title || "Tanpa judul",
            type: rawComic.type || "Komik",
            status: rawComic.status || "Unknown",
            rating: rawComic.rating || "-",
            year: rawComic.year || "-",
            author: rawComic.author || "Unknown",
            cover: rawComic.cover || rawComic.image || rawComic.thumbnail || "",
            genres: Array.isArray(rawComic.genres) ? rawComic.genres : (Array.isArray(rawComic.genre) ? rawComic.genre : []),
            summary: rawComic.summary || rawComic.description || rawComic.desc || "",
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

    // ─── Komikku API Adapter ─────────────────────────────────────────────────────

    /**
     * Konversi satu item dari /api/comic/list ke format comic KomikLoka.
     * Chapter list TIDAK diisi di sini (lazy load saat buka detail/reader).
     */
    const komikkuListItemToComic = (item) => {
        // endpoint: "/manga/judul-komik/"  →  id: "judul-komik"
        const endpoint = item.endpoint || "";
        const id = endpoint.replace(/^\/manga\//, "").replace(/\/$/, "") || item.title;

        return {
            id,
            title: item.title || "Tanpa judul",
            type: item.type || "Komik",
            status: "Unknown",
            rating: "-",
            year: "-",
            author: "Unknown",
            cover: item.image || item.thumbnail || cover(item.title, "24130f", "f8dfc5"),
            genres: [],
            summary: item.desc || item.description || "",
            chapters: [],
            // Simpan endpoint asli untuk lazy-load detail
            _komikkuEndpoint: endpoint,
            _komikkuLoaded: false,
        };
    };

    /**
     * Konversi response /api/comic/info ke field detail comic.
     * Chapter list diisi di sini sebagai stub (pages di-load saat reader dibuka).
     */
    const komikkuInfoToComic = (base, info) => {
        const chapterList = Array.isArray(info.chapter_list) ? info.chapter_list : [];

        // chapter_list sudah urut desc dari API
        const chapters = chapterList.map((ch, index) => {
            // endpoint: "/ch/judul-chapter-1/"  →  id: "judul-chapter-1"
            const chEndpoint = ch.endpoint || "";
            const chId = chEndpoint.replace(/^\/ch\//, "").replace(/\/$/, "") || `chapter-${chapterList.length - index}`;

            return {
                id: chId,
                number: chapterList.length - index,
                title: ch.name || `Chapter ${chapterList.length - index}`,
                updatedAt: ch.updatedAt || "",
                pages: [],
                pagesUrl: "",
                // Simpan endpoint chapter untuk lazy-load gambar
                _komikkuEndpoint: chEndpoint,
            };
        });

        return {
            ...base,
            type: info.type || base.type,
            status: info.status || base.status,
            rating: info.rating || base.rating,
            author: info.author || base.author,
            cover: info.thumbnail || base.cover,
            genres: Array.isArray(info.genre) ? info.genre : base.genres,
            chapters,
            _komikkuLoaded: true,
        };
    };

    /**
     * Load detail comic dari /api/comic/info jika belum di-load.
     * Update cachedLibrary in-place.
     */
    const ensureComicDetail = async (comic) => {
        if (comic._komikkuLoaded || !comic._komikkuEndpoint) return comic;

        const config = window.KOMIK_CONFIG || {};
        const base = config.apiBaseUrl || "http://localhost:3011";

        try {
            // endpoint: "/manga/judul/"  →  /api/comic/info/manga/judul/
            const infoPath = comic._komikkuEndpoint.replace(/^\/manga\//, "");
            const url = `${base}/api/comic/info/manga/${infoPath}`;
            const payload = await loadJson(url);

            if (payload.success && payload.data) {
                const updated = komikkuInfoToComic(comic, payload.data);
                // Update in-place di cachedLibrary
                Object.assign(comic, updated);
            }
        } catch (error) {
            console.warn(`Gagal load detail komik "${comic.title}":`, error);
            comic._komikkuLoaded = true; // Tandai sudah dicoba agar tidak loop
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

    const loadLibraryFromKomikku = async () => {
        const config = window.KOMIK_CONFIG || {};
        const base = config.apiBaseUrl || "http://localhost:3011";

        // Ambil daftar dari semua tipe sekaligus
        const [manga, manhwa, manhua] = await Promise.allSettled([
            loadJson(`${base}/api/comic/list?filter=manga`),
            loadJson(`${base}/api/comic/list?filter=manhwa`),
            loadJson(`${base}/api/comic/list?filter=manhua`),
        ]);

        const combined = [];

        for (const result of [manga, manhwa, manhua]) {
            if (result.status === "fulfilled" && result.value.success) {
                combined.push(...(result.value.data || []));
            }
        }

        if (combined.length === 0) throw new Error("Komikku API tidak mengembalikan data");

        // Deduplicate berdasarkan endpoint
        const seen = new Set();
        const unique = combined.filter((item) => {
            if (seen.has(item.endpoint)) return false;
            seen.add(item.endpoint);
            return true;
        });

        return unique.map(komikkuListItemToComic).filter((c) => c.id);
    };

    const loadLibrary = async ({ force = false } = {}) => {
        if (cachedLibrary && !force) return cachedLibrary;

        const config = window.KOMIK_CONFIG || {};
        const mode = config.mode || "json";

        try {
            if (mode === "komikku") {
                cachedLibrary = await loadLibraryFromKomikku();
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
        // Kalau sudah ada pages (dari JSON / pagePattern), langsung pakai
        if (Array.isArray(chapter.pages) && chapter.pages.length > 0) {
            return chapter.pages;
        }

        // Kalau ada pagesUrl (format JSON lama), fetch itu
        if (chapter.pagesUrl) {
            const payload = await loadJson(chapter.pagesUrl);
            const pages = Array.isArray(payload) ? payload : payload.pages;
            return Array.isArray(pages) ? pages.map(normalizePage).filter(Boolean) : [];
        }

        // Kalau ada _komikkuEndpoint, fetch dari API Komikku
        if (chapter._komikkuEndpoint) {
            const config = window.KOMIK_CONFIG || {};
            const base = config.apiBaseUrl || "http://localhost:3011";

            // endpoint: "/ch/judul-chapter-1/"  →  /api/comic/chapter/ch/judul-chapter-1/
            const chPath = chapter._komikkuEndpoint.replace(/^\/ch\//, "");
            const url = `${base}/api/comic/chapter/ch/${chPath}`;

            const payload = await loadJson(url);
            if (payload.success && payload.data) {
                const images = Array.isArray(payload.data.image) ? payload.data.image : [];
                chapter.pages = images; // Cache supaya tidak fetch lagi
                return images;
            }
        }

        return [];
    };

    /**
     * Load detail comic (chapter list) — dipanggil oleh detail.js sebelum render.
     * Untuk mode komikku, ini yang mengisi chapter list.
     */
    const loadComicDetail = async (comic) => {
        const config = window.KOMIK_CONFIG || {};
        if (config.mode !== "komikku") return comic;
        return ensureComicDetail(comic);
    };

    window.KomikData = {
        loadLibrary,
        loadComicDetail,
        loadChapterPages,
    };
})();

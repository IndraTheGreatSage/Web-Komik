(function () {
    const DEFAULT_DATA_URL = "komik-data.json";

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
            summary: "Data fallback. API utama sedang memproses data atau internet lambat.",
            chapters: [
                {
                    id: "chapter-1",
                    title: "Chapter 1",
                    updatedAt: new Date().toISOString(),
                    pages: [
                        "https://placehold.co/920x1280/24130f/f8dfc5.png?text=Halaman+1",
                        "https://placehold.co/920x1280/24130f/f8dfc5.png?text=Halaman+2"
                    ]
                }
            ]
        },
    ];

    let cachedLibrary = null;

    const loadJson = async (url) => {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    };

    const normalizePage = (src) => {
        if (!src) return null;
        if (typeof src === "string") return src.trim();
        if (typeof src === "object" && src.url) return src.url.trim();
        return null;
    };

    // ─── LOGIK MAPPING UNTUK REST API BARU (https://komiku-api.fly.dev) ───

    const loadLibraryFromNewApi = async (baseUrl) => {
        // Mengambil daftar komik populer/terbaru dari API
        const response = await loadJson(`${baseUrl}/api/comic/list?type=manga`);
        
        // Sesuaikan dengan pembungkus data API baru (biasanya di dalam .data atau langsung array)
        const apiData = response.data || response;
        
        if (!Array.isArray(apiData)) {
            throw new Error("API tidak mengembalikan data komik berbentuk array");
        }

        return apiData.map((item) => {
            // Transformasi properti API baru ke format yang dikenali oleh app.js & detail.js kamu
            return {
                id: item.slug || item.id,
                title: item.title || "Tanpa Judul",
                type: item.type || "Manga",
                status: item.status || "Ongoing",
                rating: item.rating || "-",
                year: item.year || "-",
                author: item.author || "Unknown",
                cover: item.thumbnail || item.cover || item.image || "",
                genres: item.genres || [],
                summary: item.summary || item.description || "Sinopsis tidak tersedia.",
                // Sediakan array penampung chapter awal
                chapters: (item.chapters || []).map((ch) => ({
                    id: ch.slug || ch.id,
                    title: ch.title || ch.name || "Chapter Detail",
                    updatedAt: ch.date || ch.updatedAt || ""
                }))
            };
        });
    };

    const ensureComicDetail = async (comic) => {
        // Jika komik sudah memiliki chapter lengkap hasil fetch detail, tidak perlu fetch ulang
        if (comic.chapters && comic.chapters.length > 1) return comic;

        const config = window.KOMIK_CONFIG || {};
        const base = config.apiBaseUrl || "https://komiku-api.fly.dev";

        try {
            // Memanggil endpoint detail komik berdasarkan SLUG / ID komik
            const res = await loadJson(`${base}/api/comic/info/${comic.id}`);
            const data = res.data || res;

            if (data && Array.isArray(data.chapters)) {
                comic.chapters = data.chapters.map((ch) => ({
                    id: ch.slug || ch.id,
                    title: ch.title || ch.name || "Chapter",
                    updatedAt: ch.date || ch.updatedAt || ""
                }));
                if (data.summary || data.description) {
                    comic.summary = data.summary || data.description;
                }
            }
        } catch (err) {
            console.error("Gagal memuat detail chapter komik:", err);
        }
        return comic;
    };

    const loadChapterPages = async (chapter) => {
        if (Array.isArray(chapter.pages) && chapter.pages.length > 0) {
            return chapter.pages;
        }

        const config = window.KOMIK_CONFIG || {};
        const base = config.apiBaseUrl || "https://komiku-api.fly.dev";

        // Mengambil data halaman gambar berdasarkan SLUG chapter
        const url = `${base}/api/chapter/info/${chapter.id}`;
        try {
            const payload = await loadJson(url);
            const resData = payload.data || payload;
            if (resData) {
                const images = resData.images || resData.chapter_images || resData.images_list || [];
                const cleanPages = images.map(normalizePage).filter(Boolean);
                chapter.pages = cleanPages;
                return cleanPages;
            }
        } catch (error) {
            console.error("Gagal memuat gambar halaman chapter dari API:", error);
        }

        return [];
    };

    // ─── CORE CONTROLLER ───

    const loadLibrary = async () => {
        if (cachedLibrary) return cachedLibrary;

        const config = window.KOMIK_CONFIG || {};
        const mode = config.mode || "json";
        const url = config.dataUrl || DEFAULT_DATA_URL;

        if (mode === "api") {
            const base = config.apiBaseUrl || "https://komiku-api.fly.dev";
            try {
                console.log(`Menghubungkan ke API: ${base}...`);
                cachedLibrary = await loadLibraryFromNewApi(base);
                return cachedLibrary;
            } catch (error) {
                console.warn("Gagal memuat dari API publik, beralih ke local file JSON:", error.message);
            }
        }

        // Jalur cadangan (JSON lokal)
        try {
            const localData = await loadJson(url);
            if (localData && Array.isArray(localData.comics)) {
                cachedLibrary = localData.comics;
                return cachedLibrary;
            }
            if (Array.isArray(localData)) {
                cachedLibrary = localData;
                return cachedLibrary;
            }
        } catch (error) {
            console.error("Gagal memuat data lokal JSON:", error);
        }

        // Jalur darurat total (Hardcoded Object)
        cachedLibrary = fallbackComics;
        return cachedLibrary;
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
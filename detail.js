(async function () {
    const comics = window.KomikData ? await window.KomikData.loadLibrary() : [];
    const params = new URLSearchParams(window.location.search);
    const comicId = params.get("id");
    const comic = comics.find((item) => item.id === comicId);
    const AUTH_KEY = "komikloka:authUser";

    const escapeHtml = (value) => {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    };

    const safeJsonParse = (value, fallback) => {
        try {
            return value ? JSON.parse(value) : fallback;
        } catch {
            return fallback;
        }
    };

    const getChapterNumber = (chapter) => {
        const directNumber = Number(chapter.number);
        if (Number.isFinite(directNumber) && directNumber > 0) return directNumber;

        const titleMatch = String(chapter.title || "").match(/chapter\s*([\d.]+)/i);
        return titleMatch ? Number(titleMatch[1]) : 0;
    };

    const getChapterDate = (chapter) => {
        const date = new Date(chapter.updatedAt || "");
        return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    };

    const getSortKey = () => `komikloka:chapterSort:${comic.id}`;

    const getSortPreference = () => {
        return {
            sortBy: "number",
            direction: "desc",
            ...safeJsonParse(localStorage.getItem(getSortKey()), {}),
        };
    };

    const saveSortPreference = (preference) => {
        localStorage.setItem(getSortKey(), JSON.stringify(preference));
    };

    const getSortedChapters = (chapters, preference) => {
        const list = [...(chapters || [])];
        const direction = preference.direction === "asc" ? 1 : -1;

        return list.sort((a, b) => {
            let result = 0;

            if (preference.sortBy === "date") {
                result = getChapterDate(a) - getChapterDate(b);
            } else if (preference.sortBy === "title") {
                result = String(a.title || "").localeCompare(String(b.title || ""), "id-ID", { numeric: true });
            } else {
                result = getChapterNumber(a) - getChapterNumber(b);
            }

            return result * direction;
        });
    };

    const getDirectionLabel = (preference) => {
        if (preference.sortBy === "title") {
            return preference.direction === "asc" ? "A-Z" : "Z-A";
        }
        if (preference.sortBy === "date") {
            return preference.direction === "asc" ? "Terlama dulu" : "Terbaru dulu";
        }
        return preference.direction === "asc" ? "Chapter kecil dulu" : "Chapter besar dulu";
    };

    const getCommentsKey = () => `komikloka:comments:${comic.id}`;

    const getCurrentUser = () => safeJsonParse(localStorage.getItem(AUTH_KEY), null);

    const saveCurrentUser = (name) => {
        const user = {
            name,
            loggedAt: new Date().toISOString(),
        };
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));
        return user;
    };

    const loadComments = () => safeJsonParse(localStorage.getItem(getCommentsKey()), []);

    const saveComments = (comments) => {
        localStorage.setItem(getCommentsKey(), JSON.stringify(comments));
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
        ? getSortedChapters(comic.chapters, { sortBy: "number", direction: "asc" })[0]
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
    const chapterSortEl = document.getElementById("chapterSort");
    const chapterDirectionEl = document.getElementById("chapterDirection");
    let chapterSortPreference = getSortPreference();

    const renderChapterList = () => {
        if (!chapterListEl || !comic.chapters) return;

        const sortedChapters = getSortedChapters(comic.chapters, chapterSortPreference);
        chapterListEl.innerHTML = sortedChapters.map((chapter) => {
            const chapterUrl = `reader.html?id=${encodeURIComponent(comic.id)}&chapter=${encodeURIComponent(chapter.id)}`;
            const date = formatDate(chapter.updatedAt);

            return `
                <a class="chapter-row" href="${chapterUrl}">
                    <span>${escapeHtml(chapter.title)}</span>
                    <time datetime="${escapeHtml(chapter.updatedAt)}">${escapeHtml(date)}</time>
                </a>
            `;
        }).join("");

        if (chapterSortEl) chapterSortEl.value = chapterSortPreference.sortBy;
        if (chapterDirectionEl) chapterDirectionEl.textContent = getDirectionLabel(chapterSortPreference);
    };

    if (chapterSortEl) {
        chapterSortEl.value = chapterSortPreference.sortBy;
        chapterSortEl.addEventListener("change", (event) => {
            chapterSortPreference = {
                ...chapterSortPreference,
                sortBy: event.target.value,
            };
            saveSortPreference(chapterSortPreference);
            renderChapterList();
        });
    }

    if (chapterDirectionEl) {
        chapterDirectionEl.textContent = getDirectionLabel(chapterSortPreference);
        chapterDirectionEl.addEventListener("click", () => {
            chapterSortPreference = {
                ...chapterSortPreference,
                direction: chapterSortPreference.direction === "asc" ? "desc" : "asc",
            };
            saveSortPreference(chapterSortPreference);
            renderChapterList();
        });
    }

    renderChapterList();

    const authStatusEl = document.getElementById("authStatus");
    const loginFormEl = document.getElementById("loginForm");
    const loginNameEl = document.getElementById("loginName");
    const logoutButtonEl = document.getElementById("logoutButton");
    const commentFormEl = document.getElementById("commentForm");
    const commentTextEl = document.getElementById("commentText");
    const commentsListEl = document.getElementById("commentsList");
    const commentCountEl = document.getElementById("commentCount");

    const renderAuth = () => {
        const user = getCurrentUser();
        if (authStatusEl) {
            authStatusEl.textContent = user ? `Login sebagai ${user.name}` : "Belum login";
        }
        if (loginFormEl) loginFormEl.hidden = Boolean(user);
        if (logoutButtonEl) logoutButtonEl.hidden = !user;
        if (commentTextEl) {
            commentTextEl.disabled = !user;
            commentTextEl.placeholder = user ? "Bagikan pendapat kamu..." : "Login dulu untuk menulis komentar";
        }
        if (commentFormEl) {
            const submitButton = commentFormEl.querySelector("button");
            if (submitButton) submitButton.disabled = !user;
        }
    };

    const formatCommentDate = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";

        return date.toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const renderComments = () => {
        const comments = loadComments()
            .filter((comment) => comment && comment.text && comment.author)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (commentCountEl) {
            commentCountEl.textContent = `${comments.length} komentar`;
        }

        if (!commentsListEl) return;

        if (comments.length === 0) {
            commentsListEl.innerHTML = `<p class="empty-comments">Belum ada komentar.</p>`;
            return;
        }

        commentsListEl.innerHTML = comments.map((comment) => {
            return `
                <article class="comment-card">
                    <div>
                        <strong>${escapeHtml(comment.author)}</strong>
                        <time datetime="${escapeHtml(comment.createdAt)}">${escapeHtml(formatCommentDate(comment.createdAt))}</time>
                    </div>
                    <p>${escapeHtml(comment.text)}</p>
                </article>
            `;
        }).join("");
    };

    if (loginFormEl) {
        loginFormEl.addEventListener("submit", (event) => {
            event.preventDefault();
            const name = String(loginNameEl?.value || "").trim().replace(/\s+/g, " ");
            if (!name) return;

            saveCurrentUser(name.slice(0, 28));
            loginFormEl.reset();
            renderAuth();
        });
    }

    if (logoutButtonEl) {
        logoutButtonEl.addEventListener("click", () => {
            localStorage.removeItem(AUTH_KEY);
            renderAuth();
        });
    }

    if (commentFormEl) {
        commentFormEl.addEventListener("submit", (event) => {
            event.preventDefault();
            const user = getCurrentUser();
            const text = String(commentTextEl?.value || "").trim();
            if (!user || !text) return;

            const comments = loadComments();
            comments.push({
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                author: user.name,
                text: text.slice(0, 600),
                createdAt: new Date().toISOString(),
            });

            saveComments(comments);
            commentFormEl.reset();
            renderComments();
        });
    }

    renderAuth();
    renderComments();
})();

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

    // Load comic detail
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

    // New Improved Comment System
    const getCommentsKey = () => `komikloka:comments:${comic.id}`;
    const getCommentsSortKey = () => `komikloka:commentsSort:${comic.id}`;

    const loadComments = () => {
        try {
            const data = localStorage.getItem(getCommentsKey());
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    };

    const saveComments = (comments) => {
        localStorage.setItem(getCommentsKey(), JSON.stringify(comments));
    };

    const getCommentSort = () => {
        return localStorage.getItem(getCommentsSortKey()) || 'newest';
    };

    const setCommentSort = (sort) => {
        localStorage.setItem(getCommentsSortKey(), sort);
    };

    const getUserAvatar = (username) => {
        const colors = ['#c8462e', '#197d75', '#d89a21', '#315c3b', '#8e2e1d'];
        const index = username.charCodeAt(0) % colors.length;
        return colors[index];
    };

    const formatRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Baru saja';
        if (diffMins < 60) return `${diffMins} menit lalu`;
        if (diffHours < 24) return `${diffHours} jam lalu`;
        if (diffDays < 7) return `${diffDays} hari lalu`;
        
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const commentInputArea = document.getElementById('commentInputArea');
    const currentUserAvatar = document.getElementById('currentUserAvatar');
    const loginPrompt = document.getElementById('loginPrompt');
    const commentForm = document.getElementById('commentForm');
    const commentText = document.getElementById('commentText');
    const charCount = document.getElementById('charCount');
    const commentsList = document.getElementById('commentsList');
    const commentCount = document.getElementById('commentCount');
    const sortCommentsBtn = document.getElementById('sortComments');
    const commentsLoading = document.getElementById('commentsLoading');

    let currentSort = getCommentSort();

    const renderAuth = () => {
        const user = auth.getCurrentUser();
        
        if (user) {
            if (currentUserAvatar) {
                currentUserAvatar.style.background = getUserAvatar(user.username);
                currentUserAvatar.querySelector('span').textContent = user.username.charAt(0).toUpperCase();
            }
            if (loginPrompt) loginPrompt.hidden = true;
            if (commentForm) commentForm.hidden = false;
        } else {
            if (currentUserAvatar) {
                currentUserAvatar.style.background = 'var(--line)';
                currentUserAvatar.querySelector('span').textContent = '?';
            }
            if (loginPrompt) loginPrompt.hidden = false;
            if (commentForm) commentForm.hidden = true;
        }
    };

    const renderComments = () => {
        if (!commentsList) return;

        const comments = loadComments().filter(c => c && c.text && c.author);
        
        // Sort comments
        if (currentSort === 'newest') {
            comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (currentSort === 'oldest') {
            comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        } else if (currentSort === 'popular') {
            comments.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        }

        if (commentCount) {
            commentCount.textContent = `${comments.length} komentar`;
        }

        if (comments.length === 0) {
            commentsList.innerHTML = `
                <div class="empty-comments">
                    <p>Belum ada komentar. Jadilah yang pertama berkomentar!</p>
                </div>
            `;
            return;
        }

        commentsList.innerHTML = comments.map(comment => {
            const currentUser = auth.getCurrentUser();
            const isOwner = currentUser && currentUser.username === comment.author;
            const timeAgo = formatRelativeTime(comment.createdAt);
            
            return `
                <article class="comment-card" data-comment-id="${escapeHtml(comment.id)}">
                    <div class="comment-avatar" style="background: ${getUserAvatar(comment.author)}">
                        <span>${escapeHtml(comment.author.charAt(0).toUpperCase())}</span>
                    </div>
                    <div class="comment-content">
                        <div class="comment-header">
                            <div class="comment-author">
                                <strong>${escapeHtml(comment.author)}</strong>
                                ${isOwner ? '<span class="comment-badge">Penulis</span>' : ''}
                            </div>
                            <time class="comment-time" datetime="${escapeHtml(comment.createdAt)}">${escapeHtml(timeAgo)}</time>
                        </div>
                        <p class="comment-text">${escapeHtml(comment.text)}</p>
                        <div class="comment-actions">
                            <button class="comment-like-btn" data-comment-id="${escapeHtml(comment.id)}">
                                <span>👍</span>
                                <span class="like-count">${comment.likes || 0}</span>
                            </button>
                            ${isOwner ? `
                                <button class="comment-delete-btn" data-comment-id="${escapeHtml(comment.id)}">
                                    <span>🗑️</span>
                                    <span>Hapus</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </article>
            `;
        }).join('');

        // Add event listeners for like and delete buttons
        commentsList.querySelectorAll('.comment-like-btn').forEach(btn => {
            btn.addEventListener('click', handleLikeComment);
        });

        commentsList.querySelectorAll('.comment-delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDeleteComment);
        });
    };

    const handleLikeComment = (e) => {
        const commentId = e.currentTarget.dataset.commentId;
        const user = auth.getCurrentUser();
        if (!user) return;

        const comments = loadComments();
        const comment = comments.find(c => c.id === commentId);
        
        if (comment) {
            if (!comment.likedBy) comment.likedBy = [];
            const userIndex = comment.likedBy.indexOf(user.username);
            
            if (userIndex === -1) {
                comment.likedBy.push(user.username);
                comment.likes = (comment.likes || 0) + 1;
            } else {
                comment.likedBy.splice(userIndex, 1);
                comment.likes = Math.max(0, (comment.likes || 0) - 1);
            }
            
            saveComments(comments);
            renderComments();
        }
    };

    const handleDeleteComment = (e) => {
        const commentId = e.currentTarget.dataset.commentId;
        const user = auth.getCurrentUser();
        if (!user) return;

        const comments = loadComments();
        const commentIndex = comments.findIndex(c => c.id === commentId);
        
        if (commentIndex !== -1) {
            const comment = comments[commentIndex];
            if (comment.author === user.username) {
                if (confirm('Hapus komentar ini?')) {
                    comments.splice(commentIndex, 1);
                    saveComments(comments);
                    renderComments();
                }
            }
        }
    };

    const handleSortComments = () => {
        const sorts = ['newest', 'oldest', 'popular'];
        const currentIndex = sorts.indexOf(currentSort);
        currentSort = sorts[(currentIndex + 1) % sorts.length];
        
        const labels = {
            newest: 'Terbaru',
            oldest: 'Terlama',
            popular: 'Terpopuler'
        };
        
        if (sortCommentsBtn) {
            sortCommentsBtn.textContent = labels[currentSort];
        }
        
        setCommentSort(currentSort);
        renderComments();
    };

    // Character count
    if (commentText && charCount) {
        commentText.addEventListener('input', () => {
            const length = commentText.value.length;
            charCount.textContent = `${length}/1000`;
            charCount.style.color = length > 900 ? 'var(--ember)' : 'var(--muted)';
        });
    }

    // Comment form submission
    if (commentForm) {
        commentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = auth.getCurrentUser();
            const text = commentText.value.trim();
            
            if (!user || !text) return;

            const comments = loadComments();
            comments.push({
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                author: user.username,
                text: text.slice(0, 1000),
                createdAt: new Date().toISOString(),
                likes: 0,
                likedBy: []
            });

            saveComments(comments);
            commentForm.reset();
            charCount.textContent = '0/1000';
            renderComments();
        });
    }

    // Sort button
    if (sortCommentsBtn) {
        sortCommentsBtn.addEventListener('click', handleSortComments);
    }

    // Initialize
    renderAuth();
    renderComments();
    
    // Listen for auth changes
    window.addEventListener('storage', (e) => {
        if (e.key === 'komikloka_user') {
            renderAuth();
        }
    });
})();

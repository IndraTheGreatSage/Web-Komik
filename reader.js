(async function () {
    const comics = window.KomikData ? await window.KomikData.loadLibrary() : [];
    const params = new URLSearchParams(window.location.search);
    const comicId = params.get("id");
    const chapterId = params.get("chapter");
    const comic = comics.find((item) => item.id === comicId);

    // DOM Elements
    const chapterSelect = document.getElementById("chapterSelect");
    const readerPages = document.getElementById("readerPages");
    const comicTitle = document.getElementById("readerComicTitle");
    const chapterTitle = document.getElementById("readerChapterTitle");
    const backToDetail = document.getElementById("backToDetail");
    const readerToolbar = document.getElementById("readerToolbar");
    const readerOverlay = document.getElementById("readerOverlay");
    const readerProgress = document.getElementById("readerProgress");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    const settingsBtn = document.getElementById("settingsBtn");
    const settingsPanel = document.getElementById("settingsPanel");
    const closeSettings = document.getElementById("closeSettings");
    const autoContinueCheckbox = document.getElementById("autoContinue");
    const tapZoneCheckbox = document.getElementById("tapZone");
    const doubleTapZoomCheckbox = document.getElementById("doubleTapZoom");

    // State
    let currentIndex = 0;
    let toolbarVisible = true;
    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;
    let zoomLevel = 1;
    let isZoomed = false;
    let autoContinueEnabled = true;
    let tapZoneEnabled = true;
    let doubleTapZoomEnabled = true;
    let hasReachedEnd = false;

    // Settings
    const loadSettings = () => {
        autoContinueEnabled = localStorage.getItem('komikloka:autoContinue') !== 'false';
        tapZoneEnabled = localStorage.getItem('komikloka:tapZone') !== 'false';
        doubleTapZoomEnabled = localStorage.getItem('komikloka:doubleTapZoom') !== 'false';
        
        if (autoContinueCheckbox) autoContinueCheckbox.checked = autoContinueEnabled;
        if (tapZoneCheckbox) tapZoneCheckbox.checked = tapZoneEnabled;
        if (doubleTapZoomCheckbox) doubleTapZoomCheckbox.checked = doubleTapZoomEnabled;
    };

    const saveSettings = () => {
        localStorage.setItem('komikloka:autoContinue', autoContinueEnabled);
        localStorage.setItem('komikloka:tapZone', tapZoneEnabled);
        localStorage.setItem('komikloka:doubleTapZoom', doubleTapZoomEnabled);
    };

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
                    <a class="primary-action" href="./">Kembali ke katalog</a>
                </section>
            `;
        }
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

    currentIndex = getChapterIndex(chapterId);

    const getReadUrl = (chapter) => {
        return `reader.html?id=${encodeURIComponent(comic.id)}&chapter=${encodeURIComponent(chapter.id)}`;
    };

    // Toolbar visibility
    const toggleToolbar = () => {
        toolbarVisible = !toolbarVisible;
        if (readerToolbar) {
            readerToolbar.style.opacity = toolbarVisible ? '1' : '0';
            readerToolbar.style.pointerEvents = toolbarVisible ? 'auto' : 'none';
        }
        if (readerProgress) {
            readerProgress.style.opacity = toolbarVisible ? '1' : '0';
        }
    };

    const showToolbar = () => {
        toolbarVisible = true;
        if (readerToolbar) {
            readerToolbar.style.opacity = '1';
            readerToolbar.style.pointerEvents = 'auto';
        }
        if (readerProgress) {
            readerProgress.style.opacity = '1';
        }
    };

    const hideToolbar = () => {
        toolbarVisible = false;
        if (readerToolbar) {
            readerToolbar.style.opacity = '0';
            readerToolbar.style.pointerEvents = 'none';
        }
        if (readerProgress) {
            readerProgress.style.opacity = '0';
        }
    };

    // Progress tracking
    const updateProgress = () => {
        if (!readerPages || !progressBar || !progressText) return;
        
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
        
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${progress}%`;
        
        // Auto-continue when reaching end
        if (progress >= 95 && autoContinueEnabled && !hasReachedEnd) {
            hasReachedEnd = true;
            setTimeout(() => {
                goToNextChapter();
            }, 1000);
        } else if (progress < 90) {
            hasReachedEnd = false;
        }
    };

    // Chapter navigation
    const goToNextChapter = () => {
        if (currentIndex > 0) {
            renderChapter(currentIndex - 1);
        }
    };

    const goToPrevChapter = () => {
        if (currentIndex < comic.chapters.length - 1) {
            renderChapter(currentIndex + 1);
        }
    };

    // Image zoom
    const toggleZoom = (x, y) => {
        if (!doubleTapZoomEnabled) return;
        
        isZoomed = !isZoomed;
        const images = document.querySelectorAll('.reader-page img');
        
        images.forEach(img => {
            if (isZoomed) {
                img.style.transform = 'scale(2)';
                img.style.transformOrigin = `${x}px ${y}px`;
                img.style.cursor = 'zoom-out';
            } else {
                img.style.transform = 'scale(1)';
                img.style.transformOrigin = 'center center';
                img.style.cursor = 'zoom-in';
            }
        });
    };

    const resetZoom = () => {
        isZoomed = false;
        const images = document.querySelectorAll('.reader-page img');
        images.forEach(img => {
            img.style.transform = 'scale(1)';
            img.style.transformOrigin = 'center center';
            img.style.cursor = 'zoom-in';
        });
    };

    // Tap handling
    const handleTap = (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;
        
        if (tapLength < 300 && tapLength > 0) {
            // Double tap
            if (doubleTapZoomEnabled) {
                toggleZoom(e.clientX, e.clientY);
            }
            e.preventDefault();
        } else {
            // Single tap
            const tapX = e.clientX;
            const windowWidth = window.innerWidth;
            
            if (tapZoneEnabled) {
                if (tapX < windowWidth * 0.3) {
                    // Left zone - previous chapter
                    goToPrevChapter();
                } else if (tapX > windowWidth * 0.7) {
                    // Right zone - next chapter
                    goToNextChapter();
                } else {
                    // Center zone - toggle toolbar
                    toggleToolbar();
                }
            } else {
                toggleToolbar();
            }
        }
        
        lastTapTime = currentTime;
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
                <figure class="reader-page" data-page="${pageIndex}">
                    <img src="${escapeHtml(image)}" alt="${escapeHtml(comic.title)} ${escapeHtml(chapter.title)} halaman ${pageIndex + 1}" loading="${loading}" style="cursor: zoom-in;">
                </figure>
            `;
        }).join("");
        
        // Add tap listeners to pages
        const pageFigures = readerPages.querySelectorAll('.reader-page');
        pageFigures.forEach(fig => {
            fig.addEventListener('click', handleTap);
        });
    };

    const renderChapter = async (index, shouldScroll = true) => {
        currentIndex = index;
        const chapter = comic.chapters[currentIndex];
        hasReachedEnd = false;
        resetZoom();

        document.title = `${chapter.title} - ${comic.title}`;
        if (comicTitle) comicTitle.textContent = comic.title;
        if (chapterTitle) chapterTitle.textContent = chapter.title;
        if (chapterSelect) chapterSelect.value = chapter.id;
        if (backToDetail) backToDetail.href = `detail.html?id=${encodeURIComponent(comic.id)}`;

        localStorage.setItem(`komikloka:last:${comic.id}`, chapter.id);
        window.history.replaceState({}, "", getReadUrl(chapter));

        // Track reading history
        const user = window.auth ? window.auth.getCurrentUser() : null;
        if (user) {
            const historyKey = `komikloka:history:${user.username}`;
            const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
            
            // Remove existing entry for this comic
            const filteredHistory = history.filter(h => h.comicId !== comic.id);
            
            // Add new entry at the beginning
            filteredHistory.unshift({
                comicId: comic.id,
                chapterId: chapter.id,
                lastRead: new Date().toISOString()
            });
            
            // Keep only last 50 entries
            const trimmedHistory = filteredHistory.slice(0, 50);
            
            localStorage.setItem(historyKey, JSON.stringify(trimmedHistory));
        }

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
        
        // Reset progress
        if (progressBar) progressBar.style.width = '0%';
        if (progressText) progressText.textContent = '0%';
    };

    // Chapter select
    if (chapterSelect) {
        chapterSelect.innerHTML = comic.chapters.map((chapter) => {
            return `<option value="${escapeHtml(chapter.id)}">${escapeHtml(chapter.title)}</option>`;
        }).join("");

        chapterSelect.addEventListener("change", (event) => {
            renderChapter(getChapterIndex(event.target.value));
        });
    }

    // Load saved chapter
    const savedChapter = localStorage.getItem(`komikloka:last:${comic.id}`);
    if (!chapterId && savedChapter) {
        currentIndex = getChapterIndex(savedChapter);
    }

    // Settings panel
    const toggleSettings = () => {
        if (settingsPanel) {
            settingsPanel.hidden = !settingsPanel.hidden;
        }
    };

    if (settingsBtn) {
        settingsBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleSettings();
        });
    }

    if (closeSettings) {
        closeSettings.addEventListener("click", () => {
            toggleSettings();
        });
    }

    if (autoContinueCheckbox) {
        autoContinueCheckbox.addEventListener("change", (e) => {
            autoContinueEnabled = e.target.checked;
            saveSettings();
        });
    }

    if (tapZoneCheckbox) {
        tapZoneCheckbox.addEventListener("change", (e) => {
            tapZoneEnabled = e.target.checked;
            saveSettings();
        });
    }

    if (doubleTapZoomCheckbox) {
        doubleTapZoomCheckbox.addEventListener("change", (e) => {
            doubleTapZoomEnabled = e.target.checked;
            saveSettings();
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'ArrowLeft':
                goToPrevChapter();
                break;
            case 'ArrowRight':
                goToNextChapter();
                break;
            case 'Escape':
                hideToolbar();
                if (settingsPanel && !settingsPanel.hidden) {
                    settingsPanel.hidden = true;
                }
                break;
            case ' ':
                e.preventDefault();
                toggleToolbar();
                break;
        }
    });

    // Scroll progress
    window.addEventListener('scroll', updateProgress);

    // Close settings when clicking outside
    document.addEventListener('click', (e) => {
        if (settingsPanel && !settingsPanel.hidden && !settingsPanel.contains(e.target) && e.target !== settingsBtn) {
            settingsPanel.hidden = true;
        }
    });

    // Initialize
    loadSettings();
    await renderChapter(currentIndex, false);
    
    // Auto-hide toolbar after 3 seconds
    let toolbarTimeout;
    const resetToolbarTimeout = () => {
        clearTimeout(toolbarTimeout);
        if (toolbarVisible) {
            toolbarTimeout = setTimeout(() => {
                hideToolbar();
            }, 3000);
        }
    };
    
    document.addEventListener('mousemove', resetToolbarTimeout);
    document.addEventListener('touchstart', resetToolbarTimeout);
    resetToolbarTimeout();
})();
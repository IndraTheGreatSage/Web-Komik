(function () {
    const params = new URLSearchParams(window.location.search);
    const comicId = params.get("id");

    if (comicId) {
        window.location.replace(`detail.html?id=${encodeURIComponent(comicId)}`);
        return;
    }

    window.location.replace("index.html");
})();

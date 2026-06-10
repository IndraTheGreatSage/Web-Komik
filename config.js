window.KOMIK_CONFIG = {
    // Mode "json" = pakai file JSON lokal
    // Mode "api"  = pakai Komiku REST API (Express.js Vercel - Hemat Kuota)
    mode: "api",

    // URL base Komiku REST API Publik (Gratis & tidak perlu Docker)
    apiBaseUrl: "https://komiku-rest-api.vercel.app",

    // Kalau mode "json", isi ini:
    dataUrl: "komik-data.json",
};
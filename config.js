window.KOMIK_CONFIG = {
    // Mode "json"     = pakai file JSON lokal (default lama)
    // Mode "komikku"  = pakai Komikku API (Go backend)
    mode: "komikku",

    // URL base Komikku API kamu.
    // Kalau run lokal pakai Docker: "http://localhost:3011"
    // Kalau sudah deploy: "https://domain-api-kamu.com"
    apiBaseUrl: "http://localhost:3011",

    // Kalau mode "json", isi ini:
    dataUrl: "komik-data.json",
};

# 🔐 Sistem Login dan Autentikasi KomikLoka

Dokumentasi lengkap untuk sistem login dan manajemen akun yang baru di KomikLoka.

## 📋 Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Struktur File](#struktur-file)
- [Setup & Konfigurasi](#setup--konfigurasi)
- [Penggunaan](#penggunaan)
- [API Endpoints](#api-endpoints)
- [Keamanan](#keamanan)

---

## 🎯 Fitur Utama

### 1. **Login dengan Email**
- ✅ Validasi email real-time
- ✅ Password strength indicator
- ✅ Toggle tampilkan/sembunyikan password
- ✅ Remember me (simpan di localStorage)
- ✅ Social login (Google & GitHub)

### 2. **Registrasi dengan Validasi Ketat**
- ✅ Username availability check
- ✅ Email uniqueness validation
- ✅ Password strength requirement (min 8 char, uppercase, lowercase, number)
- ✅ Password confirmation matching
- ✅ Terms & conditions agreement

### 3. **Profil Pengguna**
- ✅ Lihat informasi akun
- ✅ Kelola daftar sedang dibaca
- ✅ Kelola favorit komik
- ✅ Ubah password
- ✅ Pengaturan preferensi
- ✅ Hapus akun permanen

### 4. **Session Management**
- ✅ Token-based authentication (JWT)
- ✅ Auto logout pada token expire
- ✅ Protected pages redirect to login
- ✅ User data caching

---

## 📁 Struktur File

```
Web-Komik/
├── login.html              # Halaman login
├── register.html           # Halaman registrasi
├── user-profile.html       # Halaman profil pengguna
├── auth.js                 # Core authentication module
├── auth.css                # Auth pages styling
├── register.js             # Registration form handling
├── profile.js              # Profile management
├── profile.css             # Profile styling
└── index.html              # Halaman utama (sudah ada)
```

---

## ⚙️ Setup & Konfigurasi

### 1. **Integrasikan dengan Backend**

Ubah endpoint API di `auth.js`:

```javascript
// auth.js - Ganti endpoint default
async apiCall(endpoint, data, method = 'POST') {
    const baseUrl = 'https://your-api.com'; // Ganti dengan URL API Anda
    const response = await fetch(`${baseUrl}${endpoint}`, options);
    // ...
}
```

### 2. **Backend API yang Diperlukan**

#### Login
```
POST /auth/login
Request: { email, password, rememberMe }
Response: { success, token, user: { id, username, email } }
```

#### Register
```
POST /auth/register
Request: { username, email, password }
Response: { success, message, token, user }
```

#### Check Email Availability
```
POST /auth/check-email
Request: { email }
Response: { available: boolean }
```

#### Check Username Availability
```
POST /auth/check-username
Request: { username }
Response: { available: boolean }
```

#### Change Password
```
POST /user/change-password
Headers: Authorization: Bearer {token}
Request: { currentPassword, newPassword }
Response: { success, message }
```

---

## 🚀 Penggunaan Cepat

### Login
1. Buka `/login.html`
2. Masukkan email dan password
3. Klik "Masuk"

### Register
1. Buka `/register.html`
2. Isi form dengan data valid
3. Klik "Daftar"

### Akses Profil
1. Login terlebih dahulu
2. Buka `/user-profile.html`
3. Kelola akun Anda

---

## 🔒 Keamanan

**Best Practices Implemented:**

- ✅ Email validation
- ✅ Password strength checking
- ✅ XSS prevention (HTML escaping)
- ✅ Token-based authentication
- ✅ Input validation
- ✅ Protected routes

**Untuk Production:**

- [ ] Gunakan HTTPS
- [ ] Server-side password hashing (bcrypt)
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] Email verification
- [ ] 2FA support

---

## 📝 Fitur yang Ditambahkan

### ✨ Fitur Baru vs Fitur Lama

**Fitur Lama (Dihapus):**
- ❌ Simple username-only login
- ❌ Tidak ada validasi
- ❌ Tanpa password strength checking
- ❌ Tanpa user profile management

**Fitur Baru:**
- ✅ Email-based login
- ✅ Comprehensive validation
- ✅ Password strength meter
- ✅ Full user profile dashboard
- ✅ Reading list management
- ✅ Favorites management
- ✅ Account security features
- ✅ Social login integration
- ✅ Preferences & settings

---

**Terakhir diupdate:** 2026-06-13

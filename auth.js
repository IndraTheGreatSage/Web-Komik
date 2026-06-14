// Authentication System for KomikLoka
const auth = {
    // Storage keys
    STORAGE_KEY: 'komikloka_user',
    OWNER_EMAIL: 'owner@komikloka.com',
    VERIFIED_USERS_KEY: 'komikloka_verified_users',
    FAILED_ATTEMPTS_KEY: 'komikloka_failed_attempts',

    // Initialize auth
    init() {
        this.checkSession();
    },
    
    // Check if user is authenticated
    isAuthenticated() {
        const user = this.getCurrentUser();
        return user !== null;
    },
    
    // Get current user
    getCurrentUser() {
        try {
            const userData = localStorage.getItem(this.STORAGE_KEY);
            const user = userData ? JSON.parse(userData) : null;
            if (user) {
                // Add role information
                user.isOwner = user.email === this.OWNER_EMAIL;
                user.isVerified = this.isVerified(user.email);
            }
            return user;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    },

    // Check if user is verified
    isVerified(email) {
        try {
            const verifiedUsers = JSON.parse(localStorage.getItem(this.VERIFIED_USERS_KEY) || '[]');
            return verifiedUsers.includes(email.toLowerCase());
        } catch {
            return false;
        }
    },

    // Verify user (for admin use)
    verifyUser(email) {
        try {
            const currentUser = this.getCurrentUser();
            if (!currentUser || !currentUser.isOwner) {
                return { success: false, error: 'Hanya owner yang bisa verifikasi user' };
            }

            const verifiedUsers = JSON.parse(localStorage.getItem(this.VERIFIED_USERS_KEY) || '[]');
            if (!verifiedUsers.includes(email.toLowerCase())) {
                verifiedUsers.push(email.toLowerCase());
                localStorage.setItem(this.VERIFIED_USERS_KEY, JSON.stringify(verifiedUsers));
            }
            return { success: true };
        } catch (error) {
            console.error('Verify user error:', error);
            return { success: false, error: 'Terjadi kesalahan saat verifikasi' };
        }
    },
    
    // Check session validity
    checkSession() {
        const user = this.getCurrentUser();
        if (user) {
            // Check if session is still valid (24 hours)
            const loginTime = user.loginTime || 0;
            const now = Date.now();
            const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours
            
            if (now - loginTime > sessionDuration) {
                this.logout();
            }
        }
    },
    
    // Login user
    login(email, password, captchaAnswer = null) {
        try {
            // Check rate limiting
            const failedAttempts = this.getFailedAttempts(email);
            if (failedAttempts >= 5) {
                return { success: false, error: 'Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.' };
            }

            // Check CAPTCHA for suspicious activity
            if (failedAttempts >= 3) {
                if (!captchaAnswer) {
                    return { success: false, error: 'CAPTCHA_REQUIRED', requiresCaptcha: true };
                }
                // Validate CAPTCHA (simple math check)
                const captchaNum = parseInt(captchaAnswer);
                if (isNaN(captchaNum)) {
                    return { success: false, error: 'Jawaban CAPTCHA tidak valid' };
                }
            }

            // Get registered users from localStorage
            const users = this.getUsers();

            // Find user with matching email and password
            const user = users.find(u =>
                u.email.toLowerCase() === email.toLowerCase() &&
                u.password === password
            );

            if (user) {
                // Reset failed attempts on successful login
                this.resetFailedAttempts(email);

                // Create session
                const sessionUser = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    loginTime: Date.now()
                };

                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionUser));
                return { success: true, user: sessionUser };
            } else {
                // Check if this is the owner email trying to login for the first time
                if (email.toLowerCase() === this.OWNER_EMAIL.toLowerCase()) {
                    // Auto-create owner account with the provided password
                    const newOwner = {
                        id: Date.now().toString(),
                        username: 'Owner',
                        email: this.OWNER_EMAIL,
                        password: password,
                        createdAt: new Date().toISOString()
                    };
                    users.push(newOwner);
                    localStorage.setItem('komikloka_users', JSON.stringify(users));

                    // Create session
                    const sessionUser = {
                        id: newOwner.id,
                        username: newOwner.username,
                        email: newOwner.email,
                        loginTime: Date.now()
                    };

                    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionUser));
                    return { success: true, user: sessionUser };
                }

                // Increment failed attempts
                this.incrementFailedAttempts(email);
                return { success: false, error: 'Email atau password salah' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Terjadi kesalahan saat login' };
        }
    },

    // Get failed attempts count
    getFailedAttempts(email) {
        try {
            const attempts = JSON.parse(localStorage.getItem(this.FAILED_ATTEMPTS_KEY) || '{}');
            const userAttempts = attempts[email.toLowerCase()] || { count: 0, timestamp: 0 };

            // Reset if 15 minutes have passed
            const now = Date.now();
            if (now - userAttempts.timestamp > 15 * 60 * 1000) {
                delete attempts[email.toLowerCase()];
                localStorage.setItem(this.FAILED_ATTEMPTS_KEY, JSON.stringify(attempts));
                return 0;
            }

            return userAttempts.count;
        } catch {
            return 0;
        }
    },

    // Increment failed attempts
    incrementFailedAttempts(email) {
        try {
            const attempts = JSON.parse(localStorage.getItem(this.FAILED_ATTEMPTS_KEY) || '{}');
            const userAttempts = attempts[email.toLowerCase()] || { count: 0, timestamp: 0 };

            userAttempts.count++;
            userAttempts.timestamp = Date.now();
            attempts[email.toLowerCase()] = userAttempts;

            localStorage.setItem(this.FAILED_ATTEMPTS_KEY, JSON.stringify(attempts));
        } catch (error) {
            console.error('Increment failed attempts error:', error);
        }
    },

    // Reset failed attempts
    resetFailedAttempts(email) {
        try {
            const attempts = JSON.parse(localStorage.getItem(this.FAILED_ATTEMPTS_KEY) || '{}');
            delete attempts[email.toLowerCase()];
            localStorage.setItem(this.FAILED_ATTEMPTS_KEY, JSON.stringify(attempts));
        } catch (error) {
            console.error('Reset failed attempts error:', error);
        }
    },
    
    // Register new user
    register(username, email, password) {
        try {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return { success: false, error: 'Format email tidak valid' };
            }

            // Get existing users
            const users = this.getUsers();

            // Check if email already exists
            const emailExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
            if (emailExists) {
                return { success: false, error: 'Email sudah terdaftar' };
            }

            // Check if username already exists
            const usernameExists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
            if (usernameExists) {
                return { success: false, error: 'Username sudah digunakan' };
            }

            // Validate password
            if (password.length < 6) {
                return { success: false, error: 'Password minimal 6 karakter' };
            }

            // Create new user
            const newUser = {
                id: Date.now().toString(),
                username: username,
                email: email,
                password: password,
                createdAt: new Date().toISOString()
            };

            // Save user
            users.push(newUser);
            localStorage.setItem('komikloka_users', JSON.stringify(users));

            return { success: true, user: newUser };
        } catch (error) {
            console.error('Register error:', error);
            return { success: false, error: 'Terjadi kesalahan saat mendaftar' };
        }
    },
    
    // Get all registered users
    getUsers() {
        try {
            const usersData = localStorage.getItem('komikloka_users');
            return usersData ? JSON.parse(usersData) : [];
        } catch (error) {
            console.error('Error getting users:', error);
            return [];
        }
    },
    
    // Logout user
    logout() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            // Redirect to home page
            if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
                window.location.href = 'index.html';
            }
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: 'Terjadi kesalahan saat logout' };
        }
    },
    
    // Update user profile
    updateProfile(updates) {
        try {
            const currentUser = this.getCurrentUser();
            if (!currentUser) {
                return { success: false, error: 'User tidak ditemukan' };
            }
            
            const users = this.getUsers();
            const userIndex = users.findIndex(u => u.id === currentUser.id);
            
            if (userIndex === -1) {
                return { success: false, error: 'User tidak ditemukan' };
            }
            
            // Update user data
            users[userIndex] = { ...users[userIndex], ...updates };
            localStorage.setItem('komikloka_users', JSON.stringify(users));
            
            // Update session
            const sessionUser = {
                ...currentUser,
                ...updates,
                loginTime: Date.now()
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionUser));
            
            return { success: true, user: sessionUser };
        } catch (error) {
            console.error('Update profile error:', error);
            return { success: false, error: 'Terjadi kesalahan saat update profil' };
        }
    }
};

// Initialize auth on load
auth.init();

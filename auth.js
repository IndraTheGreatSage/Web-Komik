// Authentication System for KomikLoka
const auth = {
    // Storage keys
    STORAGE_KEY: 'komikloka_user',
    
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
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
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
    login(email, password) {
        try {
            // Get registered users from localStorage
            const users = this.getUsers();
            
            // Find user with matching email and password
            const user = users.find(u => 
                u.email.toLowerCase() === email.toLowerCase() && 
                u.password === password
            );
            
            if (user) {
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
                return { success: false, error: 'Email atau password salah' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Terjadi kesalahan saat login' };
        }
    },
    
    // Register new user
    register(username, email, password) {
        try {
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

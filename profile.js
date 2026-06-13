// Profile Page Manager
class ProfileManager extends AuthManager {
    constructor() {
        super();
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return;
        }
        this.user = this.getUser();
        this.init();
    }

    init() {
        this.setupUI();
        this.loadUserData();
        this.setupEventListeners();
    }

    setupUI() {
        const user = this.user;
        
        // Profile card
        const initials = user.username.charAt(0).toUpperCase();
        document.getElementById('profileAvatar').innerHTML = `<span id="avatarInitials">${initials}</span>`;
        document.getElementById('profileUsername').textContent = user.username;
        document.getElementById('profileEmail').textContent = user.email;

        // Info section
        document.getElementById('infoUsername').textContent = user.username;
        document.getElementById('infoEmail').textContent = user.email;
        document.getElementById('joinDate').textContent = new Date(user.createdAt || Date.now()).toLocaleDateString('id-ID');
    }

    setupEventListeners() {
        // Menu navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => this.switchSection(e.target.closest('.menu-item')));
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Settings
        document.getElementById('changePasswordBtn').addEventListener('click', () => this.openChangePasswordModal());
        document.getElementById('closeModal').addEventListener('click', () => this.closeChangePasswordModal());
        document.getElementById('cancelPassword').addEventListener('click', () => this.closeChangePasswordModal());
        document.getElementById('changePasswordForm').addEventListener('submit', (e) => this.handleChangePassword(e));
        document.getElementById('deleteAccountBtn').addEventListener('click', () => this.handleDeleteAccount());

        // Preferences
        document.getElementById('notificationSettings').addEventListener('change', (e) => this.savePreference('notifications', e.target.checked));
        document.getElementById('emailUpdates').addEventListener('change', (e) => this.savePreference('emailUpdates', e.target.checked));
    }

    switchSection(button) {
        // Remove active from all buttons
        document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
        button.classList.add('active');

        // Hide all sections
        document.querySelectorAll('.profile-section').forEach(section => section.classList.remove('active'));

        // Show selected section
        const sectionId = button.dataset.section;
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('active');
            
            // Load data if needed
            if (sectionId === 'reading') this.loadReadingList();
            if (sectionId === 'favorites') this.loadFavoritesList();
        }
    }

    async loadUserData() {
        try {
            // Simulasi fetch user data
            const response = await this.apiCall('/user/profile', {}, 'GET');
            
            if (response.success) {
                this.user = response.user;
                this.setUser(this.user);
                
                document.getElementById('readingCount').textContent = response.readingCount || 0;
                document.getElementById('favoritesCount').textContent = response.favoritesCount || 0;

                // Load recent activity
                this.loadRecentActivity();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    async loadRecentActivity() {
        try {
            const response = await this.apiCall('/user/activity', {}, 'GET');
            
            if (response.success && response.activity.length > 0) {
                const activityList = document.getElementById('recentActivity');
                activityList.innerHTML = response.activity.map(activity => `
                    <div class="activity-item">
                        <strong>${activity.action}</strong>
                        <small>${new Date(activity.timestamp).toLocaleDateString('id-ID')}</small>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading activity:', error);
        }
    }

    async loadReadingList() {
        try {
            const response = await this.apiCall('/user/reading', {}, 'GET');
            const readingList = document.getElementById('readingList');
            
            if (response.success && response.reading.length > 0) {
                readingList.innerHTML = response.reading.map(item => `
                    <div class="reading-item">
                        <img src="${item.cover}" alt="${item.title}" loading="lazy">
                        <div class="reading-item-body">
                            <h4>${item.title}</h4>
                            <div class="reading-progress">
                                <span>Progress</span>
                                <span>${item.progress}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${item.progress}%"></div>
                            </div>
                            <button class="remove-button" onclick="profileManager.removeFromReading('${item.id}')">
                                Hapus dari daftar
                            </button>
                        </div>
                    </div>
                `).join('');
            } else {
                readingList.innerHTML = '<p class="empty-state">Belum ada komik yang dibaca</p>';
            }
        } catch (error) {
            console.error('Error loading reading list:', error);
        }
    }

    async loadFavoritesList() {
        try {
            const response = await this.apiCall('/user/favorites', {}, 'GET');
            const favoritesList = document.getElementById('favoritesList');
            
            if (response.success && response.favorites.length > 0) {
                favoritesList.innerHTML = response.favorites.map(item => `
                    <div class="favorite-item">
                        <img src="${item.cover}" alt="${item.title}" loading="lazy">
                        <div class="favorite-item-body">
                            <h4>${item.title}</h4>
                            <button class="remove-button" onclick="profileManager.removeFromFavorites('${item.id}')">
                                Hapus favorit
                            </button>
                        </div>
                    </div>
                `).join('');
            } else {
                favoritesList.innerHTML = '<p class="empty-state">Belum ada favorit</p>';
            }
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    }

    openChangePasswordModal() {
        document.getElementById('changePasswordModal').classList.add('active');
    }

    closeChangePasswordModal() {
        document.getElementById('changePasswordModal').classList.remove('active');
        document.getElementById('changePasswordForm').reset();
    }

    async handleChangePassword(e) {
        e.preventDefault();

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;

        if (newPassword !== confirmPassword) {
            alert('Password baru tidak cocok');
            return;
        }

        try {
            const response = await this.apiCall('/user/change-password', {
                currentPassword,
                newPassword,
            });

            if (response.success) {
                alert('Password berhasil diubah');
                this.closeChangePasswordModal();
            } else {
                alert(response.message || 'Gagal mengubah password');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            alert('Terjadi kesalahan');
        }
    }

    async handleDeleteAccount() {
        if (!confirm('Apakah Anda yakin ingin menghapus akun? Tindakan ini tidak dapat dibatalkan.')) {
            return;
        }

        if (!confirm('Ketik "HAPUS AKUN" untuk mengkonfirmasi')) {
            return;
        }

        try {
            const response = await this.apiCall('/user/delete-account', {}, 'DELETE');

            if (response.success) {
                this.logout();
            } else {
                alert(response.message || 'Gagal menghapus akun');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            alert('Terjadi kesalahan');
        }
    }

    async removeFromReading(id) {
        try {
            const response = await this.apiCall('/user/reading/remove', { id });
            if (response.success) {
                this.loadReadingList();
            }
        } catch (error) {
            console.error('Error removing from reading:', error);
        }
    }

    async removeFromFavorites(id) {
        try {
            const response = await this.apiCall('/user/favorites/remove', { id });
            if (response.success) {
                this.loadFavoritesList();
            }
        } catch (error) {
            console.error('Error removing from favorites:', error);
        }
    }

    async savePreference(key, value) {
        try {
            await this.apiCall('/user/preferences', { [key]: value });
        } catch (error) {
            console.error('Error saving preference:', error);
        }
    }
}

// Inisialisasi Profile Manager
const profileManager = new ProfileManager();

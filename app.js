// Journal App - Main JavaScript File

class MoodJournal {
    constructor() {
        this.currentUser = null;
        this.entries = {};
        this.selectedMoods = []; // Array to hold multiple selected moods
        this.apiKey = localStorage.getItem('openai_api_key') || null;
        this.currentQuestions = null;
        this.currentQAResponses = null;
        this.voiceRecognition = null;
        this.voiceRecognitionInitialized = false;
        this.voiceRecognitionStopped = false;
        this.voiceSynthesis = null;
        this.isVoiceChatActive = false;
        this.voiceConversation = [];
        this.currentVoiceContext = '';
        
        // Initialize speech synthesis
        if ('speechSynthesis' in window) {
            this.voiceSynthesis = window.speechSynthesis;
            // Load voices - some browsers need time to load voices
            const loadVoices = () => {
                const voices = this.voiceSynthesis.getVoices();
                if (voices.length > 0) {
                    // Log available voices for debugging
                    const femaleVoices = voices.filter(v => {
                        const name = v.name.toLowerCase();
                        return !name.includes('david') && !name.includes('mark') 
                            && !name.includes('james') && !name.includes('male');
                    });
                    console.log('Available voices:', voices.map(v => v.name));
                    console.log('Female voices found:', femaleVoices.length);
                }
            };
            
            if (this.voiceSynthesis.getVoices().length === 0) {
                this.voiceSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
            } else {
                loadVoices();
            }
        }
        
        this.checkAuth();
    }

    // Authentication Functions
    checkAuth() {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            this.currentUser = JSON.parse(currentUser);
            // Check trial status on login
            if (this.currentUser.subscription?.trial?.active) {
                const trialStatus = this.checkTrialStatus(this.currentUser);
                if (trialStatus?.expired) {
                    // Trial expired - in production, charge the user
                    alert('Your 7-day free trial has ended. Your subscription is now active and you will be charged $5/month.');
                }
            }
            this.loadUserData();
            this.showApp();
        } else {
            this.showAuth();
        }
    }

    showAuth() {
        document.getElementById('authPage').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
        this.setupAuthListeners();
    }

    showApp() {
        document.getElementById('authPage').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        this.updateUserDisplay();
        this.init();
    }

    setupAuthListeners() {
        // Show signup/login forms
        document.getElementById('showSignup').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginForm').classList.remove('active');
            document.getElementById('signupForm').classList.add('active');
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('signupForm').classList.remove('active');
            document.getElementById('loginForm').classList.add('active');
            document.getElementById('forgotPasswordForm').classList.remove('active');
            document.getElementById('resetPasswordForm').style.display = 'none';
        });

        // Forgot password link
        document.getElementById('showForgotPassword').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginForm').classList.remove('active');
            document.getElementById('forgotPasswordForm').classList.add('active');
        });

        // Back to login from forgot password
        document.getElementById('backToLogin').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('forgotPasswordForm').classList.remove('active');
            document.getElementById('loginForm').classList.add('active');
        });

        // Forgot password form
        document.getElementById('forgotPasswordFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
        });

        // Reset password form
        document.getElementById('resetPasswordFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleResetPassword();
        });

        // Login form
        document.getElementById('loginFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Signup form
        document.getElementById('signupFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        // Toggle payment section when subscription checkbox changes
        const subscriptionCheckbox = document.getElementById('enableSubscription');
        const paymentSection = document.getElementById('paymentSection');
        if (subscriptionCheckbox && paymentSection) {
            subscriptionCheckbox.addEventListener('change', (e) => {
                paymentSection.style.display = e.target.checked ? 'block' : 'none';
            });
            // Show payment section if checkbox is checked on load
            if (subscriptionCheckbox.checked) {
                paymentSection.style.display = 'block';
            }
        }

        // Format card number input
        const cardNumberInput = document.getElementById('cardNumber');
        if (cardNumberInput) {
            cardNumberInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\s/g, '');
                let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
                e.target.value = formattedValue;
            });
        }

        // Format expiry date input
        const expiryInput = document.getElementById('cardExpiry');
        if (expiryInput) {
            expiryInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                    value = value.substring(0, 2) + '/' + value.substring(2, 4);
                }
                e.target.value = value;
            });
        }

        // Only allow numbers for CVV
        const cvvInput = document.getElementById('cardCVV');
        if (cvvInput) {
            cvvInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            alert('Please enter both email and password');
            return;
        }

        try {
            // In a real app, this would call your backend API
            // For now, we'll simulate with localStorage
            const user = this.authenticateUser(email, password);
            
            if (user) {
                this.currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                this.loadUserData();
                this.showApp();
                this.showSuccessMessage('Welcome back!');
            } else {
                alert('Invalid email or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
        }
    }

    async handleSignup() {
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const hasSubscription = document.getElementById('enableSubscription').checked;

        if (!name || !email || !password) {
            alert('Please fill in all required fields');
            return;
        }

        if (password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }

        // Validate payment method if subscription is enabled
        if (hasSubscription) {
            const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
            const cardExpiry = document.getElementById('cardExpiry').value;
            const cardCVV = document.getElementById('cardCVV').value;
            const cardName = document.getElementById('cardName').value.trim();

            if (!cardNumber || cardNumber.length < 13) {
                alert('Please enter a valid card number');
                return;
            }

            if (!cardExpiry || !/^\d{2}\/\d{2}$/.test(cardExpiry)) {
                alert('Please enter a valid expiry date (MM/YY)');
                return;
            }

            if (!cardCVV || cardCVV.length < 3) {
                alert('Please enter a valid CVV');
                return;
            }

            if (!cardName) {
                alert('Please enter the cardholder name');
                return;
            }
        }

        try {
            // In a real app, this would call your backend API
            // For now, we'll simulate with localStorage
            const paymentMethod = hasSubscription ? {
                cardNumber: document.getElementById('cardNumber').value.replace(/\s/g, '').slice(-4), // Store last 4 digits only
                cardExpiry: document.getElementById('cardExpiry').value,
                cardName: document.getElementById('cardName').value.trim(),
                // In production, never store full card details - use Stripe token
            } : null;

            const user = this.createUser(name, email, password, hasSubscription, paymentMethod);
            
            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.saveUsers();
            this.loadUserData();
            this.showApp();
            
            if (hasSubscription) {
                alert('🎉 Welcome! Your 7-day free trial has started. You won\'t be charged until the trial ends.');
                // In a real app, process payment method with Stripe (tokenize card)
                this.processSubscription(user);
            } else {
                alert('Account created successfully!');
            }
        } catch (error) {
            console.error('Signup error:', error);
            alert('Signup failed: ' + (error.message || 'Please try again.'));
        }
    }

    // User management (simulated - in production, use backend)
    getUsers() {
        const stored = localStorage.getItem('users');
        return stored ? JSON.parse(stored) : {};
    }

    saveUsers() {
        const users = this.getUsers();
        users[this.currentUser.email] = this.currentUser;
        localStorage.setItem('users', JSON.stringify(users));
    }

    authenticateUser(email, password) {
        const users = this.getUsers();
        const user = users[email];
        
        if (user && user.password === password) {
            // Don't return password in user object
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        }
        
        return null;
    }

    createUser(name, email, password, hasSubscription, paymentMethod = null) {
        const users = this.getUsers();
        
        if (users[email]) {
            throw new Error('User already exists');
        }

        const now = new Date();
        const trialEndDate = hasSubscription ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) : null; // 7 days from now
        const nextBillingDate = hasSubscription ? trialEndDate : null;

        const user = {
            id: Date.now().toString(),
            name,
            email,
            password, // In production, this would be hashed
            subscription: {
                active: hasSubscription,
                plan: 'premium',
                price: 5,
                currency: 'USD',
                trial: hasSubscription ? {
                    active: true,
                    startDate: now.toISOString(),
                    endDate: trialEndDate.toISOString()
                } : null,
                paymentMethod: paymentMethod,
                createdAt: hasSubscription ? now.toISOString() : null,
                nextBillingDate: nextBillingDate ? nextBillingDate.toISOString() : null,
                status: hasSubscription ? 'trial' : 'inactive' // trial, active, cancelled
            },
            createdAt: now.toISOString()
        };

        return user;
    }

    getNextBillingDate() {
        const date = new Date();
        date.setMonth(date.getMonth() + 1);
        return date.toISOString();
    }

    checkTrialStatus(user) {
        if (!user.subscription || !user.subscription.trial || !user.subscription.trial.active) {
            return null;
        }

        const trialEndDate = new Date(user.subscription.trial.endDate);
        const now = new Date();
        const daysRemaining = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));

        if (now > trialEndDate) {
            // Trial expired - in production, charge the user and activate subscription
            user.subscription.trial.active = false;
            user.subscription.status = 'active';
            user.subscription.nextBillingDate = this.getNextBillingDate();
            // In production, charge the payment method here
            return { expired: true, daysRemaining: 0 };
        }

        return { expired: false, daysRemaining: Math.max(0, daysRemaining) };
    }

    loadUserData() {
        if (!this.currentUser) return;
        
        // Load user-specific entries
        const userEntriesKey = `entries_${this.currentUser.id}`;
        const stored = localStorage.getItem(userEntriesKey);
        this.entries = stored ? JSON.parse(stored) : {};
    }

    saveUserEntries() {
        if (!this.currentUser) return;
        
        const userEntriesKey = `entries_${this.currentUser.id}`;
        localStorage.setItem(userEntriesKey, JSON.stringify(this.entries));
    }

    updateUserDisplay() {
        if (!this.currentUser) return;
        
        const userNameEl = document.getElementById('userName');
        const subscriptionBadge = document.getElementById('subscriptionBadge');
        
        if (userNameEl) {
            userNameEl.textContent = this.currentUser.name;
        }
        
        if (subscriptionBadge) {
            if (this.currentUser.subscription?.active || this.currentUser.subscription?.trial?.active) {
                const trialStatus = this.checkTrialStatus(this.currentUser);
                if (trialStatus && trialStatus.expired === false) {
                    subscriptionBadge.textContent = `Trial (${trialStatus.daysRemaining}d left)`;
                    subscriptionBadge.className = 'subscription-badge trial-badge-header';
                } else if (this.currentUser.subscription?.status === 'active') {
                    subscriptionBadge.textContent = 'Premium';
                    subscriptionBadge.className = 'subscription-badge';
                } else {
                    subscriptionBadge.textContent = 'Premium';
                    subscriptionBadge.className = 'subscription-badge';
                }
                subscriptionBadge.style.display = 'inline-block';
            } else {
                subscriptionBadge.style.display = 'none';
            }
        }

        // Save user if trial status was updated
        if (this.currentUser.subscription?.trial?.active) {
            const trialStatus = this.checkTrialStatus(this.currentUser);
            if (trialStatus?.expired) {
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                this.saveUsers();
            }
        }

        // Setup logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            // Remove existing listeners to prevent duplicates
            const newLogoutBtn = logoutBtn.cloneNode(true);
            logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
            newLogoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
    }

    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('currentUser');
            this.currentUser = null;
            this.entries = {};
            this.showAuth();
            
            // Reset forms
            document.getElementById('loginFormElement').reset();
            document.getElementById('signupFormElement').reset();
        }
    }

    async processSubscription(user) {
        // In production, this would integrate with Stripe
        // Tokenize the payment method and create a subscription
        console.log('Processing subscription for:', user.email);
        console.log('Payment method stored (last 4 digits):', user.subscription.paymentMethod?.cardNumber);
        
        // In production, you would:
        // 1. Tokenize the card with Stripe
        // 2. Create a Stripe customer
        // 3. Create a Stripe subscription with trial_end set to 7 days
        // 4. Store the Stripe customer ID and subscription ID
        
        // For now, the trial is already set up in createUser
        // The trial will automatically convert to active after 7 days
        // In production, Stripe webhooks would handle this
        
        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.saveUsers();
        this.updateUserDisplay();
    }

    init() {
        this.renderCurrentDate();
        this.setupEventListeners();
        this.setupRouting();
        this.setupSidebar();
        this.initVersionTracking();
        this.renderEntries();
        this.renderThoughts(); // Initialize thought journal
        this.checkApiKey();
        this.updateSaveButton();
        
        // Initialize admin portal if admin
        if (this.currentUser && this.currentUser.email === 'branlan99@gmail.com') {
            this.setupAdminPortal();
        }
    }

    setupSidebar() {
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const appWrapper = document.getElementById('appContainer');

        if (!sidebar) return;

        // Check if sidebar state is saved in localStorage (desktop only)
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (isCollapsed && window.innerWidth > 768) {
            sidebar.classList.add('collapsed');
            if (appWrapper) {
                appWrapper.classList.add('sidebar-collapsed');
            }
        }

        // Desktop sidebar toggle
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                if (window.innerWidth > 768) {
                    sidebar.classList.toggle('collapsed');
                    if (appWrapper) {
                        appWrapper.classList.toggle('sidebar-collapsed');
                    }
                    // Save state
                    localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
                }
            });
        }

        // Create mobile overlay
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
        `;
        document.body.appendChild(overlay);

        // Mobile menu toggle
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('mobile-open');
                overlay.style.display = sidebar.classList.contains('mobile-open') ? 'block' : 'none';
            });
        }

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            overlay.style.display = 'none';
        });

        // Close sidebar when clicking nav buttons on mobile
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('mobile-open');
                    overlay.style.display = 'none';
                }
            });
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('mobile-open');
                overlay.style.display = 'none';
            }
        });
    }

    initVersionTracking() {
        // Version configuration
        const VERSION_CONFIG = {
            version: '1.0.0',
            buildDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        // Get or create version info
        let versionInfo = localStorage.getItem('appVersionInfo');
        if (!versionInfo) {
            // First time - create version info
            versionInfo = JSON.stringify(VERSION_CONFIG);
            localStorage.setItem('appVersionInfo', versionInfo);
        } else {
            // Check if version has changed (update detection)
            const stored = JSON.parse(versionInfo);
            if (stored.version !== VERSION_CONFIG.version) {
                // Version changed - update timestamp
                VERSION_CONFIG.lastUpdated = new Date().toISOString();
                localStorage.setItem('appVersionInfo', JSON.stringify(VERSION_CONFIG));
                versionInfo = JSON.stringify(VERSION_CONFIG);
            }
        }

        const versionData = JSON.parse(versionInfo);
        
        // Update version display
        const versionEl = document.getElementById('appVersion');
        const lastUpdatedEl = document.getElementById('lastUpdated');
        
        if (versionEl) {
            versionEl.textContent = `v${versionData.version}`;
        }

        if (lastUpdatedEl) {
            const lastUpdated = new Date(versionData.lastUpdated);
            const formattedDate = lastUpdated.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            lastUpdatedEl.textContent = `Last updated: ${formattedDate}`;
        }

        // Store current version for future comparisons
        this.appVersion = versionData.version;
        this.appLastUpdated = versionData.lastUpdated;
    }

    setupAdminPortal() {
        // Setup admin event listeners
        const refreshUsersBtn = document.getElementById('refreshUsers');
        const refreshEmailsBtn = document.getElementById('refreshEmails');
        const userSearchInput = document.getElementById('userSearch');

        if (refreshUsersBtn) {
            refreshUsersBtn.addEventListener('click', () => {
                this.loadAdminUsers();
            });
        }

        if (refreshEmailsBtn) {
            refreshEmailsBtn.addEventListener('click', () => {
                this.loadEmailLogs();
            });
        }

        if (userSearchInput) {
            userSearchInput.addEventListener('input', (e) => {
                this.filterUsers(e.target.value);
            });
        }

        // Load admin data when admin page is shown
        const adminNavBtn = document.getElementById('adminNavBtn');
        if (adminNavBtn) {
            // Remove existing listener to prevent duplicates
            const newAdminNavBtn = adminNavBtn.cloneNode(true);
            adminNavBtn.parentNode.replaceChild(newAdminNavBtn, adminNavBtn);
            newAdminNavBtn.addEventListener('click', () => {
                this.loadAdminData();
            });
        }

        // Load admin data on page load if on admin page
        if (window.location.hash === '#admin') {
            this.loadAdminData();
        }
    }

    loadAdminData() {
        this.loadAdminStats();
        this.loadAdminUsers();
        this.loadEmailLogs();
    }

    loadAdminStats() {
        const users = this.getUsers();
        const userArray = Object.values(users);
        
        let activeSubscriptions = 0;
        let trialUsers = 0;
        let totalEntries = 0;

        userArray.forEach(user => {
            if (user.subscription?.status === 'active') {
                activeSubscriptions++;
            }
            if (user.subscription?.trial?.active) {
                trialUsers++;
            }
            
            // Count entries for this user
            const userEntriesKey = `entries_${user.id}`;
            const entries = localStorage.getItem(userEntriesKey);
            if (entries) {
                const entriesObj = JSON.parse(entries);
                totalEntries += Object.keys(entriesObj).length;
            }
        });

        document.getElementById('totalUsers').textContent = userArray.length;
        document.getElementById('activeSubscriptions').textContent = activeSubscriptions;
        document.getElementById('trialUsers').textContent = trialUsers;
        document.getElementById('totalEntries').textContent = totalEntries;
    }

    loadAdminUsers() {
        const users = this.getUsers();
        const userArray = Object.values(users);
        const tbody = document.getElementById('usersTableBody');
        
        if (tbody) {
            if (userArray.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="no-data">No users found</td></tr>';
                return;
            }

            tbody.innerHTML = userArray.map(user => {
                const subscriptionStatus = user.subscription?.trial?.active 
                    ? `Trial (${this.checkTrialStatus(user)?.daysRemaining || 0}d left)`
                    : user.subscription?.status === 'active' 
                        ? 'Active' 
                        : 'Inactive';
                
                const joinedDate = new Date(user.createdAt).toLocaleDateString();
                
                return `
                    <tr>
                        <td>${this.escapeHtml(user.name)}</td>
                        <td>${this.escapeHtml(user.email)}</td>
                        <td><span class="status-badge ${user.subscription?.status || 'inactive'}">${subscriptionStatus}</span></td>
                        <td>${user.subscription?.plan || 'None'}</td>
                        <td>${joinedDate}</td>
                        <td>
                            <button class="admin-action-btn" onclick="app.viewUserDetails('${user.email}')">View</button>
                            <button class="admin-action-btn danger" onclick="app.deleteUser('${user.email}')">Delete</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    filterUsers(searchTerm) {
        const users = this.getUsers();
        const userArray = Object.values(users);
        const tbody = document.getElementById('usersTableBody');
        const searchLower = searchTerm.toLowerCase();

        if (!searchTerm.trim()) {
            this.loadAdminUsers();
            return;
        }

        const filtered = userArray.filter(user => 
            user.email.toLowerCase().includes(searchLower) || 
            user.name.toLowerCase().includes(searchLower)
        );

        if (tbody) {
            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="no-data">No users match your search</td></tr>';
                return;
            }

            tbody.innerHTML = filtered.map(user => {
                const subscriptionStatus = user.subscription?.trial?.active 
                    ? `Trial (${this.checkTrialStatus(user)?.daysRemaining || 0}d left)`
                    : user.subscription?.status === 'active' 
                        ? 'Active' 
                        : 'Inactive';
                
                const joinedDate = new Date(user.createdAt).toLocaleDateString();
                
                return `
                    <tr>
                        <td>${this.escapeHtml(user.name)}</td>
                        <td>${this.escapeHtml(user.email)}</td>
                        <td><span class="status-badge ${user.subscription?.status || 'inactive'}">${subscriptionStatus}</span></td>
                        <td>${user.subscription?.plan || 'None'}</td>
                        <td>${joinedDate}</td>
                        <td>
                            <button class="admin-action-btn" onclick="app.viewUserDetails('${user.email}')">View</button>
                            <button class="admin-action-btn danger" onclick="app.deleteUser('${user.email}')">Delete</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    loadEmailLogs() {
        const emailLogs = this.getEmailLogs();
        const container = document.getElementById('emailLogs');
        
        if (container) {
            if (emailLogs.length === 0) {
                container.innerHTML = '<div class="no-data">No email logs found</div>';
                return;
            }

            // Sort by timestamp, newest first
            const sortedLogs = emailLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            container.innerHTML = sortedLogs.slice(0, 20).map(log => {
                const date = new Date(log.timestamp).toLocaleString();
                return `
                    <div class="email-log-item">
                        <div class="email-log-header">
                            <span class="email-type">${log.type}</span>
                            <span class="email-date">${date}</span>
                        </div>
                        <div class="email-log-details">
                            <div><strong>To:</strong> ${this.escapeHtml(log.to)}</div>
                            <div><strong>Subject:</strong> ${this.escapeHtml(log.subject)}</div>
                            <div class="email-body-preview">${this.escapeHtml(log.body.substring(0, 100))}${log.body.length > 100 ? '...' : ''}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    viewUserDetails(email) {
        const users = this.getUsers();
        const user = users[email];
        
        if (!user) {
            alert('User not found');
            return;
        }

        const details = `
User Details:
- Name: ${user.name}
- Email: ${user.email}
- Joined: ${new Date(user.createdAt).toLocaleString()}
- Subscription: ${user.subscription?.plan || 'None'}
- Status: ${user.subscription?.status || 'inactive'}
- Trial: ${user.subscription?.trial?.active ? 'Active' : 'Inactive'}
${user.subscription?.trial?.active ? `- Trial Ends: ${new Date(user.subscription.trial.endDate).toLocaleString()}` : ''}
- Payment Method: ${user.subscription?.paymentMethod ? `****${user.subscription.paymentMethod.cardNumber}` : 'None'}
        `;
        
        alert(details);
    }

    deleteUser(email) {
        if (email === 'branlan99@gmail.com') {
            alert('Cannot delete admin account');
            return;
        }

        if (!confirm(`Are you sure you want to delete user ${email}? This action cannot be undone.`)) {
            return;
        }

        const users = this.getUsers();
        if (users[email]) {
            delete users[email];
            localStorage.setItem('users', JSON.stringify(users));
            
            // Also delete user entries
            const user = users[email];
            if (user) {
                const userEntriesKey = `entries_${user.id}`;
                localStorage.removeItem(userEntriesKey);
            }
            
            this.loadAdminUsers();
            this.loadAdminStats();
            alert('User deleted successfully');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Routing System
    setupRouting() {
        // Handle navigation clicks
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.navigateToPage(page);
            });
        });

        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            const page = window.location.hash.slice(1) || 'entry';
            this.showPage(page);
        });

        // Initial page load
        const initialPage = window.location.hash.slice(1) || 'entry';
        this.navigateToPage(initialPage, false);
    }

    navigateToPage(page, pushState = true) {
        if (pushState) {
            window.history.pushState({ page }, '', `#${page}`);
        }
        this.showPage(page);
    }

    showPage(page) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // Show selected page
        const pageElement = document.getElementById(`page-${page}`);
        if (pageElement) {
            pageElement.classList.add('active');
        }

        // Update navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.page === page) {
                btn.classList.add('active');
            }
        });

        // Refresh page-specific content if needed
        if (page === 'calendar') {
            // Calendar is already rendered, just ensure it's visible
        } else if (page === 'entry') {
            // Entry page is default
        } else if (page === 'settings') {
            this.loadSettingsPage();
        } else if (page === 'admin' && this.currentUser && this.currentUser.email === 'branlan99@gmail.com') {
            this.loadAdminData();
        }
    }

    // Date Management
    renderCurrentDate() {
        const dateEl = document.getElementById('currentDate');
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = today.toLocaleDateString('en-US', options);
    }

    getTodayKey() {
        const today = new Date();
        return today.toISOString().split('T')[0]; // YYYY-MM-DD format
    }

    // Data Persistence (now user-specific)
    loadEntries() {
        // Entries are loaded in loadUserData()
        return this.entries;
    }

    // Event Listeners
    setupEventListeners() {
        // Mood selection
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectMood(e.currentTarget.dataset.mood, e.currentTarget.dataset.value, e.currentTarget);
            });
        });

        // Save entry
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            console.log('Save button found, attaching listener');
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Save button clicked!');
                this.saveEntry();
            });
        } else {
            console.error('Save button not found!');
        }

        // Journal text input
        document.getElementById('journalText').addEventListener('input', () => {
            this.updateSaveButton();
        });

        // Calendar toggle
        document.getElementById('toggleCalendar').addEventListener('click', () => {
            this.toggleCalendar();
        });

        // Q&A Section
        document.getElementById('submitAnswers').addEventListener('click', () => {
            this.submitAnswers();
        });

        // AI Suggestions
        document.getElementById('refreshSuggestions').addEventListener('click', () => {
            this.getAISuggestions();
        });

        // Review Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchReviewTab(e.currentTarget.dataset.tab);
            });
        });

        // Generate Reviews
        document.getElementById('generateWeeklyReview').addEventListener('click', () => {
            this.generateWeeklyReview();
        });

        document.getElementById('generateMonthlyReview').addEventListener('click', () => {
            this.generateMonthlyReview();
        });

        // Voice Chat
        document.getElementById('startVoiceChat').addEventListener('click', () => {
            this.startVoiceChat();
        });

        document.getElementById('stopVoiceChat').addEventListener('click', () => {
            this.stopVoiceChat();
        });

        document.getElementById('saveConversation').addEventListener('click', () => {
            this.saveVoiceConversation();
        });

        document.getElementById('cancelConversation').addEventListener('click', () => {
            this.cancelVoiceConversation();
        });

        // Thought Journal
        document.getElementById('saveThoughtBtn').addEventListener('click', () => {
            this.saveThought();
        });

        document.getElementById('getThoughtInsightsBtn').addEventListener('click', () => {
            this.getThoughtInsights();
        });

        // API Key Modal
        document.getElementById('saveApiKey').addEventListener('click', () => {
            this.saveApiKey();
        });

        document.getElementById('skipApiKey').addEventListener('click', () => {
            this.closeApiKeyModal();
        });

        // Close modal on outside click
        document.getElementById('apiKeyModal').addEventListener('click', (e) => {
            if (e.target.id === 'apiKeyModal') {
                this.closeApiKeyModal();
            }
        });
    }

    // Mood Selection (supports multiple selections)
    selectMood(mood, value, buttonElement) {
        const moodIndex = this.selectedMoods.findIndex(m => m.mood === mood);
        
        if (moodIndex > -1) {
            // Deselect if already selected
            this.selectedMoods.splice(moodIndex, 1);
            if (buttonElement) {
                buttonElement.classList.remove('selected');
            }
        } else {
            // Add to selection
            this.selectedMoods.push({ mood, value: parseInt(value) });
            if (buttonElement) {
                buttonElement.classList.add('selected');
            }
        }
        
        this.updateSelectedMoodsDisplay();
        this.updateSaveButton();
    }

    updateSelectedMoodsDisplay() {
        const selectedMoodEl = document.getElementById('selectedMood');
        const selectedMoodsContainer = document.getElementById('selectedMoodsContainer');
        
        if (this.selectedMoods.length === 0) {
            selectedMoodEl.style.display = 'none';
            return;
        }
        
        selectedMoodEl.style.display = 'flex';
        
        const moodData = {
            excited: { emoji: '😄', label: 'Excited' },
            happy: { emoji: '😊', label: 'Happy' },
            grateful: { emoji: '🙏', label: 'Grateful' },
            calm: { emoji: '😌', label: 'Calm' },
            content: { emoji: '🙂', label: 'Content' },
            neutral: { emoji: '😐', label: 'Neutral' },
            tired: { emoji: '😴', label: 'Tired' },
            stressed: { emoji: '😓', label: 'Stressed' },
            frustrated: { emoji: '😤', label: 'Frustrated' },
            sad: { emoji: '😢', label: 'Sad' },
            unhappy: { emoji: '😞', label: 'Unhappy' },
            anxious: { emoji: '😰', label: 'Anxious' },
            depressed: { emoji: '😔', label: 'Depressed' },
            lost: { emoji: '😕', label: 'Lost' }
        };
        
        // Build display for multiple moods
        const moodsDisplay = this.selectedMoods.map(m => {
            const data = moodData[m.mood];
            return `<span class="selected-mood-item">
                <span class="mood-emoji">${data.emoji}</span>
                <span class="mood-label">${data.label}</span>
            </span>`;
        }).join('');
        
        selectedMoodsContainer.innerHTML = moodsDisplay;
    }

    // Save Entry
    saveEntry() {
        console.log('saveEntry called', { moodsCount: this.selectedMoods.length });
        
        if (this.selectedMoods.length === 0) {
            alert('Please select at least one mood for today!');
            return;
        }

        const todayKey = this.getTodayKey();
        const journalTextEl = document.getElementById('journalText');
        const journalText = journalTextEl ? journalTextEl.value.trim() : '';
        
        // Store moods as array, but also keep single mood for backward compatibility
        const entry = {
            moods: this.selectedMoods.map(m => ({ mood: m.mood, value: m.value })),
            mood: this.selectedMoods[0].mood, // Primary mood for backward compatibility
            moodValue: this.selectedMoods[0].value,
            text: journalText,
            date: todayKey,
            timestamp: new Date().toISOString()
        };

        this.entries[todayKey] = entry;
        this.saveUserEntries();
        
        // Clear form
        document.getElementById('journalText').value = '';
        document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('selected'));
        document.getElementById('selectedMood').style.display = 'none';
        this.selectedMoods = [];
        
        // Refresh UI
        this.renderEntries();
        this.updateSaveButton();
        
        // Show success message
        this.showSuccessMessage('Entry saved successfully!');
        
        // Store entry reference for later AI response storage
        this.lastSavedEntryKey = todayKey;
        
        // Generate questions and show Q&A section if API key is available
        if (this.apiKey) {
            this.generateQuestions(entry);
        } else {
            // If no API key, show suggestions section directly (will prompt for key)
            document.getElementById('suggestionsSection').style.display = 'block';
            document.getElementById('suggestionsContent').innerHTML = '<p>Please add your API key to get personalized guidance and questions.</p>';
        }
    }

    // Update Save Button
    updateSaveButton() {
        const saveBtn = document.getElementById('saveBtn');
        if (!saveBtn) return; // Button doesn't exist yet
        
        const hasText = document.getElementById('journalText')?.value.trim().length > 0;
        const hasMoods = this.selectedMoods.length > 0;
        
        saveBtn.disabled = !hasMoods;
        
        if (hasMoods && hasText) {
            saveBtn.textContent = `Save Entry (${this.selectedMoods.length} mood${this.selectedMoods.length > 1 ? 's' : ''})`;
        } else if (hasMoods) {
            saveBtn.textContent = `Save Entry (${this.selectedMoods.length} mood${this.selectedMoods.length > 1 ? 's' : ''}, optional text)`;
        } else {
            saveBtn.textContent = 'Select at least one mood to save';
        }
    }

    // Render Entries
    renderEntries() {
        const entriesList = document.getElementById('entriesList');
        const sortedEntries = Object.entries(this.entries)
            .sort((a, b) => new Date(b[0]) - new Date(a[0]))
            .slice(0, 10); // Show last 10 entries

        if (sortedEntries.length === 0) {
            entriesList.innerHTML = `
                <div class="empty-state">
                    <span class="emoji">📝</span>
                    <p>No entries yet. Start by selecting how you feel today!</p>
                </div>
            `;
            return;
        }

        entriesList.innerHTML = sortedEntries.map(([date, entry]) => {
            const entryDate = new Date(date);
            const formattedDate = entryDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });

            const moodEmojis = {
                excited: '😄',
                happy: '😊',
                grateful: '🙏',
                calm: '😌',
                content: '🙂',
                neutral: '😐',
                tired: '😴',
                stressed: '😓',
                frustrated: '😤',
                sad: '😢',
                unhappy: '😞',
                anxious: '😰',
                depressed: '😔',
                lost: '😕'
            };

            // Handle both old (single mood) and new (multiple moods) format
            const moods = entry.moods || [{ mood: entry.mood }];
            const moodsDisplay = moods.map(m => moodEmojis[m.mood] || '😐').join(' ');

            return `
                <div class="entry-card">
                    <div class="entry-header">
                        <span class="entry-date">${formattedDate}</span>
                        <div class="entry-header-right">
                            <span class="entry-moods">${moodsDisplay}</span>
                            <button class="entry-view-btn" data-date="${date}">View Details</button>
                        </div>
                    </div>
                    ${entry.text ? `<div class="entry-text">${this.escapeHtml(entry.text)}</div>` : ''}
                    ${entry.aiResponse ? `<div class="entry-ai-indicator">💬 AI Guidance Available</div>` : ''}
                </div>
            `;
        }).join('');
        
        // Add event listeners to view buttons
        entriesList.querySelectorAll('.entry-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dateKey = e.currentTarget.dataset.date;
                const entry = this.entries[dateKey];
                if (entry) {
                    this.showEntryDetails(dateKey, entry);
                }
            });
        });
    }

    // Calendar View
    toggleCalendar() {
        const container = document.getElementById('calendarContainer');
        const button = document.getElementById('toggleCalendar');
        
        if (container.style.display === 'none') {
            this.renderCalendar();
            container.style.display = 'block';
            button.textContent = 'Hide Calendar';
        } else {
            container.style.display = 'none';
            button.textContent = 'Show Calendar';
        }
    }

    renderCalendar() {
        const calendarGrid = document.getElementById('calendarGrid');
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        // Get first day of month and number of days
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        // Clear previous calendar
        calendarGrid.innerHTML = '';
        
        // Add day labels
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayLabels.forEach(label => {
            const dayLabel = document.createElement('div');
            dayLabel.className = 'calendar-day-label';
            dayLabel.textContent = label;
            dayLabel.style.gridColumn = 'span 1';
            calendarGrid.appendChild(dayLabel);
        });
        
        // Add empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendarGrid.appendChild(emptyDay);
        }
        
        // Add days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasEntry = this.entries[dateKey];
            
            dayEl.className = `calendar-day ${hasEntry ? 'has-entry' : ''}`;
            dayEl.textContent = day;
            
            // Update tooltip to show multiple moods
            if (hasEntry) {
                const moods = hasEntry.moods || [{ mood: hasEntry.mood }];
                const moodsText = moods.map(m => m.mood).join(', ');
                dayEl.title = `${dateKey}: ${moodsText}`;
            } else {
                dayEl.title = dateKey;
            }
            dayEl.addEventListener('click', () => {
                if (hasEntry) {
                    this.showEntryDetails(dateKey, hasEntry);
                }
            });
            
            calendarGrid.appendChild(dayEl);
        }
    }

    showEntryDetails(dateKey, entry) {
        // Always get the latest entry data from storage to ensure we have AI responses
        const latestEntry = this.entries[dateKey] || entry;
        this.currentViewingEntry = { dateKey, entry: latestEntry };
        this.showEntryModal(dateKey, latestEntry);
    }

    showEntryModal(dateKey, entry) {
        // Ensure we're using the latest entry data from storage
        const latestEntry = this.entries[dateKey] || entry;
        entry = latestEntry;
        const moodEmojis = {
            excited: '😄',
            happy: '😊',
            grateful: '🙏',
            calm: '😌',
            content: '🙂',
            neutral: '😐',
            tired: '😴',
            stressed: '😓',
            frustrated: '😤',
            sad: '😢',
            unhappy: '😞',
            anxious: '😰',
            depressed: '😔',
            lost: '😕'
        };
        
        const date = new Date(dateKey);
        const formattedDate = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Handle both old (single mood) and new (multiple moods) format
        const moods = entry.moods || [{ mood: entry.mood }];
        const moodsText = moods.map(m => `${moodEmojis[m.mood]} ${m.mood}`).join(', ');
        
        // Get AI response if available
        const aiResponse = entry.aiResponse || '';
        const formattedAIResponse = aiResponse ? this.parseTherapeuticResponse(aiResponse) : '<p class="no-ai-response">No AI response available for this entry.</p>';
        
        // Create modal content
        const modalContent = `
            <div class="entry-modal-content">
                <div class="entry-modal-header">
                    <h3>Journal Entry</h3>
                    <button class="modal-close" id="closeEntryModal">&times;</button>
                </div>
                <div class="entry-modal-body">
                    <div class="entry-modal-date">${formattedDate}</div>
                    <div class="entry-modal-moods">
                        <strong>Mood${moods.length > 1 ? 's' : ''}:</strong> ${moodsText}
                    </div>
                    ${entry.text ? `
                        <div class="entry-modal-text">
                            <strong>Your Entry:</strong>
                            <p>${this.escapeHtml(entry.text)}</p>
                        </div>
                    ` : '<div class="entry-modal-text"><p><em>No journal text</em></p></div>'}
                    ${aiResponse ? `
                        <div class="entry-modal-ai">
                            <strong>💬 AI Therapeutic Guidance:</strong>
                            <div class="entry-ai-response">${formattedAIResponse}</div>
                        </div>
                    ` : ''}
                </div>
                <div class="entry-modal-footer">
                    <button class="btn-delete" id="deleteEntryBtn">Delete Entry</button>
                    <button class="btn-secondary" id="closeEntryModalBtn">Close</button>
                </div>
            </div>
        `;
        
        // Create or update modal
        let modal = document.getElementById('entryDetailModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'entryDetailModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = modalContent;
        modal.classList.add('show');
        
        // Event listeners
        document.getElementById('closeEntryModal').addEventListener('click', () => {
            this.closeEntryModal();
        });
        document.getElementById('closeEntryModalBtn').addEventListener('click', () => {
            this.closeEntryModal();
        });
        document.getElementById('deleteEntryBtn').addEventListener('click', () => {
            this.deleteEntry(dateKey);
        });
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'entryDetailModal') {
                this.closeEntryModal();
            }
        });
    }

    closeEntryModal() {
        const modal = document.getElementById('entryDetailModal');
        if (modal) {
            modal.classList.remove('show');
        }
        this.currentViewingEntry = null;
    }

    deleteEntry(dateKey) {
        if (confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
            delete this.entries[dateKey];
            this.saveUserEntries();
            this.renderEntries();
            this.closeEntryModal();
            this.showSuccessMessage('Entry deleted successfully');
            
            // Refresh calendar if it's visible
            const calendarContainer = document.getElementById('calendarContainer');
            if (calendarContainer && calendarContainer.style.display !== 'none') {
                this.renderCalendar();
            }
        }
    }

    // AI Suggestions
    checkApiKey() {
        if (!this.apiKey) {
            // Show modal after a short delay
            setTimeout(() => {
                document.getElementById('apiKeyModal').classList.add('show');
            }, 500);
        } else {
            // If entry exists for today, show suggestions
            const todayKey = this.getTodayKey();
            if (this.entries[todayKey]) {
                this.getAISuggestions();
            }
        }
    }

    saveApiKey() {
        const apiKeyInput = document.getElementById('apiKeyInput');
        const apiKey = apiKeyInput.value.trim();
        
        if (apiKey && apiKey.startsWith('sk-')) {
            this.apiKey = apiKey;
            localStorage.setItem('openai_api_key', apiKey);
            this.closeApiKeyModal();
            
            // Get suggestions if entry exists
            const todayKey = this.getTodayKey();
            if (this.entries[todayKey]) {
                this.getAISuggestions();
            }
        } else {
            alert('Please enter a valid OpenAI API key (should start with "sk-")');
        }
    }

    closeApiKeyModal() {
        document.getElementById('apiKeyModal').classList.remove('show');
    }

    // Generate contextual questions
    async generateQuestions(entry) {
        if (!this.apiKey) return;

        const qaSection = document.getElementById('qaSection');
        const qaContainer = document.getElementById('qaContainer');
        
        qaSection.style.display = 'block';
        qaContainer.innerHTML = '<div class="loading">Generating questions based on your entry...</div>';

        try {
            const moodDescriptions = {
                excited: 'excited and energetic',
                happy: 'happy and positive',
                grateful: 'grateful and appreciative',
                calm: 'calm and peaceful',
                content: 'content and peaceful',
                neutral: 'neutral or okay',
                tired: 'tired or exhausted',
                stressed: 'stressed or overwhelmed',
                frustrated: 'frustrated or irritated',
                sad: 'sad or down',
                unhappy: 'unhappy or displeased',
                anxious: 'anxious or worried',
                depressed: 'depressed or very down',
                lost: 'lost or confused'
            };

            const moods = entry.moods || [{ mood: entry.mood }];
            const moodsText = moods.map(m => moodDescriptions[m.mood] || m.mood).join(', ');

            const prompt = `You are a compassionate therapist. Based on this journal entry, generate 2-3 thoughtful, open-ended questions that will help you better understand the person's situation, feelings, and needs.

Moods: ${moodsText}
Journal entry: "${entry.text || 'No specific entry text'}"

Generate questions that explore:
- WHY they might be feeling this way (underlying causes, triggers, patterns)
- WHO might be involved or affected (relationships, support systems)
- WHAT might be contributing to their feelings (situations, thoughts, beliefs)
- HOW they're coping or would like to feel

Format: Return ONLY the questions, one per line, without numbers or bullets. Make them warm, curious, and non-judgmental. Each question should be on its own line.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a compassionate therapist who asks insightful, open-ended questions to understand people better.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 200,
                    temperature: 0.8
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const questionsText = data.choices[0].message.content;
            
            // Parse questions (split by newlines)
            const questions = questionsText
                .split('\n')
                .map(q => q.trim())
                .filter(q => q.length > 0 && !q.match(/^\d+[\.\)]/) && !q.startsWith('-') && !q.startsWith('•'))
                .slice(0, 3); // Limit to 3 questions

            if (questions.length === 0) {
                // Fallback questions
                questions.push("What might be contributing to how you're feeling right now?");
                questions.push("How would you like to feel instead?");
            }

            // Display questions with input fields
            const questionsHTML = questions.map((question, index) => `
                <div class="qa-item">
                    <div class="qa-question">
                        <span class="question-icon">❓</span>
                        <p>${this.escapeHtml(question)}</p>
                    </div>
                    <textarea 
                        class="qa-answer" 
                        id="qaAnswer${index}" 
                        placeholder="Your answer..."
                        rows="3"
                    ></textarea>
                </div>
            `).join('');

            qaContainer.innerHTML = questionsHTML;
            document.getElementById('submitAnswers').style.display = 'block';
            
            // Store questions for later use
            this.currentQuestions = questions;
            
            // Add skip option
            const skipButton = document.createElement('button');
            skipButton.className = 'skip-qa-btn';
            skipButton.textContent = 'Skip Questions';
            skipButton.onclick = () => {
                this.skipQuestions();
            };
            qaContainer.insertAdjacentElement('beforeend', skipButton);
            
        } catch (error) {
            console.error('Error generating questions:', error);
            qaContainer.innerHTML = `<div class="error-message">Error generating questions. You can still get guidance without answering questions.</div>`;
            // Still show submit button but skip Q&A
            document.getElementById('submitAnswers').style.display = 'block';
            this.currentQuestions = [];
        }
    }

    // Skip questions and get guidance without Q&A
    async skipQuestions() {
        this.currentQAResponses = null;
        this.currentQuestions = null;
        document.getElementById('qaSection').style.display = 'none';
        document.getElementById('suggestionsSection').style.display = 'block';
        await this.getAISuggestions();
    }

    // Submit answers and get enhanced guidance
    async submitAnswers() {
        const qaContainer = document.getElementById('qaContainer');
        const answers = [];
        
        // Collect answers
        for (let i = 0; i < (this.currentQuestions?.length || 3); i++) {
            const answerEl = document.getElementById(`qaAnswer${i}`);
            if (answerEl) {
                const answer = answerEl.value.trim();
                if (answer) {
                    answers.push({
                        question: this.currentQuestions?.[i] || `Question ${i + 1}`,
                        answer: answer
                    });
                }
            }
        }

        // Hide Q&A section, show suggestions section
        document.getElementById('qaSection').style.display = 'none';
        document.getElementById('suggestionsSection').style.display = 'block';
        
        // Store answers for use in suggestions
        this.currentQAResponses = answers;
        
        // Get AI suggestions with Q&A context
        await this.getAISuggestions();
    }

    async getAISuggestions() {
        if (!this.apiKey) {
            document.getElementById('suggestionsSection').style.display = 'none';
            return;
        }

        const todayKey = this.getTodayKey();
        const todayEntry = this.entries[todayKey];
        
        if (!todayEntry) {
            document.getElementById('suggestionsSection').style.display = 'none';
            return;
        }

        document.getElementById('suggestionsSection').style.display = 'block';
        const suggestionsContent = document.getElementById('suggestionsContent');
        suggestionsContent.innerHTML = '<div class="loading">Loading suggestions...</div>';

        try {
            // Get recent entries for context
            const recentEntries = Object.entries(this.entries)
                .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                .slice(0, 7)
                .map(([date, entry]) => {
                    // Handle both old (single mood) and new (multiple moods) format
                    const moods = entry.moods || [{ mood: entry.mood }];
                    return {
                        date,
                        mood: entry.mood, // Primary mood for compatibility
                        moods: moods.map(m => m.mood),
                        text: entry.text
                    };
                });

            const moodDescriptions = {
                excited: 'excited and energetic',
                happy: 'happy and positive',
                grateful: 'grateful and appreciative',
                calm: 'calm and peaceful',
                content: 'content and peaceful',
                neutral: 'neutral or okay',
                tired: 'tired or exhausted',
                stressed: 'stressed or overwhelmed',
                frustrated: 'frustrated or irritated',
                sad: 'sad or down',
                unhappy: 'unhappy or displeased',
                anxious: 'anxious or worried',
                depressed: 'depressed or very down',
                lost: 'lost or confused'
            };

            // Build context from recent entries
            const recentContext = recentEntries.length > 1 
                ? `\n\nLooking at their recent patterns:\n${recentEntries.slice(1, 4).map(e => {
                    const moodsText = e.moods && e.moods.length > 1 
                        ? e.moods.map(m => moodDescriptions[m] || m).join(', ')
                        : moodDescriptions[e.mood] || e.mood;
                    return `- ${e.date}: ${moodsText}${e.text ? ` - "${e.text.substring(0, 100)}${e.text.length > 100 ? '...' : ''}"` : ''}`;
                }).join('\n')}`
                : '';

            // Handle both old (single mood) and new (multiple moods) format
            const todayMoods = todayEntry.moods || [{ mood: todayEntry.mood }];
            const moodsText = todayMoods.length > 1 
                ? todayMoods.map(m => moodDescriptions[m.mood] || m.mood).join(', ')
                : moodDescriptions[todayEntry.mood] || todayEntry.mood;
            const moodLabel = todayMoods.length > 1 ? 'moods' : 'mood';

            // Build Q&A context if available
            let qaContext = '';
            if (this.currentQAResponses && this.currentQAResponses.length > 0) {
                qaContext = `\n\nADDITIONAL CONTEXT FROM OUR DISCUSSION:\n` + 
                    this.currentQAResponses.map((qa, idx) => 
                        `Q${idx + 1}: ${qa.question}\nA${idx + 1}: ${qa.answer}`
                    ).join('\n\n') + '\n';
            }

            const prompt = `You are a compassionate, experienced therapist providing therapeutic guidance. Analyze this person's journal entry deeply${qaContext ? ' along with their responses to our discussion questions' : ''} and provide specific, evidence-based therapeutic insights and techniques.

Today's ${moodLabel}: ${moodsText}
Today's journal entry: "${todayEntry.text || 'No specific entry text'}"${qaContext}${recentContext}

IMPORTANT: Provide SPECIFIC therapeutic techniques and insights. DO NOT give generic advice like "talk to friends" or "reach out to loved ones." Instead:

1. Identify underlying patterns, thoughts, or beliefs you notice in their entry
2. Provide specific cognitive-behavioral techniques, mindfulness practices, or reframing strategies tailored to their situation
3. Suggest concrete coping mechanisms or exercises they can do right now
4. Offer psychological insights about what might be contributing to their current state
5. Include self-compassion or acceptance-based approaches when appropriate

For example, instead of "talk to someone," provide: "Notice how your thoughts are creating a story of [specific pattern]. Try this cognitive reframing exercise: [specific technique]"

Write as a warm, empathetic therapist who understands their experience. Provide 3-5 specific insights or techniques, each 2-4 sentences explaining both the insight and the actionable approach.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an experienced, compassionate therapist specializing in cognitive-behavioral therapy, mindfulness, and evidence-based therapeutic techniques. You provide specific, actionable therapeutic guidance rather than generic advice. You help people understand their patterns, develop coping skills, and work through challenges with concrete techniques.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 600,
                    temperature: 0.8
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const suggestions = data.choices[0].message.content;
            
            // Parse and format suggestions into structured sections
            const formattedSuggestions = this.parseTherapeuticResponse(suggestions);
            suggestionsContent.innerHTML = formattedSuggestions;
            
            // Store AI response with the entry
            if (this.lastSavedEntryKey && this.entries[this.lastSavedEntryKey]) {
                this.entries[this.lastSavedEntryKey].aiResponse = suggestions;
                this.saveUserEntries();
            }
            
            // Clear Q&A responses after using them
            this.currentQAResponses = null;
            this.currentQuestions = null;

        } catch (error) {
            console.error('Error fetching AI suggestions:', error);
            suggestionsContent.innerHTML = `
                <p style="color: #ef4444;">
                    Sorry, we couldn't fetch suggestions right now. Please check your API key and try again.
                    <br><br>
                    Error: ${error.message}
                </p>
            `;
        }
    }

    // Utility Functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    parseTherapeuticResponse(text) {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length === 0) return '';
        
        let html = '';
        let inSection = false;
        let inList = false;
        let sectionNumber = 0;
        
        // Detect structure type
        const hasNumberedSections = lines.some(line => /^\d+[\.\)]\s/.test(line.trim()));
        const hasBulletPoints = lines.some(line => /^[-•]\s/.test(line.trim()));
        
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (!trimmed) continue;
            
            // Check for numbered sections (1., 2., etc.)
            const numberedMatch = trimmed.match(/^(\d+)[\.\)]\s*(.+)$/);
            if (numberedMatch && hasNumberedSections) {
                // Close previous structures
                if (inList) {
                    html += '</div>';
                    inList = false;
                }
                if (inSection) {
                    html += '</div></div>';
                    inSection = false;
                }
                
                sectionNumber = parseInt(numberedMatch[1]);
                const content = numberedMatch[2];
                
                // Check if next line is continuation (not another number/bullet)
                const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
                const hasContinuation = nextLine && !nextLine.match(/^(\d+)[\.\)]|^[-•]/) && nextLine.length > 30;
                
                if (hasContinuation) {
                    // Section with content
                    html += `<div class="therapy-section">
                        <div class="therapy-section-header">
                            <span class="section-number">${sectionNumber}</span>
                            <h4 class="section-title">${this.escapeHtml(content)}</h4>
                        </div>
                        <div class="therapy-section-content">`;
                    inSection = true;
                } else {
                    // Standalone point
                    html += `<div class="therapy-point">
                        <span class="point-number">${sectionNumber}</span>
                        <div class="point-content">${this.escapeHtml(content)}</div>
                    </div>`;
                }
            }
            // Check for bullet points
            else if (/^[-•]\s/.test(trimmed)) {
                if (!inList) {
                    if (inSection) {
                        // Add list inside section
                        html += '<div class="therapy-list">';
                    } else {
                        html += '<div class="therapy-list">';
                    }
                    inList = true;
                }
                const content = trimmed.replace(/^[-•]\s*/, '');
                html += `<div class="therapy-list-item">${this.escapeHtml(content)}</div>`;
            }
            // Regular paragraph
            else {
                if (inSection) {
                    html += `<p class="therapy-paragraph">${this.escapeHtml(trimmed)}</p>`;
                } else if (inList) {
                    // Close list and add paragraph
                    html += '</div>';
                    inList = false;
                    html += `<p class="therapy-paragraph">${this.escapeHtml(trimmed)}</p>`;
                } else {
                    // Standalone content - check if it's an insight/technique
                    const isLongParagraph = trimmed.length > 120;
                    const hasTechniqueKeywords = /(technique|exercise|practice|strategy|approach|try this|notice how|consider)/i.test(trimmed);
                    
                    if ((isLongParagraph || hasTechniqueKeywords) && !hasNumberedSections) {
                        sectionNumber++;
                        html += `<div class="therapy-insight">
                            <div class="insight-icon">💡</div>
                            <div class="insight-content">${this.escapeHtml(trimmed)}</div>
                        </div>`;
                    } else if (i === 0 && !hasNumberedSections && !hasBulletPoints) {
                        // First paragraph - intro style
                        html += `<p class="therapy-intro">${this.escapeHtml(trimmed)}</p>`;
                    } else {
                        html += `<p class="therapy-paragraph">${this.escapeHtml(trimmed)}</p>`;
                    }
                }
            }
        }
        
        // Close any open structures
        if (inList) html += '</div>';
        if (inSection) html += '</div></div>';
        
        // Fallback: if no structure detected, split by double newlines
        if (!html.trim()) {
            const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
            paragraphs.forEach((para) => {
                const trimmed = para.trim().replace(/\n/g, ' ');
                if (trimmed.length > 100) {
                    html += `<div class="therapy-insight">
                        <div class="insight-icon">💭</div>
                        <div class="insight-content">${this.escapeHtml(trimmed)}</div>
                    </div>`;
                } else {
                    html += `<p class="therapy-paragraph">${this.escapeHtml(trimmed)}</p>`;
                }
            });
        }
        
        return html || `<p class="therapy-paragraph">${this.escapeHtml(text)}</p>`;
    }

    showSuccessMessage(message) {
        // Create a temporary success message
        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 1rem 2rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 2000;
            font-weight: 500;
        `;
        messageEl.textContent = message;
        document.body.appendChild(messageEl);

        setTimeout(() => {
            messageEl.style.opacity = '0';
            messageEl.style.transition = 'opacity 0.3s ease';
            setTimeout(() => messageEl.remove(), 300);
        }, 3000);
    }

    // Review Tabs
    switchReviewTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            }
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        if (tab === 'weekly') {
            document.getElementById('weeklyReview').classList.add('active');
        } else {
            document.getElementById('monthlyReview').classList.add('active');
        }
    }

    // Get entries for a date range
    getEntriesInRange(startDate, endDate) {
        const entries = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the entire end date

        Object.entries(this.entries).forEach(([dateKey, entry]) => {
            const entryDate = new Date(dateKey);
            if (entryDate >= start && entryDate <= end) {
                entries.push({ date: dateKey, ...entry });
            }
        });

        return entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // Generate Weekly Review
    async generateWeeklyReview() {
        if (!this.apiKey) {
            alert('Please add your OpenAI API key in settings to generate reviews.');
            return;
        }

        const contentEl = document.getElementById('weeklyReviewContent');
        contentEl.innerHTML = '<div class="loading">Analyzing your week...</div>';

        try {
            // Get entries from the last 7 days
            const today = new Date();
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);

            const weekEntries = this.getEntriesInRange(weekAgo, today);
            
            if (weekEntries.length === 0) {
                contentEl.innerHTML = '<div class="review-placeholder"><p>No entries found for this week. Start journaling to see your progress!</p></div>';
                return;
            }

            const report = await this.generateProgressReport(weekEntries, 'week');
            contentEl.innerHTML = report;
        } catch (error) {
            console.error('Error generating weekly review:', error);
            contentEl.innerHTML = `<div class="review-error">Error generating review: ${error.message}</div>`;
        }
    }

    // Generate Monthly Review
    async generateMonthlyReview() {
        if (!this.apiKey) {
            alert('Please add your OpenAI API key in settings to generate reviews.');
            return;
        }

        const contentEl = document.getElementById('monthlyReviewContent');
        contentEl.innerHTML = '<div class="loading">Analyzing your month...</div>';

        try {
            // Get entries from the last 30 days
            const today = new Date();
            const monthAgo = new Date(today);
            monthAgo.setDate(today.getDate() - 30);

            const monthEntries = this.getEntriesInRange(monthAgo, today);
            
            if (monthEntries.length === 0) {
                contentEl.innerHTML = '<div class="review-placeholder"><p>No entries found for this month. Start journaling to see your progress!</p></div>';
                return;
            }

            const report = await this.generateProgressReport(monthEntries, 'month');
            contentEl.innerHTML = report;
        } catch (error) {
            console.error('Error generating monthly review:', error);
            contentEl.innerHTML = `<div class="review-error">Error generating review: ${error.message}</div>`;
        }
    }

    // Generate Progress Report using AI
    async generateProgressReport(entries, period) {
        const moodDescriptions = {
            excited: 'excited and energetic',
            happy: 'happy and positive',
            grateful: 'grateful and appreciative',
            calm: 'calm and peaceful',
            content: 'content and peaceful',
            neutral: 'neutral or okay',
            tired: 'tired or exhausted',
            stressed: 'stressed or overwhelmed',
            frustrated: 'frustrated or irritated',
            sad: 'sad or down',
            unhappy: 'unhappy or displeased',
            anxious: 'anxious or worried',
            depressed: 'depressed or very down',
            lost: 'lost or confused'
        };

        // Analyze mood patterns
        const moodCounts = {};
        const moodValues = [];
        let totalEntries = 0;
        const entrySummaries = [];

        entries.forEach(entry => {
            const moods = entry.moods || [{ mood: entry.mood, value: entry.moodValue }];
            moods.forEach(m => {
                moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
                moodValues.push(m.value);
            });
            totalEntries++;
            
            const date = new Date(entry.date);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const moodsText = moods.map(m => moodDescriptions[m.mood] || m.mood).join(', ');
            entrySummaries.push(`${dateStr}: ${moodsText}${entry.text ? ` - "${entry.text.substring(0, 80)}${entry.text.length > 80 ? '...' : ''}"` : ''}`);
        });

        // Calculate statistics
        const avgMoodValue = moodValues.length > 0 
            ? (moodValues.reduce((a, b) => a + b, 0) / moodValues.length).toFixed(1)
            : 'N/A';
        
        const mostCommonMood = Object.entries(moodCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        const moodDistribution = Object.entries(moodCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([mood, count]) => `${moodDescriptions[mood] || mood}: ${count} times`)
            .join(', ');

        const prompt = `You are a compassionate therapist providing a progress report. Analyze this person's journal entries from the past ${period} and provide a comprehensive, encouraging progress report.

PERIOD: Past ${period} (${totalEntries} entries)

MOOD STATISTICS:
- Average mood value: ${avgMoodValue}
- Most common mood: ${moodDescriptions[mostCommonMood] || mostCommonMood}
- Mood distribution: ${moodDistribution}

ENTRIES SUMMARY:
${entrySummaries.slice(0, 20).join('\n')}
${entrySummaries.length > 20 ? `\n... and ${entrySummaries.length - 20} more entries` : ''}

Provide a comprehensive progress report that includes:
1. **Overall Mood Pattern**: Describe the general mood trends and patterns you observe
2. **Key Insights**: Identify significant patterns, improvements, or areas of concern
3. **Progress Highlights**: Celebrate positive trends, growth, or resilience shown
4. **Areas for Attention**: Gently note any patterns that might benefit from focus (without being negative)
5. **Recommendations**: Provide 3-5 specific, actionable recommendations based on the patterns observed
6. **Encouragement**: End with warm, supportive encouragement

Write in a warm, empathetic tone. Format with clear sections using headers (## for main sections). Be specific and reference patterns you see in the data.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an experienced therapist who provides compassionate, detailed progress reports that help people understand their emotional patterns and growth.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1200,
                temperature: 0.8
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const reportText = data.choices[0].message.content;

        // Format the report
        return this.formatProgressReport(reportText);
    }

    formatProgressReport(text) {
        // Convert markdown-style headers and format
        let html = text
            .split('\n')
            .map(line => {
                const trimmed = line.trim();
                if (!trimmed) return '';

                // Headers
                if (trimmed.startsWith('## ')) {
                    return `<h4 class="report-section-header">${this.escapeHtml(trimmed.substring(3))}</h4>`;
                }
                if (trimmed.startsWith('### ')) {
                    return `<h5 class="report-subsection-header">${this.escapeHtml(trimmed.substring(4))}</h5>`;
                }
                if (trimmed.startsWith('# ')) {
                    return `<h3 class="report-header">${this.escapeHtml(trimmed.substring(2))}</h3>`;
                }
                
                // Bullet points
                if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
                    return `<li class="report-list-item">${this.escapeHtml(trimmed.substring(2))}</li>`;
                }
                
                // Numbered list
                if (trimmed.match(/^\d+\.\s/)) {
                    return `<li class="report-list-item">${this.escapeHtml(trimmed.replace(/^\d+\.\s/, ''))}</li>`;
                }

                // Bold text
                let formatted = this.escapeHtml(trimmed);
                formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                
                return `<p class="report-paragraph">${formatted}</p>`;
            })
            .filter(line => line)
            .join('\n');

        // Wrap consecutive list items in ul
        html = html.replace(/(<li class="report-list-item">.*?<\/li>\n?)+/g, (match) => {
            return `<ul class="report-list">${match}</ul>`;
        });

        return `<div class="progress-report">${html}</div>`;
    }

    // Voice Chat Functions
    initializeSpeechRecognition() {
        // Only initialize once to avoid multiple microphone permission requests
        if (this.voiceRecognition && this.voiceRecognitionInitialized) {
            return;
        }

        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.voiceRecognition = new SpeechRecognition();
        this.voiceRecognition.continuous = false;
        this.voiceRecognition.interimResults = false;
        this.voiceRecognition.lang = 'en-US';

        this.voiceRecognition.onstart = () => {
            this.updateVoiceStatus('Listening... Speak now', 'listening');
            document.getElementById('startVoiceChat').style.display = 'none';
            document.getElementById('stopVoiceChat').style.display = 'block';
        };

        this.voiceRecognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.handleVoiceInput(transcript);
        };

        this.voiceRecognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'no-speech') {
                this.updateVoiceStatus('No speech detected. Try again.', 'error');
                // Don't auto-restart on no-speech to avoid repeated permission requests
                // User can manually continue
            } else if (event.error === 'not-allowed') {
                this.updateVoiceStatus('Microphone permission denied. Please allow microphone access.', 'error');
                this.isVoiceChatActive = false;
                document.getElementById('startVoiceChat').style.display = 'block';
                document.getElementById('stopVoiceChat').style.display = 'none';
            } else {
                this.updateVoiceStatus(`Error: ${event.error}`, 'error');
            }
        };

        this.voiceRecognition.onend = () => {
            // DO NOT auto-restart here - this was causing multiple permission requests
            // Recognition naturally ends after each speech input
            // We manually restart ONLY ONCE after AI response finishes speaking
            // This prevents the browser from asking for permission multiple times
            if (!this.isVoiceChatActive || this.voiceRecognitionStopped) {
                return;
            }
            // Status will be updated when we manually restart in handleVoiceInput
        };

        this.voiceRecognitionInitialized = true;
    }

    startVoiceChat() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
            return;
        }

        if (!this.apiKey) {
            alert('Please add your OpenAI API key to use voice chat.');
            return;
        }

        this.isVoiceChatActive = true;
        this.voiceRecognitionStopped = false;
        this.voiceConversation = [];
        this.currentVoiceContext = '';

        // Initialize or reuse existing recognition instance
        this.initializeSpeechRecognition();

        // Start recognition ONLY ONCE - do not stop/restart, just start if not running
        try {
            if (this.voiceRecognition) {
                // Check state and only start if truly idle/ended
                const state = this.voiceRecognition.state;
                if (!state || state === 'idle' || state === 'ended') {
                    // Simple start - no stop() call to avoid multiple permission prompts
                    this.voiceRecognition.start();
                    document.getElementById('conversationLog').style.display = 'block';
                    this.addConversationMessage('user', 'Starting conversation...');
                } else {
                    // Already running or starting - just show the conversation
                    document.getElementById('conversationLog').style.display = 'block';
                    this.addConversationMessage('user', 'Starting conversation...');
                }
            }
        } catch (error) {
            console.error('Error starting recognition:', error);
            if (error.name === 'InvalidStateError') {
                // Already running - that's fine, just show conversation
                document.getElementById('conversationLog').style.display = 'block';
                this.addConversationMessage('user', 'Starting conversation...');
            } else {
                this.updateVoiceStatus('Error starting voice recognition. Please try again.', 'error');
                this.isVoiceChatActive = false;
            }
        }
    }

    stopVoiceChat() {
        this.isVoiceChatActive = false;
        this.voiceRecognitionStopped = true; // Mark as intentionally stopped
        if (this.voiceRecognition) {
            try {
                this.voiceRecognition.stop();
            } catch (error) {
                // Ignore errors when stopping
            }
        }
        this.updateVoiceStatus('Recording stopped', 'stopped');
        document.getElementById('startVoiceChat').style.display = 'block';
        document.getElementById('stopVoiceChat').style.display = 'none';
        document.getElementById('voiceActions').style.display = 'flex';
    }

    async handleVoiceInput(transcript) {
        this.addConversationMessage('user', transcript);
        this.voiceConversation.push({ role: 'user', content: transcript });
        this.currentVoiceContext += `User: ${transcript}\n`;

        // Update status
        this.updateVoiceStatus('Processing your message...', 'processing');

        try {
            // Get AI response
            const aiResponse = await this.getVoiceAIResponse(transcript);
            this.addConversationMessage('ai', aiResponse);
            this.voiceConversation.push({ role: 'assistant', content: aiResponse });
            this.currentVoiceContext += `AI: ${aiResponse}\n`;

            // Speak the response
            await this.speakText(aiResponse);

            // Manually restart recognition ONLY ONCE after AI finishes speaking
            // This prevents multiple permission requests
            if (this.isVoiceChatActive && !this.voiceRecognitionStopped && this.voiceRecognition) {
                // Wait for speech to finish, then restart listening ONCE
                setTimeout(() => {
                    if (this.isVoiceChatActive && !this.voiceRecognitionStopped && this.voiceRecognition) {
                        try {
                            // Only start if not already running - this prevents duplicate starts
                            if (this.voiceRecognition.state !== 'running' && 
                                this.voiceRecognition.state !== 'starting') {
                                this.voiceRecognition.start();
                                this.updateVoiceStatus('Listening... Speak your response', 'listening');
                            }
                        } catch (error) {
                            // Silently handle if already running - don't spam errors
                            if (error.name !== 'InvalidStateError') {
                                console.error('Error restarting recognition:', error);
                            }
                        }
                    }
                }, 1500); // Wait 1.5 seconds for speech to finish
            }
        } catch (error) {
            console.error('Error getting AI response:', error);
            this.updateVoiceStatus('Error getting response. Please try again.', 'error');
        }
    }

    async getVoiceAIResponse(userMessage) {
        const conversationHistory = this.voiceConversation.slice(-6); // Last 6 messages for context

        const messages = [
            {
                role: 'system',
                content: 'You are a compassionate therapist having a voice conversation. Ask thoughtful, open-ended questions to understand the person better. Keep responses concise (2-3 sentences) since they are spoken aloud. Ask "why" and "who" questions to explore their feelings and situations. Be warm, curious, and supportive.'
            },
            ...conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            }))
        ];

        // If this is the first message, start with a question
        if (this.voiceConversation.length === 1) {
            messages.push({
                role: 'user',
                content: `The person said: "${userMessage}". Start the conversation by acknowledging what they shared and asking a thoughtful question to understand more.`
            });
        } else {
            messages.push({
                role: 'user',
                content: userMessage
            });
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: messages,
                max_tokens: 150,
                temperature: 0.8
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async speakText(text) {
        // First, try OpenAI TTS API for realistic voices (ChatGPT-like quality)
        if (this.apiKey) {
            try {
                await this.speakWithOpenAITTS(text);
                return;
            } catch (error) {
                console.warn('OpenAI TTS failed, falling back to browser TTS:', error);
                // Fall through to browser TTS fallback
            }
        }

        // Fallback to browser TTS if OpenAI TTS is unavailable
        this.speakWithBrowserTTS(text);
    }

    async speakWithOpenAITTS(text) {
        // OpenAI TTS API offers very realistic, ChatGPT-like voices
        // Available voices: 
        //   - 'nova': Warm, expressive female voice (recommended, similar to ChatGPT)
        //   - 'alloy': Neutral, balanced voice
        //   - 'echo': Clear, professional male voice
        //   - 'fable': Expressive, dynamic voice
        //   - 'onyx': Deep, calm male voice
        //   - 'shimmer': Soft, gentle female voice
        
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'tts-1-hd', // Higher quality, more realistic (tts-1 is faster but lower quality)
                input: text,
                voice: 'nova', // Warm, expressive female voice similar to ChatGPT
                speed: 1.0 // 0.25 to 4.0 - 1.0 is normal speed (can adjust for more natural pacing)
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenAI TTS API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        // Get audio blob and play it
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        // Clean up URL after playing
        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = (error) => {
            console.error('Audio playback error:', error);
            URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
    }

    speakWithBrowserTTS(text) {
        if (!this.voiceSynthesis) {
            console.warn('Speech synthesis not available');
            return;
        }

        if (this.voiceSynthesis.speaking) {
            this.voiceSynthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95; // Slightly slower for more natural speech
        utterance.pitch = 1.0; // Standard pitch
        utterance.volume = 1;
        
        // Get all available voices
        const voices = this.voiceSynthesis.getVoices();
        
        if (voices.length > 0) {
            // Prioritize realistic female voices
            let preferredVoice = voices.find(voice => {
                const name = voice.name.toLowerCase();
                const lang = voice.lang.toLowerCase();
                
                // Prioritize neural/natural voices (most realistic)
                if ((name.includes('neural') || name.includes('natural') || name.includes('premium')) 
                    && lang.includes('en') 
                    && (name.includes('female') || name.includes('aria') || name.includes('zira') 
                        || name.includes('samantha') || name.includes('karen') || name.includes('victoria')
                        || !name.includes('male') && !name.includes('david') && !name.includes('mark'))) {
                    return true;
                }
                return false;
            });
            
            // If no neural voice, try premium/quality voices
            if (!preferredVoice) {
                preferredVoice = voices.find(voice => {
                    const name = voice.name.toLowerCase();
                    const lang = voice.lang.toLowerCase();
                    return (name.includes('aria') || name.includes('zira') || name.includes('samantha') 
                        || name.includes('karen') || name.includes('victoria') || name.includes('susan')
                        || name.includes('hazel') || name.includes('linda'))
                        && lang.includes('en')
                        && !name.includes('male') && !name.includes('david') && !name.includes('mark');
                });
            }
            
            // Fallback to any female-sounding voice (exclude common male names)
            if (!preferredVoice) {
                preferredVoice = voices.find(voice => {
                    const name = voice.name.toLowerCase();
                    const lang = voice.lang.toLowerCase();
                    return lang.includes('en') 
                        && !name.includes('david') && !name.includes('mark') && !name.includes('james')
                        && !name.includes('paul') && !name.includes('richard') && !name.includes('male');
                });
            }
            
            // Final fallback to any English voice
            if (!preferredVoice) {
                preferredVoice = voices.find(voice => voice.lang.toLowerCase().includes('en'));
            }
            
            if (preferredVoice) {
                utterance.voice = preferredVoice;
                console.log('Using browser voice:', preferredVoice.name);
            }
        }

        this.voiceSynthesis.speak(utterance);
    }

    addConversationMessage(role, message) {
        const messagesContainer = document.getElementById('conversationMessages');
        const messageEl = document.createElement('div');
        messageEl.className = `message ${role}`;
        
        const roleLabel = role === 'user' ? 'You' : 'AI';
        const roleIcon = role === 'user' ? '👤' : '🤖';
        
        messageEl.innerHTML = `
            <div class="message-header">
                <span class="message-role">${roleIcon} ${roleLabel}</span>
            </div>
            <div class="message-content">${this.escapeHtml(message)}</div>
        `;
        
        messagesContainer.appendChild(messageEl);
        
        // Auto-scroll to bottom when new message is added
        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    }

    updateVoiceStatus(message, status) {
        const statusEl = document.getElementById('voiceStatus');
        statusEl.textContent = message;
        statusEl.className = `voice-status ${status}`;
    }

    saveVoiceConversation() {
        if (this.voiceConversation.length === 0) {
            alert('No conversation to save.');
            return;
        }

        // Extract moods from conversation (simplified - could be enhanced)
        const conversationText = this.voiceConversation.map(msg => 
            `${msg.role === 'user' ? 'You' : 'AI'}: ${msg.content}`
        ).join('\n\n');

        // Create a journal entry from the conversation
        const todayKey = this.getTodayKey();
        const entry = {
            moods: [{ mood: 'neutral', value: 2 }], // Default mood, could be enhanced with sentiment analysis
            mood: 'neutral',
            moodValue: 2,
            text: `Voice Conversation:\n\n${conversationText}`,
            date: todayKey,
            timestamp: new Date().toISOString(),
            source: 'voice_chat'
        };

        this.entries[todayKey] = entry;
        this.saveUserEntries();
        
        // Refresh UI
        this.renderEntries();
        this.showSuccessMessage('Conversation saved to journal!');
        
        // Reset voice chat
        this.cancelVoiceConversation();
    }

    cancelVoiceConversation() {
        this.isVoiceChatActive = false;
        if (this.voiceRecognition) {
            this.voiceRecognition.stop();
        }
        this.voiceConversation = [];
        this.currentVoiceContext = '';
        this.updateVoiceStatus('Click the microphone to start talking', '');
        document.getElementById('startVoiceChat').style.display = 'block';
        document.getElementById('stopVoiceChat').style.display = 'none';
        document.getElementById('conversationLog').style.display = 'none';
        document.getElementById('voiceActions').style.display = 'none';
        document.getElementById('conversationMessages').innerHTML = '';
        
        if (this.voiceSynthesis.speaking) {
            this.voiceSynthesis.cancel();
        }
    }

    // Thought Journal Functions
    saveThought() {
        const thoughtText = document.getElementById('thoughtInput').value.trim();
        
        if (!thoughtText) {
            alert('Please enter a thought to save.');
            return;
        }

        // Load thoughts from localStorage
        const thoughts = this.loadThoughts();
        const thought = {
            text: thoughtText,
            date: new Date().toISOString(),
            timestamp: Date.now()
        };
        
        thoughts.unshift(thought); // Add to beginning
        localStorage.setItem('thought_journal_entries', JSON.stringify(thoughts));
        
        // Clear input
        document.getElementById('thoughtInput').value = '';
        
        // Show success
        this.showSuccessMessage('Thought saved!');
        
        // Refresh thought history
        this.renderThoughts();
    }

    loadThoughts() {
        const stored = localStorage.getItem('thought_journal_entries');
        return stored ? JSON.parse(stored) : [];
    }

    renderThoughts() {
        const thoughts = this.loadThoughts();
        const thoughtsList = document.getElementById('thoughtsList');
        const thoughtHistory = document.getElementById('thoughtHistory');
        
        if (thoughts.length === 0) {
            thoughtHistory.style.display = 'none';
            return;
        }

        thoughtHistory.style.display = 'block';
        
        thoughtsList.innerHTML = thoughts.slice(0, 10).map((thought, index) => {
            const date = new Date(thought.date);
            const formattedDate = date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="thought-item">
                    <div class="thought-header">
                        <span class="thought-date">${formattedDate}</span>
                        <button class="get-insights-thought-btn" data-index="${index}">Get Insights</button>
                    </div>
                    <div class="thought-text">${this.escapeHtml(thought.text)}</div>
                </div>
            `;
        }).join('');

        // Add event listeners to insight buttons
        thoughtsList.querySelectorAll('.get-insights-thought-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.getInsightsForThought(thoughts[index]);
            });
        });
    }

    async getThoughtInsights() {
        const thoughtText = document.getElementById('thoughtInput').value.trim();
        
        if (!thoughtText) {
            alert('Please enter a thought to get insights.');
            return;
        }

        if (!this.apiKey) {
            alert('Please add your OpenAI API key to get AI insights.');
            return;
        }

        const thought = {
            text: thoughtText,
            date: new Date().toISOString()
        };

        await this.getInsightsForThought(thought);
    }

    async getInsightsForThought(thought) {
        if (!this.apiKey) {
            alert('Please add your OpenAI API key to get AI insights.');
            return;
        }

        const insightsArea = document.getElementById('aiInsightsArea');
        const insightsContent = document.getElementById('insightsContent');
        
        insightsArea.style.display = 'block';
        insightsContent.innerHTML = '<div class="loading">Analyzing your thought and generating insights...</div>';

        try {
            // Get recent thoughts for context
            const thoughts = this.loadThoughts();
            const recentThoughts = thoughts.slice(0, 5).map(t => t.text).join('\n\n');

            const prompt = `You are a compassionate therapist and cognitive coach. A person has shared this thought:

"${thought.text}"

${recentThoughts ? `\nContext from their recent thoughts:\n${recentThoughts}` : ''}

Your task:
1. **Reflect and Validate**: Acknowledge what they're thinking and validate their experience
2. **Explore Deeper**: Ask 2-3 thoughtful questions that help them explore this thought more deeply
3. **Identify Patterns**: If you notice any patterns, beliefs, or assumptions, gently point them out
4. **Expand Perspective**: Offer 2-3 alternative perspectives or ways to think about this
5. **Build On It**: Provide insights that build on their thought and help them see connections, possibilities, or growth opportunities

Write in a warm, curious, and supportive tone. Be specific and reference their actual thought. Format your response with clear sections. Keep it concise but meaningful (300-400 words total).`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an experienced cognitive therapist who helps people explore their thoughts deeply, identify patterns, and expand their perspectives in a warm, supportive way.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 600,
                    temperature: 0.8
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const insights = data.choices[0].message.content;
            
            // Format insights
            const formattedInsights = this.formatThoughtInsights(insights);
            insightsContent.innerHTML = formattedInsights;

        } catch (error) {
            console.error('Error getting thought insights:', error);
            insightsContent.innerHTML = `
                <div class="error-message">
                    Error generating insights: ${error.message}. Please try again.
                </div>
            `;
        }
    }

    formatThoughtInsights(text) {
        let html = text
            .split('\n')
            .map(line => {
                const trimmed = line.trim();
                if (!trimmed) return '';

                // Headers
                if (trimmed.startsWith('## ')) {
                    return `<h5 class="insight-section-header">${this.escapeHtml(trimmed.substring(3))}</h5>`;
                }
                if (trimmed.startsWith('### ')) {
                    return `<h6 class="insight-subsection-header">${this.escapeHtml(trimmed.substring(4))}</h6>`;
                }
                if (trimmed.startsWith('# ')) {
                    return `<h4 class="insight-header">${this.escapeHtml(trimmed.substring(2))}</h4>`;
                }
                
                // Bullet points
                if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
                    return `<li class="insight-list-item">${this.escapeHtml(trimmed.substring(2))}</li>`;
                }
                
                // Numbered list
                if (trimmed.match(/^\d+[\.\)]\s/)) {
                    return `<li class="insight-list-item">${this.escapeHtml(trimmed.replace(/^\d+[\.\)]\s/, ''))}</li>`;
                }

                // Bold text
                let formatted = this.escapeHtml(trimmed);
                formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                
                return `<p class="insight-paragraph">${formatted}</p>`;
            })
            .filter(line => line)
            .join('\n');

        // Wrap consecutive list items in ul
        html = html.replace(/(<li class="insight-list-item">.*?<\/li>\n?)+/g, (match) => {
            return `<ul class="insight-list">${match}</ul>`;
        });

        return `<div class="thought-insights">${html}</div>`;
    }

    // Settings Page Functions
    loadSettingsPage() {
        if (!this.currentUser) return;
        
        // Load account information
        document.getElementById('settingsUserName').textContent = this.currentUser.name;
        document.getElementById('settingsUserEmail').textContent = this.currentUser.email;
        
        const memberSince = new Date(this.currentUser.createdAt);
        document.getElementById('settingsMemberSince').textContent = memberSince.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Load subscription information
        this.loadSubscriptionSettings();
        
        // Load API key (masked)
        const apiKey = localStorage.getItem('openai_api_key') || '';
        const apiKeyInput = document.getElementById('settingsApiKey');
        if (apiKey) {
            const maskedKey = `${apiKey.substring(0, 7)}${'•'.repeat(Math.max(0, apiKey.length - 7))}`;
            apiKeyInput.value = maskedKey;
            apiKeyInput.setAttribute('data-actual-key', apiKey);
        } else {
            apiKeyInput.value = '';
            apiKeyInput.setAttribute('data-actual-key', '');
            apiKeyInput.placeholder = 'sk-...';
        }
        
        // Setup settings event listeners
        this.setupSettingsListeners();
    }

    loadSubscriptionSettings() {
        const subscription = this.currentUser.subscription;
        const statusEl = document.getElementById('settingsSubscriptionStatus');
        const trialInfoRow = document.getElementById('trialInfoRow');
        const billingInfoRow = document.getElementById('billingInfoRow');
        const planInfoRow = document.getElementById('planInfoRow');
        const paymentMethodRow = document.getElementById('paymentMethodRow');
        const cancelBtn = document.getElementById('cancelSubscriptionBtn');
        const reactivateBtn = document.getElementById('reactivateSubscriptionBtn');
        
        if (!subscription || !subscription.active) {
            statusEl.textContent = 'Inactive';
            statusEl.className = 'info-value status-inactive';
            trialInfoRow.style.display = 'none';
            billingInfoRow.style.display = 'none';
            planInfoRow.style.display = 'none';
            paymentMethodRow.style.display = 'none';
            cancelBtn.style.display = 'none';
            reactivateBtn.style.display = 'none';
            return;
        }
        
        // Check trial status
        if (subscription.trial && subscription.trial.active) {
            const trialStatus = this.checkTrialStatus(this.currentUser);
            if (trialStatus && !trialStatus.expired) {
                statusEl.textContent = 'Free Trial';
                statusEl.className = 'info-value status-trial';
                trialInfoRow.style.display = 'flex';
                const trialEnd = new Date(subscription.trial.endDate);
                document.getElementById('settingsTrialEnds').textContent = trialEnd.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            } else {
                statusEl.textContent = 'Active';
                statusEl.className = 'info-value status-active';
                trialInfoRow.style.display = 'none';
            }
        } else {
            statusEl.textContent = 'Active';
            statusEl.className = 'info-value status-active';
            trialInfoRow.style.display = 'none';
        }
        
        // Show billing info if active subscription
        if (subscription.nextBillingDate) {
            billingInfoRow.style.display = 'flex';
            const nextBilling = new Date(subscription.nextBillingDate);
            document.getElementById('settingsNextBilling').textContent = nextBilling.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        } else {
            billingInfoRow.style.display = 'none';
        }
        
        // Show plan info
        planInfoRow.style.display = 'flex';
        document.getElementById('settingsPlan').textContent = `${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} - $${subscription.price}/${subscription.currency === 'USD' ? 'month' : subscription.currency}`;
        
        // Show payment method
        if (subscription.paymentMethod) {
            paymentMethodRow.style.display = 'flex';
            const last4 = subscription.paymentMethod.cardNumber || '****';
            document.getElementById('settingsPaymentMethod').textContent = `•••• ${last4}`;
        } else {
            paymentMethodRow.style.display = 'none';
        }
        
        // Show cancel/reactivate buttons
        if (subscription.status === 'cancelled') {
            cancelBtn.style.display = 'none';
            reactivateBtn.style.display = 'block';
        } else {
            cancelBtn.style.display = 'block';
            reactivateBtn.style.display = 'none';
        }
    }

    setupSettingsListeners() {
        // Change password form
        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleChangePassword();
            });
        }
        
        // API key toggle
        const toggleApiKeyBtn = document.getElementById('toggleApiKey');
        if (toggleApiKeyBtn) {
            toggleApiKeyBtn.addEventListener('click', () => {
                this.toggleApiKeyVisibility();
            });
        }
        
        // Save API key
        const saveApiKeySettings = document.getElementById('saveApiKeySettings');
        if (saveApiKeySettings) {
            saveApiKeySettings.addEventListener('click', () => {
                this.saveApiKeyFromSettings();
            });
        }
        
        // Remove API key
        const removeApiKeySettings = document.getElementById('removeApiKeySettings');
        if (removeApiKeySettings) {
            removeApiKeySettings.addEventListener('click', () => {
                this.removeApiKeyFromSettings();
            });
        }
        
        // Export data
        const exportDataBtn = document.getElementById('exportDataBtn');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => {
                this.exportUserData();
            });
        }
        
        // Delete account
        const deleteAccountBtn = document.getElementById('deleteAccountBtn');
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => {
                this.handleDeleteAccount();
            });
        }
        
        // Cancel subscription
        const cancelSubscriptionBtn = document.getElementById('cancelSubscriptionBtn');
        if (cancelSubscriptionBtn) {
            cancelSubscriptionBtn.addEventListener('click', () => {
                this.handleCancelSubscription();
            });
        }
        
        // Reactivate subscription
        const reactivateSubscriptionBtn = document.getElementById('reactivateSubscriptionBtn');
        if (reactivateSubscriptionBtn) {
            reactivateSubscriptionBtn.addEventListener('click', () => {
                this.handleReactivateSubscription();
            });
        }
    }

    handleChangePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPasswordSettings').value;
        const confirmPassword = document.getElementById('confirmPasswordSettings').value;
        
        // Validate current password
        if (this.currentUser.password !== currentPassword) {
            alert('Current password is incorrect.');
            return;
        }
        
        // Validate new password
        if (newPassword.length < 6) {
            alert('New password must be at least 6 characters.');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            alert('New passwords do not match.');
            return;
        }
        
        if (newPassword === currentPassword) {
            alert('New password must be different from current password.');
            return;
        }
        
        // Update password
        this.currentUser.password = newPassword;
        this.saveUsers();
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        // Clear form
        document.getElementById('changePasswordForm').reset();
        
        this.showSuccessMessage('Password updated successfully!');
    }

    toggleApiKeyVisibility() {
        const apiKeyInput = document.getElementById('settingsApiKey');
        const toggleBtn = document.getElementById('toggleApiKey');
        const actualKey = apiKeyInput.getAttribute('data-actual-key') || '';
        
        if (!actualKey) {
            // No key to toggle
            return;
        }
        
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleBtn.textContent = '🙈';
            apiKeyInput.value = actualKey;
        } else {
            apiKeyInput.type = 'password';
            toggleBtn.textContent = '👁️';
            const maskedKey = `${actualKey.substring(0, 7)}${'•'.repeat(Math.max(0, actualKey.length - 7))}`;
            apiKeyInput.value = maskedKey;
        }
    }

    saveApiKeyFromSettings() {
        const apiKeyInput = document.getElementById('settingsApiKey');
        let apiKey = apiKeyInput.value.trim();
        
        // If it's masked, get the actual key
        if (apiKey.includes('•')) {
            apiKey = apiKeyInput.getAttribute('data-actual-key') || '';
        }
        
        if (!apiKey || !apiKey.startsWith('sk-')) {
            alert('Please enter a valid OpenAI API key (starts with sk-).');
            return;
        }
        
        localStorage.setItem('openai_api_key', apiKey);
        this.apiKey = apiKey;
        
        // Update the input
        apiKeyInput.setAttribute('data-actual-key', apiKey);
        const maskedKey = `${apiKey.substring(0, 7)}${'•'.repeat(Math.max(0, apiKey.length - 7))}`;
        apiKeyInput.value = maskedKey;
        apiKeyInput.type = 'password';
        document.getElementById('toggleApiKey').textContent = '👁️';
        
        this.showSuccessMessage('API key saved successfully!');
    }

    removeApiKeyFromSettings() {
        if (!confirm('Are you sure you want to remove your API key? You won\'t be able to use AI features until you add it again.')) {
            return;
        }
        
        localStorage.removeItem('openai_api_key');
        this.apiKey = null;
        
        const apiKeyInput = document.getElementById('settingsApiKey');
        apiKeyInput.value = '';
        apiKeyInput.setAttribute('data-actual-key', '');
        
        this.showSuccessMessage('API key removed.');
    }

    exportUserData() {
        const userData = {
            user: {
                name: this.currentUser.name,
                email: this.currentUser.email,
                createdAt: this.currentUser.createdAt,
                subscription: this.currentUser.subscription
            },
            entries: this.entries,
            thoughts: this.loadThoughts(),
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(userData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mood-journal-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showSuccessMessage('Data exported successfully!');
    }

    handleDeleteAccount() {
        const confirmation = prompt('This will permanently delete your account and all your data. This action cannot be undone.\n\nType "DELETE" to confirm:');
        
        if (confirmation !== 'DELETE') {
            return;
        }
        
        if (!confirm('Are you absolutely sure? All your journal entries, thoughts, and account data will be permanently deleted.')) {
            return;
        }
        
        // Delete user data
        const users = this.getUsers();
        delete users[this.currentUser.email];
        localStorage.setItem('users', JSON.stringify(users));
        
        // Delete user-specific entries
        localStorage.removeItem(`entries_${this.currentUser.email}`);
        localStorage.removeItem(`thoughts_${this.currentUser.email}`);
        
        // Clear current user
        localStorage.removeItem('currentUser');
        this.currentUser = null;
        this.entries = {};
        
        // Redirect to auth page
        alert('Your account has been deleted.');
        this.showAuth();
    }

    handleCancelSubscription() {
        if (!confirm('Are you sure you want to cancel your subscription? You will continue to have access until the end of your current billing period.')) {
            return;
        }
        
        this.currentUser.subscription.status = 'cancelled';
        this.saveUsers();
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        this.loadSubscriptionSettings();
        this.showSuccessMessage('Subscription cancelled. You will continue to have access until the end of your billing period.');
    }

    handleReactivateSubscription() {
        if (!confirm('Reactivate your subscription? You will be charged $5/month starting immediately.')) {
            return;
        }
        
        this.currentUser.subscription.status = 'active';
        const now = new Date();
        this.currentUser.subscription.nextBillingDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
        
        this.saveUsers();
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        this.loadSubscriptionSettings();
        this.showSuccessMessage('Subscription reactivated!');
    }
}

// Initialize the app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new MoodJournal();
});


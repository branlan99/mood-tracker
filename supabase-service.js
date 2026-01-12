// Supabase Service Layer
// Handles all database operations with Supabase

class SupabaseService {
    constructor() {
        this.supabase = window.supabaseClient || null;
        this.isAvailable = !!this.supabase;
        
        if (!this.isAvailable) {
            console.warn('Supabase not configured. Falling back to localStorage.');
        }
    }

    // Authentication Methods
    async signUp(email, password, name) {
        if (!this.isAvailable) {
            throw new Error('Supabase not configured');
        }

        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name
                }
            }
        });

        if (error) throw error;
        return data;
    }

    async signIn(email, password) {
        if (!this.isAvailable) {
            throw new Error('Supabase not configured');
        }

        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        return data;
    }

    async signOut() {
        if (!this.isAvailable) return;
        await this.supabase.auth.signOut();
    }

    async sendPasswordResetEmail(email) {
        if (!this.isAvailable) {
            throw new Error('Supabase not configured');
        }

        // Configure the redirect URL (should be your app URL)
        // Supabase will append ?type=recovery&access_token=... to this URL
        const redirectUrl = `${window.location.origin}${window.location.pathname}`;
        
        console.log('📧 Sending password reset email to:', email);
        console.log('📧 Redirect URL:', redirectUrl);
        
        const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl,
            emailRedirectTo: redirectUrl
        });

        if (error) {
            console.error('❌ Supabase password reset error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            throw error;
        }
        
        console.log('✅ Password reset email sent successfully');
        return data;
    }

    async updatePassword(newPassword) {
        if (!this.isAvailable) {
            throw new Error('Supabase not configured');
        }

        const { data, error } = await this.supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;
        return data;
    }

    async verifyPasswordResetToken(accessToken) {
        if (!this.isAvailable) {
            throw new Error('Supabase not configured');
        }

        // Set the session with the access token from the reset link
        const { data, error } = await this.supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: '' // Not needed for password reset
        });

        if (error) throw error;
        return data;
    }

    async getCurrentUser() {
        if (!this.isAvailable) return null;
        
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user) return null;

        // Get profile
        const { data: profile, error } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return { id: user.id, email: user.email, name: user.email.split('@')[0] };
        }

        return {
            id: user.id,
            email: profile.email || user.email,
            name: profile.name,
            createdAt: profile.created_at
        };
    }

    async getSubscription(userId) {
        if (!this.isAvailable) return null;

        const { data, error } = await this.supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error fetching subscription:', error);
            return null;
        }

        return data;
    }

    async createSubscription(userId, subscriptionData) {
        if (!this.isAvailable) return null;

        const { data, error } = await this.supabase
            .from('subscriptions')
            .insert({
                user_id: userId,
                status: subscriptionData.status || 'trial',
                plan: subscriptionData.plan || 'premium',
                price: subscriptionData.price || 5.00,
                currency: subscriptionData.currency || 'USD',
                trial_start_date: subscriptionData.trialStartDate,
                trial_end_date: subscriptionData.trialEndDate,
                next_billing_date: subscriptionData.nextBillingDate
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating subscription:', error);
            return null;
        }

        return data;
    }

    // Entries Methods
    async getEntries(userId) {
        if (!this.isAvailable) return {};

        const { data, error } = await this.supabase
            .from('entries')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });

        if (error) {
            console.error('Error fetching entries:', error);
            return {};
        }

        // Convert to the format expected by the app
        const entries = {};
        data.forEach(entry => {
            const dateKey = entry.date;
            entries[dateKey] = {
                date: dateKey,
                mood: entry.mood,
                moods: entry.moods || (entry.mood ? [{ mood: entry.mood }] : []),
                text: entry.text,
                aiResponse: entry.ai_response
            };
        });

        return entries;
    }

    async saveEntry(userId, entry) {
        if (!this.isAvailable) return null;

        const entryData = {
            user_id: userId,
            date: entry.date,
            mood: entry.mood,
            moods: entry.moods || null,
            text: entry.text || null,
            ai_response: entry.aiResponse || null
        };

        const { data, error } = await this.supabase
            .from('entries')
            .upsert(entryData, {
                onConflict: 'user_id,date'
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving entry:', error);
            throw error;
        }

        return data;
    }

    async deleteEntry(userId, date) {
        if (!this.isAvailable) return false;

        const { error } = await this.supabase
            .from('entries')
            .delete()
            .eq('user_id', userId)
            .eq('date', date);

        if (error) {
            console.error('Error deleting entry:', error);
            return false;
        }

        return true;
    }

    // Thoughts Methods
    async getThoughts(userId) {
        if (!this.isAvailable) return [];

        const { data, error } = await this.supabase
            .from('thoughts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching thoughts:', error);
            return [];
        }

        return data.map(thought => ({
            text: thought.text,
            date: thought.created_at,
            timestamp: new Date(thought.created_at).getTime(),
            aiInsights: thought.ai_insights
        }));
    }

    async saveThought(userId, thoughtText) {
        if (!this.isAvailable) return null;

        const { data, error } = await this.supabase
            .from('thoughts')
            .insert({
                user_id: userId,
                text: thoughtText
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving thought:', error);
            throw error;
        }

        return {
            text: data.text,
            date: data.created_at,
            timestamp: new Date(data.created_at).getTime()
        };
    }

    async updateThoughtInsights(userId, thoughtId, insights) {
        if (!this.isAvailable) return false;

        const { error } = await this.supabase
            .from('thoughts')
            .update({ ai_insights: insights })
            .eq('id', thoughtId)
            .eq('user_id', userId);

        return !error;
    }

    // Admin Methods
    // Note: These require admin RLS policies (see supabase-schema-fixed.sql)
    // Admin user (branlan99@gmail.com) can view all users via RLS policies
    async getAllUsers() {
        if (!this.isAvailable) return [];

        try {
            // Get all profiles (RLS policy allows admin to see all)
            const { data: profiles, error: profilesError } = await this.supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profilesError) {
                console.error('Error fetching profiles:', profilesError);
                return [];
            }

            // Get all subscriptions (RLS policy allows admin to see all)
            const { data: subscriptions, error: subsError } = await this.supabase
                .from('subscriptions')
                .select('*');

            if (subsError && subsError.code !== 'PGRST116') {
                console.error('Error fetching subscriptions:', subsError);
            }

            // Combine profiles with their subscriptions
            const users = (profiles || []).map(profile => {
                const userSubs = (subscriptions || []).filter(sub => sub.user_id === profile.id);
                return {
                    ...profile,
                    subscriptions: userSubs
                };
            });

            return users;
        } catch (error) {
            console.error('Error in getAllUsers:', error);
            return [];
        }
    }

    async getEmailLogs() {
        if (!this.isAvailable) return [];

        const { data, error } = await this.supabase
            .from('email_logs')
            .select('*')
            .order('sent_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Error fetching email logs:', error);
            return [];
        }

        return data;
    }

    // Listen to auth state changes
    onAuthStateChange(callback) {
        if (!this.isAvailable) return () => {};

        return this.supabase.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    }
}

// Create global instance
window.supabaseService = new SupabaseService();


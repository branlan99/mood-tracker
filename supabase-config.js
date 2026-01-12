// Supabase Configuration
// Replace these with your actual Supabase project credentials

const SUPABASE_CONFIG = {
    url: 'https://mmshfdysrnoogeiuxtyi.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tc2hmZHlzcm5vb2dlaXV4dHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MjQyOTMsImV4cCI6MjA4MzUwMDI5M30.g77CMfLgPHeWh_VfAqJn5mU0AjwoL15zr9HE7qD4vKE'
};

// Initialize Supabase client only if credentials are provided
if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.url.includes('supabase.co') && 
    SUPABASE_CONFIG.anonKey && SUPABASE_CONFIG.anonKey.startsWith('eyJ')) {
    try {
        const supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        window.supabaseClient = supabase;
        console.log('Supabase client initialized successfully');
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        window.supabaseClient = null;
    }
} else {
    console.warn('Supabase not configured. Update supabase-config.js with your credentials.');
    window.supabaseClient = null;
}


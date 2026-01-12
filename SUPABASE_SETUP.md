# Supabase Setup Guide

This guide will help you set up Supabase for the Mood Journal app.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: Mood Journal (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be set up (takes 1-2 minutes)

## Step 2: Get Your API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 3: Update Configuration

1. Open `supabase-config.js` in your project
2. Replace the placeholders:
   ```javascript
   const SUPABASE_CONFIG = {
       url: 'https://your-project-id.supabase.co', // Your Project URL
       anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Your anon key
   };
   ```

## Step 4: Create Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase-schema.sql`
4. Paste it into the SQL Editor
5. Click "Run" (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

## Step 5: Verify Tables Created

1. Go to **Table Editor** in Supabase dashboard
2. You should see these tables:
   - `profiles`
   - `subscriptions`
   - `payment_methods`
   - `entries`
   - `thoughts`
   - `email_logs`

## Step 6: Test the Connection

1. Open your app in a browser
2. Open browser console (F12)
3. Try to sign up a new user
4. Check Supabase dashboard → **Authentication** → **Users** to see if user was created
5. Check **Table Editor** → **profiles** to see if profile was created

## Troubleshooting

### "Invalid API key" error
- Double-check your `supabase-config.js` file
- Make sure you're using the **anon/public key**, not the service_role key

### "Row Level Security" errors
- Make sure you ran the entire `supabase-schema.sql` file
- Check that RLS policies were created in **Authentication** → **Policies**

### User created but profile not created
- Check the trigger was created: Go to **Database** → **Functions** → `handle_new_user`
- Check **Database** → **Triggers** → `on_auth_user_created`

### Can't insert entries
- Make sure you're authenticated (check browser console for auth errors)
- Verify RLS policies allow INSERT for authenticated users

## Security Notes

- The `anon` key is safe to use in frontend code (it's public)
- Row Level Security (RLS) ensures users can only access their own data
- Never commit your `service_role` key to version control
- The `anon` key is fine to commit (it's designed to be public)

## Next Steps

Once Supabase is set up:
1. The app will automatically use Supabase instead of localStorage
2. All data will be stored in the cloud
3. Users can access their data from any device
4. Data is automatically backed up by Supabase


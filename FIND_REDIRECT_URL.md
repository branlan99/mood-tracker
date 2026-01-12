# How to Find Your Redirect URL

## Quick Answer

Your redirect URL is the full URL where your app is running. Here's how to find it:

## Method 1: Check Browser Address Bar

1. Open your app in the browser
2. Look at the address bar
3. Copy the URL (without any query parameters or hash)
4. That's your redirect URL!

### Examples:

**If you're running locally with Live Server:**
```
http://localhost:5500
```
or
```
http://127.0.0.1:5500
```

**If you're using a different port:**
```
http://localhost:3000
http://localhost:8080
http://localhost:5000
```
(Check the port number in your address bar)

**If you opened the HTML file directly:**
```
file:///C:/Users/branl/cursor/index.html
```
⚠️ **Note**: File URLs won't work with Supabase! You need to run a local server.

**If deployed to production:**
```
https://your-domain.com
```

## Method 2: Check Browser Console

1. Open your app in the browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. When you try forgot password, you'll see:
   ```
   📧 Redirect URL: http://localhost:5500/index.html
   ```
   (The exact URL will be shown)

## Method 3: Common Local Development URLs

If you're using:
- **Live Server (VS Code)**: Usually `http://127.0.0.1:5500` or `http://localhost:5500`
- **Python HTTP Server**: Usually `http://localhost:8000`
- **Node.js http-server**: Usually `http://localhost:8080`
- **PHP Server**: Usually `http://localhost:8000`

## What URL to Add to Supabase

1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add:

   **For local development, add BOTH:**
   ```
   http://localhost:5500
   http://127.0.0.1:5500
   ```
   (Replace 5500 with your actual port)

   **If using index.html:**
   ```
   http://localhost:5500/index.html
   http://127.0.0.1:5500/index.html
   ```

   **For production:**
   ```
   https://your-domain.com
   https://www.your-domain.com
   ```

## Important Notes

1. **Must match exactly** - The URL in Supabase must match what's in your browser address bar
2. **Include protocol** - Must include `http://` or `https://`
3. **Include port** - Must include port number if not using standard ports (80/443)
4. **No trailing slash** - Usually better to not include trailing `/`
5. **No query parameters** - Don't include `?` or `#` parts

## Quick Test

1. Open your app in browser
2. Look at address bar: `http://localhost:5500`
3. Copy that URL
4. Add to Supabase Redirect URLs
5. Save
6. Try forgot password again

## Still Not Sure?

1. Open your app
2. Press F12 (open console)
3. Type this in console and press Enter:
   ```javascript
   console.log('Your redirect URL:', window.location.origin + window.location.pathname);
   ```
4. Copy the URL that appears
5. Add it to Supabase


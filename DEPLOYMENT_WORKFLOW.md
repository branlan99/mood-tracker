# Deployment Workflow Guide

## 🚀 Two Ways to Deploy Updates

### Option 1: Automatic Deployments (Recommended) ✅

**Setup once, deploy automatically forever!**

When you connect Netlify to your Git repository (GitHub, GitLab, Bitbucket), every time you push code, Netlify automatically:
- Detects changes
- Builds your site
- Deploys updates
- Updates your live site

**Workflow:**
```bash
# Make changes to your code
# Then:
git add .
git commit -m "Update feature"
git push

# Netlify automatically deploys! ✨
```

### Option 2: Manual Uploads (Quick but repetitive)

Use Netlify's drag-and-drop or CLI for one-off deployments.

---

## 📦 Setting Up Automatic Deployments

### Step 1: Create GitHub Repository (if you don't have one)

```bash
# In your project folder
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub.com, then:
git remote add origin https://github.com/yourusername/mood-journal.git
git branch -M main
git push -u origin main
```

### Step 2: Connect Netlify to GitHub

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Click "Deploy with GitHub"
4. Authorize Netlify (first time only)
5. Select your repository
6. Configure build settings:
   - **Build command**: (leave empty - static site)
   - **Publish directory**: `/` (root)
7. Click "Deploy site"

### Step 3: That's It! 🎉

Now every `git push` automatically deploys!

---

## 🔄 Your Daily Workflow (Automatic)

```bash
# 1. Make changes to your code
# Edit files locally...

# 2. Test locally (optional)
# Open index.html in browser

# 3. Commit and push
git add .
git commit -m "Add new feature"
git push

# 4. Netlify automatically deploys (30-60 seconds)
# Check Netlify dashboard for status
# Your site updates automatically!
```

---

## 🛠️ Manual Deployment (When Needed)

Use manual deployment for:
- Quick tests
- One-off deployments
- Before setting up Git connection

### Method 1: Netlify Drop (Drag & Drop)
1. Go to https://app.netlify.com/drop
2. Drag your project folder
3. Done!

### Method 2: Netlify CLI (Command Line)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login (first time)
netlify login

# Deploy
netlify deploy --prod

# Or for draft/preview
netlify deploy
```

### Method 3: Netlify Dashboard
1. Go to your site in Netlify dashboard
2. Go to "Deploys" tab
3. Drag & drop folder or use CLI

---

## ⚡ Quick Comparison

| Method | Setup Time | Update Process | Best For |
|--------|------------|----------------|----------|
| **Automatic (Git)** | 5 minutes | `git push` | Production, regular updates |
| **Manual (Drop)** | 0 minutes | Drag folder each time | Quick tests, one-off |
| **Manual (CLI)** | 2 minutes | `netlify deploy` | Quick deployments, scripts |

---

## 🎯 Recommended Setup

**For development:**
1. Use automatic Git deployment (set up once)
2. Make changes locally
3. Test locally
4. `git push` to deploy
5. Check Netlify dashboard for status

**Benefits:**
- ✅ Automatic deployments
- ✅ Deployment history
- ✅ Rollback capability
- ✅ Preview deployments (for pull requests)
- ✅ Build logs
- ✅ No manual uploading needed!

---

## 🔍 Checking Deployment Status

After pushing to Git:
1. Go to Netlify dashboard
2. Click on your site
3. See "Deploys" tab
4. Watch build progress in real-time
5. Get notification when live

---

## 📝 Deployment Settings

In Netlify dashboard → Site settings → Build & deploy:

**Build settings:**
- Build command: (empty for static site)
- Publish directory: `/`
- Base directory: (empty)

**Deploy notifications:**
- Email notifications
- Slack integration
- Discord webhooks
- etc.

---

## 🚨 Troubleshooting

**Deployment fails?**
- Check build logs in Netlify dashboard
- Verify all files are committed
- Check for syntax errors

**Changes not showing?**
- Hard refresh browser (Ctrl+F5 / Cmd+Shift+R)
- Clear browser cache
- Check deployment status in Netlify

**Need to rollback?**
- Go to Netlify → Deploys
- Click on previous deployment
- Click "Publish deploy"

---

## 💡 Pro Tips

1. **Use branches for testing:**
   - `main` branch = production
   - `develop` branch = staging/testing
   - Netlify creates preview deployments for branches

2. **Environment variables:**
   - Set in Netlify dashboard
   - Use for API keys, configs
   - Different values for production/branch deploys

3. **Deploy previews:**
   - Every pull request gets a preview URL
   - Test changes before merging
   - Share with team for review

---

**Bottom line:** Set up Git connection once, then just `git push` to deploy! 🚀



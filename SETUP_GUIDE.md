# Complete Setup Guide - Backend + Frontend + Payments + Email

Follow this guide to set up your complete Mood Journal application with backend, payments, and email.

## Prerequisites

- Node.js 18+ installed
- Git installed
- Stripe account (free)
- SendGrid account (free) or Gmail account

## Step 1: Backend Setup (10 minutes)

### 1.1 Install Dependencies

```bash
cd backend
npm install
```

### 1.2 Configure Environment

```bash
cp .env.example .env
```

Edit `.env` file:

```env
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-app.netlify.app

# Generate JWT secret (run: openssl rand -hex 32)
JWT_SECRET=your-generated-secret-here

# Database (SQLite - no setup needed)
DATABASE_URL=./data/moodjournal.db
```

### 1.3 Set Up Stripe

1. Go to https://stripe.com and create account
2. Get API keys: Dashboard → Developers → API keys
3. Copy **Secret key** (starts with `sk_test_` or `sk_live_`)
4. Add to `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   ```

5. Create Product & Price:
   - Dashboard → Products → Add Product
   - Name: "Mood Journal Premium"
   - Price: $5.00
   - Billing: Monthly (recurring)
   - Copy **Price ID** (starts with `price_`)
   - Add to `.env`:
     ```
     STRIPE_PRICE_ID=price_...
     ```

6. Set up Webhook (for production):
   - Developers → Webhooks → Add endpoint
   - URL: `https://your-backend-url.com/api/webhooks/stripe`
   - Events to send:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
   - Copy **Signing secret** (starts with `whsec_`)
   - Add to `.env`:
     ```
     STRIPE_WEBHOOK_SECRET=whsec_...
     ```

### 1.4 Set Up Email Service

#### Option A: SendGrid (Recommended - Free 100 emails/day)

1. Sign up at https://sendgrid.com
2. Verify your email
3. Create API Key:
   - Settings → API Keys → Create API Key
   - Name it "Mood Journal"
   - Copy the key (starts with `SG.`)
4. Add to `.env`:
   ```
   SENDGRID_API_KEY=SG.your_key_here
   EMAIL_FROM=noreply@yourdomain.com
   ```

#### Option B: Gmail SMTP (Free, but limited)

1. Enable 2-Factor Authentication on Google Account
2. Generate App Password:
   - Google Account → Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Copy the 16-character password
3. Add to `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   SMTP_FROM=your-email@gmail.com
   ```

### 1.5 Start Backend

```bash
npm start
```

Backend runs on `http://localhost:3000`

## Step 2: Deploy Backend (15 minutes)

### Option A: Railway (Easiest - Free tier available)

1. Push backend to GitHub
2. Go to https://railway.app
3. Sign up with GitHub
4. New Project → Deploy from GitHub repo
5. Select your backend folder/repo
6. Add environment variables (copy from `.env`)
7. Deploy!
8. Copy your Railway URL (e.g., `https://your-app.railway.app`)

### Option B: Heroku

```bash
heroku create your-app-name
heroku config:set JWT_SECRET=...
heroku config:set STRIPE_SECRET_KEY=...
# Add all env vars from .env
git push heroku main
```

### Option C: DigitalOcean / AWS / Other

Follow standard Node.js deployment guides.

## Step 3: Update Frontend (5 minutes)

### 3.1 Update API URL

In your `app.js`, add at the top:

```javascript
const API_BASE_URL = 'https://your-backend.railway.app/api';
// Or for local testing: 'http://localhost:3000/api'
```

### 3.2 Update Authentication

Replace localStorage-based auth with API calls. See `FRONTEND_INTEGRATION.md` for complete code.

### 3.3 Deploy Frontend

Deploy to Netlify/Vercel as before. Your frontend will now use the backend API.

## Step 4: Update Stripe Webhook URL

1. Go to Stripe Dashboard → Webhooks
2. Edit your webhook
3. Update URL to: `https://your-backend-url.com/api/webhooks/stripe`
4. Save

## Step 5: Test Everything

1. ✅ Register new user
2. ✅ Login
3. ✅ Forgot password (check email)
4. ✅ Create journal entry
5. ✅ Subscribe with test card: `4242 4242 4242 4242`
6. ✅ Check subscription status
7. ✅ Cancel subscription

## Production Checklist

- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] Stripe keys set (use live keys, not test)
- [ ] Email service configured
- [ ] Webhook URL updated in Stripe
- [ ] JWT_SECRET is secure (random string)
- [ ] All environment variables set
- [ ] Test all features
- [ ] SSL/HTTPS enabled
- [ ] Domain configured (optional)

## Troubleshooting

**Backend won't start:**
- Check all environment variables are set
- Check port isn't already in use
- Check Node.js version (18+)

**Emails not sending:**
- Check SendGrid API key is correct
- Verify sender email in SendGrid
- Check spam folder
- For Gmail, use App Password (not regular password)

**Stripe payments not working:**
- Use test keys for testing
- Check Price ID is correct
- Check webhook is configured
- View Stripe dashboard logs

**Frontend can't connect to backend:**
- Check CORS settings in backend
- Verify API_BASE_URL is correct
- Check backend is running
- Check network tab in browser console

## Support

See individual README files:
- `backend/README.md` - Backend details
- `FRONTEND_INTEGRATION.md` - Frontend integration
- `PRODUCTION_DEPLOYMENT.md` - Deployment guide

## Cost Estimate

**Free Tier Options:**
- Backend hosting: Railway free tier (500 hours/month)
- Frontend hosting: Netlify free tier
- Database: SQLite (free, included)
- Email: SendGrid free (100 emails/day)
- Payments: Stripe (2.9% + $0.30 per transaction)

**Total Monthly Cost: $0** (for small scale)

---

🎉 You're all set! Your Mood Journal app now has:
- ✅ Real user accounts
- ✅ Secure password resets
- ✅ Stripe payments
- ✅ Email notifications
- ✅ Production-ready backend


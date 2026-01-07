# Mood Journal Backend API

Complete backend API for Mood Journal with authentication, payments, and email services.

## Features

- ✅ User authentication (JWT)
- ✅ Password reset with email
- ✅ Stripe payment integration
- ✅ Subscription management
- ✅ Journal entries API
- ✅ SQLite database (easily switchable to PostgreSQL)
- ✅ SendGrid email service
- ✅ SMTP email fallback
- ✅ Webhook handling for Stripe events

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-app.netlify.app

# Generate JWT secret: openssl rand -hex 32
JWT_SECRET=your-jwt-secret-here

# Stripe (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (SendGrid - get from https://app.sendgrid.com/settings/api_keys)
SENDGRID_API_KEY=SG....
EMAIL_FROM=noreply@yourdomain.com
```

### 3. Initialize Database

```bash
npm run init-db
```

Or just start the server - it will create the database automatically:

```bash
npm start
```

### 4. Run Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server runs on `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (requires auth)
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Users

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Entries

- `GET /api/entries` - Get all entries
- `GET /api/entries/:date` - Get entry by date
- `POST /api/entries` - Create/update entry
- `PUT /api/entries/:id` - Update entry
- `DELETE /api/entries/:id` - Delete entry

### Subscriptions

- `GET /api/subscriptions` - Get user subscription
- `POST /api/subscriptions/create` - Create subscription
- `POST /api/subscriptions/cancel` - Cancel subscription

### Webhooks

- `POST /api/webhooks/stripe` - Stripe webhook endpoint

## Stripe Setup

1. Create account at https://stripe.com
2. Get API keys from Dashboard → Developers → API keys
3. Create a product and price:
   - Products → Add Product
   - Set price to $5/month (recurring)
   - Copy the Price ID (starts with `price_`)
4. Set up webhook:
   - Developers → Webhooks → Add endpoint
   - URL: `https://your-backend.com/api/webhooks/stripe`
   - Select events:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
   - Copy webhook signing secret (starts with `whsec_`)

## Email Setup

### Option 1: SendGrid (Recommended)

1. Sign up at https://sendgrid.com (free tier: 100 emails/day)
2. Create API key: Settings → API Keys → Create API Key
3. Verify sender email: Settings → Sender Authentication
4. Add to `.env`:
   ```
   SENDGRID_API_KEY=SG.your_key_here
   EMAIL_FROM=your-verified-email@yourdomain.com
   ```

### Option 2: SMTP (Gmail, etc.)

1. Enable app password for Gmail:
   - Google Account → Security → 2-Step Verification → App passwords
2. Add to `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=your-email@gmail.com
   ```

## Deployment

### Option 1: Railway (Easiest)

1. Push code to GitHub
2. Go to https://railway.app
3. New Project → Deploy from GitHub
4. Add environment variables
5. Deploy!

### Option 2: Heroku

```bash
heroku create your-app-name
heroku config:set JWT_SECRET=...
heroku config:set STRIPE_SECRET_KEY=...
# ... add all env vars
git push heroku main
```

### Option 3: DigitalOcean / AWS / GCP

Follow standard Node.js deployment guides.

## Database Migration to PostgreSQL

To use PostgreSQL instead of SQLite:

1. Install `pg` package:
```bash
npm install pg
```

2. Update `config/database.js` to use PostgreSQL connection
3. Update DATABASE_URL in `.env` to PostgreSQL connection string

## Frontend Integration

Update your frontend to use the backend API. See `FRONTEND_INTEGRATION.md` for details.

## Security

- JWT tokens for authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Helmet.js for security headers
- CORS configured
- Input validation

## License

MIT



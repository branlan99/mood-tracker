# Backend Requirements for Production

This application currently uses localStorage for user management and authentication, which is fine for development but **requires a backend server for production use**.

## Required Backend Components

### 1. Authentication System
- **User Registration & Login API**
  - POST `/api/auth/register` - Create new user account
  - POST `/api/auth/login` - Authenticate user
  - POST `/api/auth/logout` - End user session
  - GET `/api/auth/me` - Get current user info
  - Password hashing (bcrypt, argon2, etc.)
  - JWT tokens for session management

### 2. Database
- **User Table**
  - id, email, password_hash, name
  - created_at, updated_at
  
- **Subscription Table**
  - user_id, plan, status, price
  - subscription_start, next_billing_date
  - stripe_customer_id, stripe_subscription_id
  
- **Entries Table**
  - id, user_id, date, mood, moods (JSON), text
  - ai_response, created_at

### 3. Payment Processing (Stripe Integration)
- **Subscription Management**
  - POST `/api/subscription/create` - Create Stripe subscription
  - POST `/api/subscription/cancel` - Cancel subscription
  - Webhook endpoint for Stripe events
  - Handle payment failures, renewals, cancellations

### 4. API Endpoints Needed
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/user/profile
GET    /api/entries
POST   /api/entries
PUT    /api/entries/:id
DELETE /api/entries/:id
POST   /api/subscription/create
POST   /api/subscription/cancel
GET    /api/subscription/status
POST   /api/webhooks/stripe (for Stripe events)
```

### 5. Recommended Tech Stack

**Backend Options:**
- **Node.js + Express** with MongoDB/PostgreSQL
- **Python + Flask/FastAPI** with PostgreSQL
- **Ruby on Rails** with PostgreSQL
- **PHP + Laravel** with MySQL/PostgreSQL

**Database:**
- PostgreSQL (recommended)
- MongoDB
- MySQL

**Payment Processing:**
- Stripe (recommended - easiest integration)
- PayPal
- Square

### 6. Security Considerations
- HTTPS required for all API calls
- Password hashing (never store plain text)
- JWT token expiration
- Rate limiting
- CORS configuration
- Input validation and sanitization
- SQL injection prevention

### 7. Environment Variables Needed
```
DATABASE_URL=postgresql://user:pass@localhost/dbname
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000
```

## Current Implementation (Development Only)

The current code uses localStorage to simulate:
- User authentication
- User data storage
- Subscription status

**This is for development/testing only** and will not work in production. All user data is stored locally in the browser.

## Next Steps

1. Set up backend server (Node.js/Python/etc.)
2. Create database schema
3. Implement authentication endpoints
4. Integrate Stripe for payments
5. Update frontend to call backend APIs instead of localStorage
6. Deploy backend to cloud (AWS, Heroku, Railway, etc.)
7. Update frontend API endpoints to production URLs

## Stripe Integration Example

```javascript
// In your backend (Node.js example)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/subscription/create', async (req, res) => {
  const { userId, email } = req.user;
  
  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: 'Mood Journal Premium' },
        unit_amount: 500, // $5.00
        recurring: { interval: 'month' }
      },
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: `${process.env.FRONTEND_URL}/success`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`,
  });
  
  res.json({ sessionId: session.id });
});
```


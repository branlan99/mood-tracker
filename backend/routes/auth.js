const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../config/email');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, hasSubscription, paymentMethod } = req.body;

    // Check if user exists
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, existingUser) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = uuidv4();

      // Create user
      db.run(
        'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
        [userId, email, passwordHash, name],
        async function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create user' });
          }

          let subscription = null;

          // Create subscription if requested
          if (hasSubscription) {
            const subscriptionId = uuidv4();
            const now = new Date();
            const trialEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            // Create Stripe customer if payment method provided
            let stripeCustomerId = null;
            if (paymentMethod && process.env.STRIPE_SECRET_KEY) {
              try {
                const customer = await stripe.customers.create({
                  email,
                  name,
                  metadata: { userId }
                });
                stripeCustomerId = customer.id;

                // Create Stripe subscription with trial
                if (process.env.STRIPE_PRICE_ID) {
                  const stripeSubscription = await stripe.subscriptions.create({
                    customer: stripeCustomerId,
                    items: [{ price: process.env.STRIPE_PRICE_ID }],
                    trial_period_days: 7,
                    metadata: { userId }
                  });

                  db.run(
                    `INSERT INTO subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, status, trial_start_date, trial_end_date, next_billing_date)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [subscriptionId, userId, stripeCustomerId, stripeSubscription.id, 'trial', now.toISOString(), trialEndDate.toISOString(), trialEndDate.toISOString()]
                  );
                } else {
                  db.run(
                    `INSERT INTO subscriptions (id, user_id, stripe_customer_id, status, trial_start_date, trial_end_date, next_billing_date)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [subscriptionId, userId, stripeCustomerId, 'trial', now.toISOString(), trialEndDate.toISOString(), trialEndDate.toISOString()]
                  );
                }
              } catch (stripeError) {
                console.error('Stripe error:', stripeError);
              }
            } else {
              db.run(
                `INSERT INTO subscriptions (id, user_id, status, trial_start_date, trial_end_date, next_billing_date)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [subscriptionId, userId, 'trial', now.toISOString(), trialEndDate.toISOString(), trialEndDate.toISOString()]
              );
            }

            // Get subscription
            db.get('SELECT * FROM subscriptions WHERE user_id = ?', [userId], (err, sub) => {
              if (!err && sub) {
                subscription = sub;
              }
            });
          }

          // Generate JWT token
          const token = jwt.sign(
            { userId, email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
          );

          // Send welcome email
          try {
            await sendWelcomeEmail({ id: userId, email, name });
          } catch (emailError) {
            console.error('Welcome email error:', emailError);
          }

          res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
              id: userId,
              email,
              name
            },
            subscription
          });
        }
      );
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Get subscription
      db.get('SELECT * FROM subscriptions WHERE user_id = ?', [user.id], (err, subscription) => {
        // Generate JWT token
        const token = jwt.sign(
          { userId: user.id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: '30d' }
        );

        delete user.password_hash;

        res.json({
          token,
          user,
          subscription: subscription || null
        });
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticate, (req, res) => {
  db.get('SELECT * FROM subscriptions WHERE user_id = ?', [req.user.id], (err, subscription) => {
    res.json({
      user: req.user,
      subscription: subscription || null
    });
  });
});

// Forgot password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Always return success (don't reveal if user exists)
      if (user) {
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        db.run(
          'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
          [uuidv4(), user.id, token, expiresAt.toISOString()],
          async (err) => {
            if (!err) {
              const resetUrl = `${frontendUrl}?reset=${token}`;
              try {
                await sendPasswordResetEmail(user, token, resetUrl);
              } catch (emailError) {
                console.error('Password reset email error:', emailError);
              }
            }
          }
        );
      }

      res.json({ message: 'If an account exists, a password reset link has been sent' });
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 6 })
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    // Find valid token
    db.get(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > datetime("now")',
      [token],
      async (err, tokenRecord) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!tokenRecord) {
          return res.status(400).json({ error: 'Invalid or expired token' });
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(password, 10);

        // Update password
        db.run(
          'UPDATE users SET password_hash = ? WHERE id = ?',
          [passwordHash, tokenRecord.user_id],
          (err) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to update password' });
            }

            // Mark token as used
            db.run('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [tokenRecord.id]);

            res.json({ message: 'Password reset successfully' });
          }
        );
      }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;


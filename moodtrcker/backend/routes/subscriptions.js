const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { sendSubscriptionEmail } = require('../config/email');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get subscription
router.get('/', (req, res) => {
  db.get(
    'SELECT * FROM subscriptions WHERE user_id = ?',
    [req.user.id],
    (err, subscription) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({ subscription: subscription || null });
    }
  );
});

// Create subscription
router.post('/create', async (req, res) => {
  try {
    const { paymentMethodId } = req.body;

    // Check if subscription already exists
    db.get(
      'SELECT * FROM subscriptions WHERE user_id = ?',
      [req.user.id],
      async (err, existingSubscription) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (existingSubscription && existingSubscription.status !== 'cancelled') {
          return res.status(400).json({ error: 'Subscription already exists' });
        }

        if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
          return res.status(500).json({ error: 'Stripe not configured' });
        }

        try {
          // Create or get Stripe customer
          let customer;
          if (existingSubscription?.stripe_customer_id) {
            customer = await stripe.customers.retrieve(existingSubscription.stripe_customer_id);
          } else {
            customer = await stripe.customers.create({
              email: req.user.email,
              name: req.user.name,
              metadata: { userId: req.user.id }
            });
          }

          // Attach payment method if provided
          if (paymentMethodId) {
            await stripe.paymentMethods.attach(paymentMethodId, {
              customer: customer.id
            });
            await stripe.customers.update(customer.id, {
              invoice_settings: {
                default_payment_method: paymentMethodId
              }
            });
          }

          // Create subscription with trial
          const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: process.env.STRIPE_PRICE_ID }],
            trial_period_days: 7,
            metadata: { userId: req.user.id }
          });

          const now = new Date();
          const trialEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

          // Save to database
          const subscriptionId = existingSubscription?.id || require('uuid').v4();
          db.run(
            `INSERT OR REPLACE INTO subscriptions 
             (id, user_id, stripe_customer_id, stripe_subscription_id, status, trial_start_date, trial_end_date, next_billing_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              subscriptionId,
              req.user.id,
              customer.id,
              subscription.id,
              'trial',
              now.toISOString(),
              trialEndDate.toISOString(),
              trialEndDate.toISOString()
            ],
            async (err) => {
              if (err) {
                return res.status(500).json({ error: 'Failed to save subscription' });
              }

              // Send email
              try {
                await sendSubscriptionEmail(req.user, {
                  trial: true,
                  trial_end_date: trialEndDate.toISOString()
                });
              } catch (emailError) {
                console.error('Subscription email error:', emailError);
              }

              db.get('SELECT * FROM subscriptions WHERE id = ?', [subscriptionId], (err, sub) => {
                res.status(201).json({ subscription: sub });
              });
            }
          );
        } catch (stripeError) {
          console.error('Stripe error:', stripeError);
          res.status(500).json({ error: 'Payment processing failed' });
        }
      }
    );
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel subscription
router.post('/cancel', async (req, res) => {
  try {
    db.get(
      'SELECT * FROM subscriptions WHERE user_id = ?',
      [req.user.id],
      async (err, subscription) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!subscription) {
          return res.status(404).json({ error: 'No subscription found' });
        }

        if (subscription.status === 'cancelled') {
          return res.status(400).json({ error: 'Subscription already cancelled' });
        }

        // Cancel Stripe subscription if exists
        if (subscription.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
          try {
            await stripe.subscriptions.update(subscription.stripe_subscription_id, {
              cancel_at_period_end: true
            });
          } catch (stripeError) {
            console.error('Stripe cancellation error:', stripeError);
          }
        }

        // Update in database
        db.run(
          'UPDATE subscriptions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['cancelled', subscription.id],
          (err) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to cancel subscription' });
            }

            res.json({ message: 'Subscription cancelled successfully' });
          }
        );
      }
    );
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;


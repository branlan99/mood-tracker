const express = require('express');
const db = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// Stripe webhook endpoint
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      await handleSubscriptionUpdate(subscription);
      break;

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object;
      await handleSubscriptionDeletion(deletedSubscription);
      break;

    case 'invoice.paid':
      const invoice = event.data.object;
      await handleInvoicePaid(invoice);
      break;

    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      await handleInvoiceFailed(failedInvoice);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

async function handleSubscriptionUpdate(subscription) {
  const userId = subscription.metadata.userId;

  if (!userId) {
    return;
  }

  const status = subscription.status === 'active' || subscription.status === 'trialing' 
    ? subscription.status === 'trialing' ? 'trial' : 'active'
    : subscription.status;

  db.run(
    `UPDATE subscriptions 
     SET status = ?, 
         stripe_subscription_id = ?,
         next_billing_date = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE stripe_customer_id = ?`,
    [
      status,
      subscription.id,
      new Date(subscription.current_period_end * 1000).toISOString(),
      subscription.customer
    ]
  );
}

async function handleSubscriptionDeletion(subscription) {
  db.run(
    'UPDATE subscriptions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE stripe_subscription_id = ?',
    ['cancelled', subscription.id]
  );
}

async function handleInvoicePaid(invoice) {
  // Subscription is active and paid
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    await handleSubscriptionUpdate(subscription);
  }
}

async function handleInvoiceFailed(invoice) {
  // Handle failed payment
  console.log('Invoice payment failed:', invoice.id);
  // You might want to send an email to the user here
}

module.exports = router;



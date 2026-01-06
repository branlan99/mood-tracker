const sgMail = require('@sendgrid/mail');
const db = require('./database');
const { v4: uuidv4 } = require('uuid');

// Lazy load nodemailer (optional dependency)
let nodemailer;
if (process.env.SMTP_HOST) {
  try {
    nodemailer = require('nodemailer');
  } catch (e) {
    console.log('nodemailer not installed, SMTP disabled');
  }
}

// Initialize email service
let emailService;

if (process.env.SENDGRID_API_KEY) {
  // Use SendGrid
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  emailService = 'sendgrid';
  console.log('✅ Email service: SendGrid');
} else if (process.env.SMTP_HOST) {
  // Use SMTP
  emailService = 'smtp';
  console.log('✅ Email service: SMTP');
} else {
  console.log('⚠️  No email service configured');
}

// Send email function
async function sendEmail(to, subject, text, html, userId = null) {
  const emailId = uuidv4();
  
  try {
    let result;

    if (emailService === 'sendgrid') {
      const msg = {
        to,
        from: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'noreply@moodjournal.com',
        subject,
        text,
        html: html || text.replace(/\n/g, '<br>')
      };
      result = await sgMail.send(msg);
    } else if (emailService === 'smtp') {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      result = await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text,
        html: html || text.replace(/\n/g, '<br>')
      });
    } else {
      // No email service - log for development
      console.log('📧 Email (simulated):', { to, subject });
      console.log('📧 Body:', text);
      
      // Log to database
      db.run(
        'INSERT INTO email_logs (id, user_id, type, to_email, subject, body, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [emailId, userId, 'general', to, subject, text, 'simulated']
      );
      
      return { success: true, simulated: true };
    }

    // Log successful email
    db.run(
      'INSERT INTO email_logs (id, user_id, type, to_email, subject, body, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [emailId, userId, 'general', to, subject, text, 'sent']
    );

    return { success: true, messageId: result?.messageId || emailId };
  } catch (error) {
    console.error('Email error:', error);
    
    // Log failed email
    db.run(
      'INSERT INTO email_logs (id, user_id, type, to_email, subject, body, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [emailId, userId, 'general', to, subject, text, 'failed']
    );

    throw error;
  }
}

// Send password reset email
async function sendPasswordResetEmail(user, resetToken, resetUrl) {
  const subject = 'Reset Your Mood Journal Password';
  const text = `Hello ${user.name},

You requested to reset your password for Mood Journal.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
Mood Journal Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset Your Password</h2>
      <p>Hello ${user.name},</p>
      <p>You requested to reset your password for Mood Journal.</p>
      <p><a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Reset Password</a></p>
      <p>Or copy and paste this link: <a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>Mood Journal Team</p>
    </div>
  `;

  return sendEmail(user.email, subject, text, html, user.id);
}

// Send welcome email
async function sendWelcomeEmail(user) {
  const subject = 'Welcome to Mood Journal!';
  const text = `Hello ${user.name},

Welcome to Mood Journal! We're excited to have you join us on your journey to better mental wellness.

Start tracking your mood and get AI-powered insights to help improve your daily wellbeing.

Get started by creating your first journal entry!

Best regards,
Mood Journal Team`;

  return sendEmail(user.email, subject, text, null, user.id);
}

// Send subscription confirmation email
async function sendSubscriptionEmail(user, subscription) {
  const subject = subscription.trial ? 
    'Your 7-Day Free Trial Has Started!' : 
    'Welcome to Mood Journal Premium!';
  
  const text = subscription.trial ? 
    `Hello ${user.name},

Your 7-day free trial for Mood Journal Premium has started!

Enjoy all premium features:
- Unlimited journal entries
- AI therapeutic guidance
- Voice chat therapy
- Weekly & monthly reviews
- Thought journal insights

Your trial ends on ${new Date(subscription.trial_end_date).toLocaleDateString()}.
After the trial, you'll be charged $5/month.

Best regards,
Mood Journal Team` :
    `Hello ${user.name},

Thank you for subscribing to Mood Journal Premium!

You now have access to all premium features. Your subscription will be charged $5/month.

Best regards,
Mood Journal Team`;

  return sendEmail(user.email, subject, text, null, user.id);
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendSubscriptionEmail
};


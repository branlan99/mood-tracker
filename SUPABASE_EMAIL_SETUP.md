# Supabase Email Setup Guide

## Problem: Not Receiving Password Reset Emails

If you're not receiving password reset emails, follow these steps to configure Supabase email service.

## Step 1: Enable Email Service in Supabase

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **Providers**
3. Make sure **Email** is enabled (should be on by default)

## Step 2: Configure Redirect URLs (REQUIRED!)

This is the most common issue!

1. Go to **Authentication** → **URL Configuration**
2. In **Redirect URLs**, add your app URLs:
   - **Local Development**: `http://localhost:5500` (or whatever port you're using)
   - **Production**: `https://your-domain.com`
   - **With path**: `http://localhost:5500/index.html` (if needed)
3. Click **Save**

**Important**: The redirect URL must match EXACTLY where your app is hosted.

## Step 3: Check Email Templates

1. Go to **Authentication** → **Email Templates**
2. Click on **Reset Password** template
3. Verify the template includes:
   ```
   {{ .ConfirmationURL }}
   ```
4. The template should automatically use the redirect URL you configured

## Step 4: Verify Email Service Status

### Free Tier Limitations:
- Supabase free tier uses their default email service
- Emails are sent from `noreply@mail.app.supabase.io`
- Rate limits: 3 emails per hour per user
- May go to spam folder

### Check if Email Service is Working:
1. Try creating a new user account
2. Check if you receive the confirmation email
3. If confirmation emails work, reset emails should work too

## Step 5: Check Email Logs in Supabase

1. Go to **Logs** → **Auth Logs** in Supabase Dashboard
2. Look for recent password reset requests
3. Check for any errors or failures

## Step 6: Configure Custom SMTP (Optional - Recommended for Production)

For better deliverability and branding:

1. Go to **Settings** → **Auth** → **SMTP Settings**
2. Configure your SMTP provider:
   - **SendGrid**
   - **Mailgun**
   - **AWS SES**
   - **Gmail** (not recommended for production)
3. Enter SMTP credentials
4. Test the connection

### SMTP Configuration Example (SendGrid):

```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Password: [Your SendGrid API Key]
Sender Email: noreply@yourdomain.com
Sender Name: Mood Journal
```

## Step 7: Check Spam/Junk Folder

- Supabase emails from free tier often go to spam
- Add `noreply@mail.app.supabase.io` to your contacts
- Check spam folder regularly

## Step 8: Rate Limiting

- Free tier limits: 3 emails per hour per email address
- If you requested multiple resets, wait 1 hour
- Check **Auth Logs** in Supabase to see rate limit errors

## Step 9: Verify User Exists

1. Go to **Authentication** → **Users** in Supabase Dashboard
2. Verify the email address exists
3. Make sure the user account is confirmed (not in pending state)

## Step 10: Test the Flow

1. Open browser console (F12)
2. Try the forgot password flow
3. Check console for errors:
   - Look for "Password reset email sent successfully" ✅
   - Look for any error messages ❌
4. Check Supabase **Auth Logs** for the request

## Common Errors and Solutions

### Error: "Email rate limit exceeded"
- **Solution**: Wait 1 hour between requests
- Or upgrade Supabase plan

### Error: "Invalid redirect URL"
- **Solution**: Add your app URL to **Redirect URLs** in Supabase
- Must match exactly (including http:// vs https://)

### Error: "Email service not configured"
- **Solution**: Enable email in **Authentication** → **Providers**
- Or configure custom SMTP

### No Error, But No Email Received
1. Check spam folder
2. Verify email address is correct
3. Check Supabase Auth Logs
4. Verify user exists in Supabase
5. Try a different email address
6. Check rate limits

## Development Workaround

If emails aren't working in development, you can manually test the reset flow:

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click on the user
3. Click **Send Password Reset Email** button
4. This will send the email directly from Supabase

## Production Recommendations

1. **Use Custom SMTP**: Better deliverability
2. **Use Custom Domain**: Branded emails
3. **Monitor Logs**: Check Auth Logs regularly
4. **Set Up Monitoring**: Alert on email failures
5. **Rate Limiting**: Implement client-side rate limiting
6. **Email Templates**: Customize for branding

## Quick Checklist

- [ ] Redirect URL added to Supabase
- [ ] Email service enabled in Supabase
- [ ] User exists in Supabase
- [ ] Not rate limited (wait 1 hour if needed)
- [ ] Checked spam folder
- [ ] Verified email address is correct
- [ ] Checked browser console for errors
- [ ] Checked Supabase Auth Logs
- [ ] Custom SMTP configured (optional)

## Still Not Working?

1. **Check Browser Console**: Look for detailed error messages
2. **Check Supabase Logs**: Go to Logs → Auth Logs
3. **Verify Configuration**: Double-check all settings
4. **Test with Different Email**: Try a different email address
5. **Contact Supabase Support**: If all else fails

## Testing Tips

1. Use a real email address (not fake/test emails)
2. Check spam folder immediately
3. Don't request multiple resets in a row (rate limiting)
4. Wait a few minutes for email delivery
5. Check Supabase dashboard for any warnings/errors


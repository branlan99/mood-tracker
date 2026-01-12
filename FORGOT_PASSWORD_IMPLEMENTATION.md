# Forgot Password Implementation Guide

## Overview
The forgot password functionality has been fully implemented using Supabase's built-in password reset feature. This provides a secure, production-ready password reset flow.

## How It Works

### 1. **Request Password Reset**
- User clicks "Forgot Password?" link on the login page
- User enters their email address
- System sends a password reset email via Supabase
- Email contains a secure reset link that expires in 1 hour

### 2. **Reset Link Email**
- Supabase automatically sends an email to the user
- Email contains a link like: `your-app-url?type=recovery&access_token=...`
- The link is valid for 1 hour

### 3. **Password Reset Page**
- When user clicks the link, they're redirected to the app
- The app detects the reset token in the URL
- Shows the password reset form automatically
- User enters new password twice (for confirmation)

### 4. **Password Update**
- New password is validated (minimum 6 characters, must match)
- Password is updated securely via Supabase
- User is logged out and redirected to login page
- Success message is displayed

## Files Modified

### `app.js`
- Added `handleForgotPassword()` - Handles email submission
- Added `handleResetPassword()` - Handles new password submission
- Added `checkPasswordResetToken()` - Detects reset links in URL
- Added `logEmail()` - Logs email events for admin portal
- Updated `checkAuth()` - Checks for reset tokens on page load

### `supabase-service.js`
- Added `sendPasswordResetEmail()` - Sends reset email via Supabase
- Added `updatePassword()` - Updates user password
- Added `verifyPasswordResetToken()` - Verifies reset token (for future use)

### `index.html`
- Already had forgot password form (no changes needed)

## Configuration Required

### Supabase Email Templates
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Edit the **Reset Password** template
4. Make sure the redirect URL is set correctly:
   - Use: `{{ .SiteURL }}?type=recovery&token={{ .TokenHash }}`
   - Or your custom URL format

### Allowed Redirect URLs
1. Go to **Authentication** → **URL Configuration**
2. Add your app URL to **Redirect URLs**:
   - Local: `http://localhost:5500` (or your port)
   - Production: `https://your-domain.com`
   - Must match exactly where the app is hosted

## Security Features

✅ **Secure Token-Based Reset**
- Uses Supabase's secure token system
- Tokens expire after 1 hour
- Single-use tokens (invalidated after use)

✅ **Email Validation**
- Only sends email if account exists (doesn't reveal if email exists)
- Rate limiting prevents abuse

✅ **Password Requirements**
- Minimum 6 characters
- Must match confirmation
- Validated on both client and server

✅ **Session Management**
- User is logged out after password reset
- Clean session ensures security
- URL tokens are removed after use

## Testing

### Test Flow:
1. Click "Forgot Password?" on login page
2. Enter your email address
3. Check your email for reset link
4. Click the reset link
5. Enter new password (must be 6+ characters)
6. Confirm password
7. Submit form
8. Should see success message
9. Redirected to login page
10. Try logging in with new password

### Expected Behavior:
- ✅ Email sent successfully
- ✅ Reset form appears when clicking link
- ✅ Password validation works
- ✅ Password updated successfully
- ✅ User logged out after reset
- ✅ Can login with new password

## Admin Portal

Password reset emails are logged in the admin portal:
- Go to Admin → Email Logs
- View all password reset requests
- See email details (to, subject, timestamp)

## Troubleshooting

### Email Not Received
- Check spam/junk folder
- Verify email address is correct
- Check Supabase email service is configured
- Verify redirect URL is whitelisted in Supabase

### Reset Link Doesn't Work
- Link expires after 1 hour
- Link can only be used once
- Verify redirect URL is in Supabase whitelist
- Check browser console for errors

### Password Update Fails
- Ensure password is 6+ characters
- Passwords must match
- Check Supabase connection
- Verify user session is valid

## Fallback Mode (localStorage)

If Supabase is not configured, the app falls back to a simulated password reset:
- Shows success message (doesn't reveal if email exists)
- Logs email event to localStorage
- Displays message that backend integration is needed

## Next Steps

1. **Configure Supabase Email Templates** (if not done)
2. **Add Redirect URL to Supabase** (required!)
3. **Test the full flow** end-to-end
4. **Customize email template** (optional) - make it branded

## Notes

- Password reset uses Supabase's built-in email service
- No additional backend code needed for Supabase mode
- Email logs are stored in Supabase `email_logs` table
- Admin can view all password reset requests in admin portal


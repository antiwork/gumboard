# Local Development Setup

## Email Configuration for Password Authentication

The password authentication feature requires email verification. For local development, you need to configure Resend email service.

### Required Environment Variables

Add these to your `.env.local` file:

```bash
AUTH_RESEND_KEY=your_resend_api_key
EMAIL_FROM=your_verified_sender_email@yourdomain.com
```

### Getting Resend Credentials

1. Sign up at [resend.com](https://resend.com)
2. Create an API key in your dashboard
3. Verify your sender domain or use the sandbox domain for testing
4. Contact your administrator if you need production credentials

### Testing Email Delivery

When testing the signup flow locally:

1. Use a real email address you can access
2. Check your spam folder if emails don't arrive
3. Verification links expire in 24 hours
4. If you see "Email service not configured" error, check your environment variables

### Troubleshooting

- **"Email service not configured"**: Missing `AUTH_RESEND_KEY` or `EMAIL_FROM` in `.env.local`
- **"Failed to send verification email"**: Invalid Resend API key or sender email
- **Emails not arriving**: Check spam folder, verify sender domain in Resend dashboard

### Alternative Testing Methods

For development without email setup:

1. Check server logs for verification URLs
2. Manually construct verification URLs using the token from database
3. Use a tool like MailHog for local email testing

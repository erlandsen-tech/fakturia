# AWS Amplify Deployment Guide for Fakturia

This guide will walk you through deploying your Fakturia invoice application to AWS Amplify.

## Important Note

Your application contains API routes that require server-side functionality. AWS Amplify supports Next.js applications with API routes through Server-Side Rendering (SSR). The configuration has been updated to support this.

## Prerequisites

1. AWS Account with Amplify access
2. GitHub repository with your code
3. Supabase project set up
4. Stripe account configured

## Step 1: Prepare Your Repository

The following files have been configured for Amplify deployment:

- `amplify.yml` - Build specification file
- `next.config.js` - Configured for SSR with API routes
- Environment variables documented below

## Step 2: Required Environment Variables

Set up the following environment variables in AWS Amplify Console:

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DATABASE_URL=your_supabase_database_url
```

### Stripe Configuration
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

### Application Configuration
```
NEXT_PUBLIC_BASE_URL=https://your-amplify-domain.amplifyapp.com
NEXTAUTH_URL=https://your-amplify-domain.amplifyapp.com
NEXTAUTH_SECRET=your_nextauth_secret_key
```

## Step 3: Deploy to AWS Amplify

### Option A: Using AWS Amplify Console (Recommended)

1. **Login to AWS Console**
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Click "New app" → "Host web app"

2. **Connect Repository**
   - Select "GitHub" as your Git provider
   - Authorize AWS Amplify to access your GitHub account
   - Select your repository and branch (usually `main` or `master`)

3. **Configure Build Settings**
   - Amplify will auto-detect the `amplify.yml` file
   - Review the build settings (should match the amplify.yml configuration)
   - Click "Next"

4. **Set Environment Variables**
   - In the "Environment variables" section, add all the variables listed above
   - Make sure to use your actual values from Supabase and Stripe

5. **Review and Deploy**
   - Review all settings
   - Click "Save and deploy"

### Option B: Using Amplify CLI

1. **Install Amplify CLI**
   ```bash
   npm install -g @aws-amplify/cli
   amplify configure
   ```

2. **Initialize Amplify Project**
   ```bash
   amplify init
   ```

3. **Add Hosting**
   ```bash
   amplify add hosting
   # Select "Amazon CloudFront and S3"
   ```

4. **Deploy**
   ```bash
   amplify publish
   ```

## Step 4: Configure Domain and SSL

1. **Custom Domain (Optional)**
   - In Amplify Console, go to "Domain management"
   - Add your custom domain
   - Follow DNS configuration instructions

2. **SSL Certificate**
   - Amplify automatically provides SSL certificates
   - Your app will be available at `https://your-app-id.amplifyapp.com`

## Step 5: Configure Supabase for Production

1. **Update Supabase Auth Settings**
   - Go to your Supabase project dashboard
   - Navigate to Authentication → URL Configuration
   - Add your Amplify domain to "Site URL"
   - Add redirect URLs:
     - `https://your-amplify-domain.amplifyapp.com/auth/callback`

2. **Update CORS Settings**
   - In Supabase, go to Settings → API
   - Add your Amplify domain to allowed origins

## Step 6: Configure Stripe Webhooks

1. **Create Webhook Endpoint**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-amplify-domain.amplifyapp.com/api/stripe-webhook`
   - Select events: `checkout.session.completed`, `payment_intent.succeeded`

2. **Update Environment Variables**
   - Copy the webhook signing secret
   - Update `STRIPE_WEBHOOK_SECRET` in Amplify environment variables

## API Routes Information

Your application includes the following API routes that will be deployed as serverless functions:

- `/api/invoices` - Invoice management
- `/api/invoices/[id]` - Individual invoice operations
- `/api/create-checkout-session` - Stripe payment session creation
- `/api/stripe-webhook` - Stripe webhook handler
- `/api/test-env` - Environment variable testing
- `/api/test-db` - Database connection testing

These routes will automatically be deployed as AWS Lambda functions by Amplify.

## Step 7: Test Deployment

1. **Verify Application**
   - Visit your Amplify URL
   - Test user registration/login
   - Create a test invoice
   - Test payment flow (use Stripe test mode)

2. **Check Logs**
   - Monitor Amplify build logs for any issues
   - Check browser console for client-side errors

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify all environment variables are set
   - Review build logs in Amplify Console

2. **Authentication Issues**
   - Verify Supabase URL configuration
   - Check redirect URLs in Supabase settings
   - Ensure environment variables are correctly set

3. **Payment Issues**
   - Verify Stripe webhook configuration
   - Check webhook endpoint URL
   - Ensure webhook secret is correctly set

### Environment Variable Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `DATABASE_URL`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `NEXT_PUBLIC_BASE_URL`
- [ ] `NEXTAUTH_URL`
- [ ] `NEXTAUTH_SECRET`

## Monitoring and Maintenance

1. **Set up Monitoring**
   - Enable CloudWatch logs in Amplify
   - Set up alerts for build failures
   - Monitor application performance

2. **Automatic Deployments**
   - Amplify automatically deploys on git push to main branch
   - Configure branch-based deployments if needed

3. **Backup Strategy**
   - Supabase handles database backups
   - Consider exporting important data regularly

## Security Considerations

1. **Environment Variables**
   - Never commit sensitive keys to git
   - Use Amplify's environment variable management
   - Rotate keys regularly

2. **HTTPS Only**
   - Ensure all traffic uses HTTPS
   - Configure HSTS headers if needed

3. **CORS Configuration**
   - Limit CORS origins to your domain only
   - Review and update regularly

## Cost Optimization

1. **Amplify Pricing**
   - Monitor build minutes usage
   - Optimize build times by caching dependencies
   - Consider build frequency

2. **Supabase Usage**
   - Monitor database usage
   - Optimize queries for performance
   - Consider upgrading plan if needed

3. **Stripe Fees**
   - Understand Stripe pricing structure
   - Monitor transaction volumes

## Support

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs) 
# Fakturia - Invoice Generator for Micro-Businesses

Fakturia is a simple, efficient invoice generation application for micro-businesses. Generate invoices on demand, track payments, and manage your clients all in one place.

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework for server-side rendering and static site generation
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Shadcn UI](https://ui.shadcn.com/) - Beautifully designed components built with Radix UI and Tailwind CSS
- [Clerk](https://clerk.com/) - Authentication and user management
- [Stripe](https://stripe.com/) - Payment processing
- [AWS Amplify](https://aws.amazon.com/amplify/) - Deployment and hosting

## Getting Started

### Prerequisites

- Node.js (v18 or newer)
- npm or yarn

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/fakturia.git
   cd fakturia
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   Create a `.env.local` file in the root directory and add the following variables:
   ```
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

   # Stripe Payment
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   ```

4. Start the development server
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application

## Deployment

### AWS Amplify

1. Set up an AWS account if you don't have one
2. Install the AWS Amplify CLI
   ```bash
   npm install -g @aws-amplify/cli
   ```

3. Configure the Amplify CLI
   ```bash
   amplify configure
   ```

4. Initialize Amplify in your project
   ```bash
   amplify init
   ```

5. Add hosting
   ```bash
   amplify add hosting
   ```

6. Publish the app
   ```bash
   amplify publish
   ```

## Project Structure

```
fakturia/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── dashboard/        # Dashboard page
│   │   ├── invoices/         # Invoice management pages
│   │   ├── clients/          # Client management pages
│   │   ├── settings/         # User settings pages
│   │   ├── sign-in/          # Sign in page
│   │   ├── sign-up/          # Sign up page
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home page
│   ├── components/           # React components
│   │   ├── ui/               # Shadcn UI components
│   │   └── ...               # Custom components
│   ├── lib/                  # Utility functions
│   └── ...
├── public/                   # Static files
├── middleware.ts             # Auth middleware
├── amplify.yml               # AWS Amplify config
└── ...
```

## Features

- Authentication (sign up, sign in, sign out)
- Dashboard with overview of invoicing activity
- Create, edit, and send invoices
- Manage clients and their information
- Payment processing with Stripe
- Responsive design for all devices

## License

This project is licensed under the MIT License - see the LICENSE file for details.

# Fakturia - Invoice Generator for Micro-Businesses

Fakturia is a simple, efficient invoice generation application for micro-businesses. Generate invoices on demand, track payments, and manage your clients all in one place.

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework for server-side rendering and static site generation
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Shadcn UI](https://ui.shadcn.com/) - Beautifully designed components built with Radix UI and Tailwind CSS
- [Supabase](https://supabase.com/) - Backend as a Service (BaaS) with authentication and database
- [Stripe](https://stripe.com/) - Payment processing
- [Docker](https://www.docker.com/) - Containerization and deployment

## Getting Started

### Prerequisites

- Node.js (v18 or newer)
- npm or yarn
- Docker and Docker Compose
- [Supabase](https://supabase.com/) account
- [Stripe](https://stripe.com/) account (for payments)

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
   Create a `.env` file in the root directory and add the following variables:
   ```
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   DATABASE_URL=your_supabase_database_url

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

### Running with Docker

1. Build and start the containers
   ```bash
   docker-compose up --build
   ```

2. The application will be available at [http://localhost:3001](http://localhost:3001)

### Supabase Setup

1. Create a new project in [Supabase](https://supabase.com/)
2. Enable Email auth provider in Authentication > Providers
3. Configure your site URL in Authentication > URL Configuration
4. Add your redirect URLs:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://your-domain.com/auth/callback`
5. Set up your database schema using the SQL editor or migrations

### Stripe Setup

1. Create a [Stripe](https://stripe.com/) account
2. Get your API keys from the Stripe Dashboard
3. Set up webhook endpoints for payment notifications
4. Configure your products and pricing in the Stripe Dashboard

## Project Structure

```
fakturia/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── auth/            # Authentication routes
│   │   ├── dashboard/       # Dashboard page
│   │   ├── invoices/        # Invoice management pages
│   │   ├── clients/         # Client management pages
│   │   ├── settings/        # User settings pages
│   │   ├── sign-in/         # Sign in page
│   │   ├── sign-up/         # Sign up page
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Home page
│   ├── components/          # React components
│   │   ├── ui/              # Shadcn UI components
│   │   └── ...              # Custom components
│   ├── lib/                 # Utility functions
│   └── utils/               # Helper functions
│       └── supabase/        # Supabase client utilities
├── public/                  # Static files
├── middleware.ts            # Auth middleware
├── docker-compose.yml       # Docker Compose configuration
├── Dockerfile              # Docker configuration
└── ...
```

## Features

- Authentication with Supabase (email/password, magic links)
- Dashboard with overview of invoicing activity
- Create, edit, and send invoices
- Manage clients and their information
- Payment processing with Stripe
- Responsive design for all devices
- Docker containerization for easy deployment

## Development

### Database Migrations

To manage database changes:

1. Create a new migration:
   ```bash
   supabase migration new your_migration_name
   ```

2. Apply migrations:
   ```bash
   supabase db push
   ```

### Testing

Run the test suite:
```bash
npm test
```

## Deployment

### Docker Deployment

1. Build the Docker image:
   ```bash
   docker build -t fakturia .
   ```

2. Run the container:
   ```bash
   docker run -p 3001:3001 fakturia
   ```

### Environment Variables

Make sure to set all required environment variables in your production environment:
- Supabase configuration
- Stripe API keys
- Database connection string

## License

This project is licensed under the MIT License - see the LICENSE file for details.

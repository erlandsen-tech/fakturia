import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Fakturia</h1>
          <div className="flex gap-4">
            <Link href="/sign-in">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto py-20 flex flex-col items-center text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6">Invoice Generation for Micro-Businesses</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mb-10">
            Generate professional invoices on demand, track payments, and manage your clients - all in one place.
          </p>
          <div className="flex gap-4">
            <Link href="/sign-up">
              <Button size="lg">Start for Free</Button>
            </Link>
            <Button variant="outline" size="lg">Learn More</Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-muted py-20">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Everything You Need</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-card p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">Create Invoices</h3>
                <p className="text-muted-foreground">
                  Generate professional invoices in seconds with customizable templates.
                </p>
              </div>
              <div className="bg-card p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">Manage Clients</h3>
                <p className="text-muted-foreground">
                  Keep track of your clients and their billing information in one place.
                </p>
              </div>
              <div className="bg-card p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">Get Paid Faster</h3>
                <p className="text-muted-foreground">
                  Integrated with Stripe for seamless payment processing.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2024 Fakturia. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

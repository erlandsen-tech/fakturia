import { UserButton } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header/Navbar */}
      <header className="border-b border-border">
        <div className="container mx-auto py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Fakturia</h1>
          <nav className="hidden md:flex items-center space-x-6">
            <a href="/dashboard" className="font-medium">Dashboard</a>
            <a href="/invoices" className="text-muted-foreground hover:text-foreground">Invoices</a>
            <a href="/clients" className="text-muted-foreground hover:text-foreground">Clients</a>
            <a href="/settings" className="text-muted-foreground hover:text-foreground">Settings</a>
          </nav>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Total Invoices</CardTitle>
              <CardDescription>Current month</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Outstanding</CardTitle>
              <CardDescription>Awaiting payment</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">$0.00</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Paid</CardTitle>
              <CardDescription>Current month</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">$0.00</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <a href="/invoices/new" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">
              Create Invoice
            </a>
            <a href="/clients/new" className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow hover:bg-secondary/90">
              Add Client
            </a>
          </div>
        </div>
        
        {/* Recent Activity Placeholder */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="bg-muted p-8 rounded-md text-center text-muted-foreground">
            <p>No recent activity to display</p>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border py-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2024 Fakturia. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
} 
import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-border">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Page Not Found</h1>
        <p className="text-muted-foreground mb-8">The page you are looking for doesn't exist or has been moved.</p>
        <Link href="/">
          <Button className="w-full">Return Home</Button>
        </Link>
      </div>
    </div>
  );
}

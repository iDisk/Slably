import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { BuilderLayout } from "./BuilderLayout";
import { RealtorLayout } from "./RealtorLayout";

export function DirectoryLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    if (user.role === "realtor") {
      return (
        <RealtorLayout>
          <div className="py-4">{children}</div>
        </RealtorLayout>
      );
    }
    return (
      <BuilderLayout>
        <div className="py-4">{children}</div>
      </BuilderLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-[hsl(222,47%,11%)] px-6 py-4">
        <Link href="/" className="cursor-pointer">
          <img src="/slably-logo.png" alt="Slably" className="h-8" />
        </Link>
      </div>
      <div className="py-10">{children}</div>
    </div>
  );
}

import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Building2, LogOut } from "lucide-react";
import { formatInitials } from "@/lib/utils";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-border shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/client" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
                <Building2 className="text-primary-foreground h-6 w-6" />
              </div>
              <span className="text-foreground font-display font-bold text-2xl tracking-tight">Slably <span className="text-accent text-lg">Client Portal</span></span>
            </Link>
            
            <div className="flex items-center gap-6">
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-accent/20 border-2 border-accent text-accent-foreground flex items-center justify-center font-bold">
                  {formatInitials(user?.name || "C")}
                </div>
              </div>
              <button onClick={logout} className="p-2.5 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {children}
      </main>
    </div>
  );
}

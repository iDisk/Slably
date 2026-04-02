import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Building2, LayoutDashboard, Briefcase, Settings, LogOut, FileText, UserCircle, Users } from "lucide-react";
import { formatInitials } from "@/lib/utils";

export function BuilderLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/network",   label: "Network",   icon: Users },
    { href: "/profile",   label: "Perfil",    icon: UserCircle },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border shadow-xl z-10 sticky top-0 h-screen">
        <div className="h-20 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
              <Building2 className="text-accent-foreground h-6 w-6" />
            </div>
            <span className="text-sidebar-foreground font-display font-bold text-xl tracking-tight">Slably</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive ? "bg-primary text-primary-foreground shadow-md" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}>
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-4 py-3 bg-sidebar-accent/50 rounded-xl mb-3">
            <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              {formatInitials(user?.name || "B")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={logout} className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors font-medium">
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <header className="md:hidden flex items-center justify-between p-4 bg-sidebar border-b border-sidebar-border sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Building2 className="text-accent h-6 w-6" />
          <span className="text-sidebar-foreground font-display font-bold text-lg">Slably</span>
        </div>
        <button onClick={logout} className="p-2 text-sidebar-foreground/70 hover:text-sidebar-foreground">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
        <div className="flex-1 p-4 md:p-8 md:pt-10 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

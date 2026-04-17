import { Link } from "wouter";

interface LegalFooterProps {
  className?: string;
  variant?: "sidebar" | "page";
}

export function LegalFooter({ className = "", variant = "page" }: LegalFooterProps) {
  if (variant === "sidebar") {
    return (
      <div className={`flex items-center justify-center gap-3 px-4 pb-2 ${className}`}>
        <Link href="/terms" className="text-xs text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors">
          Terms
        </Link>
        <span className="text-sidebar-foreground/30 text-xs">·</span>
        <Link href="/privacy" className="text-xs text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors">
          Privacy
        </Link>
      </div>
    );
  }

  return (
    <footer className={`border-t py-8 ${className}`}>
      <div className="flex items-center justify-center gap-4 flex-wrap text-xs text-muted-foreground">
        <a href="/terms" className="hover:underline">Terms of Service</a>
        <span>·</span>
        <a href="/privacy" className="hover:underline">Privacy Policy</a>
        <span>·</span>
        <span>© {new Date().getFullYear()} Slably, Inc.</span>
      </div>
    </footer>
  );
}

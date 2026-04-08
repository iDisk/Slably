import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const [, navigate] = useLocation();

  function handleBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/find");
    }
  }

  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
    >
      <ArrowLeft className="w-4 h-4" />
      Volver
    </button>
  );
}

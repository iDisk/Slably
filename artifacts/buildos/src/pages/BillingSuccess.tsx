import { useLocation } from 'wouter';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BillingSuccessPage() {
  const [, navigate] = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('slably_token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <CheckCircle2 className="w-20 h-20 text-[#16A34A] mx-auto" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#1B3A5C]">¡Suscripción activada!</h1>
          <p className="text-muted-foreground">
            Tu plan ya está activo. Cierra sesión y vuelve a entrar para ver los cambios.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            className="w-full bg-[#1B3A5C] hover:bg-[#152d47] text-white"
            onClick={() => navigate('/dashboard')}
          >
            Ir al dashboard
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleLogout}
          >
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
}

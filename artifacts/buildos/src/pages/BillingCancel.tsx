import { useLocation } from 'wouter';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BillingCancelPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <XCircle className="w-20 h-20 text-gray-400 mx-auto" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#1B3A5C]">Pago cancelado</h1>
          <p className="text-muted-foreground">
            No se realizó ningún cargo. Puedes intentarlo de nuevo cuando quieras.
          </p>
        </div>
        <Button
          className="w-full bg-[#F97316] hover:bg-[#ea6c0a] text-white"
          onClick={() => navigate('/pricing')}
        >
          Ver planes
        </Button>
      </div>
    </div>
  );
}

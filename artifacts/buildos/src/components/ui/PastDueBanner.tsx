import { useLocation } from 'wouter';
import { getJwtStatus } from '@/hooks/usePlanGate';

export default function PastDueBanner() {
  const [, navigate] = useLocation();
  const status = getJwtStatus();

  if (status !== 'past_due') return null;

  return (
    <div className="w-full bg-[#FEE2E2] px-4 py-3 flex items-center justify-between gap-4">
      <p className="text-sm text-red-800 font-medium">
        Tu pago falló. Actualiza tu método de pago para mantener el acceso.
      </p>
      <button
        onClick={() => navigate('/pricing')}
        className="shrink-0 text-sm font-semibold text-red-800 underline underline-offset-2 hover:text-red-900"
      >
        Actualizar pago
      </button>
    </div>
  );
}

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getJwtPlan } from '@/hooks/usePlanGate';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/mes',
    target: 'Subs, Suppliers, Realtors, Contadores, Homeowners',
    features: ['Perfil en directorio', 'RFQs limitados', 'Network'],
    badge: null as string | null,
    cta: 'Tu plan actual',
    highlighted: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$39',
    period: '/mes',
    target: 'Constructores pequeños',
    features: ['Hasta 3 proyectos activos', 'Documentos + firma digital', 'Network'],
    badge: '1 mes gratis' as string | null,
    cta: 'Comenzar prueba gratis',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$79',
    period: '/mes',
    target: 'Constructores activos',
    features: [
      'Todo ilimitado',
      'IA features (audio, OCR)',
      'Portal del cliente',
      'Change orders',
      'Activity logs',
    ],
    badge: 'Más popular' as string | null,
    cta: 'Actualizar a Pro',
    highlighted: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: '$149',
    period: '/mes',
    target: 'Equipos y empresas grandes',
    features: ['Todo de Pro', 'Multi-usuario', 'Roles avanzados'],
    badge: null as string | null,
    cta: 'Contactar ventas',
    highlighted: false,
  },
];

export default function PricingPage() {
  const currentPlan = getJwtPlan();

  const checkoutMutation = useMutation({
    mutationFn: async (plan: string) => {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error('checkout_failed');
      return res.json() as Promise<{ url: string }>;
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast.error('No se pudo iniciar el pago. Intenta de nuevo.');
    },
  });

  const handleCta = (planId: string) => {
    if (planId === 'free' || planId === currentPlan) return;
    if (planId === 'business') {
      toast.info('Contáctanos en hola@slably.app');
      return;
    }
    checkoutMutation.mutate(planId);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#1B3A5C]">Elige tu plan</h1>
          <p className="text-muted-foreground mt-2">Sin contratos. Cancela cuando quieras.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            return (
              <Card
                key={plan.id}
                className={[
                  'relative flex flex-col',
                  plan.highlighted ? 'border-[#F97316] border-2 shadow-lg' : '',
                  isCurrent && !plan.highlighted ? 'border-[#F97316] border-2' : '',
                ].join(' ')}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#F97316] text-white text-xs px-3">{plan.badge}</Badge>
                  </div>
                )}
                <CardHeader className="pb-2 pt-6">
                  <h2 className="text-lg font-bold text-[#1B3A5C]">{plan.name}</h2>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-3xl font-extrabold text-[#1B3A5C]">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{plan.target}</p>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 gap-4">
                  <ul className="space-y-1.5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={[
                      'w-full mt-auto',
                      plan.highlighted && !isCurrent
                        ? 'bg-[#F97316] hover:bg-[#ea6c0a] text-white'
                        : '',
                      isCurrent ? 'border-[#F97316] text-[#F97316]' : '',
                    ].join(' ')}
                    variant={plan.highlighted && !isCurrent ? 'default' : 'outline'}
                    disabled={
                      plan.id === 'free' ||
                      isCurrent ||
                      (checkoutMutation.isPending && checkoutMutation.variables === plan.id)
                    }
                    onClick={() => handleCta(plan.id)}
                  >
                    {checkoutMutation.isPending && checkoutMutation.variables === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrent ? (
                      'Tu plan actual'
                    ) : (
                      plan.cta
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

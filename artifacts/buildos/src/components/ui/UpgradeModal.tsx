import { Lock } from 'lucide-react';
import { useLocation } from 'wouter';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  aiFeatures:        'El log por audio con IA y el OCR de recibos están disponibles en el plan Pro.',
  changeOrders:      'Los Change Orders digitales están disponibles en el plan Pro.',
  clientPortal:      'El portal del cliente está disponible en el plan Pro.',
  maxActiveProjects: 'Has alcanzado el límite de proyectos de tu plan. Actualiza para crear proyectos ilimitados.',
};

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature: string;
  currentPlan: string;
  requiredPlan: string;
}

export function UpgradeModal({ open, onClose, feature, requiredPlan }: UpgradeModalProps) {
  const [, setLocation] = useLocation();

  const description = FEATURE_DESCRIPTIONS[feature]
    ?? 'Esta función no está disponible en tu plan actual.';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="w-14 h-14 rounded-full bg-[#1B3A5C]/10 flex items-center justify-center">
              <Lock className="w-7 h-7 text-[#1B3A5C]" />
            </div>
            <DialogTitle className="text-center text-[#1B3A5C]">
              Necesitas un plan {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}
            </DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-sm text-muted-foreground text-center px-2">{description}</p>
        <div className="flex flex-col gap-2 mt-4">
          <Button
            className="bg-[#F97316] hover:bg-[#ea6c0a] text-white w-full"
            onClick={() => { onClose(); setLocation('/pricing'); }}
          >
            Ver planes
          </Button>
          <Button variant="outline" className="w-full" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

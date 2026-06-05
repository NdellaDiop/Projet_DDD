import { Phone, MapPin, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PaiementCahierLayoutProps {
  children: React.ReactNode;
  onBack?: () => void;
}

export function PaiementCahierLayout({ children, onBack }: PaiementCahierLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-teal-700 text-white text-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <span className="inline-flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0" aria-hidden />
            Contactez-nous : +221 33 824 10 10
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            5, Avenue Birago Diop — Point E, Dakar
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" aria-hidden />
            24h/24 — 7j/7
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-10">
        {onBack && (
          <Button type="button" variant="ghost" className="mb-6 -ml-2" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        )}

        <Card className="shadow-md">
          <CardHeader className="border-b bg-white">
            <CardTitle className="text-xl text-slate-800">Paiement du cahier des charges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}

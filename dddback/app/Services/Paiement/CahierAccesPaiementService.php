<?php

namespace App\Services\Paiement;

use App\Models\CahierAccesAchat;

class CahierAccesPaiementService
{
    public function marquerCommePaye(CahierAccesAchat $achat, ?string $referenceExterne = null): void
    {
        if ($achat->isCompleted()) {
            return;
        }

        $achat->update([
            'statut' => CahierAccesAchat::STATUT_COMPLETED,
            'paye_le' => now(),
            'reference_externe' => $referenceExterne ?? $achat->reference_externe,
        ]);
    }

    public function marquerEchec(CahierAccesAchat $achat): void
    {
        if ($achat->isCompleted()) {
            return;
        }
        $achat->update(['statut' => CahierAccesAchat::STATUT_FAILED]);
    }
}

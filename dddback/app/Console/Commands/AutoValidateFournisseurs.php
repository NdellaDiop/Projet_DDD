<?php

namespace App\Console\Commands;

use App\Services\FournisseurValidationService;
use Illuminate\Console\Command;

class AutoValidateFournisseurs extends Command
{
    protected $signature = 'fournisseurs:auto-valider';

    protected $description = 'Valide automatiquement les fournisseurs en attente dont le dossier légal est complet';

    public function handle(FournisseurValidationService $validation): int
    {
        if (! config('fournisseur.auto_validation')) {
            $this->warn('FOURNISSEUR_AUTO_VALIDATION est désactivé — aucune action.');

            return self::SUCCESS;
        }

        $stats = $validation->validerEnAttenteComplets('cron');

        $this->info("Validation automatique terminée : {$stats['validated']} activé(s), {$stats['skipped']} ignoré(s).");

        return self::SUCCESS;
    }
}

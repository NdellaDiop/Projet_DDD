<?php

namespace App\Console\Commands;

use App\Services\AppelOffreService;
use Illuminate\Console\Command;

class CloseExpiredAppelsOffres extends Command
{
    protected $signature = 'appels-offres:close-expired';

    protected $description = 'Clôture automatiquement les appels d’offres dont le délai de dépôt est dépassé';

    public function handle(AppelOffreService $appelOffreService): int
    {
        $count = $appelOffreService->closeExpiredAppelsOffres();
        $this->info("Clôture auto: {$count} AO");

        return Command::SUCCESS;
    }
}

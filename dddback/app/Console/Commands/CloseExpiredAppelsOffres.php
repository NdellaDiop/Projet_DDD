<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\AppelOffre;
use App\Models\LogActivite;

class CloseExpiredAppelsOffres extends Command
{
    protected $signature = 'appels-offres:close-expired';
    protected $description = 'Clôture automatiquement les appels d’offres expirés';

    public function handle(): int
    {
        $expired = AppelOffre::where('statut', AppelOffre::STATUS_PUBLISHED)
            ->where('date_limite_depot', '<', now())
            ->get();

        foreach ($expired as $ao) {
            $ao->update(['statut' => AppelOffre::STATUS_CLOSED]);

            LogActivite::create([
                'user_id' => null,
                'action' => 'auto_close_appel_offre',
                'details' => "Clôture automatique AO #{$ao->id}",
                'ip_address' => null,
            ]);
        }

        $this->info("Clôture auto: {$expired->count()} AO");
        return Command::SUCCESS;
    }
}
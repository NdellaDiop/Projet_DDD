<?php

namespace App\Services;

use App\Models\AppelOffre;
use App\Models\User;
use App\Models\Candidature;
use Illuminate\Database\Eloquent\Collection;

class AppelOffreService
{
    /**
     * Récupère tous les appels d'offres.
     *
     * @return \Illuminate\Database\Eloquent\Collection<int, \App\Models\AppelOffre>
     */
    public function getAllAppelsOffres(): Collection
    {
        return AppelOffre::all();
    }

    /**
     * Crée un nouvel appel d'offre.
     *
     * @param array $data Les données validées pour la création.
     * @return \App\Models\AppelOffre
     */
    public function createAppelOffre(array $data): AppelOffre
    {
        return AppelOffre::create($data);
    }

    /**
     * Récupère un appel d'offre spécifique par son ID.
     *
     * @param \App\Models\AppelOffre $appelOffre L'instance de l'appel d'offre (via Route Model Binding).
     * @return \App\Models\AppelOffre
     */
    public function getAppelOffre(AppelOffre $appelOffre): AppelOffre
    {
        return $appelOffre;
    }

    /**
     * Met à jour un appel d'offre existant.
     *
     * @param \App\Models\AppelOffre $appelOffre L'instance de l'appel d'offre à mettre à jour.
     * @param array $data Les données validées pour la mise à jour.
     * @return \App\Models\AppelOffre
     */
    public function updateAppelOffre(AppelOffre $appelOffre, array $data): AppelOffre
    {
        $appelOffre->update($data);
        return $appelOffre;
    }

    /**
     * Supprime un appel d'offre.
     *
     * @param \App\Models\AppelOffre $appelOffre L'instance de l'appel d'offre à supprimer.
     * @return bool|null
     */
    public function deleteAppelOffre(AppelOffre $appelOffre): ?bool
    {
        return $appelOffre->delete();
    }

     /**
     * Publie un appel d'offre (change son statut à 'ouvert').
     *
     * @param \App\Models\AppelOffre $appelOffre L'instance de l'appel d'offre à publier.
     * @return \App\Models\AppelOffre
     */
    public function publishAppelOffre(AppelOffre $appelOffre): AppelOffre
    {
        $appelOffre->update(['statut' => AppelOffre::STATUS_PUBLISHED]);
        return $appelOffre;
    }

    public function closeAppelOffre(AppelOffre $appelOffre): AppelOffre
    {
        $appelOffre->update(['statut' => AppelOffre::STATUS_CLOSED]);
        
        // Notifier tous les fournisseurs qui ont postulé à cet appel d'offre
        $candidatures = Candidature::where('appel_offre_id', $appelOffre->id)
            ->with('fournisseur.user')
            ->get();
        
        $notificationService = app(\App\Services\NotificationService::class);
        
        foreach ($candidatures as $candidature) {
            if ($candidature->fournisseur && $candidature->fournisseur->user) {
                $notificationService->notifyUser(
                    $candidature->fournisseur->user->id,
                    "L'appel d'offre \"{$appelOffre->titre}\" (Réf: {$appelOffre->reference}) a été clôturé. Les candidatures ne sont plus acceptées."
                );
            }
        }
        
        return $appelOffre;
    }
}
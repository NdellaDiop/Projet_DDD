<?php

namespace App\Services;

use App\Models\AppelOffre;
use App\Models\CahierAccesAchat;
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
        return AppelOffre::where('statut', AppelOffre::STATUS_PUBLISHED)
            ->orderBy('date_publication', 'desc')
            ->get();
    }

    /**
     * Crée un nouvel appel d'offres.
     *
     * @param array $data Les données validées pour la création.
     * @return \App\Models\AppelOffre
     */
    public function createAppelOffre(array $data): AppelOffre
    {
        return AppelOffre::create($data);
    }

    /**
     * Récupère un appel d'offres spécifique par son ID.
     *
     * @param \App\Models\AppelOffre $appelOffre L'instance de l'appel d'offres (via Route Model Binding).
     * @return \App\Models\AppelOffre
     */
    public function getAppelOffre(AppelOffre $appelOffre): AppelOffre
    {
        return $appelOffre;
    }

    /**
     * Met à jour un appel d'offres existant.
     *
     * @param \App\Models\AppelOffre $appelOffre L'instance de l'appel d'offres à mettre à jour.
     * @param array $data Les données validées pour la mise à jour.
     * @return \App\Models\AppelOffre
     */
    public function updateAppelOffre(AppelOffre $appelOffre, array $data): AppelOffre
    {
        $appelOffre->update($data);
        return $appelOffre;
    }

    /**
     * Supprime un appel d'offres.
     *
     * @param \App\Models\AppelOffre $appelOffre L'instance de l'appel d'offres à supprimer.
     * @return bool|null
     */
    public function deleteAppelOffre(AppelOffre $appelOffre): ?bool
    {
        return $appelOffre->delete();
    }

     /**
     * Publie un appel d'offres (change son statut à 'ouvert').
     *
     * @param \App\Models\AppelOffre $appelOffre L'instance de l'appel d'offres à publier.
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

        $message = "L'appel d'offres « {$appelOffre->titre} » (réf. {$appelOffre->reference}) est clôturé. Le dépôt des plis n'est plus ouvert ; les suites se font selon l'avis et les instructions du service des marchés.";

        $userIds = collect();

        $candidatures = Candidature::where('appel_offre_id', $appelOffre->id)
            ->with('fournisseur.user')
            ->get();

        foreach ($candidatures as $candidature) {
            if ($candidature->fournisseur?->user) {
                $userIds->push((int) $candidature->fournisseur->user->id);
            }
        }

        // Fournisseurs ayant acquis l'accès au cahier (paiement complété), même sans dossier en ligne
        $userIds = $userIds->merge(
            CahierAccesAchat::query()
                ->where('appel_offre_id', $appelOffre->id)
                ->where('statut', CahierAccesAchat::STATUT_COMPLETED)
                ->whereHas('user', function ($q): void {
                    $q->whereHas('role', function ($r): void {
                        $r->where('name', 'FOURNISSEUR');
                    });
                })
                ->pluck('user_id')
        )->unique()->filter()->values();

        $notificationService = app(\App\Services\NotificationService::class);

        foreach ($userIds as $userId) {
            $notificationService->notifyUser((int) $userId, $message);
        }

        return $appelOffre;
    }
}
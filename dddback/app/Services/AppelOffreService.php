<?php

namespace App\Services;

use App\Models\AppelOffre;
use App\Models\CahierAccesAchat;
use App\Models\Candidature;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\DB;

class AppelOffreService
{
    public function __construct(
        private readonly AppelOffreDocumentService $documentService
    ) {
    }
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
     * Création atomique : AO + avis + cahier en une transaction (rollback si échec upload).
     */
    public function createAppelOffreWithDocuments(array $data, UploadedFile $avis, UploadedFile $cahier, int $userId): AppelOffre
    {
        return DB::transaction(function () use ($data, $avis, $cahier, $userId) {
            $appelOffre = AppelOffre::create($data);

            $this->documentService->attachToAppelOffre($appelOffre, $avis, 'AVIS_APPEL_OFFRES', $userId);
            $this->documentService->attachToAppelOffre($appelOffre, $cahier, 'CAHIER_DES_CHARGES', $userId);

            return $appelOffre->load(['responsableMarche.user', 'documents'])->loadCount('candidatures');
        });
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

        $this->notifierFournisseursConcernes($appelOffre, $message);

        return $appelOffre;
    }

    /**
     * Clôture les AO publiés dont la date limite de dépôt est dépassée
     * (après la fin du jour calendaire de l'échéance).
     *
     * @return int Nombre d'AO clôturés
     */
    public function closeExpiredAppelsOffres(): int
    {
        // Une échéance au jour J reste ouverte jusqu'à la fin de J ;
        // on clôture dès que le calendrier passe au jour suivant.
        $expired = AppelOffre::query()
            ->where('statut', AppelOffre::STATUS_PUBLISHED)
            ->whereNotNull('date_limite_depot')
            ->where('date_limite_depot', '<', now()->startOfDay())
            ->get();

        foreach ($expired as $ao) {
            $ao->update(['statut' => AppelOffre::STATUS_CLOSED]);

            \App\Models\LogActivite::create([
                'user_id' => null,
                'action' => 'auto_close_appel_offre',
                'details' => "Clôture automatique AO #{$ao->id} (délai de dépôt dépassé)",
                'ip_address' => null,
            ]);
        }

        return $expired->count();
    }

    /** Réouvre un AO clôturé (admin — retour en arrière). */
    public function reopenAppelOffre(AppelOffre $appelOffre, ?string $newDateLimiteDepot = null): AppelOffre
    {
        $updates = ['statut' => AppelOffre::STATUS_PUBLISHED];
        if ($newDateLimiteDepot !== null) {
            $updates['date_limite_depot'] = $newDateLimiteDepot;
        }

        $appelOffre->update($updates);

        $message = "L'appel d'offres « {$appelOffre->titre} » (réf. {$appelOffre->reference}) a été réouvert. Le dépôt des plis est à nouveau ouvert selon les modalités indiquées dans l'avis.";
        if ($newDateLimiteDepot !== null) {
            $message .= ' Une nouvelle date limite de dépôt a été fixée.';
        }

        $this->notifierFournisseursConcernes($appelOffre, $message);

        return $appelOffre->fresh();
    }

    /**
     * Fournisseurs ayant un dossier ou un accès cahier payé sur cet AO.
     *
     * @return \Illuminate\Support\Collection<int, int>
     */
    private function fournisseurUserIdsConcernes(AppelOffre $appelOffre): SupportCollection
    {
        $userIds = collect();

        $candidatures = Candidature::where('appel_offre_id', $appelOffre->id)
            ->with('fournisseur.user')
            ->get();

        foreach ($candidatures as $candidature) {
            if ($candidature->fournisseur?->user) {
                $userIds->push((int) $candidature->fournisseur->user->id);
            }
        }

        return $userIds->merge(
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
    }

    private function notifierFournisseursConcernes(AppelOffre $appelOffre, string $message): void
    {
        $notificationService = app(NotificationService::class);

        foreach ($this->fournisseurUserIdsConcernes($appelOffre) as $userId) {
            $notificationService->notifyUser((int) $userId, $message);
        }
    }

    /** Repasse un AO publié en brouillon (admin — retour en arrière). */
    public function unpublishAppelOffre(AppelOffre $appelOffre): AppelOffre
    {
        $appelOffre->update(['statut' => AppelOffre::STATUS_DRAFT]);

        return $appelOffre->fresh();
    }
}
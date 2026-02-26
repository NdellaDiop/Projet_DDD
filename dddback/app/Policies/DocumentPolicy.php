<?php

namespace App\Policies;

use App\Models\Document;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class DocumentPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role->name, ['ADMIN', 'RESPONSABLE_MARCHE', 'FOURNISSEUR']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Document $document): bool
    {
        if ($user->role->name === 'ADMIN') {
            return true;
        }

        // Un RESPONSABLE_MARCHE peut voir les documents liés à ses appels d'offres
        if ($user->role->name === 'RESPONSABLE_MARCHE') {
            // Si le document est lié à un appel d'offre
            if ($document->appelOffre) {
                $document->load('appelOffre.responsableMarche');
                if ($document->appelOffre->responsable_marche_id === $user->responsableMarche->id) {
                    return true;
                }
            }
            // Si le document est lié à une candidature d'un de ses appels d'offres
            if ($document->candidature) {
                $document->load('candidature.appelOffre.responsableMarche');
                if ($document->candidature->appelOffre && 
                    $document->candidature->appelOffre->responsable_marche_id === $user->responsableMarche->id) {
                    return true;
                }
            }
            // Si le document est un document légal d'un fournisseur qui a postulé à un de ses appels d'offres
            // (documents légaux : RCCM, NINEA, QUITUS_FISCAL)
            if (in_array($document->categorie, ['RCCM', 'NINEA', 'QUITUS_FISCAL'])) {
                // Vérifier si ce fournisseur a des candidatures pour les appels d'offres du responsable
                $hasCandidature = \App\Models\Candidature::whereHas('appelOffre', function ($q) use ($user) {
                    $q->where('responsable_marche_id', $user->responsableMarche->id);
                })->whereHas('fournisseur', function ($q) use ($document) {
                    $q->where('user_id', $document->user_id);
                })->exists();
                
                if ($hasCandidature) {
                    return true;
                }
            }
        }

        // Un FOURNISSEUR peut voir les documents liés à ses candidatures ou qu'il a uploadés
        if ($user->role->name === 'FOURNISSEUR') {
            if ($document->user_id === $user->id) { // Si le fournisseur a uploadé le document
                return true;
            }
            if ($document->candidature && $user->id === $document->candidature->fournisseur->user_id) { // Si lié à sa candidature
                return true;
            }
        }

        return false;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return in_array($user->role->name, ['ADMIN', 'RESPONSABLE_MARCHE', 'FOURNISSEUR']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Document $document): bool
    {
        if ($user->role->name === 'ADMIN') {
            return true;
        }

        // Seul l'utilisateur qui a uploadé le document peut le modifier
        return $user->id === $document->user_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Document $document): bool
    {
        if ($user->role->name === 'ADMIN') {
            return true;
        }

        // Seul l'utilisateur qui a uploadé le document peut le supprimer
        return $user->id === $document->user_id;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Document $document): bool
    {
        return $user->role->name === 'ADMIN';
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Document $document): bool
    {
        return $user->role->name === 'ADMIN';
    }
}
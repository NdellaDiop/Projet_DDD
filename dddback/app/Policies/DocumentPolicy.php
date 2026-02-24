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
        if ($user->role->name === 'RESPONSABLE_MARCHE' && $document->appelOffre && $user->id === $document->appelOffre->responsableMarche->user_id) {
            return true;
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
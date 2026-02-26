<?php

namespace App\Policies;

use App\Models\ContactMessage;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ContactMessagePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // Seuls les admins peuvent voir tous les messages
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, ContactMessage $contactMessage): bool
    {
        // Seuls les admins peuvent voir les messages
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(?User $user): bool
    {
        // Tout le monde peut créer un message de contact (même non authentifié)
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, ContactMessage $contactMessage): bool
    {
        // Seuls les admins peuvent mettre à jour les messages
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ContactMessage $contactMessage): bool
    {
        // Seuls les admins peuvent supprimer les messages
        return $user->isAdmin();
    }
}

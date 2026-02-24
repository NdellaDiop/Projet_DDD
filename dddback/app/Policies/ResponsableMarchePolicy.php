<?php

namespace App\Policies;

use App\Models\ResponsableMarche;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ResponsableMarchePolicy
{
    /**
     * Permet aux admins d'effectuer n'importe quelle action.
     */
    public function before(User $user, string $ability): bool|null
    {
        if ($user->role->name === 'ADMIN') {
            return true;
        }
        return null; // Laisse les autres méthodes de politique gérer l'autorisation
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // Seuls les ADMINS et RESPONSABLES_MARCHE peuvent voir la liste
        return in_array($user->role->name, ['ADMIN', 'RESPONSABLE_MARCHE']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, ResponsableMarche $responsableMarche): bool
    {
        // Les RESPONSABLES_MARCHE ne peuvent voir que leur propre profil
        return $user->id === $responsableMarche->user_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Seuls les ADMINS peuvent créer des responsables de marché
        return $user->role->name === 'ADMIN';
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, ResponsableMarche $responsableMarche): bool
    {
        // Les ADMINS peuvent tout modifier, les RESPONSABLES_MARCHE peuvent modifier leur propre profil
        return $user->id === $responsableMarche->user_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ResponsableMarche $responsableMarche): bool
    {
        // Seuls les ADMINS peuvent supprimer un responsable de marché
        return $user->role->name === 'ADMIN';
    }
}
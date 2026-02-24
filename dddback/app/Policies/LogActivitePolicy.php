<?php

namespace App\Policies;

use App\Models\LogActivite;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class LogActivitePolicy
{
    /**
     * Permet aux admins d'effectuer n'importe quelle action.
     */
    public function before(User $user, string $ability): bool|null
    {
        if ($user->role->name === 'ADMIN') {
            return true;
        }
        return null;
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // Seuls les ADMINS peuvent voir tous les logs
        return $user->role->name === 'ADMIN';
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, LogActivite $logActivite): bool
    {
        // Un utilisateur peut voir ses propres logs
        return $user->id === $logActivite->user_id;
    }

    /**
     * Determine whether the user can create models.
     * Les logs sont créés par le système.
     */
    public function create(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can update the model.
     * Les logs ne devraient pas être modifiés.
     */
    public function update(User $user, LogActivite $logActivite): bool
    {
        return false;
    }

    /**
     * Determine whether the user can delete the model.
     * Les logs ne devraient pas être supprimés par les utilisateurs standards.
     */
    public function delete(User $user, LogActivite $logActivite): bool
    {
        return $user->role->name === 'ADMIN';
    }
}
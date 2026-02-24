<?php

namespace App\Policies;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class NotificationPolicy
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
        return true; // Tous les utilisateurs authentifiés peuvent voir leurs notifications
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Notification $notification): bool
    {
        return $user->id === $notification->user_id;
    }

    /**
     * Determine whether the user can create models.
     * Les notifications sont généralement créées par le système, pas par l'utilisateur directement via API
     */
    public function create(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Notification $notification): bool
    {
        return $user->id === $notification->user_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Notification $notification): bool
    {
        return $user->id === $notification->user_id;
    }
}
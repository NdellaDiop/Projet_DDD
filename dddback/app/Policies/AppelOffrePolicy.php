<?php

namespace App\Policies;

use App\Models\AppelOffre;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class AppelOffrePolicy
{
    public function before(?User $user, string $ability): bool|null
    {
        if (in_array($ability, ['viewAny', 'view'])) {
            return null;
        }
        if ($user && $user->isAdmin()) {
            return true;
        }
        return null;
    }

    public function viewAny(?User $user): bool
    {
        return true;
    }

    public function view(?User $user, AppelOffre $appelOffre): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->isResponsableMarche();
    }

    public function update(User $user, AppelOffre $appelOffre): bool
    {
        if (! $user->isResponsableMarche() || ! $user->responsableMarche) {
            return false;
        }
        if ((int) $appelOffre->responsable_marche_id !== (int) $user->responsableMarche->id) {
            return false;
        }

        return in_array($appelOffre->statut, [
            AppelOffre::STATUS_DRAFT,
            AppelOffre::STATUS_PUBLISHED,
        ], true);
    }

    public function publish(User $user, AppelOffre $appelOffre): bool
    {
        return $user->isResponsableMarche()
            && $user->responsableMarche
            && $appelOffre->responsable_marche_id === $user->responsableMarche->id
            && $appelOffre->statut === AppelOffre::STATUS_DRAFT;
    }

    public function close(User $user, AppelOffre $appelOffre): bool
    {
        return $user->isResponsableMarche()
            && $user->responsableMarche
            && $appelOffre->responsable_marche_id === $user->responsableMarche->id
            && $appelOffre->statut === AppelOffre::STATUS_PUBLISHED;
    }

    public function reopen(User $user, AppelOffre $appelOffre): bool
    {
        return $user->isResponsableMarche()
            && $user->responsableMarche
            && (int) $appelOffre->responsable_marche_id === (int) $user->responsableMarche->id
            && $appelOffre->statut === AppelOffre::STATUS_CLOSED;
    }

    public function restore(User $user, AppelOffre $appelOffre): bool
    {
        return $user->isAdmin();
    }

    public function forceDelete(User $user, AppelOffre $appelOffre): bool
    {
        return $user->isAdmin();
    }

}
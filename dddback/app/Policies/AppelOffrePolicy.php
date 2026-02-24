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
        return $user->isResponsableMarche() 
            && $user->responsableMarche
            && $appelOffre->responsable_marche_id === $user->responsableMarche->id
            && $appelOffre->statut === AppelOffre::STATUS_DRAFT;
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

    public function restore(User $user, AppelOffre $appelOffre): bool
    {
        return $user->isAdmin();
    }

    public function forceDelete(User $user, AppelOffre $appelOffre): bool
    {
        return $user->isAdmin();
    }

}
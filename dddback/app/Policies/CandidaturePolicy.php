<?php

namespace App\Policies;

use App\Models\Candidature;
use App\Models\User;

class CandidaturePolicy
{
    public function before(?User $user, string $ability): bool|null
    {
        if ($user && $user->isAdmin()) {
            return true;
        }
        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->role && in_array($user->role->name, ['ADMIN','RESPONSABLE_MARCHE','FOURNISSEUR']);
    }

    public function view(User $user, Candidature $candidature): bool
    {
        if ($user->isFournisseur()) {
            return $candidature->fournisseur?->user_id === $user->id;
        }

        if ($user->isResponsableMarche()) {
            return $candidature->appelOffre?->responsable_marche_id === $user->responsableMarche?->id;
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->isFournisseur() && $user->is_active === true;
    }

    public function accept(User $user, Candidature $candidature): bool
    {
        return $user->isResponsableMarche()
            && $candidature->appelOffre?->responsable_marche_id === $user->responsableMarche?->id;
    }

    public function reject(User $user, Candidature $candidature): bool
    {
        return $this->accept($user, $candidature);
    }
}
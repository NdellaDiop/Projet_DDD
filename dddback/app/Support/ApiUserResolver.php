<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Résout l'utilisateur effectif pour l'accès aux documents sur les routes publiques.
 *
 * - Jeton Bearer présent : utilisateur authentifié (admin, PRM, fournisseur).
 * - Session seule sans Bearer : uniquement les fournisseurs (évite qu'une session
 *   admin/PRM résiduelle après logout accorde encore des téléchargements).
 */
class ApiUserResolver
{
    public static function forDocumentAccess(Request $request): ?User
    {
        $user = $request->user() ?? self::resolveUserFromBearer($request);

        if (! $user) {
            return null;
        }

        $user->loadMissing('role');

        if ($request->bearerToken()) {
            return $user;
        }

        return $user->role->name === 'FOURNISSEUR' ? $user : null;
    }

    private static function resolveUserFromBearer(Request $request): ?User
    {
        $token = $request->bearerToken();
        if (! $token) {
            return null;
        }

        $accessToken = PersonalAccessToken::findToken($token);

        return $accessToken?->tokenable instanceof User
            ? $accessToken->tokenable
            : null;
    }
}

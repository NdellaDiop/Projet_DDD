<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureCandidatureEnLigneEnabled
{
    /**
     * Bloque toutes les routes liées aux candidatures lorsque le portail est en mode dépôt physique.
     */
    public function handle(Request $request, Closure $next)
    {
        if (! config('portail.candidature_en_ligne')) {
            return response()->json([
                'message' => "La soumission d'offres en ligne n'est pas disponible sur ce portail. Le dépôt des plis se fait en présentiel, selon les modalités indiquées sur chaque avis.",
            ], 403);
        }

        return $next($request);
    }
}


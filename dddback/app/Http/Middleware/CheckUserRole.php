<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class CheckUserRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (!Auth::check()) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        $user = Auth::user();

        // Si l'utilisateur a le rôle "ADMIN", il a accès à tout
        if ($user->role && $user->role->name === 'ADMIN') {
            return $next($request);
        }

        // Vérifie si l'utilisateur a l'un des rôles requis
        if ($user->role && in_array($user->role->name, $roles)) {
            return $next($request);
        }

        return response()->json(['message' => 'Accès refusé. Vous n\'avez pas le rôle requis.'], 403);
    }
}
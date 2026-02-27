<?php

namespace App\Http\Controllers;

use App\Models\Suggestion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SuggestionController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index()
    {
        $user = Auth::user();
        
        // L'admin ne peut pas accéder aux suggestions via cette route
        // Il doit utiliser indexAdmin pour voir toutes les suggestions
        if ($user->isAdmin()) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }
        
        // Suggestions de l'utilisateur connecté
        return Suggestion::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        
        // L'admin ne peut pas créer de suggestions via cette route
        if ($user->isAdmin()) {
            return response()->json(['message' => 'Vous n\'êtes pas autorisé à créer des suggestions.'], 403);
        }
        
        $request->validate([
            'sujet' => 'required|string|max:255',
            'message' => 'required|string',
        ]);

        $suggestion = Suggestion::create([
            'user_id' => Auth::id(),
            'sujet' => $request->sujet,
            'message' => $request->message,
            'statut' => 'pending',
        ]);

        return response()->json([
            'message' => 'Votre suggestion a été envoyée avec succès.',
            'data' => $suggestion
        ], 201);
    }

    // Pour l'admin : voir toutes les suggestions
    public function indexAdmin()
    {
        return Suggestion::with('user.fournisseur')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    // Pour l'admin : changer le statut
    public function updateStatus(Request $request, Suggestion $suggestion)
    {
        $request->validate([
            'statut' => 'required|in:pending,read,implemented,rejected'
        ]);

        $suggestion->update(['statut' => $request->statut]);

        return response()->json(['message' => 'Statut mis à jour.', 'data' => $suggestion]);
    }
}

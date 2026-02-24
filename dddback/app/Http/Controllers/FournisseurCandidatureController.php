<?php

namespace App\Http\Controllers;

use App\Models\Candidature;
use App\Models\Fournisseur;
use App\Models\LogActivite;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Http\Requests\StoreCandidatureRequest;
use App\Http\Requests\UpdateCandidatureRequest;


class FournisseurCandidatureController extends Controller
{
    public function __construct()
    {
        $this->middleware(['auth:sanctum', 'role:FOURNISSEUR,ADMIN']);
    }

    /**
     * Display a listing of candidatures for the authenticated Fournisseur.
     */
    public function index()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if ($user->role->name === 'ADMIN') {
            $candidatures = Candidature::with(['appelOffre', 'fournisseur'])->get();
        } else {
            $fournisseur = $user->fournisseur;
            if (!$fournisseur) {
                return response()->json(['message' => 'Utilisateur non reconnu comme fournisseur.'], 403);
            }
            $candidatures = $fournisseur->candidatures()->with(['appelOffre', 'fournisseur'])->get();
        }

        return response()->json($candidatures);
    }

    /**
     * Store a newly created candidature for the authenticated Fournisseur.
     */
    public function store(StoreCandidatureRequest $request)
    {
        $candidature = Candidature::create($request->validated());
        return response()->json($candidature->load(['appelOffre', 'fournisseur']), 201);
    }

    /**
     * Display the specified candidature for the authenticated Fournisseur.
     */
    public function show(Candidature $candidature)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if ($user->role->name === 'ADMIN' || ($user->role->name === 'FOURNISSEUR' && $candidature->fournisseur->user_id === $user->id)) {
            return response()->json($candidature->load(['appelOffre', 'fournisseur']));
        }

        return response()->json(['message' => 'Accès refusé.'], 403);
    }

    /**
     * Update the specified candidature for the authenticated Fournisseur.
     */
    public function update(UpdateCandidatureRequest $request, Candidature $candidature)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if ($user->role->name === 'ADMIN' || ($user->role->name === 'FOURNISSEUR' && $candidature->fournisseur->user_id === $user->id)) {
            $candidature->update($request->validated());
            return response()->json($candidature);
        }

        return response()->json(['message' => 'Accès refusé.'], 403);
    }

    /**
     * Remove the specified candidature for the authenticated Fournisseur.
     */
    public function destroy(Candidature $candidature)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if ($user->role->name === 'ADMIN' || ($user->role->name === 'FOURNISSEUR' && $candidature->fournisseur->user_id === $user->id)) {
            $candidature->delete();
            return response()->json(null, 204);
        }

        return response()->json(['message' => 'Accès refusé.'], 403);
    }

    public function showProfile()
    {
        $user = auth()->user();
        $fournisseur = $user->fournisseur;

        if (!$fournisseur) {
            return response()->json(['message' => 'Profil fournisseur introuvable.'], 404);
        }

        return response()->json($fournisseur->load('user'));
    }

    public function updateProfile(Request $request)
    {
        $user = auth()->user();
        $fournisseur = $user->fournisseur;

        if (!$fournisseur) {
            return response()->json(['message' => 'Profil fournisseur introuvable.'], 404);
        }

        $request->validate([
            'nom_entreprise' => 'required|string|max:255',
            'adresse' => 'required|string|max:255',
            'telephone' => 'required|string|max:50',
            'email_contact' => 'required|email',
            'ninea' => 'nullable|string|max:50',
            'rccm' => 'nullable|string|max:50',
            'quitus_fiscal' => 'nullable|string|max:50',
        ]);

        $fournisseur->update($request->all());
        $this->log('update_fournisseur_profile', "Mise à jour profil fournisseur #{$fournisseur->id}");

        return response()->json($fournisseur);
    }

    private function log(string $action, string $details): void
    {
        LogActivite::create([
            'user_id' => auth()->id(),
            'action' => $action,
            'details' => $details,
            'ip_address' => request()->ip(),
        ]);
    }

    public function getOwnCandidatures()
    {
        $user = auth()->user();
        $fournisseur = $user->fournisseur;

        if (!$fournisseur) {
            return response()->json([]);
        }

        $candidatures = $fournisseur->candidatures()
            ->with('appelOffre')
            ->orderBy('date_soumission', 'desc')
            ->get()
            ->map(function ($c) {
                return [
                    'id' => $c->id,
                    'statut' => $c->statut,
                    'date_soumission' => $c->date_soumission,
                    'montant_propose' => 0, // À implémenter si géré
                    'appel_offre' => [
                        'id' => $c->appelOffre->id,
                        'titre' => $c->appelOffre->titre,
                        'numero_reference' => $c->appelOffre->reference, 
                        'date_limite' => $c->appelOffre->date_limite_depot,
                        'statut' => $c->appelOffre->statut,
                    ]
                ];
            });

        return response()->json($candidatures);
    }
// ...
}
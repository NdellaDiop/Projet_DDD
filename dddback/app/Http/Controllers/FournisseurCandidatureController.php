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
        
        // L'admin ne peut pas accéder au profil fournisseur via cette route
        // Il doit utiliser les routes admin pour voir les informations
        if ($user->isAdmin()) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }
        
        $fournisseur = $user->fournisseur;
        if (!$fournisseur) {
            return response()->json(['message' => 'Profil fournisseur introuvable.'], 404);
        }
        return response()->json($fournisseur->load('user'));
    }

    public function updateProfile(Request $request)
    {
        $user = auth()->user();
        
        // L'admin ne peut pas modifier le profil d'un fournisseur
        if ($user->isAdmin()) {
            return response()->json(['message' => 'Vous n\'êtes pas autorisé à modifier le profil d\'un fournisseur.'], 403);
        }
        
        $fournisseur = $user->fournisseur;
        if (!$fournisseur) {
            return response()->json(['message' => 'Profil fournisseur introuvable.'], 404);
        }
        $targetUser = $user;

        // Valider les données (maintenant en JSON, plus simple)
        $validated = $request->validate([
            'nom_entreprise' => 'required|string|max:255',
            'adresse' => 'required|string|max:255',
            'telephone' => 'required|string|max:50',
            'email_contact' => 'required|email',
            'ninea' => 'nullable|string|max:50',
            'rccm' => 'nullable|string|max:50',
            'quitus_fiscal' => 'nullable|string|max:50',
        ]);

        // Utiliser les valeurs validées directement
        $data = [
            'nom_entreprise' => trim($validated['nom_entreprise']),
            'adresse' => trim($validated['adresse']),
            'telephone' => trim($validated['telephone']),
            'email_contact' => trim($validated['email_contact']),
        ];
        
        // Ajouter les champs optionnels s'ils sont présents
        if (isset($validated['ninea']) && $validated['ninea'] !== null && $validated['ninea'] !== '') {
            $data['ninea'] = trim($validated['ninea']);
        }
        if (isset($validated['rccm']) && $validated['rccm'] !== null && $validated['rccm'] !== '') {
            $data['rccm'] = trim($validated['rccm']);
        }
        if (isset($validated['quitus_fiscal']) && $validated['quitus_fiscal'] !== null && $validated['quitus_fiscal'] !== '') {
            $data['quitus_fiscal'] = trim($validated['quitus_fiscal']);
        }
        
        // Log pour déboguer
        \Log::info('Données validées et à sauvegarder', [
            'validated' => $validated,
            'data' => $data,
            'ancien_nom' => $fournisseur->nom_entreprise,
        ]);
        
        // Ajouter les champs optionnels s'ils sont fournis
        if ($request->has('ninea') && $request->input('ninea') !== null && $request->input('ninea') !== '') {
            $data['ninea'] = trim($request->input('ninea'));
        }
        if ($request->has('rccm') && $request->input('rccm') !== null && $request->input('rccm') !== '') {
            $data['rccm'] = trim($request->input('rccm'));
        }
        if ($request->has('quitus_fiscal') && $request->input('quitus_fiscal') !== null && $request->input('quitus_fiscal') !== '') {
            $data['quitus_fiscal'] = trim($request->input('quitus_fiscal'));
        }

        // Si l'email_contact change, mettre à jour aussi l'email dans la table users
        $emailChanged = false;
        if ($data['email_contact'] !== $fournisseur->email_contact) {
            $emailChanged = true;
            // Vérifier que le nouvel email n'est pas déjà utilisé par un autre utilisateur
            $existingUser = \App\Models\User::where('email', $data['email_contact'])
                ->where('id', '!=', $targetUser->id)
                ->first();
            
            if ($existingUser) {
                return response()->json([
                    'message' => 'Cet email est déjà utilisé par un autre compte.'
                ], 422);
            }

            // Mettre à jour l'email dans la table users
            $targetUser->update(['email' => $data['email_contact']]);
        }

        // Mettre à jour le fournisseur avec toutes les données
        $fournisseur->update($data);
        
        // Recharger le modèle depuis la base de données pour avoir les données à jour
        $fournisseur->refresh();
        
        // Recharger les relations pour retourner les données à jour
        $fournisseur->load('user');
        
        // Ajouter un indicateur dans la réponse pour savoir si l'email a changé
        $fournisseur->email_changed = $emailChanged;
        
        $this->log('update_fournisseur_profile', "Mise à jour profil fournisseur #{$fournisseur->id} - nom_entreprise: {$data['nom_entreprise']}, adresse: {$data['adresse']}, telephone: {$data['telephone']}, email_contact: {$data['email_contact']}");

        // Retourner les données mises à jour
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
        
        // L'admin ne peut pas accéder aux candidatures via cette route
        // Il doit utiliser les routes admin pour voir les candidatures
        if ($user->isAdmin()) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }
        
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
                    'montant_propose' => $c->montant_propose, // Récupérer le vrai montant depuis la base de données
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
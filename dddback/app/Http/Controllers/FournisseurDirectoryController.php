<?php

namespace App\Http\Controllers;

use App\Models\Fournisseur;
use Illuminate\Http\Request;

/**
 * Annuaire « light » des fournisseurs accessibles en lecture aux PRM (et Admin).
 * Sert au contrôle des dossiers lorsque le fournisseur se présente au siège
 * pour le dépôt physique des plis.
 */
class FournisseurDirectoryController extends Controller
{
    /**
     * Liste des fournisseurs actifs (validés) — pagination + recherche libre.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && !$user->isResponsableMarche())) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $perPage = (int) $request->get('per_page', 15);
        $search = trim((string) $request->get('search', ''));
        // Pour le PRM on ne montre que les fournisseurs actifs (dossier validé).
        // Pour l'admin on autorise un filtre statut optionnel ; par défaut « actif ».
        $statut = (string) $request->get('statut', 'actif');

        $query = Fournisseur::query()
            ->with('user')
            ->where(function ($q) use ($statut, $user) {
                if ($user->isAdmin() && $statut === 'tous') {
                    return; // pas de filtre statut côté admin si demandé
                }
                $q->where('statut', $statut ?: 'actif');
            });

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('nom_entreprise', 'LIKE', "%{$search}%")
                    ->orWhere('ninea', 'LIKE', "%{$search}%")
                    ->orWhere('email_contact', 'LIKE', "%{$search}%")
                    ->orWhere('telephone', 'LIKE', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'LIKE', "%{$search}%")
                            ->orWhere('email', 'LIKE', "%{$search}%");
                    });
            });
        }

        $shape = function (Fournisseur $f): array {
            return [
                'id' => $f->id,
                'raison_sociale' => $f->nom_entreprise,
                'ninea' => $f->ninea,
                'email' => $f->email_contact ?? $f->user?->email,
                'telephone' => $f->telephone,
                'adresse' => $f->adresse,
                'statut' => $f->statut,
                'references_professionnelles' => $f->references_professionnelles,
                'user' => $f->user ? [
                    'id' => $f->user->id,
                    'name' => $f->user->name,
                    'email' => $f->user->email,
                ] : null,
                'created_at' => $f->created_at,
            ];
        };

        if ($request->boolean('all')) {
            $fournisseurs = $query->orderBy('nom_entreprise')->get()->map($shape);
            return response()->json(['data' => $fournisseurs->values()]);
        }

        $paginated = $query->orderBy('nom_entreprise')->paginate($perPage);

        return response()->json([
            'data' => collect($paginated->items())->map($shape)->values(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
            ],
        ]);
    }
}

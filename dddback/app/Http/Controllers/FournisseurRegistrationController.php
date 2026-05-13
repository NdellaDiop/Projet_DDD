<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Fournisseur;
use App\Models\Role;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Inscription fournisseur en « guichet unique » :
 * - Identification de l'entreprise (raison sociale, NINEA, RCCM, contact)
 * - Compte d'accès (email + mot de passe)
 * - Pièces justificatives (7 documents légaux obligatoires + pièces complémentaires)
 *
 * Tout est créé en une seule transaction : User (désactivé) + Fournisseur (en_attente) + Documents.
 * Sans le dossier complet, l'admin ne peut pas valider le compte.
 */
class FournisseurRegistrationController extends Controller
{
    public function register(Request $request)
    {
        $required = Document::LEGAL_CATEGORIES;

        $rules = [
            // Compte d'accès
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|confirmed',

            // Identification entreprise
            'nom_entreprise' => 'required|string|max:255',
            'ninea' => 'nullable|string|max:50',
            'rccm' => 'nullable|string|max:100',
            'adresse' => 'required|string|max:500',
            'telephone' => 'required|string|max:30',
            'references_professionnelles' => 'nullable|string|max:5000',

            // Pièces complémentaires (catégorie AUTRE) — multiples possibles
            'documents.AUTRE' => 'nullable|array|max:5',
            'documents.AUTRE.*' => 'file|mimes:pdf,jpg,jpeg,png|max:10240',
        ];

        // Une pièce obligatoire par catégorie de la liste légale
        foreach ($required as $cat) {
            $rules["documents.$cat"] = ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'];
        }

        try {
            $data = $request->validate($rules);
        } catch (ValidationException $e) {
            // On enrichit le message d'erreur des pièces manquantes
            $errors = $e->errors();
            $manquantes = [];
            foreach ($required as $cat) {
                if (isset($errors["documents.$cat"])) {
                    $manquantes[] = $cat;
                }
            }
            if (! empty($manquantes)) {
                $labels = Document::legalCategoryLabels();
                $libelles = array_map(fn ($c) => $labels[$c] ?? $c, $manquantes);
                $errors['documents'] = [
                    'Veuillez joindre toutes les pièces obligatoires (manquantes : '
                    .implode(', ', $libelles).').',
                ];
            }
            throw ValidationException::withMessages($errors);
        }

        // Récupération du rôle FOURNISSEUR (création des données dans une transaction)
        $role = Role::where('name', 'FOURNISSEUR')->first();
        if (! $role) {
            return response()->json([
                'message' => 'Configuration du rôle FOURNISSEUR introuvable. Contactez l\'administrateur.',
            ], 500);
        }

        try {
            $payload = DB::transaction(function () use ($request, $data, $role, $required) {
                $user = User::create([
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'password' => Hash::make($data['password']),
                    'role_id' => $role->id,
                    'is_active' => false, // Validation administrateur requise
                ]);

                $fournisseur = Fournisseur::create([
                    'user_id' => $user->id,
                    'nom_entreprise' => $data['nom_entreprise'],
                    'adresse' => $data['adresse'],
                    'telephone' => $data['telephone'],
                    'email_contact' => $data['email'],
                    'ninea' => $data['ninea'] ?? null,
                    'rccm' => $data['rccm'] ?? null,
                    'references_professionnelles' => $data['references_professionnelles'] ?? null,
                    'statut' => 'en_attente',
                ]);

                // Pièces obligatoires (1 par catégorie)
                foreach ($required as $categorie) {
                    /** @var \Illuminate\Http\UploadedFile $file */
                    $file = $request->file("documents.$categorie");
                    $this->storeLegalFile($user->id, $categorie, $file);
                }

                // Pièces optionnelles (catégorie AUTRE) — plusieurs fichiers possibles
                $autres = $request->file('documents.AUTRE');
                if (is_array($autres)) {
                    foreach ($autres as $file) {
                        if ($file) {
                            $this->storeLegalFile($user->id, 'AUTRE', $file);
                        }
                    }
                }

                return ['user' => $user, 'fournisseur' => $fournisseur];
            });
        } catch (\Throwable $e) {
            return response()->json([
                'message' => "Une erreur est survenue lors de l'enregistrement de votre dossier. Veuillez réessayer.",
                'error' => app()->environment('local') ? $e->getMessage() : null,
            ], 500);
        }

        // Notifications admin (best-effort : ne bloque pas la création si ça échoue)
        try {
            $this->notifierAdmins(
                $payload['fournisseur']->nom_entreprise,
                (int) $payload['fournisseur']->id
            );
        } catch (\Throwable $e) {
            // ignore
        }

        return response()->json([
            'message' => "Votre dossier a été soumis. L'administrateur le validera après examen des pièces.",
            'fournisseur' => [
                'id' => $payload['fournisseur']->id,
                'nom_entreprise' => $payload['fournisseur']->nom_entreprise,
                'statut' => $payload['fournisseur']->statut,
            ],
        ], 201);
    }

    /**
     * Stocke un fichier de pièce légale et crée la ligne Document associée.
     */
    private function storeLegalFile(int $userId, string $categorie, \Illuminate\Http\UploadedFile $file): Document
    {
        $path = $file->store('documents', 'public');

        return Document::create([
            'user_id' => $userId,
            'candidature_id' => null,
            'appel_offre_id' => null,
            'nom_fichier' => $file->getClientOriginalName(),
            'type_fichier' => $file->getClientMimeType(),
            'categorie' => $categorie,
            'chemin_fichier' => $path,
        ]);
    }

    /**
     * Notifie tous les administrateurs qu'un nouveau dossier fournisseur est en attente.
     */
    private function notifierAdmins(string $raisonSociale, int $fournisseurId): void
    {
        $adminIds = User::whereHas('role', function ($q) {
            $q->where('name', 'ADMIN');
        })->pluck('id');

        if ($adminIds->isEmpty()) {
            return;
        }

        $service = app(NotificationService::class);
        $message = "Nouveau dossier fournisseur à valider : « {$raisonSociale} » (dossier #{$fournisseurId}). Vérifiez les pièces légales avant validation.";

        foreach ($adminIds as $id) {
            $service->notifyUser((int) $id, $message);
        }
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\AppelOffre;
use App\Models\LogActivite;
use App\Services\AppelOffreService;
use App\Services\NotificationService;
use App\Http\Requests\StoreAppelOffreRequest;
use App\Http\Requests\StoreAppelOffreWithDocumentsRequest;
use App\Http\Requests\UpdateAppelOffreRequest;
use App\Http\Requests\PublishAppelOffreRequest;
use App\Http\Requests\CloseAppelOffreRequest;
use App\Http\Resources\AppelOffreResource;
use App\Models\Document;
use Illuminate\Http\Request;

class AppelOffreController extends Controller
{
    protected AppelOffreService $appelOffreService;
    protected NotificationService $notificationService;

    public function __construct(AppelOffreService $appelOffreService, NotificationService $notificationService)
    {
        $this->middleware('auth:sanctum')->except(['index', 'show']);
        $this->authorizeResource(AppelOffre::class, 'appel_offre', [
            'except' => ['index', 'show']
        ]);

        $this->appelOffreService = $appelOffreService;
        $this->notificationService = $notificationService;
    }

    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 15);
        $search = $request->get('search', '');
        $statut = $request->get('statut', '');
        
        $query = AppelOffre::query()
            ->with('responsableMarche.user')
            ->withCount('candidatures');
        
        // Par défaut, on affiche les publiés et clôturés
        if (!$statut) {
            $query->whereIn('statut', [AppelOffre::STATUS_PUBLISHED, AppelOffre::STATUS_CLOSED]);
        }
        
        // Recherche
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('titre', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%")
                  ->orWhere('reference', 'LIKE', "%{$search}%");
            });
        }
        
        // Filtre par statut (si différent de published)
        if ($statut) {
            $query->where('statut', $statut);
        }
        
        // Pagination
        $appelsOffres = $query->orderBy('date_publication', 'desc')->paginate($perPage);
    
        return AppelOffreResource::collection($appelsOffres);
    }
    
    public function show(AppelOffre $appelOffre)
    {
        // SÉCURITÉ : Si l'utilisateur n'est pas admin/responsable, il ne doit voir que les AO publiés ou clôturés
        $user = auth('sanctum')->user();
        
        // Si non connecté OU connecté mais pas admin/responsable du marché
        $isPublicOrSimpleUser = !$user || ($user->role->name !== 'ADMIN' && ($user->role->name !== 'RESPONSABLE_MARCHE' || $appelOffre->responsable_marche_id !== $user->responsableMarche?->id));

        if ($isPublicOrSimpleUser) {
            if (!in_array($appelOffre->statut, [AppelOffre::STATUS_PUBLISHED, AppelOffre::STATUS_CLOSED])) {
                abort(404); // On fait croire que l'AO n'existe pas
            }
        }

        $appelOffre->load(['responsableMarche.user', 'documents'])->loadCount('candidatures');
        return new AppelOffreResource($appelOffre);
    }
    
    public function store(StoreAppelOffreRequest $request)
    {
        $appelOffre = $this->appelOffreService->createAppelOffre($request->validated());
        $this->log('create_appel_offre', "Création AO #{$appelOffre->id}");
        return (new AppelOffreResource($appelOffre))->response()->setStatusCode(201);
    }

    /**
     * Création atomique : métadonnées + avis + cahier (évite un brouillon sans pièces).
     */
    public function storeWithDocuments(StoreAppelOffreWithDocumentsRequest $request)
    {
        $this->authorize('create', AppelOffre::class);

        $data = $request->safe()->except(['avis', 'cahier']);
        $appelOffre = $this->appelOffreService->createAppelOffreWithDocuments(
            $data,
            $request->file('avis'),
            $request->file('cahier'),
            (int) auth()->id()
        );

        $this->log('create_appel_offre', "Création AO #{$appelOffre->id} avec pièces jointes");

        return (new AppelOffreResource($appelOffre))->response()->setStatusCode(201);
    }
    
    public function update(UpdateAppelOffreRequest $request, AppelOffre $appelOffre)
    {
        $appelOffre = $this->appelOffreService->updateAppelOffre($appelOffre, $request->validated());
        $this->log('update_appel_offre', "Mise à jour AO #{$appelOffre->id}");
        return new AppelOffreResource($appelOffre);
    }
    
    public function publish(PublishAppelOffreRequest $request, AppelOffre $appelOffre)
    {
        $this->authorize('publish', $appelOffre);

        // Exiger les documents AO minimum avant publication (avis + cahier)
        $requiredAoDocs = ['AVIS_APPEL_OFFRES', 'CAHIER_DES_CHARGES'];
        $present = Document::where('appel_offre_id', $appelOffre->id)
            ->whereIn('categorie', $requiredAoDocs)
            ->pluck('categorie')
            ->unique()
            ->toArray();
        $missing = array_values(array_diff($requiredAoDocs, $present));
        if (!empty($missing)) {
            $labels = [
                'AVIS_APPEL_OFFRES' => "Avis d'appel d'offres",
                'CAHIER_DES_CHARGES' => 'Cahier des charges',
            ];
            $missingLabels = array_map(fn ($c) => $labels[$c] ?? $c, $missing);
            return response()->json([
                'message' => "Documents AO manquants. Ajoutez : ".implode(', ', $missingLabels)." avant de publier.",
                'missing_documents' => $missing,
            ], 422);
        }

        if ($appelOffre->cahier_paiement_requis) {
            $prix = (int) ($appelOffre->cahier_prix_xof ?? 0);
            if ($prix <= 0) {
                return response()->json([
                    'message' => 'Le cahier des charges est marqué comme payant : indiquez un prix (FCFA) supérieur à 0 dans la fiche AO avant publication.',
                ], 422);
            }
        }

        $modalites = trim((string) ($appelOffre->modalites_soumission_physique ?? ''));
        if ($modalites === '') {
            return response()->json([
                'message' => 'Indiquez les modalités de dépôt des plis en présentiel (adresse du guichet, horaires, contact du service des marchés, salle de dépôt…) dans la fiche avant publication — champ « Modalités de dépôt des plis ».',
            ], 422);
        }

        $appelOffre = $this->appelOffreService->publishAppelOffre($appelOffre);
        $this->log('publish_appel_offre', "Publication AO #{$appelOffre->id}");
        return new AppelOffreResource($appelOffre);
    }
    
    public function close(CloseAppelOffreRequest $request, AppelOffre $appelOffre)
    {
        $this->authorize('close', $appelOffre);
        $appelOffre = $this->appelOffreService->closeAppelOffre($appelOffre);
        $this->log('close_appel_offre', "Clôture AO #{$appelOffre->id}");
        return new AppelOffreResource($appelOffre);
    }

    /**
     * Réouvre un appel d'offres clôturé (admin ou PRM responsable de l'avis).
     */
    public function reopen(Request $request, AppelOffre $appelOffre)
    {
        $this->authorize('reopen', $appelOffre);

        if ($appelOffre->statut !== AppelOffre::STATUS_CLOSED) {
            return response()->json([
                'message' => 'Seul un appel d\'offres clôturé peut être réouvert.',
            ], 422);
        }

        $data = $request->validate([
            'date_limite_depot' => 'nullable|date|after:now',
        ]);

        if ($appelOffre->dateLimiteDepotDepassee() && empty($data['date_limite_depot'])) {
            return response()->json([
                'message' => 'La date limite de dépôt est dépassée. Indiquez une nouvelle date limite pour réouvrir cet appel d\'offres.',
                'requires_new_date_limite' => true,
            ], 422);
        }

        $appelOffre = $this->appelOffreService->reopenAppelOffre(
            $appelOffre,
            $data['date_limite_depot'] ?? null
        );
        $this->log('reopen_appel_offre', "Réouverture AO #{$appelOffre->id}");

        return new AppelOffreResource($appelOffre);
    }

    /**
     * Repasse un appel d'offres publié en brouillon (admin uniquement).
     */
    public function unpublish(Request $request, AppelOffre $appelOffre)
    {
        if (! auth()->user()?->isAdmin()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        if ($appelOffre->statut !== AppelOffre::STATUS_PUBLISHED) {
            return response()->json([
                'message' => 'Seul un appel d\'offres publié peut repasser en brouillon.',
            ], 422);
        }

        $appelOffre = $this->appelOffreService->unpublishAppelOffre($appelOffre);
        $this->log('unpublish_appel_offre', "Retour brouillon AO #{$appelOffre->id}");

        return new AppelOffreResource($appelOffre);
    }

    public function destroy(AppelOffre $appelOffre)
    {
        $this->appelOffreService->deleteAppelOffre($appelOffre);

        $this->log('delete_appel_offre', "Suppression AO #{$appelOffre->id}");

        return response()->json(null, 204);
    }

    /**
     * Récupère les appels d'offres créés par le responsable connecté.
     * Les responsables voient UNIQUEMENT leurs propres appels d'offres (responsable_marche_id = leur id).
     * L'admin voit tous les appels d'offres (y compris ceux non assignés).
     */
    public function indexForResponsable(Request $request)
    {
        $user = auth()->user();
        $perPage = $request->get('per_page', 15);
        $search = $request->get('search', '');
        $statut = $request->get('statut', '');
        $dateDebut = $request->get('date_debut', '');
        $dateFin = $request->get('date_fin', '');
        
        $query = AppelOffre::query();
        
        // Si c'est l'admin, il voit tout (y compris les AO non assignés)
        if ($user->role->name === 'ADMIN') {
            $query->with([
                'responsableMarche.user',
                'documents' => fn ($q) => $q
                    ->select('id', 'appel_offre_id', 'categorie', 'nom_fichier')
                    ->whereIn('categorie', AppelOffre::REQUIRED_AO_DOCUMENTS),
            ])->withCount('candidatures');
        } else {
            $responsable = $user->responsableMarche;
            if (!$responsable) {
                return response()->json(['message' => 'Non autorisé'], 403);
            }

            // Les responsables voient UNIQUEMENT leurs propres appels d'offres
            $query->where('responsable_marche_id', $responsable->id)
                ->with([
                    'responsableMarche.user',
                    'documents' => fn ($q) => $q
                        ->select('id', 'appel_offre_id', 'categorie', 'nom_fichier')
                        ->whereIn('categorie', AppelOffre::REQUIRED_AO_DOCUMENTS),
                ])
                ->withCount('candidatures');
        }
        
        // Recherche
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('titre', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%")
                  ->orWhere('reference', 'LIKE', "%{$search}%");
            });
        }
        
        // Filtre par statut
        if ($statut) {
            $query->where('statut', $statut);
        }

        // Filtre par plage de dates (publication)
        if ($dateDebut) {
            $query->whereDate('date_publication', '>=', $dateDebut);
        }
        if ($dateFin) {
            $query->whereDate('date_publication', '<=', $dateFin);
        }
        
        if ($request->has('all')) {
            $appelsOffres = $query->orderBy('created_at', 'desc')->get();
            return AppelOffreResource::collection($appelsOffres);
        }
        
        $appelsOffres = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return AppelOffreResource::collection($appelsOffres);
    }

    /**
     * Récupère les candidatures pour un appel d'offres donné (pour le responsable).
     */
    public function getCandidatures(Request $request, AppelOffre $appelOffre)
    {
        $user = auth()->user();
        $perPage = $request->get('per_page', 15);
        $statut = $request->get('statut', '');
        
        // Vérification que c'est bien son appel d'offres (ou admin)
        if ($user->role->name !== 'ADMIN') {
            $responsable = $user->responsableMarche;
            if (!$responsable || $appelOffre->responsable_marche_id !== $responsable->id) {
                return response()->json(['message' => 'Accès refusé'], 403);
            }
        }

        $query = $appelOffre->candidatures()
            ->with('fournisseur.user')
            ->orderBy('created_at', 'desc');
        
        // Filtre par statut
        if ($statut) {
            $query->where('statut', $statut);
        }

        $candidatures = $query->paginate($perPage);

        return response()->json($candidatures);
    }

    /**
     * Assigner un appel d'offres à un responsable de marché.
     * Seul l'admin peut assigner un AO à un responsable.
     */
    public function assign(Request $request, AppelOffre $appelOffre)
    {
        // Seul l'admin peut assigner (vérification manuelle car pas de Policy spécifique pour 'assign')
        if (auth()->user()->role->name !== 'ADMIN') {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $request->validate([
            'responsable_marche_id' => 'required|exists:responsables_marche,id',
        ]);

        $appelOffre->responsable_marche_id = $request->responsable_marche_id;
        $appelOffre->save();
        
        $appelOffre->load('responsableMarche.user');
        
        // Envoi de l'email de notification au responsable
        if ($appelOffre->responsableMarche && $appelOffre->responsableMarche->user) {
            try {
                $this->notificationService->sendAppelOffreAssignedEmail(
                    $appelOffre->responsableMarche->user,
                    $appelOffre
                );
                $this->notificationService->notifyUser(
                    $appelOffre->responsableMarche->user->id,
                    "L'avis d'appel d'offres « {$appelOffre->titre} » (réf. {$appelOffre->reference}) vous a été assigné.",
                    \App\Models\Notification::AUDIENCE_PRM
                );
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("Erreur envoi email assignation AO: " . $e->getMessage());
            }
        }

        $this->log('assign_appel_offre', "Assignation AO #{$appelOffre->id} au responsable #{$request->responsable_marche_id}");

        return new AppelOffreResource($appelOffre);
    }

    /**
     * Attribution du marché (alignée dépôt physique) — administrateur uniquement.
     */
    public function attribuer(Request $request, AppelOffre $appelOffre)
    {
        $user = $request->user();
        if (! $user?->isAdmin()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        if ($appelOffre->statut !== AppelOffre::STATUS_CLOSED) {
            return response()->json([
                'message' => "L'attribution est disponible une fois l'appel d'offres clôturé.",
            ], 422);
        }

        $data = $request->validate([
            'attributaire_nom' => 'required|string|max:255',
            'attributaire_ninea' => 'nullable|string|max:255',
            'attribution_montant_xof' => 'nullable|integer|min:0',
            'attribution_date' => 'nullable|date',
            'attribution_commentaire' => 'nullable|string|max:5000',
        ]);

        $appelOffre->fill([
            'attribution_statut' => 'attribue',
            'attributaire_nom' => $data['attributaire_nom'],
            'attributaire_ninea' => $data['attributaire_ninea'] ?? null,
            'attribution_montant_xof' => $data['attribution_montant_xof'] ?? null,
            'attribution_date' => isset($data['attribution_date']) ? $data['attribution_date'] : now(),
            'attribution_commentaire' => $data['attribution_commentaire'] ?? null,
            'attribution_par_user_id' => $user->id,
        ]);
        $appelOffre->save();

        $this->log('attribuer_appel_offre', "Attribution AO #{$appelOffre->id} à {$appelOffre->attributaire_nom}");

        return new AppelOffreResource($appelOffre->fresh());
    }

    public function annulerAttribution(Request $request, AppelOffre $appelOffre)
    {
        $user = $request->user();
        if (! $user?->isAdmin()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $appelOffre->fill([
            'attribution_statut' => 'non_attribue',
            'attributaire_nom' => null,
            'attributaire_ninea' => null,
            'attribution_montant_xof' => null,
            'attribution_date' => null,
            'attribution_commentaire' => null,
            'attribution_par_user_id' => null,
        ]);
        $appelOffre->save();

        $this->log('annuler_attribution_appel_offre', "Annulation attribution AO #{$appelOffre->id}");

        return new AppelOffreResource($appelOffre->fresh());
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
}
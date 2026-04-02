<?php

namespace App\Http\Controllers;

use App\Models\AppelOffre;
use App\Models\LogActivite;
use App\Services\AppelOffreService;
use App\Services\NotificationService;
use App\Http\Requests\StoreAppelOffreRequest;
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
                $q->where('titre', 'ilike', "%{$search}%")
                  ->orWhere('description', 'ilike', "%{$search}%")
                  ->orWhere('reference', 'ilike', "%{$search}%");
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
    
    public function update(UpdateAppelOffreRequest $request, AppelOffre $appelOffre)
    {
        $appelOffre = $this->appelOffreService->updateAppelOffre($appelOffre, $request->validated());
        $this->log('update_appel_offre', "Mise à jour AO #{$appelOffre->id}");
        return new AppelOffreResource($appelOffre);
    }
    
    public function publish(PublishAppelOffreRequest $request, AppelOffre $appelOffre)
    {
        $this->authorize('publish', $appelOffre);

        // Exiger les documents AO minimum avant publication (workflow 2 temps)
        $requiredAoDocs = ['CAHIER_DES_CHARGES', 'REGLEMENT_CONSULTATION'];
        $present = Document::where('appel_offre_id', $appelOffre->id)
            ->whereIn('categorie', $requiredAoDocs)
            ->pluck('categorie')
            ->unique()
            ->toArray();
        $missing = array_values(array_diff($requiredAoDocs, $present));
        if (!empty($missing)) {
            $labels = [
                'CAHIER_DES_CHARGES' => 'Cahier des charges',
                'REGLEMENT_CONSULTATION' => 'Règlement de consultation',
            ];
            $missingLabels = array_map(fn ($c) => $labels[$c] ?? $c, $missing);
            return response()->json([
                'message' => "Documents AO manquants. Ajoutez : ".implode(', ', $missingLabels)." avant de publier.",
                'missing_documents' => $missing,
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
            $query->with('responsableMarche.user')
                ->withCount('candidatures');
        } else {
            $responsable = $user->responsableMarche;
            if (!$responsable) {
                return response()->json(['message' => 'Non autorisé'], 403);
            }

            // Les responsables voient UNIQUEMENT leurs propres appels d'offres
            $query->where('responsable_marche_id', $responsable->id)
                ->with('responsableMarche.user')
                ->withCount('candidatures');
        }
        
        // Recherche
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('titre', 'ilike', "%{$search}%")
                  ->orWhere('description', 'ilike', "%{$search}%")
                  ->orWhere('reference', 'ilike', "%{$search}%");
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
     * Récupère les candidatures pour un appel d'offre donné (pour le responsable).
     */
    public function getCandidatures(Request $request, AppelOffre $appelOffre)
    {
        $user = auth()->user();
        $perPage = $request->get('per_page', 15);
        $statut = $request->get('statut', '');
        
        // Vérification que c'est bien son appel d'offre (ou admin)
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
     * Assigner un appel d'offre à un responsable de marché.
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
                    "L'appel d'offre '{$appelOffre->titre}' vous a été assigné."
                );
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("Erreur envoi email assignation AO: " . $e->getMessage());
            }
        }

        $this->log('assign_appel_offre', "Assignation AO #{$appelOffre->id} au responsable #{$request->responsable_marche_id}");

        return new AppelOffreResource($appelOffre);
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
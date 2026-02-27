<?php

namespace App\Http\Controllers;

use App\Models\AppelOffre;
use App\Models\LogActivite;
use App\Services\AppelOffreService;
use App\Http\Requests\StoreAppelOffreRequest;
use App\Http\Requests\UpdateAppelOffreRequest;
use App\Http\Requests\PublishAppelOffreRequest;
use App\Http\Requests\CloseAppelOffreRequest;
use App\Http\Resources\AppelOffreResource;

class AppelOffreController extends Controller
{
    protected AppelOffreService $appelOffreService;

    public function __construct(AppelOffreService $appelOffreService)
    {
        $this->middleware('auth:sanctum')->except(['index', 'show']);
        $this->authorizeResource(AppelOffre::class, 'appel_offre', [
            'except' => ['index', 'show']
        ]);

        $this->appelOffreService = $appelOffreService;
    }

    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 15);
        $search = $request->get('search', '');
        $statut = $request->get('statut', '');
        
        $query = $this->appelOffreService
            ->getAllAppelsOffres()
            ->load('responsableMarche.user')
            ->loadCount('candidatures');
        
        // Recherche
        if ($search) {
            $query = $query->filter(function ($ao) use ($search) {
                return stripos($ao->titre, $search) !== false 
                    || stripos($ao->description, $search) !== false
                    || stripos($ao->reference, $search) !== false;
            });
        }
        
        // Filtre par statut
        if ($statut) {
            $query = $query->filter(function ($ao) use ($statut) {
                return $ao->statut === $statut;
            });
        }
        
        // Pagination
        $appelsOffres = $query->paginate($perPage);
    
        return AppelOffreResource::collection($appelsOffres);
    }
    
    public function show(AppelOffre $appelOffre)
    {
        $appelOffre->load('responsableMarche.user')->loadCount('candidatures');
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
     * Les responsables voient leurs propres appels d'offres + ceux créés par l'admin (responsable_marche_id = null).
     * L'admin voit tous les appels d'offres.
     */
    public function indexForResponsable(Request $request)
    {
        $user = auth()->user();
        $perPage = $request->get('per_page', 15);
        $search = $request->get('search', '');
        $statut = $request->get('statut', '');
        
        $query = AppelOffre::query();
        
        // Si c'est l'admin, il voit tout
        if ($user->role->name === 'ADMIN') {
            $query->with('responsableMarche.user')
                ->withCount('candidatures');
        } else {
            $responsable = $user->responsableMarche;
            if (!$responsable) {
                return response()->json(['message' => 'Non autorisé'], 403);
            }

            // Les responsables voient leurs propres appels d'offres + ceux créés par l'admin
            $query->where(function($q) use ($responsable) {
                    $q->where('responsable_marche_id', $responsable->id)
                      ->orWhereNull('responsable_marche_id');
                })
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
        
        $appelsOffres = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($appelsOffres);
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
            if (!$responsable || ($appelOffre->responsable_marche_id !== $responsable->id && $appelOffre->responsable_marche_id !== null)) {
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
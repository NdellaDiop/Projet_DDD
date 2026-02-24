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

    public function index()
    {
        $appelsOffres = $this->appelOffreService
            ->getAllAppelsOffres()
            ->load('responsableMarche.user')
            ->loadCount('candidatures');
    
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
     */
    public function indexForResponsable()
    {
        $user = auth()->user();
        
        // Si c'est l'admin, il voit tout (optionnel, pour debug)
        if ($user->role->name === 'ADMIN') {
            return $this->index();
        }

        $responsable = $user->responsableMarche;
        if (!$responsable) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $appelsOffres = AppelOffre::where('responsable_marche_id', $responsable->id)
            ->withCount('candidatures')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($appelsOffres);
    }

    /**
     * Récupère les candidatures pour un appel d'offre donné (pour le responsable).
     */
    public function getCandidatures(AppelOffre $appelOffre)
    {
        $user = auth()->user();
        
        // Vérification que c'est bien son appel d'offre (ou admin)
        if ($user->role->name !== 'ADMIN') {
            $responsable = $user->responsableMarche;
            if (!$responsable || $appelOffre->responsable_marche_id !== $responsable->id) {
                return response()->json(['message' => 'Accès refusé'], 403);
            }
        }

        $candidatures = $appelOffre->candidatures()
            ->with('fournisseur')
            ->orderBy('created_at', 'desc')
            ->get();

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
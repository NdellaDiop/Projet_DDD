<?php

namespace App\Http\Controllers;

use App\Models\AppelOffre;
use App\Models\Candidature;
use App\Models\LogActivite;
use App\Http\Requests\StoreCandidatureRequest;
use App\Http\Requests\UpdateCandidatureStatusRequest;
use Illuminate\Support\Facades\Auth;
use App\Services\NotificationService;
use App\Http\Resources\CandidatureResource;

class CandidatureController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index()
    {
        $this->authorize('viewAny', Candidature::class);

        $user = Auth::user();

        if ($user->isAdmin()) {
            $candidatures = Candidature::with(['appelOffre', 'fournisseur.user'])->get();
            return CandidatureResource::collection($candidatures);
        }

        if ($user->isResponsableMarche()) {
            $candidatures = Candidature::whereHas('appelOffre', function ($q) use ($user) {
                $q->where('responsable_marche_id', $user->responsableMarche->id);
            })->with(['appelOffre', 'fournisseur.user'])->get();

            return CandidatureResource::collection($candidatures);
        }

        if ($user->isFournisseur()) {
            $candidatures = $user->fournisseur
                ? $user->fournisseur->candidatures()->with(['appelOffre'])->get()
                : collect();

            return CandidatureResource::collection($candidatures);
        }

        return CandidatureResource::collection(collect());
    }

    public function show(Candidature $candidature)
    {
        $this->authorize('view', $candidature);
        return new CandidatureResource($candidature->load(['appelOffre','fournisseur.user']));
    }

    public function store(StoreCandidatureRequest $request, AppelOffre $appelOffre)
    {
        $this->authorize('create', Candidature::class);

        if ($appelOffre->statut !== \App\Models\AppelOffre::STATUS_PUBLISHED) {
            return response()->json(['message' => 'Appel d’offre non ouvert à la candidature.'], 403);
        }
        
        // Vérifier si une candidature existe déjà pour ce fournisseur et cet appel d'offre
        $existingCandidature = Candidature::where('appel_offre_id', $appelOffre->id)
            ->where('fournisseur_id', $request->fournisseur_id)
            ->first();

        if ($existingCandidature) {
            return response()->json(['message' => 'Vous avez déjà postulé à cet appel d\'offre.'], 409);
        }

        $candidature = Candidature::create([
            'appel_offre_id' => $appelOffre->id,
            'fournisseur_id' => $request->fournisseur_id,
            'date_soumission' => now(),
            'montant_propose' => $request->montant_propose,
            'statut' => \App\Models\Candidature::STATUS_SUBMITTED,
        ]);

        $this->log('submit_candidature', "Soumission candidature #{$candidature->id}");

        return (new CandidatureResource($candidature))->response()->setStatusCode(201);
    }

    public function update(StoreCandidatureRequest $request, Candidature $candidature)
    {
        // On vérifie si c'est le propriétaire (via fournisseur lié au user connecté)
        if (!auth()->user()->fournisseur || $candidature->fournisseur_id !== auth()->user()->fournisseur->id) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        // On ne peut modifier que si le statut est soumis
        if ($candidature->statut !== \App\Models\Candidature::STATUS_SUBMITTED) {
            return response()->json(['message' => 'Impossible de modifier une candidature déjà traitée.'], 403);
        }

        $candidature->update([
            'montant_propose' => $request->montant_propose,
        ]);

        return new CandidatureResource($candidature);
    }

    public function accept(UpdateCandidatureStatusRequest $request, Candidature $candidature)
    {
        $this->authorize('accept', $candidature);

        if ($candidature->statut === \App\Models\Candidature::STATUS_ACCEPTED) {
            return response()->json(['message' => 'Déjà acceptée.'], 409);
        }
        if ($candidature->statut === \App\Models\Candidature::STATUS_REJECTED) {
            return response()->json(['message' => 'Déjà rejetée.'], 409);
        }

        $candidature->update(['statut' => \App\Models\Candidature::STATUS_ACCEPTED]);

        $this->log('accept_candidature', "Acceptation candidature #{$candidature->id}");

        app(NotificationService::class)->notifyUser(
            $candidature->fournisseur->user->id,
            'Votre candidature a été acceptée.'
        );

        return new CandidatureResource($candidature);
    }

    public function reject(UpdateCandidatureStatusRequest $request, Candidature $candidature)
    {
        $this->authorize('reject', $candidature);

        if ($candidature->statut === \App\Models\Candidature::STATUS_REJECTED) {
            return response()->json(['message' => 'Déjà rejetée.'], 409);
        }
        if ($candidature->statut === \App\Models\Candidature::STATUS_ACCEPTED) {
            return response()->json(['message' => 'Déjà acceptée.'], 409);
        }

        $candidature->update(['statut' => \App\Models\Candidature::STATUS_REJECTED]);

        $this->log('reject_candidature', "Rejet candidature #{$candidature->id}");

        app(NotificationService::class)->notifyUser(
            $candidature->fournisseur->user->id,
            'Votre candidature a été rejetée.'
        );

        return new CandidatureResource($candidature);
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
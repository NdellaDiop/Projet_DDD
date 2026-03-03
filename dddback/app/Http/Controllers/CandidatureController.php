<?php

namespace App\Http\Controllers;

use App\Models\AppelOffre;
use App\Models\Candidature;
use App\Models\Document;
use App\Models\LogActivite;
use App\Http\Requests\StoreCandidatureRequest;
use App\Http\Requests\UpdateCandidatureStatusRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\NotificationService;
use App\Http\Resources\CandidatureResource;

class CandidatureController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index(Request $request)
    {
        $this->authorize('viewAny', Candidature::class);

        $user = Auth::user();
        $perPage = $request->get('per_page', 15);
        $statut = $request->get('statut', '');
        $appelOffreId = $request->get('appel_offre_id', '');

        $query = Candidature::query();

        if ($user->isAdmin()) {
            $query->with(['appelOffre', 'fournisseur.user']);
        } elseif ($user->isResponsableMarche()) {
            $query->whereHas('appelOffre', function ($q) use ($user) {
                $q->where('responsable_marche_id', $user->responsableMarche->id)
                  ->orWhereNull('responsable_marche_id'); // AO créés par admin
            })->with(['appelOffre', 'fournisseur.user']);
        } elseif ($user->isFournisseur()) {
            if ($user->fournisseur) {
                $query = $user->fournisseur->candidatures()->with(['appelOffre']);
            } else {
                return CandidatureResource::collection(collect()->paginate($perPage));
            }
        } else {
            return CandidatureResource::collection(collect()->paginate($perPage));
        }
        
        // Filtre par statut
        if ($statut) {
            $query->where('statut', $statut);
        }
        
        // Filtre par appel d'offre
        if ($appelOffreId) {
            $query->where('appel_offre_id', $appelOffreId);
        }

        $candidatures = $query->orderBy('created_at', 'desc')->paginate($perPage);
        return CandidatureResource::collection($candidatures);
    }

    public function show(Candidature $candidature)
    {
        $this->authorize('view', $candidature);
        return new CandidatureResource($candidature->load(['appelOffre','fournisseur.user','documents']));
    }

    public function store(StoreCandidatureRequest $request, AppelOffre $appelOffre)
    {
        $this->authorize('create', Candidature::class);

        if ($appelOffre->statut !== \App\Models\AppelOffre::STATUS_PUBLISHED) {
            return response()->json(['message' => 'Appel d\'offre non ouvert à la candidature.'], 403);
        }
        
        $user = Auth::user();
        
        // Seuls les fournisseurs peuvent créer des candidatures
        if (!$user->fournisseur) {
            return response()->json(['message' => 'Utilisateur non reconnu comme fournisseur.'], 403);
        }
        
        $fournisseurId = $user->fournisseur->id;
        
        // Vérifier si une candidature existe déjà pour ce fournisseur et cet appel d'offre
        $existingCandidature = Candidature::where('appel_offre_id', $appelOffre->id)
            ->where('fournisseur_id', $fournisseurId)
            ->first();

        if ($existingCandidature) {
            return response()->json(['message' => 'Vous avez déjà postulé à cet appel d\'offre.'], 409);
        }

        // Vérifier que le fournisseur a bien uploadé tous ses documents légaux
        $requiredDocs = ['RCCM', 'NINEA', 'QUITUS_FISCAL'];
        $userDocuments = Document::where('user_id', $user->id)
            ->whereIn('categorie', $requiredDocs)
            ->pluck('categorie')
            ->unique()
            ->toArray();
        
        $missingDocs = array_diff($requiredDocs, $userDocuments);
        
        if (!empty($missingDocs)) {
            $docNames = [
                'RCCM' => 'RCCM (Registre du Commerce)',
                'NINEA' => 'NINEA',
                'QUITUS_FISCAL' => 'Quitus Fiscal'
            ];
            $missingNames = array_map(fn($doc) => $docNames[$doc], $missingDocs);
            return response()->json([
                'message' => 'Documents légaux manquants. Veuillez uploader les documents suivants avant de postuler : ' . implode(', ', $missingNames),
                'missing_documents' => $missingDocs
            ], 422);
        }

        $validated = $request->validated();
        
        $candidature = Candidature::create([
            'appel_offre_id' => $appelOffre->id,
            'fournisseur_id' => $fournisseurId,
            'date_soumission' => now(),
            'montant_propose' => $validated['montant_propose'],
            'statut' => \App\Models\Candidature::STATUS_SUBMITTED,
        ]);

        $candidature->refresh();

        $this->log('submit_candidature', "Soumission candidature #{$candidature->id}");

        return (new CandidatureResource($candidature))->response()->setStatusCode(201);
    }

    public function update(StoreCandidatureRequest $request, Candidature $candidature)
    {
        // Seul le fournisseur propriétaire peut modifier sa candidature
        if (!auth()->user()->fournisseur || $candidature->fournisseur_id !== auth()->user()->fournisseur->id) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        // On ne peut modifier que si le statut est soumis
        if ($candidature->statut !== \App\Models\Candidature::STATUS_SUBMITTED) {
            return response()->json(['message' => 'Impossible de modifier une candidature déjà traitée.'], 403);
        }

        // Vérifier que l'appel d'offre n'est pas clôturé
        $candidature->load('appelOffre');
        if ($candidature->appelOffre->statut === \App\Models\AppelOffre::STATUS_CLOSED) {
            return response()->json(['message' => 'Impossible de modifier une candidature pour un appel d\'offre clôturé.'], 403);
        }

        $candidature->update([
            'montant_propose' => $request->validated()['montant_propose'],
        ]);

        $candidature->refresh();

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
        \Illuminate\Support\Facades\Log::info("Tentative de rejet candidature #{$candidature->id} par utilisateur " . auth()->id());
        
        $this->authorize('reject', $candidature);

        if ($candidature->statut === \App\Models\Candidature::STATUS_REJECTED) {
            \Illuminate\Support\Facades\Log::warning("Candidature #{$candidature->id} déjà rejetée.");
            return response()->json(['message' => 'Déjà rejetée.'], 409);
        }
        if ($candidature->statut === \App\Models\Candidature::STATUS_ACCEPTED) {
            \Illuminate\Support\Facades\Log::warning("Candidature #{$candidature->id} déjà acceptée.");
            return response()->json(['message' => 'Déjà acceptée.'], 409);
        }

        $candidature->update(['statut' => \App\Models\Candidature::STATUS_REJECTED]);
        \Illuminate\Support\Facades\Log::info("Candidature #{$candidature->id} rejetée avec succès.");

        $this->log('reject_candidature', "Rejet candidature #{$candidature->id}");

        try {
            app(NotificationService::class)->notifyUser(
                $candidature->fournisseur->user->id,
                'Votre candidature a été rejetée.'
            );
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Erreur notif rejet: " . $e->getMessage());
        }

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
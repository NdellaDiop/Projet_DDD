<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Candidature;
use App\Models\Fournisseur;
use App\Models\LogActivite;
use App\Support\ApiUserResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use App\Http\Resources\DocumentResource;
use Illuminate\Validation\Rule;

class DocumentController extends Controller
{
    private const DOCUMENTS_LOCAL_DISK = 'local';
    private const DOCUMENTS_PUBLIC_DISK = 'public';

    public function store(Request $request)
    {
        $this->authorize('create', Document::class);

        $request->validate([
            'file' => 'required|file|max:10240',
            'categorie' => [
                'required',
                Rule::in(array_merge(Document::allLegalUploadCategories(), [
                    'OFFRE_TECHNIQUE',
                    'OFFRE_FINANCIERE',
                    'PIECE_ADMINISTRATIVE',
                    'AVIS_APPEL_OFFRES',
                    'CAHIER_DES_CHARGES',
                    'REGLEMENT_CONSULTATION',
                    'ANNEXE_AO',
                ])),
            ],
            'candidature_id' => 'nullable|exists:candidatures,id',
            'appel_offre_id' => 'nullable|exists:appels_offres,id',
        ]);

        $file = $request->file('file');
        // Stockage non-public : accès uniquement via l'API (download protégé).
        $path = $file->store('documents', self::DOCUMENTS_LOCAL_DISK);

        $doc = Document::create([
            'user_id' => auth()->id(),
            'candidature_id' => $request->candidature_id,
            'appel_offre_id' => $request->appel_offre_id,
            'nom_fichier' => $file->getClientOriginalName(),
            'type_fichier' => $file->getClientMimeType(),
            'categorie' => $request->categorie,
            'chemin_fichier' => $path,
        ]);

        $this->log('upload_document', "Upload document #{$doc->id}");

        return (new DocumentResource($doc))->response()->setStatusCode(201);
    }

    public function indexLegal()
    {
        $this->authorize('viewAny', Document::class);
        
        $user = auth()->user();
        
        // L'admin ne peut pas accéder aux documents légaux via cette route
        // Il doit utiliser getFournisseurLegalDocuments via une candidature
        if ($user->isAdmin()) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }
        
        $documents = Document::where('user_id', $user->id)
            ->whereIn('categorie', Document::allLegalUploadCategories())
            ->latest()
            ->get();

        return DocumentResource::collection($documents);
    }

    public function storeLegal(Request $request)
    {
        $this->authorize('create', Document::class);

        $user = auth()->user();
        
        // L'admin ne peut pas uploader de documents légaux pour un fournisseur
        if ($user->isAdmin()) {
            return response()->json(['message' => 'Vous n\'êtes pas autorisé à uploader des documents légaux.'], 403);
        }

        // Le fournisseur ne peut renseigner ses pièces légales qu'après validation
        // de son compte par l'administrateur (statut « actif »).
        $fournisseur = $user->fournisseur;
        if (!$fournisseur || $fournisseur->statut !== 'actif') {
            return response()->json([
                'message' => "Votre compte fournisseur doit être validé par l'administrateur avant de pouvoir déposer vos documents légaux.",
            ], 403);
        }

        $request->validate([
            'file' => 'required|file|max:10240',
            'categorie' => ['required', Rule::in(Document::allLegalUploadCategories())],
        ]);

        $file = $request->file('file');
        // Stockage non-public : accès uniquement via l'API (download protégé).
        $path = $file->store('documents', self::DOCUMENTS_LOCAL_DISK);

        $doc = Document::create([
            'user_id' => $user->id,
            'candidature_id' => null,
            'appel_offre_id' => null,
            'nom_fichier' => $file->getClientOriginalName(),
            'type_fichier' => $file->getClientMimeType(),
            'categorie' => $request->categorie,
            'chemin_fichier' => $path,
        ]);

        $this->log('upload_legal_document', "Upload doc legal #{$doc->id}");

        return (new DocumentResource($doc))->response()->setStatusCode(201);
    }

    public function destroyLegal(Document $document)
    {
        $this->authorize('delete', $document);

        Storage::disk(self::DOCUMENTS_LOCAL_DISK)->delete($document->chemin_fichier);
        // Compatibilité : si un ancien fichier était sur le disque public
        Storage::disk(self::DOCUMENTS_PUBLIC_DISK)->delete($document->chemin_fichier);
        $document->delete();

        $this->log('delete_legal_document', "Suppression doc legal #{$document->id}");

        return response()->json(null, 204);
    }

    public function index()
    {
        $this->authorize('viewAny', Document::class);

        $user = auth()->user();

        if ($user->isAdmin()) {
            return DocumentResource::collection(Document::latest()->get());
        }

        if ($user->isResponsableMarche()) {
            $documents = Document::whereHas('appelOffre', function ($q) use ($user) {
                $q->where('responsable_marche_id', $user->responsableMarche->id);
            })->latest()->get();

            return DocumentResource::collection($documents);
        }

        if ($user->isFournisseur()) {
            if (!$user->fournisseur) {
                return DocumentResource::collection(collect());
            }

            $documents = Document::where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhereHas('candidature', function ($cq) use ($user) {
                      $cq->where('fournisseur_id', $user->fournisseur->id);
                  });
            })->latest()->get();

            return DocumentResource::collection($documents);
        }

        return DocumentResource::collection(collect());
    }

    public function show(Document $document)
    {
        $this->authorize('view', $document);
        return new DocumentResource($document);
    }

    public function download(Request $request, Document $document)
    {
        $user = ApiUserResolver::forDocumentAccess($request);
        if (! $user) {
            return response()->json([
                'message' => 'Authentification requise pour télécharger ce document.',
            ], 401);
        }

        // Charger les relations nécessaires pour la vérification des permissions
        $document->load(['candidature.appelOffre.responsableMarche', 'appelOffre.responsableMarche']);

        if (! Gate::forUser($user)->allows('view', $document)) {
            return response()->json([
                'message' => 'Vous n\'êtes pas autorisé à télécharger ce document.',
            ], 403);
        }
        
        // Priorité au stockage non-public (local). Fallback vers public pour les anciens fichiers.
        if (Storage::disk(self::DOCUMENTS_LOCAL_DISK)->exists($document->chemin_fichier)) {
            return Storage::disk(self::DOCUMENTS_LOCAL_DISK)->download(
                $document->chemin_fichier,
                $document->nom_fichier
            );
        }

        if (Storage::disk(self::DOCUMENTS_PUBLIC_DISK)->exists($document->chemin_fichier)) {
            return Storage::disk(self::DOCUMENTS_PUBLIC_DISK)->download(
                $document->chemin_fichier,
                $document->nom_fichier
            );
        }

        return response()->json(['message' => 'Document non trouvé.'], 404);
    }

    public function destroy(Document $document)
    {
        $this->authorize('delete', $document);

        Storage::disk(self::DOCUMENTS_LOCAL_DISK)->delete($document->chemin_fichier);
        // Compatibilité : si un ancien fichier était sur le disque public
        Storage::disk(self::DOCUMENTS_PUBLIC_DISK)->delete($document->chemin_fichier);
        $document->delete();

        $this->log('delete_document', "Suppression document #{$document->id}");

        return response()->json(null, 204);
    }

    /**
     * Liste les documents légaux d'un fournisseur donné, sans dépendance à une candidature.
     * Accessible aux ADMIN et RESPONSABLE_MARCHE pour pouvoir contrôler le dossier
     * lorsque le fournisseur se présente au siège pour le dépôt des plis.
     */
    public function getDocumentsLegauxFournisseur(Fournisseur $fournisseur)
    {
        $user = auth()->user();

        if (!$user || (!$user->isAdmin() && !$user->isResponsableMarche())) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        // Pour un PRM, on n'autorise que les fournisseurs actifs (dossier validé).
        if ($user->isResponsableMarche() && $fournisseur->statut !== 'actif') {
            return response()->json([
                'message' => "Le dossier de ce fournisseur n'est pas (encore) accessible : son compte doit être validé par l'administrateur.",
            ], 403);
        }

        if (!$fournisseur->user_id) {
            return DocumentResource::collection(collect());
        }

        $documents = Document::where('user_id', $fournisseur->user_id)
            ->whereIn('categorie', Document::allLegalUploadCategories())
            ->latest()
            ->get();

        return DocumentResource::collection($documents);
    }

    public function getFournisseurLegalDocuments(Candidature $candidature)
    {
        // Vérifier que l'utilisateur peut voir cette candidature
        $user = auth()->user();
        
        // Vérifier que c'est un responsable de marché ou admin
        if (!$user->isResponsableMarche() && !$user->isAdmin()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }
        
        // Vérifier que le responsable a accès à cette candidature (via l'appel d'offres)
        if ($user->isResponsableMarche()) {
            $candidature->load('appelOffre.responsableMarche');
            if ($candidature->appelOffre->responsable_marche_id !== $user->responsableMarche->id) {
                return response()->json(['message' => 'Non autorisé.'], 403);
            }
        }
        
        // Charger le fournisseur
        $candidature->load('fournisseur');
        
        // Vérifier que le fournisseur existe
        if (!$candidature->fournisseur) {
            return DocumentResource::collection(collect());
        }
        
        // Récupérer les documents légaux du fournisseur via son user_id
        // Le fournisseur a un champ user_id qui référence l'utilisateur
        $userId = $candidature->fournisseur->user_id;
        
        if (!$userId) {
            return DocumentResource::collection(collect());
        }
        
        $documents = Document::where('user_id', $userId)
            ->whereIn('categorie', Document::allLegalUploadCategories())
            ->latest()
            ->get();
        
        return DocumentResource::collection($documents);
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
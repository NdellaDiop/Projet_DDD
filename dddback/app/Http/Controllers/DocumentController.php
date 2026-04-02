<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Candidature;
use App\Models\LogActivite;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Http\Resources\DocumentResource;

class DocumentController extends Controller
{
    public function store(Request $request)
    {
        $this->authorize('create', Document::class);

        $request->validate([
            'file' => 'required|file|max:10240',
            'categorie' => 'required|in:RCCM,NINEA,QUITUS_FISCAL,OFFRE_TECHNIQUE,OFFRE_FINANCIERE,PIECE_ADMINISTRATIVE,CAHIER_DES_CHARGES,REGLEMENT_CONSULTATION,ANNEXE_AO',
            'candidature_id' => 'nullable|exists:candidatures,id',
            'appel_offre_id' => 'nullable|exists:appels_offres,id',
        ]);

        $file = $request->file('file');
        $path = $file->store('documents', 'public');

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
            ->whereIn('categorie', ['RCCM', 'NINEA', 'QUITUS_FISCAL'])
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

        $request->validate([
            'file' => 'required|file|max:10240',
            'categorie' => 'required|in:RCCM,NINEA,QUITUS_FISCAL',
        ]);

        $file = $request->file('file');
        $path = $file->store('documents', 'public');

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

        Storage::disk('public')->delete($document->chemin_fichier);
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

    public function download(Document $document)
    {
        // Charger les relations nécessaires pour la vérification des permissions
        $document->load(['candidature.appelOffre.responsableMarche', 'appelOffre.responsableMarche']);
        
        $this->authorize('view', $document);
        
        if (!Storage::disk('public')->exists($document->chemin_fichier)) {
            return response()->json(['message' => 'Document non trouvé.'], 404);
        }
        
        return Storage::disk('public')->download(
            $document->chemin_fichier,
            $document->nom_fichier
        );
    }

    public function destroy(Document $document)
    {
        $this->authorize('delete', $document);

        Storage::disk('public')->delete($document->chemin_fichier);
        $document->delete();

        $this->log('delete_document', "Suppression document #{$document->id}");

        return response()->json(null, 204);
    }

    public function getFournisseurLegalDocuments(Candidature $candidature)
    {
        // Vérifier que l'utilisateur peut voir cette candidature
        $user = auth()->user();
        
        // Vérifier que c'est un responsable de marché ou admin
        if (!$user->isResponsableMarche() && !$user->isAdmin()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }
        
        // Vérifier que le responsable a accès à cette candidature (via l'appel d'offre)
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
            ->whereIn('categorie', ['RCCM', 'NINEA', 'QUITUS_FISCAL'])
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
<?php

namespace App\Http\Controllers;

use App\Models\Document;
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
            'categorie' => 'required|in:RCCM,NINEA,QUITUS_FISCAL,OFFRE_TECHNIQUE,OFFRE_FINANCIERE,PIECE_ADMINISTRATIVE',
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

        $documents = Document::where('user_id', auth()->id())
            ->whereIn('categorie', ['RCCM', 'NINEA', 'QUITUS_FISCAL'])
            ->latest()
            ->get();

        return DocumentResource::collection($documents);
    }

    public function storeLegal(Request $request)
    {
        $this->authorize('create', Document::class);

        $request->validate([
            'file' => 'required|file|max:10240',
            'categorie' => 'required|in:RCCM,NINEA,QUITUS_FISCAL',
        ]);

        $file = $request->file('file');
        $path = $file->store('documents', 'public');

        $doc = Document::create([
            'user_id' => auth()->id(),
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

    public function destroy(Document $document)
    {
        $this->authorize('delete', $document);

        Storage::disk('public')->delete($document->chemin_fichier);
        $document->delete();

        $this->log('delete_document', "Suppression document #{$document->id}");

        return response()->json(null, 204);
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
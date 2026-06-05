<?php

namespace App\Services;

use App\Models\AppelOffre;
use App\Models\Document;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class AppelOffreDocumentService
{
    private const DOCUMENTS_DISK = 'local';

    public function attachToAppelOffre(AppelOffre $appelOffre, UploadedFile $file, string $categorie, int $userId): Document
    {
        $path = $file->store('documents', self::DOCUMENTS_DISK);

        return Document::create([
            'user_id' => $userId,
            'appel_offre_id' => $appelOffre->id,
            'nom_fichier' => $file->getClientOriginalName(),
            'type_fichier' => $file->getClientMimeType(),
            'categorie' => $categorie,
            'chemin_fichier' => $path,
        ]);
    }

    public function deleteFile(Document $document): void
    {
        Storage::disk(self::DOCUMENTS_DISK)->delete($document->chemin_fichier);
        Storage::disk('public')->delete($document->chemin_fichier);
    }
}

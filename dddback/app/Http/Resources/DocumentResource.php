<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;

class DocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'categorie' => $this->categorie,
            'nom_fichier' => $this->nom_fichier,
            'type_fichier' => $this->type_fichier,
            // Ne pas exposer de lien direct vers /storage/... en public.
            // Téléchargement uniquement si l'utilisateur connecté passe la policy.
            'download_url' => $request->user() && Gate::forUser($request->user())->allows('view', $this->resource)
                ? "/api/documents/{$this->id}/download"
                : null,
            'created_at' => $this->created_at,
        ];
    }
}
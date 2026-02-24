<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class DocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'categorie' => $this->categorie,
            'nom_fichier' => $this->nom_fichier,
            'type_fichier' => $this->type_fichier,
            'chemin_fichier' => $this->chemin_fichier,
            'url' => $this->chemin_fichier ? Storage::disk('public')->url($this->chemin_fichier) : null,
            'created_at' => $this->created_at,
        ];
    }
}
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppelOffreResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'titre' => $this->titre,
            'reference' => $this->reference,
            'description' => $this->description,
            'statut' => $this->statut,
            'date_publication' => $this->date_publication,
            'date_limite_depot' => $this->date_limite_depot,
            'responsable' => $this->whenLoaded('responsableMarche', function () {
                return [
                    'id' => $this->responsableMarche->id,
                    'name' => $this->responsableMarche->user ? $this->responsableMarche->user->name : 'Non défini',
                    'email' => $this->responsableMarche->user ? $this->responsableMarche->user->email : '',
                ];
            }),
            'candidatures_count' => $this->whenCounted('candidatures'),
        ];
    }
}
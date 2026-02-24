<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CandidatureResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'statut' => $this->statut,
            'date_soumission' => $this->date_soumission,
            'appel_offre' => $this->whenLoaded('appelOffre', function () {
                return $this->appelOffre?->only(['id','titre','statut','date_publication','date_limite_depot']);
            }),
            'fournisseur' => $this->whenLoaded('fournisseur', function () {
                return [
                    'id' => $this->fournisseur->id,
                    'nom_entreprise' => $this->fournisseur->nom_entreprise,
                    'user' => $this->fournisseur->user?->only(['id','name','email']),
                ];
            }),
        ];
    }
}